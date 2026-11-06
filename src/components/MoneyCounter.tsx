import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

export function MoneyCounter({ value, active, caption }: Props) {
  const prev = useRef(value)
  const [pops, setPops] = useState<Pop[]>([])
  const [flash, setFlash] = useState(false)

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
    setFlash(true)
    const t = window.setTimeout(() => setFlash(false), 280)
    return () => window.clearTimeout(t)
  }, [value, active])

  return (
    <div className={`money${flash ? ' is-flash' : ''}`}>
      <div className="money__glow" />

      <div className="money__pops" aria-hidden>
        <AnimatePresence>
          {pops.map((p) => (
            <motion.span
              key={p.id}
              className="pop numeric"
              initial={{ opacity: 0, y: 6, x: p.x, scale: 0.6, rotate: 0 }}
              animate={{ opacity: 1, y: -30, scale: 1, rotate: p.rot }}
              exit={{ opacity: 0, y: -44, scale: 0.9 }}
              transition={{ duration: 1.25, ease: 'easeOut' }}
              onAnimationComplete={() => setPops((list) => list.filter((it) => it.id !== p.id))}
            >
              +{p.delta.toFixed(4)}
            </motion.span>
          ))}
        </AnimatePresence>
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
