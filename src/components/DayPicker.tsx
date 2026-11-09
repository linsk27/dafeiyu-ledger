import { useMemo, useState } from 'react'
import { isoDate, monthWorkdays } from '../lib/salary'

interface Props {
  /** 选中的日期（YYYY-MM-DD），固定落在一个月内 */
  value: string[]
  onChange: (days: string[]) => void
}

const WEEK = ['一', '二', '三', '四', '五', '六', '日']

/**
 * 手动计薪日：月历，点哪天算哪天。
 * 计薪天数是「月薪 ÷ 这个数」，所以只认一个月，不跨月累加；
 * 换月时按新月份的周一~周五重新预选，再手动改差异。
 */
export function DayPicker({ value, onChange }: Props) {
  const today = new Date()
  const [view, setView] = useState(() => {
    const first = value[0] ? new Date(`${value[0]}T00:00:00`) : today
    return { y: first.getFullYear(), m: first.getMonth() }
  })

  const monthDays = useMemo(() => monthWorkdays(view.y, view.m), [view])
  const picked = useMemo(() => new Set(value), [value])

  const cells = useMemo(() => {
    const total = new Date(view.y, view.m + 1, 0).getDate()
    const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7 // 周一为第一列
    const list: (string | null)[] = Array.from({ length: lead }, () => null)
    for (let d = 1; d <= total; d += 1) list.push(isoDate(new Date(view.y, view.m, d)))
    while (list.length % 7 !== 0) list.push(null)
    return list
  }, [view])

  const shiftMonth = (delta: number) => {
    const next = new Date(view.y, view.m + delta, 1)
    const ym = { y: next.getFullYear(), m: next.getMonth() }
    setView(ym)
    // 换月就不跨月累加，直接按新月份的周一~周五重新预选
    onChange(monthWorkdays(ym.y, ym.m))
  }

  const toggle = (iso: string) => {
    const next = new Set(picked)
    if (next.has(iso)) next.delete(iso)
    else next.add(iso)
    onChange([...next].sort())
  }

  const todayIso = isoDate(today)

  return (
    <div className="dayPick">
      <div className="dayPick__head">
        <button type="button" className="dayPick__nav" onClick={() => shiftMonth(-1)} aria-label="上个月">
          ‹
        </button>
        <b className="dayPick__month">
          {view.y} 年 {view.m + 1} 月
        </b>
        <button type="button" className="dayPick__nav" onClick={() => shiftMonth(1)} aria-label="下个月">
          ›
        </button>
        <span className="dayPick__count">已选 {value.length} 天</span>
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
          const weekend = !monthDays.includes(iso)
          return (
            <button
              key={iso}
              type="button"
              className={[
                'dayPick__day',
                picked.has(iso) ? 'is-on' : '',
                weekend ? 'is-weekend' : '',
                iso === todayIso ? 'is-today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => toggle(iso)}
            >
              {Number(iso.slice(-2))}
            </button>
          )
        })}
      </div>

      <div className="dayPick__actions">
        <button type="button" onClick={() => onChange(monthDays)}>
          只选工作日
        </button>
        <button
          type="button"
          onClick={() => {
            const total = new Date(view.y, view.m + 1, 0).getDate()
            onChange(
              Array.from({ length: total }, (_, i) => isoDate(new Date(view.y, view.m, i + 1))),
            )
          }}
        >
          全选本月
        </button>
        <button type="button" onClick={() => onChange([])}>
          清空
        </button>
      </div>

      <p className="dayPick__tip">
        法定节假日点掉、调休补班的周六点上来；换月会按新月份的工作日重新预选。
      </p>
    </div>
  )
}
