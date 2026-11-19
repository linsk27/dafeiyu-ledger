import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { fmtMoney } from '../lib/salary'

interface Pop {
  id: number
  delta: number
  x: number
  rot: number
}

interface Props {
  value: number
  active: boolean
  caption?: string
}

/** 飘字活多久：CSS 里 .pop 的动画时长减 50ms，动画播完就把它摘掉 */
const POP_MS = 1550

export function MoneyCounter({ value, active, caption }: Props) {
  const prev = useRef(value)
  const [pops, setPops] = useState<Pop[]>([])
  const [flash, setFlash] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t))
      timers.current = []
    }
  }, [])

  useEffect(() => {
    const delta = value - prev.current
    prev.current = value
    if (!active || delta <= 0) return
    // 后台标签页 rAF 会停，动画收敛不了，飘字只会在 DOM 里越堆越多
    if (document.hidden) return

    const pop: Pop = {
      id: Date.now() + Math.random(),
      delta,
      x: (Math.random() - 0.5) * 132,
      rot: (Math.random() - 0.5) * 14,
    }
    setPops((list) => [...list.slice(-4), pop])
    // 以前靠 onAnimationComplete 收尾，现在动画在 CSS 里，用定时器对时
    const kill = window.setTimeout(() => {
      setPops((list) => list.filter((it) => it.id !== pop.id))
      timers.current = timers.current.filter((t) => t !== kill)
    }, POP_MS)
    timers.current.push(kill)

    setFlash(true)
    const t = window.setTimeout(() => setFlash(false), 280)
    return () => window.clearTimeout(t)
  }, [value, active])

  return (
    <div className={`money${flash ? ' is-flash' : ''}`}>
      <div className="money__glow" />

      <div className="money__pops" aria-hidden>
        {pops.map((p) => (
          <span
            key={p.id}
            className="pop numeric"
            style={{ '--pop-x': `${p.x}px`, '--pop-rot': `${p.rot}deg` } as CSSProperties}
          >
            +{p.delta.toFixed(4)}
          </span>
        ))}
      </div>

      <div className="money__label">
        <span className="money__dot" />
        今日已赚
      </div>

      <div className="money__value">
        <span className="money__unit">¥</span>
        <span className="numeric">{fmtMoney(value)}</span>
      </div>

      {caption && <div className="money__caption">{caption}</div>}
    </div>
  )
}
