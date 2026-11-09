import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MoneyCounter } from './MoneyCounter'
import { ClockIcon } from './Icons'
import {
  dailySalary,
  earnedAt,
  fmtDuration,
  minutesOf,
  perSecond,
  progressOf,
  remainingSeconds,
  type Phase,
  type SalaryConfig,
} from '../lib/salary'

const FISH: Record<Phase, { src: string; alt: string; title: string; sub: string }> = {
  before: {
    src: '/assets/fish-poor.webp',
    alt: '还没上班、抱着空钱包的大肥鱼',
    title: '钱包空空，还没到点',
    sub: '上班时间一到，这里就开始跳数字啦',
  },
  working: {
    src: '/assets/fish-work.webp',
    alt: '戴着牛头帽、打着算盘的大肥鱼',
    title: '牛马大肥鱼，正在搬砖',
    sub: '每一秒都在为你赚一点点',
  },
  lunch: {
    src: '/assets/fish-sleep.webp',
    alt: '趴在枕头上睡着的大肥鱼',
    title: '午休中，趴着眯一会儿',
    sub: '午休不扣钱，也不进账，一会儿接着算',
  },
  dinner: {
    src: '/assets/fish-sleep.webp',
    alt: '趴在枕头上睡着的大肥鱼',
    title: '晚休中，先趴一会儿',
    sub: '吃点东西，晚班还长着呢',
  },
  after: {
    src: '/assets/fish-rich.webp',
    alt: '抱着钱堆、眼里发光的大肥鱼',
    title: '下班啦，今天赚麻了',
    sub: '今天的工资已经全部到账',
  },
}

/** 点击互动图：每个时段各有一张「反应」，午休没有 */
const POKES: Partial<Record<Phase, { src: string; alt: string; title: string; sub: string; note: string }>> = {
  before: {
    src: '/assets/fish-poke-before.webp',
    alt: '气得把钱包倒过来抖的大肥鱼',
    title: '钱包：真的挤不出来了',
    sub: '……抖了三分钟，掉出两个钢镚',
    note: '摇钱包中，一分也没有',
  },
  working: {
    src: '/assets/fish-poke-work.webp',
    alt: '把算盘摔出去、气鼓鼓的大肥鱼',
    title: '算盘摔了！这破班谁爱上谁上',
    sub: '……骂完了，捡起来继续算',
    note: '生气中，钱还是照涨',
  },
  lunch: {
    src: '/assets/fish-poke-sleep.webp',
    alt: '被戳醒、气鼓鼓趴在枕头上的大肥鱼',
    title: '谁！谁戳我！',
    sub: '……午休就一小时，别闹',
    note: '被戳醒了，午休继续',
  },
  dinner: {
    src: '/assets/fish-poke-sleep.webp',
    alt: '被戳醒、气鼓鼓趴在枕头上的大肥鱼',
    title: '醒了醒了，别戳了',
    sub: '……离下班还早着呢',
    note: '被戳醒了，晚休继续',
  },
  after: {
    src: '/assets/fish-poke-after.webp',
    alt: '举着钞票撒钱、眼睛发光的大肥鱼',
    title: '发工资啦！钱给我撒起来',
    sub: '反正都是今天一秒一秒赚的',
    note: '撒钱中，反正是自己赚的',
  },
}

const POKE_MS = 1900

interface Props {
  config: SalaryConfig
  now: Date
  phase: Phase
  variant?: 'card' | 'immersive'
}

/** 白天 6:00–18:00 用白天那张，其余用夜里那张 */
function isDayHour(h: number) {
  return h >= 6 && h < 18
}

/**
 * 判断「这一屏该不该是夜里」：
 * - 晚休 = 夜里那张床，写死（17:10 的晚休也该是台灯蓝床）
 * - 午休看它自己几点开始（夜班 02:00 的午休也是黑的）
 * - 其余时段看当下的真实钟点
 */
function isNightScene(phase: Phase, config: SalaryConfig) {
  if (phase === 'dinner') return true
  if (phase === 'lunch') return !isDayHour(Math.floor(minutesOf(config.lunchStart) / 60) % 24)
  return !isDayHour(new Date().getHours())
}

/**
 * 舞台底图：按「真实钟点」的天色挑白天/夜里那张。
 * 注意不能用 now —— 预览模式会把 now 平移进某个时段，天色会被一起改掉。
 */
