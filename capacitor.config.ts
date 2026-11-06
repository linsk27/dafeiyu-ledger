import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.dafeiyu.ledger',
  appName: '大肥鱼账本',
  webDir: 'dist',
  android: {
    backgroundColor: '#fdf6f4',
    // targetSdk 35 起系统强制 edge-to-edge，这里让原生把 WebView 整体内缩，
    // 内容就不会被状态栏/导航栏压住（force 不看主题，稳定生效）
    adjustMarginsForEdgeToEdge: 'force',
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
