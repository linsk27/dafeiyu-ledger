import {
  clampConfig,
  DEFAULT_CONFIG,
  minutesOf,
  monthWorkdays,
  repairBreaks,
  type SalaryConfig,
} from './salary'

const KEY = 'dafeiyu-ledger:v2'
const LEGACY = 'dafeiyu-ledger:v1'

/** 把 v1（日薪/月薪 + 金额 + 每月工作日）迁移到 v2（月薪 + 午休 + 自动计薪天数） */
function migrate(): SalaryConfig | null {
  try {
    const raw = localStorage.getItem(LEGACY)
    if (!raw) return null
    const old = JSON.parse(raw) as {
      mode?: 'day' | 'month'
      amount?: number
      workDays?: number
      start?: string
      end?: string
    }
    const amount = Number.isFinite(old.amount) ? Number(old.amount) : DEFAULT_CONFIG.monthly
    return clampConfig({
      ...DEFAULT_CONFIG,
      monthly: old.mode === 'day' ? amount * (old.workDays || 22) : amount,
      start: old.start || DEFAULT_CONFIG.start,
      end: old.end || DEFAULT_CONFIG.end,
      payDays: old.mode === 'day' ? old.workDays || 22 : null,
    })
  } catch {
    return null
  }
}

/**
 * 没存过（也没有 v1 可迁移）时返回 null —— 用来区分「首次进入」。
 *
 * 老版本只有午休、没有开关：迁移时如果起止相同（当时表示「没有午休」），
 * 就把午休开关关掉，而不是弹一条「时间顺序反了」的红字。
 */
export function loadConfig(): SalaryConfig | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<SalaryConfig>
      const merged = { ...DEFAULT_CONFIG, ...saved }
      if (!('lunchOn' in saved)) {
        merged.lunchOn = minutesOf(merged.lunchEnd) !== minutesOf(merged.lunchStart)
      }
      if (!('dinnerOn' in saved)) merged.dinnerOn = false

      // 手动挑的日期只对当月有效：跨月了就按本月工作日重算，
      // 免得十一月的 21 天被拿来当十二月的分母
      if (merged.workDays && merged.workDays.length > 0) {
        const now = new Date()
        const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        if (!merged.workDays.some((d) => d.startsWith(prefix))) {
          merged.workDays = monthWorkdays(now.getFullYear(), now.getMonth())
        }
      }
      const fixed = repairBreaks(clampConfig(merged))
      // 修过的（休息从越界位置挪进班次）顺手写回去，别每次启动都重算
      if (JSON.stringify(fixed) !== JSON.stringify(clampConfig(merged))) {
        try {
          localStorage.setItem(KEY, JSON.stringify(fixed))
        } catch {
          /* 存不进去也不影响这次使用 */
        }
      }
      return fixed
    }
    const migrated = migrate()
    if (migrated) return migrated
  } catch {
    /* 解析失败当成没设置过 */
  }
  return null
}

export function saveConfig(c: SalaryConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(clampConfig(c)))
  } catch {
    /* 隐私模式下忽略 */
  }
}
