import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SparkIcon, WalletIcon } from '../components/Icons'
import { TimeField } from '../components/TimeField'
import {
  clampConfig,
  dailySalary,
  fmtMoney,
  payDaysAuto,
  payDaysOf,
  perHour,
  perSecond,
  timeline,
  workSeconds,
  type SalaryConfig,
} from '../lib/salary'

interface Props {
  config: SalaryConfig
  onSave: (c: SalaryConfig) => void
}

const START_PRESETS = ['08:30', '09:00', '09:30', '10:00']
const END_PRESETS = ['17:30', '18:00', '18:30', '19:00']
const LUNCH_START_PRESETS = ['11:30', '12:00', '12:30']
const LUNCH_END_PRESETS = ['13:00', '13:30', '14:00']

export function SalaryPage({ config, onSave }: Props) {
  const [draft, setDraft] = useState<SalaryConfig>(config)
  const now = new Date()

  const auto = payDaysAuto(now)
  const tl = timeline(draft)

  const preview = useMemo(() => {
    const c = clampConfig(draft)
    return {
      daily: dailySalary(c, now),
      hourly: perHour(c, now),
      second: perSecond(c, now),
      hours: workSeconds(c) / 3600,
      lunch: timeline(c).lunch,
      payDays: payDaysOf(c, now),
    }
  }, [draft, now])

  const update = <K extends keyof SalaryConfig>(key: K, value: SalaryConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const lunchInvalid = tl.lunch === 0
  const lunchOutside = tl.lunch > 0 && (tl.ls < tl.s || tl.le > tl.e)

  return (
    <div className="page page--salary">
      <header className="pageHead">
        <div>
          <h1 className="pageTitle">薪资管理</h1>
          <p className="pageSub">填月薪和上下班时间，日薪、时薪、每秒都由账本自己算</p>
        </div>
        <span className="chip chip--neutral">
          <WalletIcon width={14} height={14} />
          本地保存
        </span>
      </header>

      <div className="salaryGrid">
        <motion.section
          className="card card--form"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
        >
          <div className="card__head card__head--row">
            <div>
              <h2 className="card__title">工资设置</h2>
              <p className="card__hint">月薪、上下班、午休，填完就够</p>
            </div>
            <span className="card__badge">
              <span className="card__badgeDot" />
              自动折算
            </span>
          </div>

          <div className="formGrid">
            <div className="field">
              <label className="field__label" htmlFor="monthly">
                月薪
              </label>
              <div className="input input--money">
                <span className="input__prefix">¥</span>
                <input
                  id="monthly"
                  type="number"
                  min={0}
                  step={500}
                  value={Number.isFinite(draft.monthly) ? draft.monthly : 0}
                  onChange={(e) => update('monthly', Number(e.target.value))}
                />
                <span className="input__suffix">元 / 月</span>
              </div>
            </div>

            <div className="field">
              <span className="field__label">计薪天数</span>
              <div className="input input--combine">
                {draft.payDays === null ? (
                  <b className="numeric input__value">{auto}</b>
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={31}
                    step={1}
                    value={draft.payDays}
                    onChange={(e) => update('payDays', Number(e.target.value))}
                  />
                )}
                <span className="input__suffix">天 / 月</span>
                <div className="segmented segmented--xs">
                  <button
                    type="button"
                    className={draft.payDays === null ? 'is-on' : ''}
                    onClick={() => update('payDays', null)}
                  >
                    自动
                  </button>
                  <button
                    type="button"
                    className={draft.payDays !== null ? 'is-on' : ''}
                    onClick={() => update('payDays', draft.payDays ?? auto)}
                  >
                    手动
                  </button>
                </div>
              </div>
            </div>

            <TimeField
              label="上班时间"
              value={draft.start}
              onChange={(v) => update('start', v)}
              presets={START_PRESETS}
            />
            <TimeField
              label="下班时间"
              value={draft.end}
              onChange={(v) => update('end', v)}
              presets={END_PRESETS}
            />
            <TimeField
              label="午休开始"
              value={draft.lunchStart}
              onChange={(v) => update('lunchStart', v)}
              presets={LUNCH_START_PRESETS}
              hint="不计薪"
            />
            <TimeField
              label="午休结束"
              value={draft.lunchEnd}
              onChange={(v) => update('lunchEnd', v)}
              presets={LUNCH_END_PRESETS}
            />
          </div>

          {(lunchInvalid || lunchOutside) && (
            <p className="formWarn">
              {lunchInvalid
                ? '午休起止时间相同或顺序反了，按「没有午休」计算。'
                : '午休有部分落在上下班时间之外，只扣落在班内的那一段。'}
            </p>
          )}

          <div className="formFoot">
            <button
              className="btn btn--primary"
              type="button"
              onClick={() => onSave(clampConfig(draft))}
            >
              保存设置
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => setDraft(config)}>
              还原
            </button>
            <span className="formFoot__sum">
              折合 <b className="numeric">¥{fmtMoney(preview.daily, 0)}</b> / 天 · 净工时{' '}
              {(tl.work / 60).toFixed(1)} h
            </span>
          </div>
        </motion.section>

        <motion.aside
          className="card card--receipt"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, type: 'spring', stiffness: 200, damping: 26 }}
        >
          <div className="receipt__head">
            <span className="receipt__title">算一算</span>
            <span className="receipt__live">
              <i />
              实时
            </span>
          </div>

          <div className="receipt__hero">
            <span className="receipt__heroLabel">每秒进账</span>
            <div className="receipt__heroValue numeric">¥{preview.second.toFixed(6)}</div>
            <img src="/assets/fish-rich.webp" alt="" className="receipt__fish" />
          </div>

          <ul className="receipt__rows">
            <li>
              <span>每天工资</span>
              <b className="numeric">¥{fmtMoney(preview.daily, 2)}</b>
            </li>
            <li>
              <span>时薪</span>
              <b className="numeric">¥{fmtMoney(preview.hourly, 2)}</b>
            </li>
            <li>
              <span>净工时（已扣午休）</span>
              <b className="numeric">{preview.hours.toFixed(1)} 小时</b>
            </li>
            <li>
              <span>午休时长</span>
              <b className="numeric">{preview.lunch.toFixed(0)} 分钟</b>
            </li>
          </ul>

          <p className="receipt__formula">
            <SparkIcon width={13} height={13} />
            每秒 = 月薪 ÷ {preview.payDays} 天 ÷（班次 − 午休）秒数
          </p>
        </motion.aside>
      </div>
    </div>
  )
}
