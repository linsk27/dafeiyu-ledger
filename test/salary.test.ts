import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_CONFIG,
  breakInfo,
  clampConfig,
  dailySalary,
  earnedAt,
  endOf,
  fmtDuration,
  fmtMoney,
  isOvernightShift,
  monthEarnedAt,
  monthWorkdays,
  payDaysOf,
  perSecond,
  phaseAt,
  progressOf,
  repairBreaks,
  startOf,
  timeline,
  type SalaryConfig,
} from '../src/lib/salary.ts'

/** 2026-11-19 是周四；11 月共 21 个工作日 */
const day = (h: number, m = 0) => new Date(2026, 10, 19, h, m, 0)

const NIGHT: SalaryConfig = {
  ...DEFAULT_CONFIG,
  start: '22:00',
  end: '06:00',
  lunchOn: false,
  dinnerOn: true,
  dinnerStart: '01:00',
  dinnerEnd: '01:40',
}

test('计薪天数：空数组不能退化成 1 天', () => {
  const now = day(10)
  assert.equal(payDaysOf({ ...DEFAULT_CONFIG, workDays: [] }, now), 21)
  assert.equal(payDaysOf(DEFAULT_CONFIG, now), 21)
  assert.equal(payDaysOf({ ...DEFAULT_CONFIG, payDays: 30 }, now), 30)
  assert.equal(
    payDaysOf({ ...DEFAULT_CONFIG, workDays: monthWorkdays(2026, 10).slice(0, 20) }, now),
    20,
  )
})

test('计薪天数：空数组时每秒进账仍是正常值', () => {
  const now = day(10)
  const normal = perSecond(DEFAULT_CONFIG, now)
  const empty = perSecond({ ...DEFAULT_CONFIG, workDays: [] }, now)
  assert.equal(empty, normal)
  assert.ok(empty < 0.02, `每秒不该跳到 0.24，实际 ${empty}`)
})

test('日薪 / 时薪：7000 元 21 天 8 小时', () => {
  const now = day(10)
  assert.equal(dailySalary(DEFAULT_CONFIG, now).toFixed(2), '333.33')
  // 9 小时班 - 1 小时午休 = 8 小时
  assert.equal(timeline(DEFAULT_CONFIG).work, 480)
})

test('白班：五个时段判得对', () => {
  const c = DEFAULT_CONFIG
  assert.equal(phaseAt(day(8), c), 'before')
  assert.equal(phaseAt(day(9), c), 'working')
  assert.equal(phaseAt(day(12, 30), c), 'lunch')
  assert.equal(phaseAt(day(13, 30), c), 'working')
  assert.equal(phaseAt(day(18), c), 'after')
  assert.equal(phaseAt(day(23, 59), c), 'after')
})

test('白班：已赚按净工时线性涨，休息不涨', () => {
  const c = DEFAULT_CONFIG
  const daily = dailySalary(c, day(10))
  assert.equal(earnedAt(day(8), c), 0)
  assert.equal(earnedAt(day(9), c), 0)
  // 09:00–12:00 三小时 / 八小时
  assert.ok(Math.abs(earnedAt(day(12), c) - (daily * 3) / 8) < 1e-6)
  // 午休中不涨
  assert.equal(earnedAt(day(12, 30), c), earnedAt(day(12), c))
  assert.equal(earnedAt(day(13), c), earnedAt(day(12), c))
  // 18:00 收满
  assert.ok(Math.abs(earnedAt(day(18), c) - daily) < 1e-6)
  assert.equal(progressOf(day(18), c), 1)
})

test('夜班：凌晨那段属于这一班，不能算成「还没上班」', () => {
  assert.ok(isOvernightShift(NIGHT))
  assert.equal(phaseAt(day(23), NIGHT), 'working')
  // 01:00–01:40 是这段夜班的晚休
  assert.equal(phaseAt(new Date(2026, 10, 20, 1, 20), NIGHT), 'dinner')
  assert.equal(phaseAt(new Date(2026, 10, 20, 2, 10), NIGHT), 'working')
  assert.equal(phaseAt(new Date(2026, 10, 20, 5), NIGHT), 'working')
  // 07:00 已经收工
  assert.equal(phaseAt(new Date(2026, 10, 20, 7), NIGHT), 'after')
  // 白天也是「下班后」，不是「上班前」
  assert.equal(phaseAt(day(12), NIGHT), 'after')
})

test('夜班：凌晨已赚接着涨，而不是从 0 开始', () => {
  const c = NIGHT
  const daily = dailySalary(c, day(23))
  // 22:00 上班，02:10 = 上了 250 分钟、晚休 40 分钟，净工时 440
  const at210 = earnedAt(new Date(2026, 10, 20, 2, 10), c)
  assert.ok(Math.abs(at210 - (daily * 210) / 440) < 1e-6, `得到 ${at210}`)
  assert.ok(at210 > daily * 0.4, '凌晨两点应该已经赚了小一半')
  // 晚休期间不涨
  assert.equal(
    earnedAt(new Date(2026, 10, 20, 1, 20), c),
    earnedAt(new Date(2026, 10, 20, 1), c),
  )
  assert.ok(Math.abs(earnedAt(day(7), c) - daily) < 1e-6, '白天应当显示满勤')
  assert.equal(progressOf(day(7), c), 1)
})

