import { useCallback, useEffect, useState } from 'react'
import { Stage } from './Stage'
import type { Phase, SalaryConfig } from '../lib/salary'

interface Props {
  config: SalaryConfig
  now: Date
  phase: Phase
  onExit: () => void
}

function requestFullscreen() {
  const p = document.documentElement.requestFullscreen?.()
  if (p && typeof p.catch === 'function') p.catch(() => undefined)
}

/**
 * 沉浸模式只负责「铺满视口」这件事，全屏是锦上添花：
 * 系统把全屏踢掉（切窗口、远程桌面、Esc）时视图不关闭，只提示可以重新全屏。
 */
export function Immersive({ config, now, phase, onExit }: Props) {
  const [isFs, setIsFs] = useState(() => Boolean(document.fullscreenElement))

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.()
    onExit()
  }, [onExit])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit()
    }
    const onFs = () => setIsFs(Boolean(document.fullscreenElement))
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFs)
    }
  }, [exit])

  const time = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="immersive">
      <div className="immersive__top">
        <div className="immersive__brand">
          <span className="immersive__dot" />
          牛马激励器
        </div>

        <div className="immersive__clock numeric">{time}</div>

        <div className="immersive__actions">
          {!isFs && (
            <button className="immersive__exit" type="button" onClick={requestFullscreen}>
              重新全屏
            </button>
          )}
          <button className="immersive__exit" type="button" onClick={exit}>
            退出沉浸
            <kbd>Esc</kbd>
          </button>
        </div>
      </div>

      <div className="immersive__stage">
        <Stage config={config} now={now} phase={phase} variant="immersive" />
      </div>

      <div className="immersive__foot">
        盯着它看一会儿，数字真的会自己长大 · 大肥鱼账本
      </div>
    </div>
  )
}
