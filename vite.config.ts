import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 相对路径：GitHub Pages 的子路径和 Capacitor 的 file:// 都能用
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5273,
    strictPort: true,
    watch: {
      // 编辑器/工具原子写入时的临时目录会触发 EBUSY，直接忽略
      ignored: ['**/*.tmp', '**/.*.tmpdir/**', '**/.git/**'],
    },
  },
})