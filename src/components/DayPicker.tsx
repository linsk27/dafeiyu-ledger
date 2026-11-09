import { useMemo, useState } from 'react'
import { isoDate, monthWorkdays } from '../lib/salary'

interface Props {
  /** 选中的日期（YYYY-MM-DD） */
  value: string[]
  onChange: (days: string[]) => void
}

const WEEK = ['一', '二', '三', '四', '五', '六', '日']

/**
 * 手动计薪日：一个月历，点哪天算哪天。
 * 默认按「周一~周五」预选，所以调休补班点一下、法定节假日再点一下就改好了。
 */
export function DayPicker({ value, onChange }: Props) {
  const today = new Date()
  const [ym, setYm] = useState(() => {
    const first = value[0] ? new Date(`${value[0]}T00:00:00`) : today
    return { y: first.getFullYear(), m: first.getMonth() }
  })

  const picked = useMemo(() => new Set(value), [value])

  const cells = useMemo(() => {
    const total = new Date(ym.y, ym.m + 1, 0).getDate()
    // 周一为一周第一天
    const lead = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7
    const list: (string | null)[] = Array.from({ length: lead }, () => null)
    for (let d = 1; d <= total; d += 1) list.push(isoDate(new Date(ym.y, ym.m, d)))
    while (list.length % 7 !== 0) list.push(null)
    return list
  }, [ym])

  const monthDays = useMemo(() => monthWorkdays(ym.y, ym.m), [ym])
  // 计数按「这个月选中的全部日子」算，包括手动补上来的周末
  const monthPrefix = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}`
  const inThisMonth = value.filter((d) => d.startsWith(monthPrefix)).length

  const shiftMonth = (delta: number) => {
    const d = new Date(ym.y, ym.m + delta, 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
  }

  const toggle = (iso: string) => {
    const next = new Set(picked)
    if (next.has(iso)) next.delete(iso)
    else next.add(iso)
    onChange([...next].sort())
  }

  /** 只改当前月，别把其它月选的清掉 */
  const setMonthSelection = (days: string[]) => {
    const keep = value.filter((d) => !d.startsWith(monthPrefix))
    onChange([...keep, ...days].sort())
  }

  const todayIso = isoDate(today)

  return (
    <div className="dayPick">
      <div className="dayPick__head">
        <button type="button" className="dayPick__nav" onClick={() => shiftMonth(-1)} aria-label="上个月">
          ‹
        </button>
        <b className="dayPick__month">
          {ym.y} 年 {ym.m + 1} 月
        </b>
        <button type="button" className="dayPick__nav" onClick={() => shiftMonth(1)} aria-label="下个月">
          ›
        </button>
        <span className="dayPick__count">本月已选 {inThisMonth} 天</span>
      </div>

      <div className="dayPick__week">
        {WEEK.map((w) => (
          <span key={w} className={w === '六' || w === '日' ? 'is-weekend' : ''}>
            {w}
          </span>
        ))}
      </div>

      <div className="dayPick__grid">
        {cells.map((iso, i) => {
          if (!iso) return <span key={`x${i}`} className="dayPick__blank" />
          const day = Number(iso.slice(-2))
          const on = picked.has(iso)
          const isWeekend = !monthDays.includes(iso)
          return (
            <button
              key={iso}
              type="button"
              className={[
                'dayPick__day',
                on ? 'is-on' : '',
                isWeekend ? 'is-weekend' : '',
                iso === todayIso ? 'is-today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => toggle(iso)}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="dayPick__actions">
        <button type="button" onClick={() => setMonthSelection(monthDays)}>
          只选工作日
        </button>
        <button
          type="button"
          onClick={() => {
            const total = new Date(ym.y, ym.m + 1, 0).getDate()
            setMonthSelection(
              Array.from({ length: total }, (_, i) => isoDate(new Date(ym.y, ym.m, i + 1))),
            )
          }}
        >
          全选本月
        </button>
        <button type="button" onClick={() => setMonthSelection([])}>
          清空本月
        </button>
      </div>

      <p className="dayPick__tip">法定节假日点掉、调休补班的周六点上来，天数据此重算。</p>
    </div>
  )
}
