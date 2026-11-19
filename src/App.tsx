import { useCallback, useEffect, useMemo, useState } from 'react'
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

const TAB_FROM_HASH = (hash: string): Tab =>
  hash.replace('#/', '') === 'salary' ? 'salary' : 'ledger'

export default function App() {
  const [tab, setTab] = useState<Tab>(() => TAB_FROM_HASH(window.location.hash))
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

  /** 地址栏 ← → 要和页面同步：以前只写不读，按后退键 URL 变了、页面不动 */
  useEffect(() => {
    const sync = () => setTab(TAB_FROM_HASH(window.location.hash))
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  /** 预览状态 / 沉浸模式也写回地址：刷新、收藏、分享都能还原（replaceState 不塞历史） */
  useEffect(() => {
    const url = new URL(window.location.href)
    if (preview === 'auto') url.searchParams.delete('phase')
    else url.searchParams.set('phase', preview)
    if (immersive) url.searchParams.set('immersive', '1')
    else url.searchParams.delete('immersive')
    window.history.replaceState(null, '', url)
  }, [preview, immersive])

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
  const { offsetMs, freezeAt } = useMemo(() => {
    if (preview === 'auto') return { offsetMs: 0, freezeAt: null }
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
    // 休息时段「钉死」在休息中点：否则真实时间往前走 20 分钟后
    // 预览会滑出休息区，数字又开始跳，看着像「休息还在计费」
    const pinned = preview === 'lunch' || preview === 'dinner'
    return { offsetMs: target - base, freezeAt: pinned ? target : null }
  }, [preview, config])

  const viewNow = useMemo(
    () => (freezeAt === null ? new Date(now.getTime() + offsetMs) : new Date(freezeAt)),
    [now, offsetMs, freezeAt],
  )

  const phase: Phase = phaseAt(viewNow, config)

  // 回调保持引用稳定：这两个页面都在 memo 里，换新函数会让它们每秒重渲染
  const handleSave = useCallback(
    (next: SalaryConfig) => {
      const firstTime = stored === null
      setConfig(next)
      saveConfig(next)
      setToast(firstTime ? '填好啦，开始给你数钱' : '设置已保存，账本马上生效')
      if (firstTime) setTab('ledger')
    },
    [stored],
  )

  const goSalary = useCallback(() => setTab('salary'), [])
  const onPreview = useCallback((p: 'auto' | Phase) => setPreview(p), [])
  const exitImmersive = useCallback(() => setImmersive(false), [])

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
        {/* key 换页 = 重挂一次，进场动画交给 CSS（.pageWrap），比 JS 动画少一层 */}
        <div className="pageWrap" key={tab}>
          {tab === 'ledger' ? (
            <LedgerPage
              config={config}
              configured={configured}
              now={viewNow}
              phase={phase}
              preview={preview}
              onPreview={onPreview}
              onGoSalary={goSalary}
              onImmersive={enterImmersive}
            />
          ) : (
            <SalaryPage config={config} onSave={handleSave} />
          )}
        </div>
      </main>

      <SiteFooter />

      {immersive && (
        <Immersive config={config} now={viewNow} phase={phase} onExit={exitImmersive} />
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite" key={toast}>
          <span className="toast__dot" />
          {toast}
        </div>
      )}
    </div>
  )
}
