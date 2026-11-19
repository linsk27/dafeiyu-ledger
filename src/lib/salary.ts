export interface SalaryConfig {
  /** 月薪 */
  monthly: number
  /** 上班时间 HH:MM */
  start: string
  /** 下班时间 HH:MM */
  end: string
  /** 有没有午休 */
  lunchOn: boolean
  /** 午休开始 HH:MM */
  lunchStart: string
  /** 午休结束 HH:MM */
  lunchEnd: string
  /** 有没有晚休（晚饭时间） */
  dinnerOn: boolean
  /** 晚休开始 HH:MM */
  dinnerStart: string
  /** 晚休结束 HH:MM */
  dinnerEnd: string
  /** 计薪天数；null = 按当月工作日自动算（旧字段，手动模式也兼容它） */
  payDays: number | null
  /** 手动挑的具体计薪日（YYYY-MM-DD）；null = 自动 */
  workDays: string[] | null
}

export const DEFAULT_CONFIG: SalaryConfig = {
  monthly: 7000,
  start: '09:00',
  end: '18:00',
  lunchOn: true,
  lunchStart: '12:00',
  lunchEnd: '13:00',
  dinnerOn: false,
  dinnerStart: '18:00',
  dinnerEnd: '18:30',
  payDays: null,
  workDays: null,
}

export type Phase = 'before' | 'working' | 'lunch' | 'dinner' | 'after'

export type BreakId = 'lunch' | 'dinner'

/** 落地到分钟的一段区间 */
export interface Span {
  from: number
  to: number
}

export function parseHM(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(':').map((v) => Number.parseInt(v, 10))
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 }
}

export function minutesOf(hm: string): number {
  const { h, m } = parseHM(hm)
  return (((h % 24) + 24) % 24) * 60 + Math.min(59, Math.max(0, m))
}

/** 当月工作日（周一~周五），用于把月薪折成日薪 */
export function payDaysAuto(now: Date): number {
  const y = now.getFullYear()
  const mo = now.getMonth()
  const total = new Date(y, mo + 1, 0).getDate()
  let n = 0
  for (let d = 1; d <= total; d += 1) {
    const wd = new Date(y, mo, d).getDay()
    if (wd !== 0 && wd !== 6) n += 1
  }
  return Math.max(1, n)
}

/** 本地时区的 YYYY-MM-DD（不要用 toISOString，会按 UTC 掉一天） */
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** 某月所有「周一~周五」的日期 */
export function monthWorkdays(year: number, month: number): string[] {
  const total = new Date(year, month + 1, 0).getDate()
  const out: string[] = []
  for (let d = 1; d <= total; d += 1) {
    const date = new Date(year, month, d)
    const wd = date.getDay()
    if (wd !== 0 && wd !== 6) out.push(isoDate(date))
  }
  return out
}

export function payDaysOf(c: SalaryConfig, now: Date): number {
  // 手动勾的日期：只在「真的勾了」时才算数。
  // 空数组曾经被 Math.max(1, 0) 兜成 1 天 —— 日薪直接变成整月工资（7000/1），
  // 和 monthEarnedAt 退回 21 天的口径也对不上，所以这里跟着退回自动。
  if (c.workDays && c.workDays.length > 0) return c.workDays.length
  return c.payDays && c.payDays > 0 ? c.payDays : payDaysAuto(now)
}

/**
 * 本月已赚：把这个月「已经过完的计薪日」全算满，再加上今天赚到的。
 * 只往前看，不预测未来；今天不是计薪日就只算已过完的那些天。
 */
export function monthEarnedAt(
  c: SalaryConfig,
  now: Date,
): { earned: number; done: number; total: number; countsToday: boolean } {
  const y = now.getFullYear()
  const mo = now.getMonth()
  const ym = `${y}-${String(mo + 1).padStart(2, '0')}`
  // 手动勾选的日期可能停留上个月，这里只认本月的；没有就退回周一到周五
  const picked = (c.workDays ?? []).filter((d) => d.startsWith(ym))
  const days = picked.length > 0 ? picked : monthWorkdays(y, mo)
  // 夜班跨零点：凌晨 / 白天那段属于「昨晚开始的那一班」，得记在它开始的那一天，
  // 否则昨天整天先算满、今天再算一遍这一段，会重复计一次。
  const shiftDay = isoDate(shiftDate(now, c))
  const done = days.filter((d) => d < shiftDay).length
  const countsToday = days.includes(shiftDay)
  const perDay = dailySalary(c, now)
  return {
    earned: done * perDay + (countsToday ? earnedAt(now, c) : 0),
    done,
    total: days.length,
    countsToday,
  }
}

export function dailySalary(c: SalaryConfig, now: Date): number {
  const m = Number.isFinite(c.monthly) ? Math.max(0, c.monthly) : 0
  return m / payDaysOf(c, now)
}

/** 一段休息的原始区间；起止相同 = 没有这段休息 */
function rawSpan(startHM: string, endHM: string): Span | null {
  const from = minutesOf(startHM)
  let to = minutesOf(endHM)
  if (to === from) return null
  if (to < from) to += 24 * 60
  return { from, to }
}

