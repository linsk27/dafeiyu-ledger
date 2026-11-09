import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar, type Tab } from './components/Sidebar'
import { Immersive } from './components/Immersive'
import { SiteFooter } from './components/SiteFooter'
import { LedgerPage } from './pages/LedgerPage'
import { SalaryPage } from './pages/SalaryPage'
import { loadConfig, saveConfig } from './lib/storage'
import {
  DEFAULT_CONFIG,
  endOf,
  phaseAt,
  startOf,
  timeline,
  type Phase,
  type SalaryConfig,
} from './lib/salary'

export default function App() {  const [tab, setTab] = useState<Tab>(() =>
    window.location.hash.replace('#/', '') === 'salary' ? 'salary' : 'ledger',
  )
  // null = 这台设备上还没设置过工资，走引导页
  const [stored, setConfig] = useState<SalaryConfig | null>(() => loadConfig())
  const configured = stored !== null
  const config = stored ?? DEFAULT_CONFIG
  const [preview, setPreview] = useState<'auto' | Phase>(() => {
    const p = new URLSearchParams(window.location.search).get('phase')
    return p === 'before' || p === 'working' || p === 'lunch' || p === 'dinner' || p === 'after'
      ? p
      : 'auto'
  })
  const [immersive, setImmersive] = useState(
    () => new URLSearchParams(window.location.search).get('immersive') === '1',
  )
  const [now, setNow] = useState(() => new Date())
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    window.location.hash = `#/${tab}`
  }, [tab])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  /** 窄屏（手机）直接换页，不做转场 —— 两层页面同时重绘太重，会掉帧 */
  const narrow = useNarrowScreen()

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(id)
  }, [toast])

  /** 预览时把「现在」平移到对应时段；偏移量只算一次，之后跟随真实时间推进 */
  const offsetMs = useMemo(() => {
    if (preview === 'auto') return 0
    const base = Date.now()
    const today = new Date(base)
    const s = startOf(today, config).getTime()
    const e = endOf(today, config).getTime()
    const tl = timeline(config)
    // 休息区间已经是「一天内的分钟数」，换算成绝对时间点
    const toAbs = (min: number) => s + Math.max(0, min - tl.s) * 60_000
    const lunchMid = tl.lunch ? (toAbs(tl.lunch.from) + toAbs(tl.lunch.to)) / 2 : null
    const dinnerMid = tl.dinner ? (toAbs(tl.dinner.from) + toAbs(tl.dinner.to)) / 2 : null

    let target: number
    if (preview === 'before') target = s - 2 * 3600_000
    else if (preview === 'after') target = e + 3600_000
    else if (preview === 'lunch' && lunchMid !== null) target = lunchMid
    else if (preview === 'dinner' && dinnerMid !== null) target = dinnerMid
    else {
      // 上班中：取开工后 40% 的位置；正好撞上休息就往后挪出休息区
      let guess = s + Math.max(60_000, (e - s) * 0.4)
      const inside = [tl.lunch, tl.dinner].find(
        (sp) => sp && guess >= toAbs(sp.from) && guess < toAbs(sp.to),
      )
      if (inside) guess = toAbs(inside.to) + 15 * 60_000
      target = guess
    }
    return target - base
  }, [preview, config])

  const viewNow = useMemo(() => new Date(now.getTime() + offsetMs), [now, offsetMs])

  const phase: Phase = phaseAt(viewNow, config)

  const handleSave = (next: SalaryConfig) => {
    const firstTime = stored === null
    setConfig(next)
    saveConfig(next)
    setToast(firstTime ? '填好啦，开始给你数钱' : '设置已保存，账本马上生效')
    if (firstTime) setTab('ledger')
  }

  /** 全屏必须在点击事件里申请，放 effect 里会被浏览器的用户手势校验拦下 */
  const enterImmersive = () => {
    setImmersive(true)
    const p = document.documentElement.requestFullscreen?.()
    if (p && typeof p.catch === 'function') p.catch(() => undefined)
  }

  return (
    <div className="app">
      <Sidebar tab={tab} onChange={setTab} />

      <main className="main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={narrow ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={narrow ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={narrow ? { duration: 0 } : { duration: 0.24, ease: 'easeOut' }}
          >
            {tab === 'ledger' ? (
              <LedgerPage
                config={config}
                configured={configured}
                now={viewNow}
                phase={phase}
                preview={preview}
                onPreview={setPreview}
                onGoSalary={() => setTab('salary')}
                onImmersive={enterImmersive}
              />
            ) : (
              <SalaryPage config={config} onSave={handleSave} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <SiteFooter />

      <AnimatePresence>
        {immersive && (
          <Immersive
            config={config}
            now={viewNow}
            phase={phase}
            onExit={() => setImmersive(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
          >
            <span className="toast__dot" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 窄屏判定：手机上一律不做转场动画，直接换页最跟手 */
function useNarrowScreen() {
  const query = '(max-width: 700px)'
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return narrow
}
