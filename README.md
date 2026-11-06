# 大肥鱼账本 · Dafeiyu Ledger

可爱风的「看着钱一秒一秒长出来」账本 —— 本质是个**牛马激励器**。

<p>
  <a href="https://github.com/linsk27/dafeiyu-ledger/releases/latest"><img alt="下载 APK" src="https://img.shields.io/github/v/release/linsk27/dafeiyu-ledger?label=APK&color=4b7bf5"></a>
  <a href="https://github.com/linsk27/dafeiyu-ledger/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/github/license/linsk27/dafeiyu-ledger?color=0fb87c"></a>
  <img alt="Android" src="https://img.shields.io/badge/Android-7.0%2B-3ddc84">
</p>

上班的时候打开它，大肥鱼就戴着牛头帽在打算盘，头顶的数字跟着秒针往上跳；
下班回家，它变成躺在钱堆里发光的样子。

> 📱 **[下载 Android APK](https://github.com/linsk27/dafeiyu-ledger/releases/latest)** ·
> 💻 网页版：`pnpm install && pnpm dev`

技术栈：React 19 + Vite 6 + TypeScript + framer-motion + Capacitor 7。

> ⚖️ 代码是 MIT。但**角色美术不在此列**：大肥鱼是社区同人形象（表情包来自
> [diwer/ai-biaoqingbao](https://github.com/diwer/ai-biaoqingbao)，CC BY-NC-SA 4.0，角色设计 ZipZipPipe、上善无形），
> 仓库里的立绘由作者提供，只用于这个项目，请勿商用或二次分发。

## 跑起来

```bash
pnpm install
pnpm dev      # http://127.0.0.1:5273
pnpm build
```

## 页面

### 我的账本

- 一张大卡片，角色按时间切换：
  - **上班前** → 抱空钱包哭的大肥鱼
  - **上班中** → 戴牛头帽、打算盘的「牛马大肥鱼」
  - **午休中** → 还是牛马，但计时暂停（冷色调 + 不涨钱）
  - **下班后** → 抱着钱堆、眼里发光的大肥鱼
- 头顶绿色数字（`¥` + 保底 4 位小数）。上班中每过 1 秒：
  - 数字 +`日薪 ÷ 净工时秒数`
  - 上方飘出一枚 `+0.0057` 的绿色小药丸，随机左右偏移 / 微旋转
  - 数字弹一下、气泡闪一下绿边
  - 午休期间整个停住（不涨、不飘字）
- 进度条 = 净工作进度，午休时段直接跳过。
- 三张统计卡：今日已赚 / 日薪 / 时薪。
- **戳一下大肥鱼**：三个时段都能点，各有一张「反应图」，1.9 秒后自动切回：
  - 上班前 → 气得抖钱包（`fish-poke-before.webp`），文案「钱包：真的挤不出来了」
  - 上班中 → 摔算盘（`fish-poke-work.webp`），文案「算盘摔了！这破班谁爱上谁上」
  - 下班后 → 举着钞票撒钱（`fish-poke-after.webp`），文案「发工资啦！钱给我撒起来」

  切图是**互斥硬切**（`opacity` 不做过渡，靠各自入场动画），叠加 0.62s 抖动，不会出现两张图叠在一起。
  午休没有互动图。
- 右上角两个入口：**调整薪资**、**沉浸模式**。
- 「状态预览」可强制切上班前 / 上班中 / 午休 / 下班后（也支持 `?phase=lunch`）。

### 薪资管理

只填四件事：**月薪**、**上班时间**、**下班时间**、**午休起止**。日薪 / 时薪 / 每秒全部自动算。

- 时间是**自绘时间选择器**：点开是小卡片，时、分两列滚动，选中项高亮，下面还有 08:30 / 09:00 / 12:00 / 13:00 这类常用值快选。支持点外部关闭、Esc 关闭。
- **计薪天数**默认「自动（本月 N 天）」——按当月周一到周五的天数算；也可以手动改成 21.75 / 22 这种口径。
- 午休落在班次之外时会有橙色提示，只扣班内那一段。

### 沉浸模式（牛马激励器）

点「沉浸模式」：请求浏览器全屏，把页面换成深色背景 + 一张铺满的**大肥鱼卡片**，只留绿色数字、角色、进度、时钟。

- 数字放大到 `clamp(42px, 6vw, 88px)`，一眼看见钱在长
- 右上「退出沉浸」或按 `Esc` 退出
- **全屏和沉浸是两件事**：全屏被系统/浏览器踢掉（切窗口、远程桌面、按 Esc 退全屏）时，
  沉浸视图**不会跟着关**，只在右上多出一个「重新全屏」按钮；想退出要再按一次 Esc 或点「退出沉浸」
- 全屏请求放在点击事件里（浏览器要求用户手势），失败就退化成全屏遮罩，功能不变
- 也可直接访问 `?immersive=1` 打开

## 计算口径

```
日薪 = 月薪 ÷ 计薪天数（默认 = 当月周一~周五天数）
净工时秒数 = (下班 − 上班 − 午休) × 60
每秒 = 日薪 ÷ 净工时秒数
已赚 = clamp(0, 已工作净分钟 × 60 × 每秒, 日薪)     // 午休时段不计
```

默认月薪 7000、09:00–18:00、午休 12:00–13:00：
计薪 21 天 → 日薪 333.33 → 净工时 8.0h → **每秒 0.011574**。

## 目录

```
src/
  App.tsx                 外壳、1s 心跳、预览时间偏移、沉浸开关
  lib/salary.ts           全部计算（时间轴/午休/日薪/每秒/已赚/进度/格式化）
  lib/storage.ts          localStorage v2 + 从 v1 迁移
  components/Sidebar.tsx  侧边栏（layoutId 滑动药丸）
  components/Stage.tsx    角色舞台（四种状态 + immersive 变体）
  components/MoneyCounter.tsx  绿色数字 + 每秒飘字
  components/TimeField.tsx     自绘时间选择器
  components/Immersive.tsx     全屏激励器
  pages/LedgerPage.tsx    我的账本
  pages/SalaryPage.tsx    薪资管理
  components/Icons.tsx    内联 SVG 图标
  styles.css              全部样式（无 UI 框架）
public/assets/            三张角色立绘（抠白底 → webp）
```

## 素材处理

三张原图是 4096×4096 白底 JPEG，处理成透明 webp：缩到 1400 → 四角泛洪取背景 → 灰色地面投影并入背景 → 边界 3px 软 alpha + 白边反混合 → 裁内容框导出（quality 92，约 200–300 KB/张）。

## 字体

- 中文：**站酷快乐体**（自托管 public/fonts/zcool-kuaile-cn.woff2）
- 数字：**Baloo 2**（自托管 woff2，500/600/700，开 tabular-nums，跳数不抖位）

两者都本地打包，不依赖 Google Fonts。

## 数据

`localStorage` 键 `dafeiyu-ledger:v2`，结构 `{ monthly, start, end, lunchStart, lunchEnd, payDays }`。
旧版 v1 的「日薪/月薪 + 金额 + 每月工作日」会在首次加载时自动迁移成月薪口径。

## 页脚外链

右下角一行 12.5px 的「点个 star~ ↗」（`components/SiteFooter.tsx`），平时是 `--ink-2` 灰，
hover 才变蓝并铺一层浅底。地址默认 `https://github.com`，换成自己的仓库：

```tsx
<SiteFooter href="https://github.com/you/repo" />
```

**定位用 `position: fixed`**，不是跟着文档流走的。原因：两个页面的内容高度不一样（账本页几乎撑满，
薪资页居中且短），如果让链接跟在内容后面，切 tab 时它会在「内容末尾」和「视口底部」之间跳来跳去。
现在钉在右下角，`right` 用 `max(20px, calc((100vw - 1760px)/2 + 24px))` 跟内容右边缘对齐，
所以超宽屏也不会贴到屏幕最边上。外层 `pointer-events: none`，只有链接本身可点，不会挡住下面的内容。

## 打包成 Android APK

产物在 `release/dafeiyu-ledger-v1.3-debug.apk`（约 9 MB，versionCode 4 / versionName 1.3，debug 签名，可直接覆盖安装）。

v1.1 修的三件事：启动白屏（内置启动画面）、首次进入的引导（空数据 → 去薪资管理）、状态栏遮挡（原生 inset + 深色图标）。

v1.3 修的两件事：手机上切 tab 掉帧（去掉 `backdrop-filter` / `filter: blur`，窄屏不做页面转场）、薪资表单在窄屏溢出（手机上时间字段两两并排，时间面板右列改为右对齐）。

### 一次性环境（已装好，全部在工作区里，没动系统）

```
work/android-toolchain/
  jdk21/             Temurin 21.0.13（Capacitor 7 的 Java 编译目标就是 21，17 会报"无效的源发行版:21"）
  sdk/               cmdline-tools + platform-tools + platforms;android-35 + build-tools;35.0.0
  gradle-home/       GRADLE_USER_HOME，含 init.d/mirrors.gradle
  tmp/               构建用的 TEMP（系统 %TEMP% 没写权限）
```

### 每次重新打包

```bash
cd work/dafeiyu-ledger
node node_modules/vite/bin/vite.js build          # 产出 dist/
node node_modules/@capacitor/cli/bin/capacitor copy android
cd android
export JAVA_HOME=<...>/android-toolchain/jdk21
export ANDROID_HOME=<...>/android-toolchain/sdk
export GRADLE_USER_HOME=<...>/android-toolchain/gradle-home
export TMP=<...>/android-toolchain/tmp TEMP=$TMP
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

改完依赖或资源如果发现 APK 体积异常变大，先 `gradlew clean`——增量打包会把删掉的旧条目留成死空间
（这次 21 MB → 8.9 MB 就是清掉 `public/assets` 里那批没被引用的 2 MB PNG 后 rebuild 的结果）。

### 两个环境坑（换机器时会再遇到）

1. **Maven Central 在这台机器上给 Gradle 回 403**（curl 却是 200），AGP 的传递依赖全部解析失败。
   解决：`gradle-home/init.d/mirrors.gradle` 把 `repo.maven.apache.org` / `plugins.gradle.org`
   的仓库地址改写成阿里云镜像，对所有子工程（含 node_modules 里的 `capacitor-android`）生效。
2. **`services.gradle.org` 只有 ~23 KB/s**，Gradle 8.11.1 要下 230 MB。
   解决：`android/gradle/wrapper/gradle-wrapper.properties` 的 `distributionUrl` 换成腾讯云镜像。

### 图标与启动图

`work/feiyu/make_android_assets.py` 用 094 半身像生成：米字级 legacy 图标（48/72/96/144/192）、
圆形图标、adaptive 前景（108dp 画布 + 72dp 安全区），以及 11 张 splash。
`res/values/ic_launcher_background.xml` 的背景色改成 `#E7EFFF` 与之配套。

### node_modules 的坑（这次踩到）

`pnpm add @capacitor/*` 之后 Vite 报 `Cannot find package 'picomatch'`、dev 报 `Yallist is not a constructor`。
根因是 `shamefully-hoist=true` 把 `yallist@5` 提到根部，而 `lru-cache@5`（babel 依赖）拿到的是 ESM 版的 yallist。
现在 `.npmrc` 改成了 `node-linker=hoisted`，并且**重装前必须先停掉 dev server**
（它会锁住 `esbuild.exe` / `rollup.win32-x64-msvc.node`，`rmdir /s /q node_modules` 会 Access denied，
留下半残的目录，pnpm 又认为已装好）：

```bash
cmd //c "rmdir /s /q node_modules"   # MSYS 的 rm -rf 对 junction 无效
pnpm install
```

### 没验证的部分

这台机器没有真机也没有模拟器（`adb` 连 `~/.android` 都建不出来），**没有做过安装冒烟测试**。
理论上 Capacitor 的 WebView 直接加载 `assets/public/index.html`，路由是 hash 的，不依赖网络；
但如果装上出现白屏，多半是资源路径（`/assets/...` 绝对路径在 `https://localhost` scheme 下是正常的）。


## 启动画面

`index.html` 里直接写着 `#boot` 占位（内联样式，不依赖任何外部 CSS/JS），WebView 一解析 HTML 就能看到：

- 大肥鱼「抱着算盘跑过来」（`public/assets/loading-fish.webp`）+ 上下轻晃的动画
- 文案「大肥鱼正抱着算盘跑过来…」+ 三颗跳动的小圆点
- JS 挂载后由 `src/main.tsx` 淡出并移除；最短展示 620ms（从导航开始算），秒开时不会闪一下就没

这样从「点图标」到「App 出现」中间不再是白屏。

## 首次进入的引导

`src/lib/storage.ts` 的 `loadConfig()` 在没有任何存储时返回 `null`（而不是默认的 7000），
`App.tsx` 据此区分「首次进入」：

- 账本页渲染 `Onboarding`（`src/pages/LedgerPage.tsx` 底部）：大肥鱼捧脸 + 「这里还空着呢」+ 三步提示 + 「去『薪资管理』填一下 →」
- 首启时薪资表单里仍是 7000/09:00–18:00 这些**占位默认值**，但只有点了「保存设置」才算配置完成
- 保存成功后 toast 换成「填好啦，开始给你数钱」，并自动切回账本页

## Android 状态栏避让

targetSdk 35 起系统强制 edge-to-edge，WebView 会画到状态栏底下。处理：

- `capacitor.config.ts` 里 `android.adjustMarginsForEdgeToEdge: 'force'` —— 让原生层按 systemBars + displayCutout 的 inset 给 WebView 加 margin，整体下移（不依赖 WebView 是否上报 `env(safe-area-inset-*)`，更稳）
- `android/app/src/main/res/values/styles.xml` 给 `AppTheme.NoActionBar` 加 `windowLightStatusBar / windowLightNavigationBar = true`、`statusBarColor / navigationBarColor / windowBackground = #FDF6F4`，状态栏图标变深色，和米白底色连成一片
- 因为原生已经内缩，CSS 里**不要**再叠加 `env(safe-area-inset-top)`，否则会多出一截

## 已知取舍

- 心跳 1 秒；想更丝滑把 `App.tsx` 的 interval 改 100ms，公式不用动。
- 计薪天数按周一到周五算，不识别法定节假日/调休；需要精确就在薪资页手动改。
- 数据只存本地，没有后端。

## 鼠标指针

全站光标换成 094「恭喜·举手」的**整只角色**：从 2048px 透明图裁到角色外轮廓（去掉散落的彩带），
降到 32×32（与系统指针同尺寸），加 1px 白色描边保证深色底也看得清，再轻微 unsharp 保锐利。

```css
cursor: url('/assets/cursor-fish.png') 16 16, auto !important;
```

输入框保留 I 形光标（cursor: text）。

## 字体加载（防首屏抽搐）

站酷快乐体原来走 `@fontsource`，会被切成 180 多个 unicode-range 分片：首屏先出系统字体，
几百毫秒后才换成快乐体，行宽一变整页回流——就是那一下抽搐。

现在：

1. **单文件**：`public/fonts/zcool-kuaile-cn.woff2`（709 KB 整包简中）+ Baloo 2 三个字重（各 19 KB）。
2. **预加载**：`index.html` 用 `<link rel="preload" as="font" crossorigin>`；URL 必须和 `@font-face` 完全一致（都带 `?v=1`），否则同一文件会被下两次。
3. **`font-display: block`**：字体到位前不画字（配合预加载只阻塞几十毫秒），从根上消除换字回流。
4. **缓存**：`public/sw.js` 只在生产构建注册，把字体与角色图放进 Cache Storage（cache-first），二次访问 0 请求。
5. 移除 fontsource 的 CSS 后，样式表从 **181 KB 降到 30 KB**。

实测（CDP，1440×900）：

```text
CLS = 0，layout-shift 记录 0 条
字体请求 start = 19ms（缓存命中）
first-contentful-paint = 136ms   ← 字体先于首屏完成
```
