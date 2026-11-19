import { useLayoutEffect, useRef } from 'react'
import { BookIcon, WalletIcon, WhaleIcon } from './Icons'

export type Tab = 'ledger' | 'salary'

interface Props {
  tab: Tab
  onChange: (t: Tab) => void
}

const ITEMS: { id: Tab; label: string; hint: string; Icon: typeof BookIcon }[] = [
  { id: 'ledger', label: '我的账本', hint: '看看今天赚了多少', Icon: BookIcon },
  { id: 'salary', label: '薪资管理', hint: '上班时间 & 工资', Icon: WalletIcon },
]

export function Sidebar({ tab, onChange }: Props) {
  const pillRef = useRef<HTMLSpanElement>(null)
  const last = useRef<DOMRect | null>(null)

  /**
   * 选中态那块蓝色药丸从一个标签滑到另一个标签。
   * 以前是 framer-motion 的 layoutId，现在用 FLIP：记住上一帧的矩形，
   * 换页后把新矩形「反向平移 + 拉伸」回旧位置，再让 CSS transition 归位。
   * 纯 Web Animations API，不引依赖；系统开了「减少动态效果」就直接跳过。
   */
  useLayoutEffect(() => {
    const el = pillRef.current
    if (!el) return
    const next = el.getBoundingClientRect()
    const prev = last.current
    last.current = next
    if (!prev || prev.width === 0) return
    const dx = prev.left - next.left
    const dy = prev.top - next.top
    const sx = prev.width / next.width
    const sy = prev.height / next.height
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, borderRadius: '20px' },
        { transform: 'none', borderRadius: '20px' },
      ],
      { duration: 260, easing: 'cubic-bezier(.2,.85,.25,1)' },
    )
  }, [tab])

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand__mark">
          <WhaleIcon width={24} height={24} />
        </div>
        <div>
          <div className="brand__name">大肥鱼账本</div>
          <div className="brand__sub">dafeiyu ledger</div>
        </div>
      </div>

      <nav className="nav">
        {ITEMS.map(({ id, label, hint, Icon }) => {
          const active = id === tab
          return (
            <button
              key={id}
              className={`nav__item${active ? ' is-active' : ''}`}
              onClick={() => onChange(id)}
              type="button"
            >
              {active && <span ref={pillRef} className="nav__pill" />}
              <span className="nav__icon">
                <Icon width={20} height={20} />
              </span>
              <span className="nav__text">
                <span className="nav__label">{label}</span>
                <span className="nav__hint">{hint}</span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar__foot">
        <img src={`${import.meta.env.BASE_URL}assets/fish-side.webp`} alt="" className="sidebar__fish" />
        <p>每一秒都在进账，<br />别忘了摸摸鱼。</p>
      </div>
    </aside>
  )
}