test('夜班：本月已赚不重复计一次', () => {
  const c = NIGHT
  const perDay = dailySalary(c, day(23))
  // 11-20 01:30：这一班是 19 号开的，19 号不能先算满再算一遍
  const m = monthEarnedAt(c, new Date(2026, 10, 20, 1, 30))
  const doneDays = m.done
  const expected = doneDays * perDay + earnedAt(new Date(2026, 10, 20, 1, 30), c)
  assert.ok(Math.abs(m.earned - expected) < 1e-6)
  assert.ok(m.countsToday, '19/20 号都是工作日，这一班要计入')
  // 白天的「下班后」：这一班算满，且不算两遍
  const noon = monthEarnedAt(c, day(12))
  assert.ok(Math.abs(noon.earned - (noon.done * perDay + perDay)) < 1e-6)
})

test('夜班：班次起点落在昨天', () => {
  const at0130 = new Date(2026, 10, 20, 1, 30)
  assert.equal(startOf(at0130, NIGHT).getDate(), 19)
  assert.equal(startOf(at0130, NIGHT).getHours(), 22)
  assert.equal(endOf(at0130, NIGHT).getDate(), 20)
  assert.equal(endOf(at0130, NIGHT).getHours(), 6)
  // 白天算「昨晚那一班已经收工」，预览「下班后」才对得上
  assert.equal(startOf(day(12), NIGHT).getDate(), 18)
  assert.equal(endOf(day(12), NIGHT).getDate(), 19)
  // 开工之后就是今天这一班
  assert.equal(startOf(day(23), NIGHT).getDate(), 19)
  assert.equal(endOf(day(23), NIGHT).getDate(), 20)
})

test('夜班：本月已赚只增不减', () => {
  const c = NIGHT
  const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m)
  const before = monthEarnedAt(c, at(19, 21)).earned
  const after = monthEarnedAt(c, at(20, 7)).earned
  const seq = [
    at(19, 7),
    at(19, 12),
    at(19, 21),
    at(19, 23),
    at(20, 1, 30),
    at(20, 5),
    at(20, 7),
    at(20, 12),
  ].map((d) => monthEarnedAt(c, d).earned)
  for (let i = 1; i < seq.length; i += 1) {
    assert.ok(
      seq[i] >= seq[i - 1] - 1e-6,
      `第 ${i} 个时刻倒退了：${seq[i - 1].toFixed(2)} → ${seq[i].toFixed(2)}`,
    )
  }
  // 一整夜（19 号 22:00 → 20 号 06:00）应当正好涨满一天
  const perDay = dailySalary(c, at(19, 23))
  assert.ok(Math.abs(after - before - perDay) < 1e-6, '整夜应当只涨一天的量')
})

test('休息：两段重叠只扣一次', () => {
  const c: SalaryConfig = {
    ...DEFAULT_CONFIG,
    start: '09:00',
    end: '20:00',
    lunchOn: true,
    lunchStart: '12:00',
    lunchEnd: '14:00',
    dinnerOn: true,
    dinnerStart: '13:00',
    dinnerEnd: '14:30',
  }
  const tl = timeline(c)
  // 并集 12:00–14:30 = 150 分钟
  assert.equal(tl.breakMin, 150)
  assert.equal(tl.work, 11 * 60 - 150)
})

test('休息：落在班次外只扣班内那段', () => {
  const c: SalaryConfig = { ...DEFAULT_CONFIG, dinnerOn: true, dinnerStart: '17:00', dinnerEnd: '19:00' }
  const info = breakInfo(c, 'dinner')
  assert.equal(info.outside, true)
  assert.equal(info.span?.from, 17 * 60)
  assert.equal(info.span?.to, 18 * 60)
})

test('repairBreaks：把撞到下班点的晚休挪进班次', () => {
  const c: SalaryConfig = { ...DEFAULT_CONFIG, dinnerOn: true, dinnerStart: '18:00', dinnerEnd: '18:30' }
  assert.equal(breakInfo(c, 'dinner').span, null)
  const fixed = repairBreaks(c)
  assert.ok(breakInfo(fixed, 'dinner').span, '修完应当落在班次内')
  assert.equal(fixed.lunchStart, c.lunchStart, '不该动午休')
})

test('clampConfig：坏数据兜住', () => {
  const c = clampConfig({
    ...DEFAULT_CONFIG,
    monthly: Number.NaN,
    start: '25:99',
    end: 'abc',
    payDays: 99,
    workDays: ['2026-11-03', '2026-11-03', 'x'],
  })
  assert.equal(c.monthly, 0)
  assert.equal(c.start, '09:00')
  assert.equal(c.end, '18:00')
  assert.equal(c.payDays, 31)
  assert.deepEqual(c.workDays, ['2026-11-03'])
})

test('格式化', () => {
  assert.equal(fmtMoney(1234.5678), '1,234.5678')
  assert.equal(fmtMoney(-1.5, 2), '-1.50')
  assert.equal(fmtMoney(Number.NaN), '0.0000')
  assert.equal(fmtDuration(3600 + 25 * 60), '1 小时 25 分')
  assert.equal(fmtDuration(90), '1 分')
})
