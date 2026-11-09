import { motion } from 'framer-motion'
import { Stage } from '../components/Stage'
import { SparkIcon } from '../components/Icons'
import {
  dailySalary,
  earnedAt,
  fmtMoney,
  payDaysOf,
  perHour,
  progressOf,
  workSeconds,
  type Phase,
  type SalaryConfig,
} from '../lib/salary'

const PHASE_TEXT: Record<Phase, string> = {
  before: '上班前',
  working: '上班中',
  lunch: '午休中',
  dinner: '晚休中',
  after: '已下班',
}

const PREVIEWS: { id: Phase; label: string }[] = [
  { id: 'before', label: '上班前' },
  { id: 'working', label: '上班中' },
  { id: 'lunch', label: '午休' },
  { id: 'dinner', label: '晚休' },
  { id: 'after', label: '下班后' },
]

interface Props {
  config: SalaryConfig
  configured: boolean
  now: Date
  phase: Phase
  preview: 'auto' | Phase
  onPreview: (p: 'auto' | Phase) => void
  onGoSalary: () => void
  onImmersive: () => void
}

export function LedgerPage({
  config,
  configured,
  now,
  phase,
  preview,
  onPreview,
  onGoSalary,
  onImmersive,
}: Props) {
  if (!configured) return <Onboarding onGoSalary={onGoSalary} />

  const daily = dailySalary(config, now)
  const hourly = perHour(config, now)
  const progress = progressOf(now, config)
  const earned = earnedAt(now, config)

  return (
    <div className="page">
      <header className="pageHead">
        <div>
          <h1 className="pageTitle">我的账本</h1>
          <p className="pageSub">
            {now.toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
            <span className="dotSep">·</span>
            月薪 ¥{fmtMoney(config.monthly, 0)} / {payDaysOf(config, now)} 个工作日
            <span className="dotSep">·</span>
            今天已过 {Math.round(progress * 100)}%
          </p>
        </div>

        <div className="pageHead__right">
          <span className={`chip chip--${phase}`}>
            <span className="chip__dot" />
            {PHASE_TEXT[phase]}
            {preview !== 'auto' && <em>预览</em>}
          </span>
          <button className="btn btn--ghost" onClick={onGoSalary} type="button">
            调整薪资
          </button>
          <button className="btn btn--immersive" onClick={onImmersive} type="button">
            <ExpandIcon />
            沉浸模式
          </button>
        </div>
      </header>

      <div className="previewRow">
        <span className="previewRow__label">状态预览</span>
        <div className="segmented segmented--sm">
          <button
            type="button"
            className={preview === 'auto' ? 'is-on' : ''}
            onClick={() => onPreview('auto')}
          >
            自动
          </button>
          {PREVIEWS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={preview === p.id ? 'is-on' : ''}
              onClick={() => onPreview(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Stage config={config} now={now} phase={phase} />

      <div className="statRow">
        <StatCard
          label="今日已赚"
          value={`¥${fmtMoney(earned)}`}
          note="保底 4 位小数，休息不计"
          tone="green"
          delay={0}
        />
        <StatCard
          label="日薪"
          value={`¥${fmtMoney(daily, 2)}`}
          note={`净工时 ${(workSeconds(config) / 3600).toFixed(1)} 小时`}
          tone="blue"
          delay={0.06}
        />
        <StatCard
          label="时薪"
          value={`¥${fmtMoney(hourly, 2)}`}
          note="月薪 ÷ 计薪天数 ÷ 净工时"
          tone="pink"
          delay={0.12}
        />
      </div>

      <div className="tipRow">
        <SparkIcon width={16} height={16} />
        <span>点「沉浸模式」全屏盯着它看，数字每秒钟都会自己长一点。Esc 退出。</span>
      </div>
    </div>
  )
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden>
      <path
        d="M4 9V5.6c0-.9.7-1.6 1.6-1.6H9M15 4h3.4c.9 0 1.6.7 1.6 1.6V9M20 15v3.4c0 .9-.7 1.6-1.6 1.6H15M9 20H5.6c-.9 0-1.6-.7-1.6-1.6V15"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

function StatCard({
  label,
  value,
  note,
  tone,
  delay,
}: {
  label: string
  value: string
  note: string
  tone: 'green' | 'blue' | 'pink'
  delay: number
}) {
  return (
    <motion.div
      className={`statCard statCard--${tone}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 24 }}
    >
      <div className="statCard__label">{label}</div>
      <div className="statCard__value numeric">{value}</div>
      <div className="statCard__note">{note}</div>
    </motion.div>
  )
}

/** 首次打开：还没填过工资，先把人送去薪资管理 */
function Onboarding({ onGoSalary }: { onGoSalary: () => void }) {
  return (
    <div className="page page--onboard">
      <header className="pageHead">
        <div>
          <h1 className="pageTitle">我的账本</h1>
          <p className="pageSub">先告诉我你赚多少，我才能帮你数</p>
        </div>
      </header>

      <section className="onboard">
        <img className="onboard__fish" src="/assets/fish-setup.webp" alt="" />
        <h2 className="onboard__title">这里还空着呢</h2>
        <p className="onboard__text">
          去「薪资管理」填一下月薪和上下班时间，
          <br />
          我就能把每一秒赚的钱算给你看。
        </p>

        <ul className="onboard__list">
          <li>
            <span>01</span>月薪多少
          </li>
          <li>
            <span>02</span>几点上下班
          </li>
          <li>
            <span>03</span>午休算不算
          </li>
        </ul>

        <button className="btn btn--primary onboard__cta" onClick={onGoSalary} type="button">
          去「薪资管理」填一下 →
        </button>
        <p className="onboard__hint">数据只存在这台设备上，不会上传</p>
      </section>
    </div>
  )
}
