/* 大肥鱼账本 · 静态资源缓存（只在生产构建注册） */
const CACHE = 'dafeiyu-assets-v1'

const PRECACHE = [
  '/fonts/zcool-kuaile-cn.woff2?v=1',
  '/fonts/baloo-2-500.woff2?v=1',
  '/fonts/baloo-2-600.woff2?v=1',
  '/fonts/baloo-2-700.woff2?v=1',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
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

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  const isFont = req.destination === 'font' || url.pathname.startsWith('/fonts/')
  const isArt = url.pathname.startsWith('/assets/fish-') || url.pathname.includes('cursor-')
  if (!isFont && !isArt) return

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit
      return fetch(req).then((resp) => {
        if (resp.ok) {
          const copy = resp.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy))
        }
        return resp
      })
    }),
  )
})
