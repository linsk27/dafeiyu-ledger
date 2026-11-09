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
 * 系统把全屏踢掉（切窗口、远程桌面、Esc）时视图不关闭，只给一个「重新全屏」。
 *
 * 「重新全屏」只在**真正进过全屏又被踢出来**的时候出现。
 * 安卓 WebView 里 Fullscreen API 根本没实现，只显示沉浸层就够了，
 * 这种情况下不显示按钮（否则永远挂着一个点了没反应的按钮）。
 */
export function Immersive({ config, now, phase, onExit }: Props) {
  const [isFs, setIsFs] = useState(() => Boolean(document.fullscreenElement))
  /** 曾经成功进过全屏 —— 只有它为 true，被踢出来时才值得提示“重新全屏” */
  const [everFs, setEverFs] = useState(false)

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.()
    onExit()
  }, [onExit])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit()
    }
    const onFs = () => {
      const on = Boolean(document.fullscreenElement)
      setIsFs(on)
      if (on) setEverFs(true)
    }
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
          {everFs && !isFs && (
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