function shiftOf(c: SalaryConfig): { s: number; e: number } {
  const s = minutesOf(c.start)
  let e = minutesOf(c.end)
  if (e <= s) e += 24 * 60
  return { s, e }
}

/** 班次跨零点（22:00 → 06:00）：这种班里没有「上班前」那一段 */
export function isOvernightShift(c: SalaryConfig): boolean {
  return shiftOf(c).e > 24 * 60
}

/** 两段区间的并集长度（避免午休与晚休重叠时重复扣） */
function unionMinutes(spans: Span[]): number {
  const xs = spans.filter((x) => x.to > x.from).sort((a, b) => a.from - b.from)
  if (!xs.length) return 0
  let total = 0
  let from = xs[0].from
  let to = xs[0].to
  for (const x of xs.slice(1)) {
    if (x.from > to) {
      total += to - from
      from = x.from
      to = x.to
    } else if (x.to > to) {
      to = x.to
    }
  }
  return total + (to - from)
}

/**
 * 某段休息的完整状态：
 * - invalid：开着但起止相同（等于没休）
 * - outside：有一部分落在班次之外
 * - span：真正会扣掉的那段（已裁到班次内）
 */
export function breakInfo(c: SalaryConfig, id: BreakId) {
  const on = id === 'lunch' ? c.lunchOn : c.dinnerOn
  const startHM = id === 'lunch' ? c.lunchStart : c.dinnerStart
  const endHM = id === 'lunch' ? c.lunchEnd : c.dinnerEnd
  const raw = rawSpan(startHM, endHM)
  const { s, e } = shiftOf(c)

  let span: Span | null = null
  let invalid = false
  let outside = false

  if (!on) return { on, raw, span, invalid, outside }

  if (!raw) {
    invalid = true
    return { on, raw, span, invalid, outside }
  }

  let from = raw.from
  let to = raw.to
  // 班次跨零点时，休息也跟着往后挪一天
  while (from < s) {
    from += 24 * 60
    to += 24 * 60
  }
  outside = from < s || to > e
  const a = Math.max(from, s)
  const b = Math.min(to, e)
  span = b > a ? { from: a, to: b } : null
  if (!span) outside = true
  return { on, raw, span, invalid, outside }
}

/** 一天的时间轴（分钟，跨零点自动接续） */
export function timeline(c: SalaryConfig) {
  const { s, e } = shiftOf(c)
  const lunch = breakInfo(c, 'lunch').span
  const dinner = breakInfo(c, 'dinner').span
  const gross = e - s
  const breakMin = unionMinutes([lunch, dinner].filter((x): x is Span => Boolean(x)))
  return {
    s,
    e,
    gross,
    lunch,
    dinner,
    lunchMin: lunch ? lunch.to - lunch.from : 0,
    dinnerMin: dinner ? dinner.to - dinner.from : 0,
    breakMin,
    work: Math.max(60, gross - breakMin),
  }
}

/** 净工作秒数（已扣午休 / 晚休） */
export function workSeconds(c: SalaryConfig): number {
  return timeline(c).work * 60
}

export function perSecond(c: SalaryConfig, now: Date): number {
  return dailySalary(c, now) / workSeconds(c)
}

export function perHour(c: SalaryConfig, now: Date): number {
  return dailySalary(c, now) / (workSeconds(c) / 3600)
}

function nowMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
}

/**
 * 把「现在」换算成「这一班」里的相对分钟数。
 *
 * 跨零点的班次（22:00 → 06:00）凌晨那段属于**昨天开的这一班**，
 * 所以 t 是在班次里数、而不是在一天里数：
 *   t < 0        这一班还没开始（对夜班来说 = 昨夜那班已经收工）
 *   0 ≤ t < 总长  正在上班
 * 曾经直接用 0–1439 的钟点判断，导致 01:30 被判成「上班前、已赚 0」，
 * 整夜只算 22:00–24:00 两个小时。
 */
function clockOf(now: Date, c: SalaryConfig) {
  const { s, e } = shiftOf(c)
  const overnight = e > 24 * 60
  const raw = nowMinutes(now)
  const tail = overnight && raw < e - 24 * 60
  return { s, e, overnight, tail, t: raw - s + (tail ? 24 * 60 : 0) }
}

/** 这一班是哪一天开的（夜班 = 昨天开的那一班，一直到今晚开工前都算它） */
function shiftDate(now: Date, c: SalaryConfig): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const { s, overnight } = clockOf(now, c)
  // 夜班在上班时间之前（凌晨的尾巴 + 白天那一段）都属于昨晚开的那一班；
  // 这样同一班从头到尾都记在同一天，跨零点的瞬间不会忽然少算一天。
  if (overnight && nowMinutes(now) < s) d.setDate(d.getDate() - 1)
  return d
}

