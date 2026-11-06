import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import App from './App'

const boot = document.getElementById('boot')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

/**
 * 启动占位是写在 index.html 里的静态 DOM，React 挂载后淡出。
 * 用 performance.now()（从导航开始计时）算，保证它至少露脸 ~620ms：
 * 本机秒开时不会「闪一下就没」，慢的时候又不会提前消失留白屏。
 */
if (boot) {
  const wait = Math.max(0, 620 - performance.now())
  window.setTimeout(() => {
    boot.classList.add('boot--out')
    window.setTimeout(() => boot.remove(), 420)
  }, wait)
}

// 生产构建下把字体和角色图放进 Cache Storage，二次访问不再回源
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
