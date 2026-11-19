import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import App from './App'

const boot = document.getElementById('boot')
// index.html 里给搜索引擎准备的正文，React 接管后就不需要了
const seo = document.getElementById('seo')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

seo?.remove()

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
  // 首次安装时 claim() 也会触发 controllerchange，那种情况不该弹提示
  const hadController = Boolean(navigator.serviceWorker.controller)
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => undefined)
  })
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return
    // 新版本已经接管，但页面里跑的还是旧的 bundle：让用户刷一下
    const bar = document.createElement('button')
    bar.className = 'updateBar'
    bar.type = 'button'
    bar.textContent = '有新版本，点这里刷新'
    bar.addEventListener('click', () => window.location.reload())
    document.body.appendChild(bar)
  })
}