/** 从上班到 t 之间，真正在工作（已扣掉休息）的分钟数 */
function workedMinutes(c: SalaryConfig, t: number): number {
  const { s, lunch, dinner } = timeline(c)
  const clipped = [lunch, dinner]
    .filter((x): x is Span => Boolean(x))
    .map((x) => ({ from: Math.max(x.from, s), to: Math.min(x.to, t) }))
    .filter((x) => x.to > x.from)
  return Math.max(0, t - s - unionMinutes(clipped))
}

export function startOf(now: Date, c: SalaryConfig): Date {
  const d = shiftDate(now, c)
  d.setMinutes(shiftOf(c).s)
  return d
}

export function endOf(now: Date, c: SalaryConfig): Date {
  const d = shiftDate(now, c)
  d.setMinutes(shiftOf(c).e)
  return d
}

export function phaseAt(now: Date, c: SalaryConfig): Phase {
  const { s, e, overnight, t } = clockOf(now, c)
  const { lunch, dinner } = timeline(c)
  // 夜班白天那段算「下班后」（昨夜那班已经收工），不能算「上班前」——
  // 否则这 16 小时里既看不到赚到的钱，也永远到不了「已结清」。
  if (t < 0) return overnight ? 'after' : 'before'
  const at = s + t
  if (at >= e) return 'after'
  if (lunch && at >= lunch.from && at < lunch.to) return 'lunch'
  if (dinner && at >= dinner.from && at < dinner.to) return 'dinner'
  return 'working'
}

/** 今日已赚：按净工作秒数累加，休息期间不涨 */
export function earnedAt(now: Date, c: SalaryConfig): number {
  const { s, e, work } = timeline(c)
  const { overnight, t } = clockOf(now, c)
  // 夜班白天：这一班已经收工，按满勤算
  const at = overnight && t < 0 ? e : Math.min(Math.max(s + t, s), e)
  const earned = (workedMinutes(c, at) * 60 * dailySalary(c, now)) / (work * 60)
  return Math.min(Math.max(0, earned), dailySalary(c, now))
}

export function progressOf(now: Date, c: SalaryConfig): number {
  const { s, e, work } = timeline(c)
  const { overnight, t } = clockOf(now, c)
  const at = overnight && t < 0 ? e : Math.min(Math.max(s + t, s), e)
  return Math.min(1, Math.max(0, workedMinutes(c, at) / work))
}

export function remainingSeconds(now: Date, c: SalaryConfig): number {
  return Math.max(0, (1 - progressOf(now, c)) * workSeconds(c))
}

export function fmtMoney(v: number, decimals = 4): string {
  const n = Number.isFinite(v) ? v : 0
  const fixed = Math.abs(n).toFixed(Math.max(0, decimals))
  const [int, dec] = fixed.split('.')
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (n < 0 ? '-' : '') + withSep + (dec ? '.' + dec : '')
}

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h} 小时 ${m} 分`
  return `${m} 分`
}

export function clampConfig(c: SalaryConfig): SalaryConfig {
  const monthly = Number.isFinite(c.monthly) ? Math.max(0, Math.min(9_999_999, c.monthly)) : 0
  const hm = (v: string, fallback: string) =>
    /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fallback
  const payDays =
    c.payDays === null || !Number.isFinite(c.payDays)
      ? null
      : Math.max(1, Math.min(31, Math.round(c.payDays)))
  return {
    monthly,
    start: hm(c.start, '09:00'),
    end: hm(c.end, '18:00'),
    lunchOn: c.lunchOn !== false,
    lunchStart: hm(c.lunchStart, '12:00'),
    lunchEnd: hm(c.lunchEnd, '13:00'),
    dinnerOn: c.dinnerOn === true,
    dinnerStart: hm(c.dinnerStart, '18:00'),
    dinnerEnd: hm(c.dinnerEnd, '18:30'),
    payDays,
    workDays: Array.isArray(c.workDays)
      ? [...new Set(c.workDays.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort()
      : null,
  }
}

/**
 * 休息开着却落在班次外（或起止相同）时，把它挪进班次里。
 * 用来兜住老数据：默认晚休 18:00–18:30 撞上 18:00 下班，开着也永远"没生效"。
 */
export function repairBreaks(c: SalaryConfig): SalaryConfig {
  const out = { ...c }
  const fit = (id: BreakId) => {
    const onKey = id === 'lunch' ? 'lunchOn' : 'dinnerOn'
    if (!out[onKey]) return
    if (breakInfo(out, id).span) return
    const { s, e } = timeline(out)
    const len = id === 'lunch' ? 60 : 40
    const from = id === 'lunch' ? s + 4 * 60 : Math.max(s + len, e - len - 10)
    const to = Math.min(e, from + len)
    if (to - from < 10) return
    const hm = (min: number) => {
      const v = ((Math.round(min) % 1440) + 1440) % 1440
      return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
    }
    if (id === 'lunch') {
      out.lunchStart = hm(from)
      out.lunchEnd = hm(to)
    } else {
      out.dinnerStart = hm(from)
      out.dinnerEnd = hm(to)
    }
  }
  fit('lunch')
  fit('dinner')
  return out
}
