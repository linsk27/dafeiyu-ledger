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
  minutesOf,
  phaseAt,
  startOf,
  timeline,
  type Phase,
  type SalaryConfig,
} from './lib/salary'

export default function App() {
  const [tab, setTab] = useState<Tab>(() =>
    window.location.hash.replace('#/', '') === 'salary' ? 'salary' : 'ledger',
  )
  // null = 这台设备上还没设置过工资，走引导页
  const [stored, setConfig] = useState<SalaryConfig | null>(() => loadConfig())
  const configured = stored !== null
  const config = stored ?? DEFAULT_CONFIG
  const [preview, setPreview] = useState<'auto' | Phase>(() => {
    const p = new URLSearchParams(window.location.search).get('phase')
    return p === 'before' || p === 'working' || p === 'lunch' || p === 'after' ? p : 'auto'
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
    const { ls, le } = timeline(config)
    const lunchStart = s + Math.max(0, ls - minutesOf(config.start)) * 60_000
    const lunchEnd = s + Math.max(0, le - minutesOf(config.start)) * 60_000
    let target: number
    if (preview === 'before') target = s - 2 * 3600_000
    else if (preview === 'after') target = e + 3600_000
    else if (preview === 'lunch') target = (lunchStart + lunchEnd) / 2
    else {
      // 上班中：取早上开工后 40% 的位置，撞上午休就挪到午休结束前 15 分钟
      const guess = s + Math.max(60_000, (e - s) * 0.4)
      target = guess >= lunchStart && guess < lunchEnd ? lunchEnd + 15 * 60_000 : guess
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
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
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
