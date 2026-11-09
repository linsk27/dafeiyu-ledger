import { motion } from 'framer-motion'
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
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="nav__pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
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
        <img src={`${import.meta.env.BASE_URL}assets/fish-poor.webp`} alt="" className="sidebar__fish" />
        <p>每一秒都在进账，<br />别忘了摸摸鱼。</p>
      </div>
    </aside>
  )
}
