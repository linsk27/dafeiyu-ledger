import { useMemo } from 'react'
import { isoDate, monthWorkdays } from '../lib/salary'

interface Props {
  /** 选中的日期（YYYY-MM-DD），固定落在当前这一个月 */
  value: string[]
  onChange: (days: string[]) => void
}

const WEEK = ['一', '二', '三', '四', '五', '六', '日']

/**
 * 手动计薪日：只画「本月」这一张月历，点哪天算哪天。
 *
 * 不做跨月：计薪天数是「月薪 ÷ 这个数」，跨月累加会把日薪摊薄，
 * 而且会让同一个数字既像 11 月又像 12 月。要改月份就等下个月自动切。
 */
export function DayPicker({ value, onChange }: Props) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  const monthDays = useMemo(() => monthWorkdays(year, month), [year, month])
  const picked = useMemo(() => new Set(value), [value])

  const cells = useMemo(() => {
    const total = new Date(year, month + 1, 0).getDate()
    const lead = (new Date(year, month, 1).getDay() + 6) % 7 // 周一为第一列
    const list: (string | null)[] = Array.from({ length: lead }, () => null)
    for (let d = 1; d <= total; d += 1) list.push(isoDate(new Date(year, month, d)))
    while (list.length % 7 !== 0) list.push(null)
    return list
  }, [year, month])

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
        <b className="dayPick__month">
          {year} 年 {month + 1} 月
        </b>
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
            const total = new Date(year, month + 1, 0).getDate()
            onChange(
              Array.from({ length: total }, (_, i) => isoDate(new Date(year, month, i + 1))),
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
        法定节假日点掉、调休补班的周六点上来；这里只算本月，跨月会把日薪摊薄。
      </p>
    </div>
  )
}
