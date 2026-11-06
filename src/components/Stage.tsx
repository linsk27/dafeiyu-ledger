import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MoneyCounter } from './MoneyCounter'
import { ClockIcon } from './Icons'
import {
  dailySalary,
  earnedAt,
  fmtDuration,
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
    src: '/assets/fish-work.webp',
    alt: '午休打盹的大肥鱼',
    title: '午休中，先扒两口饭',
    sub: '午休不扣钱，也不进账，一会儿接着算',
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
          : phase === 'before'
            ? '还没开始，先攒点力气'
            : '今天到此为止，辛苦了'

  return (
    <section className={`stage is-${phase}${variant === 'immersive' ? ' stage--immersive' : ''}`}>
      <div className="stage__deco stage__deco--a" />
      <div className="stage__deco stage__deco--b" />
      <div className="stage__deco stage__deco--c" />

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
              {phase === 'working' || phase === 'lunch'
                ? `还剩 ${fmtDuration(left)}`
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