function bgFor(phase: Phase, day: boolean) {
  // 休息躺床，干活在工位；都分白天/夜里两版
  if (phase === 'lunch' || phase === 'dinner') {
    return day ? '/assets/bg-rest-day.jpg' : '/assets/bg-rest-night.jpg'
  }
  return day ? '/assets/bg-day.jpg' : '/assets/bg-night.jpg'
}

export function Stage({ config, now, phase, variant = 'card' }: Props) {
  const [poking, setPoking] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    setPoking(false)
  }, [phase])

  const fish = FISH[phase]
  const poke = POKES[phase]
  const canPoke = Boolean(poke)
  const head = poking && poke ? poke : fish

  const handlePoke = () => {
    if (!canPoke) return
    setPoking(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPoking(false), POKE_MS)
  }



  const daily = dailySalary(config, now)
  const value = phase === 'before' ? 0 : phase === 'after' ? daily : earnedAt(now, config)
  const progress = progressOf(now, config)
  const left = remainingSeconds(now, config)

  const caption =
    poking && poke
      ? poke.note
      : phase === 'working'
        ? `每秒 +¥${perSecond(config, now).toFixed(4)}`
        : phase === 'lunch'
          ? '午休计时暂停'
          : phase === 'dinner'
            ? '晚休计时暂停'
            : phase === 'before'
              ? '还没开始，先攒点力气'
              : '今天到此为止，辛苦了'

  const day = !isNightScene(phase, config)
  const photo = bgFor(phase, day)
  const today = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
    now.getDate(),
  ).padStart(2, '0')}`

  return (
    <section
      className={`stage is-${phase} stage--photo${day ? '' : ' stage--night'}${
        variant === 'immersive' ? ' stage--immersive' : ''
      }`}
      style={{ ['--photo' as string]: `url(${photo})` } as React.CSSProperties}
    >
      <div className="stage__meta" aria-hidden>
        <span>DAFEIYU LEDGER</span>
        <span>NO. {today.replace(/\./g, '')}</span>
      </div>

      {phase === 'after' && !poking && (
        <span className="stage__stamp" aria-hidden>
          已结清
        </span>
      )}

      <div className="stage__counter">
        <MoneyCounter value={value} active={phase === 'working'} caption={caption} />
      </div>

      <div className="stage__fishWrap">
        <div className="stage__floor" />
        <button
          type="button"
          className={`stage__fishBtn${canPoke ? ' is-poke' : ''}${poking ? ' is-poking' : ''}`}
          onClick={handlePoke}
          aria-label={canPoke ? '戳一下大肥鱼' : fish.alt}
          tabIndex={canPoke ? 0 : -1}
        >
          <span className={`stage__fishStack${poking ? ' is-shake' : ''}`}>
            <img
              key={`base-${phase}-${poking ? 'p' : 'n'}`}
              src={fish.src}
              alt={fish.alt}
              className={`stage__fish${poking && canPoke ? ' is-dim' : ''}`}
            />
            {poke && (
              <img
                key={`poke-${phase}`}
                src={poke.src}
                alt={poking ? poke.alt : ''}
                aria-hidden={!poking}
                className={`stage__fish stage__fish--poke${poking ? ' is-shown' : ''}`}
              />
            )}

            {canPoke && !poking && (
              <motion.span
                className="stage__poke"
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: [0.75, 1, 0.75], y: 0, scale: [1, 1.05, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }}
              >
                戳我
              </motion.span>
            )}
          </span>
        </button>
      </div>

      <div className="stage__foot">
        <div className="stage__caption">
          <div className="stage__title">{head.title}</div>
          <div className="stage__sub">{head.sub}</div>
        </div>

        <div className="stage__meter">
          <div className="stage__meterTop">
            <span className="stage__meterLabel">
              <ClockIcon width={16} height={16} />
              {phase === 'working'
                ? `还剩 ${fmtDuration(left)}`
                : phase === 'lunch' || phase === 'dinner'
                  ? `${phase === 'lunch' ? '午休' : '晚休'} ${
                      (phase === 'lunch' ? config.lunchStart : config.dinnerStart) + '–' +
                      (phase === 'lunch' ? config.lunchEnd : config.dinnerEnd)
                    } · ${phase === 'lunch' ? config.lunchEnd : config.dinnerEnd} 继续`
                  : phase === 'before'
                    ? `${config.start} 开工`
                    : `${config.end} 已收工`}
            </span>
            <span className="stage__meterValue numeric">{Math.round(progress * 100)}%</span>
          </div>
          <div className="stage__bar">
            <motion.div
              className="stage__barFill"
              animate={{ width: `${Math.max(2, progress * 100)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
