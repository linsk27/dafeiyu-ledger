import { clampConfig, DEFAULT_CONFIG, type SalaryConfig } from './salary'

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

/** 没存过（也没有 v1 可迁移）时返回 null —— 用来区分「首次进入」 */
export function loadConfig(): SalaryConfig | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      return clampConfig({ ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<SalaryConfig>) })
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
