/* 大肥鱼账本 · Service Worker（只在生产构建注册）
 *
 * 目标：从主屏打开时即便断网也能进得去。
 * - 导航请求：network-first，失败回落到缓存的 index.html
 * - 同源静态资源（字体 / 脚本 / 样式 / 图片）：stale-while-revalidate
 * 路径一律用相对写法：站点可能挂在 /dafeiyu-ledger/ 这样的子路径下。
 */
const CACHE = 'dafeiyu-v3'

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './fonts/zcool-kuaile-cn.woff2?v=1',
  './fonts/baloo-2-500.woff2?v=1',
  './fonts/baloo-2-600.woff2?v=1',
  './fonts/baloo-2-700.woff2?v=1',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // 单个资源失败不该让整个安装挂掉
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const putInCache = (req, resp) => {
  if (!resp || !resp.ok || resp.type === 'opaque') return
  const copy = resp.clone()
  caches.open(CACHE).then((cache) => cache.put(req, copy))
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // 页面导航：先要新的，断网时用缓存里的壳
  if (req.mode === 'navigate') {
    event.respondWith(
      // no-store：GitHub Pages 给 HTML 的 max-age 是 600s，
      // 不加这个，fetch 会直接把 HTTP 缓存里那份旧壳还回来（新版本要等十分钟）
      fetch(req, { cache: 'no-store' })
        .then((resp) => {
          putInCache(req, resp)
          return resp
        })
        .catch(async () => {
          const cache = await caches.open(CACHE)
          return (
            (await cache.match(req)) ||
            (await cache.match('./index.html')) ||
            (await cache.match('./')) ||
            new Response('离线了，先连一次网再打开吧', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          )
        }),
    )
    return
  }

  // 静态资源：先给缓存的，同时后台更新
  const isStatic =
    req.destination === 'font' ||
    req.destination === 'script' ||
    req.destination === 'style' ||
    req.destination === 'image' ||
    url.pathname.includes('/fonts/') ||
    url.pathname.includes('/assets/') ||
    url.pathname.includes('/icons/') ||
    url.pathname.includes('/splash/') ||
    url.pathname.endsWith('manifest.webmanifest')

  if (!isStatic) return

  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((resp) => {
          putInCache(req, resp)
          return resp
        })
        .catch(() => hit)
      return hit || network
    }),
  )
})
