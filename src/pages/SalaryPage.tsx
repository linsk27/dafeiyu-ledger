import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SparkIcon, WalletIcon } from '../components/Icons'
import { DayPicker } from '../components/DayPicker'
import { TimeField } from '../components/TimeField'
import {
  breakInfo,
  clampConfig,
  dailySalary,
  fmtMoney,
  monthWorkdays,
  payDaysOf,
  perHour,
  timeline,
  perSecond,
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
const DINNER_START_PRESETS = ['17:30', '18:00', '18:30']
const DINNER_END_PRESETS = ['18:30', '19:00', '19:30']

export function SalaryPage({ config, onSave }: Props) {
  const [draft, setDraft] = useState<SalaryConfig>(config)
  const now = new Date()


  const preview = useMemo(() => {
    const c = clampConfig(draft)
    return {
      daily: dailySalary(c, now),
      hourly: perHour(c, now),
      second: perSecond(c, now),
      hours: workSeconds(c) / 3600,
      lunch: breakInfo(c, 'lunch').span
        ? (breakInfo(c, 'lunch').span!.to - breakInfo(c, 'lunch').span!.from)
        : 0,
      dinner: breakInfo(c, 'dinner').span
        ? (breakInfo(c, 'dinner').span!.to - breakInfo(c, 'dinner').span!.from)
        : 0,
      payDays: payDaysOf(c, now),
    }
  }, [draft, now])

  const update = <K extends keyof SalaryConfig>(key: K, value: SalaryConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const lunch = breakInfo(draft, 'lunch')
  const dinner = breakInfo(draft, 'dinner')

  /** 分钟数 → HH:MM（跨零点的用 % 落回 0–1439） */
  const hm = (min: number) => {
    const v = ((Math.round(min) % 1440) + 1440) % 1440
    return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
  }

  /**
   * 打开休息开关时，如果当前时间落在班次外（默认 18:00–18:30 撞上 18:00 下班很常见），
   * 直接把它挪进班次里，别让用户开了开关还是灰的。
   */
  const toggleBreak = (id: 'lunch' | 'dinner') => {
    const onKey = id === 'lunch' ? 'lunchOn' : 'dinnerOn'
    if (draft[onKey]) {
      update(onKey, false)
      return
    }
    const probe = breakInfo({ ...draft, [onKey]: true } as SalaryConfig, id)
    if (probe.span) {
      update(onKey, true)
      return
    }
    const { s: st, e } = timeline(draft)
    const len = id === 'lunch' ? 60 : 40
    const from = id === 'lunch' ? st + 4 * 60 : e - len - 10
    const to = from + len
    setDraft((d) => ({
      ...d,
      [onKey]: true,
      [id === 'lunch' ? 'lunchStart' : 'dinnerStart']: hm(from),
      [id === 'lunch' ? 'lunchEnd' : 'dinnerEnd']: hm(to),
    }))
  }
  const lunchMinutes = lunch.span ? lunch.span.to - lunch.span.from : 0
  const dinnerMinutes = dinner.span ? dinner.span.to - dinner.span.from : 0

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
                <b className="numeric input__value">{preview.payDays}</b>
                <span className="input__suffix">天 / 月</span>
                <div className="segmented segmented--xs">
                  <button
                    type="button"
                    className={draft.workDays === null ? 'is-on' : ''}
                    onClick={() => {
                      update('workDays', null)
                      update('payDays', null)
                    }}
                  >
                    自动
                  </button>
                  <button
                    type="button"
                    className={draft.workDays !== null ? 'is-on' : ''}
                    onClick={() => {
                      if (draft.workDays) return
                      const now2 = new Date()
                      update('workDays', monthWorkdays(now2.getFullYear(), now2.getMonth()))
                      update('payDays', null)
                    }}
                  >
                    手动
                  </button>
                </div>
              </div>
              {draft.workDays === null ? (
                <span className="field__note">当月周一至周五，{preview.payDays} 天</span>
              ) : (
                <span className="field__note">按日历勾，只算这一个月</span>
              )}
            </div>

            {draft.workDays !== null && (
              <DayPicker
                value={draft.workDays}
                onChange={(days) => update('workDays', days)}
              />
            )}

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
            <BreakHead
              title="午休"
              note={lunch.on ? (lunch.invalid ? '起止一样' : `${lunchMinutes} 分钟`) : '没有午休'}
              on={draft.lunchOn}
              onToggle={() => toggleBreak('lunch')}
            />
            <TimeField
              label="午休开始"
              value={draft.lunchStart}
              onChange={(v) => update('lunchStart', v)}
              presets={LUNCH_START_PRESETS}
              hint={draft.lunchOn ? '不计薪' : undefined}
              disabled={!draft.lunchOn}
            />
            <TimeField
              label="午休结束"
              value={draft.lunchEnd}
              onChange={(v) => update('lunchEnd', v)}
              presets={LUNCH_END_PRESETS}
              disabled={!draft.lunchOn}
            />
            {lunch.on && (lunch.invalid || lunch.outside) && (
              <p className="formWarn">
                {lunch.invalid
                  ? '午休起止时间一样，先按「没有午休」算。'
                  : '午休有一段在上下班之外，只扣班内那一段。'}
              </p>
            )}

            <BreakHead
              title="晚休"
              note={dinner.on ? (dinner.invalid ? '起止一样' : `${dinnerMinutes} 分钟`) : '没有晚休'}
              on={draft.dinnerOn}
              onToggle={() => toggleBreak('dinner')}
            />
            <TimeField
              label="晚休开始"
              value={draft.dinnerStart}
              onChange={(v) => update('dinnerStart', v)}
              presets={DINNER_START_PRESETS}
              hint={draft.dinnerOn ? '不计薪' : undefined}
              disabled={!draft.dinnerOn}
            />
            <TimeField
              label="晚休结束"
              value={draft.dinnerEnd}
              onChange={(v) => update('dinnerEnd', v)}
              presets={DINNER_END_PRESETS}
              disabled={!draft.dinnerOn}
            />
            {dinner.on && (dinner.invalid || dinner.outside) && (
              <p className="formWarn">
                {dinner.invalid
                  ? '晚休起止时间一样，先按「没有晚休」算。'
                  : '晚休有一段在上下班之外，只扣班内那一段。'}
              </p>
            )}
          </div>

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
              {preview.hours.toFixed(1)} h
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
              <span>计薪天数</span>
              <b className="numeric">
                {preview.payDays} 天
                {draft.workDays === null ? '（自动）' : ''}
              </b>
            </li>
            <li>
              <span>每天工资</span>
              <b className="numeric">¥{fmtMoney(preview.daily, 2)}</b>
            </li>
            <li>
              <span>时薪</span>
              <b className="numeric">¥{fmtMoney(preview.hourly, 2)}</b>
            </li>
            <li>
              <span>净工时（已扣休息）</span>
              <b className="numeric">{preview.hours.toFixed(1)} 小时</b>
            </li>
            <li>
              <span>午休</span>
              <b className="numeric">{preview.lunch ? `${preview.lunch} 分钟` : '没有'}</b>
            </li>
            <li>
              <span>晚休</span>
              <b className="numeric">{preview.dinner ? `${preview.dinner} 分钟` : '没有'}</b>
            </li>
          </ul>

          <p className="receipt__formula">
            <SparkIcon width={13} height={13} />
            每秒 = 月薪 ÷ {preview.payDays} 天 ÷（班次 − 休息）秒数
          </p>
        </motion.aside>
      </div>
    </div>
  )
}

/** 一段休息的小标题 + 开关（没有这段休息的人直接关掉） */
function BreakHead({
  title,
  note,
  on,
  onToggle,
}: {
  title: string
  note: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div className="breakHead">
      <span className="breakHead__title">{title}</span>
      <span className={`breakHead__note${on ? '' : ' is-off'}`}>{note}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${on ? '关闭' : '打开'}${title}`}
        className={`switch${on ? ' is-on' : ''}`}
        onClick={onToggle}
      >
        <span className="switch__dot" />
      </button>
    </div>
  )
}
