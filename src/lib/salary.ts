export interface SalaryConfig {
  /** 月薪 */
  monthly: number
  /** 上班时间 HH:MM */
  start: string
  /** 下班时间 HH:MM */
  end: string
  /** 午休开始 HH:MM */
  lunchStart: string
  /** 午休结束 HH:MM */
  lunchEnd: string
  /** 计薪天数；null = 按当月工作日自动算 */
  payDays: number | null
}

export const DEFAULT_CONFIG: SalaryConfig = {
  monthly: 7000,
  start: '09:00',
  end: '18:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  payDays: null,
}

export type Phase = 'before' | 'working' | 'lunch' | 'after'

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

export function payDaysOf(c: SalaryConfig, now: Date): number {
  return c.payDays && c.payDays > 0 ? c.payDays : payDaysAuto(now)
}

export function dailySalary(c: SalaryConfig, now: Date): number {
  const m = Number.isFinite(c.monthly) ? Math.max(0, c.monthly) : 0
  return m / payDaysOf(c, now)
}

/** 一天的时间轴（分钟，跨零点自动接续） */
export function timeline(c: SalaryConfig) {
  const s = minutesOf(c.start)
  let e = minutesOf(c.end)
  if (e <= s) e += 24 * 60
  let ls = minutesOf(c.lunchStart)
  let le = minutesOf(c.lunchEnd)
  if (le <= ls) {
    ls = 0
    le = 0
  }
  const lunch = Math.max(0, Math.min(e, le) - Math.max(s, ls))
  const gross = e - s
  return { s, e, ls, le, lunch, gross, work: Math.max(60, gross - lunch) }
}

/** 净工作秒数（已扣午休） */
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

export function startOf(now: Date, c: SalaryConfig): Date {
  const { s } = timeline(c)
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setMinutes(s)
  return d
}

export function endOf(now: Date, c: SalaryConfig): Date {
  const { e } = timeline(c)
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setMinutes(e)
  return d
}

export function phaseAt(now: Date, c: SalaryConfig): Phase {
  const { s, e, ls, le } = timeline(c)
  const t = nowMinutes(now)
  if (t < s) return 'before'
  if (t >= e) return 'after'
  if (le > ls && t >= ls && t < le) return 'lunch'
  return 'working'
}

/** 今日已赚：按净工作秒数累加，午休期间不涨 */
export function earnedAt(now: Date, c: SalaryConfig): number {
  const { s, e, ls, le, work } = timeline(c)
  const t = Math.min(Math.max(nowMinutes(now), s), e)
  let minutes = t - s
  if (le > ls) minutes -= Math.max(0, Math.min(t, le) - Math.max(s, ls))
  const earned = (Math.max(0, minutes) * 60 * dailySalary(c, now)) / (work * 60)
  return Math.min(earned, dailySalary(c, now))
}

export function progressOf(now: Date, c: SalaryConfig): number {
  const { s, e, ls, le, work } = timeline(c)
  const t = Math.min(Math.max(nowMinutes(now), s), e)
  let minutes = t - s
  if (le > ls) minutes -= Math.max(0, Math.min(t, le) - Math.max(s, ls))
  return Math.min(1, Math.max(0, minutes / work))
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
    lunchStart: hm(c.lunchStart, '12:00'),
    lunchEnd: hm(c.lunchEnd, '13:00'),
    payDays,
  }
}
