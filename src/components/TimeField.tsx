import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ClockIcon } from './Icons'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

const PANEL_HEIGHT = 200

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  presets?: string[]
  hint?: string
  /** 关闭状态：变灰、点不开 */
  disabled?: boolean
}

export function TimeField({ label, value, onChange, presets, hint, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const hourRef = useRef<HTMLDivElement>(null)

  const [hh, mm] = value.split(':')

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // 展开方向在点击时就算好，避免先向下渲染一帧再翻上去（那一下就是“抽搐”）
  const toggle = () => {
    if (disabled) return
    if (open) {
      setOpen(false)
      return
    }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      const below = window.innerHeight - rect.bottom
      const above = rect.top
      setUp(below < PANEL_HEIGHT && above > below)
    }
    setOpen(true)
  }

  // 滚动定位放在 layout 阶段，绘制前就把小时列表滚到当前值
  useLayoutEffect(() => {
    if (!open) return
    const el = hourRef.current
    if (!el) return
    const idx = Math.max(0, HOURS.indexOf(hh))
    el.scrollTop = Math.max(0, idx * 26 - 40)
  }, [open, hh])

  return (
    <div className={`timeField${disabled ? ' is-off' : ''}`} ref={boxRef}>
      <span className="field__label">{label}</span>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        className={`input input--btn${open ? ' is-open' : ''}`}
        onClick={toggle}
      >
        <ClockIcon width={18} height={18} className="input__icon" />
        <span className="timeField__value numeric">{value}</span>
        {hint && <span className="timeField__hint">{hint}</span>}
      </button>

      {open && (
        <div className={`timePop${up ? ' timePop--up' : ''}`}>
          <div className="timePop__head">
            <span>选择时间</span>
            <b className="numeric">{value}</b>
          </div>

          <div className="timePop__body">
            <div className="timePop__hours" ref={hourRef}>
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`timePop__hour numeric${h === hh ? ' is-on' : ''}`}
                  onClick={() => onChange(`${h}:${mm}`)}
                >
                  {h}
                </button>
              ))}
            </div>

            <div className="timePop__minutes">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`timePop__min numeric${m === mm ? ' is-on' : ''}`}
                  onClick={() => {
                    onChange(`${hh}:${m}`)
                    setOpen(false)
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {presets && presets.length > 0 && (
            <div className="timePop__presets">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`timePop__chip numeric${p === value ? ' is-on' : ''}`}
                  onClick={() => {
                    onChange(p)
                    setOpen(false)
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
