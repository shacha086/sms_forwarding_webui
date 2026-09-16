# 短信转发器 Web 控制台

基于 React、TypeScript 和 Vite，使用 Radix UI 提供无样式、可访问的交互组件，
TanStack Query 管理设备 REST API 状态。界面按 Vercel / Geist 风格设计，并针对手机操作优化。

控制台同时支持 Web Bluetooth 配网：选择名称以 `SMS-` 开头的设备，使用 PIN `123456`
完成安全配对后，可直接写入 WiFi SSID 和密码。该功能要求 HTTPS 和支持 Web Bluetooth 的浏览器。

## 本地开发

需要 Node.js 20.19+ 或 22.12+。

```powershell
npm install
npm run dev
```

开发地址通常为 `http://localhost:5173/#192.168.x.x`。设备固件的 CORS 白名单默认不包含
localhost，因此真实设备联调应使用 `sms.ctree.site`，或仅在本地开发固件中临时加入该来源。

## 构建与部署

```powershell
npm run lint
npm test
npm run build
```

生产文件输出到 `dist/`。在 Vercel 中把项目的 **Root Directory** 设置为 `web`，框架选择
Vite（通常会自动识别），构建命令使用 `npm run build`，输出目录使用 `dist`。
`vercel.json` 已包含静态站点的回退规则。

也可以直接把完整 `dist/` 目录上传到任意静态托管服务，并将域名绑定为
`sms.ctree.site`。

## 设备连接

设备会把浏览器重定向到：

```text
https://sms.ctree.site/#192.168.x.x
```

控制台从 URL hash 读取设备地址，通过 `http://设备IP/api/v1/*` 调用 REST API。
浏览器首次访问时需要允许“本地网络访问”。默认账号为 `admin`，默认密码为
`admin123`。页面不会自动连接，需确认账号和密码后点击“连接”；每次点击都会重新认证，
连接过程中可取消或修改凭据后重新连接。单个连接请求超时为 10 秒，连接失败后不自动重试。
连接成功后每 15 秒刷新设备信息，后台刷新不会锁住连接按钮。
默认不保存凭据。勾选“记住密码”后，仅在连接成功时保存，刷新后回填但不自动连接；
取消勾选会删除已保存的密文。带有其他设备 IP 的链接不会回填上一个设备的凭据。
保存新管理密码后当前连接同步使用新凭据，重新认证成功后更新已记住的密码。

凭据使用 AES-256-GCM 加密后写入 localStorage，每次保存使用随机 IV；
不可导出的 CryptoKey 单独存入 IndexedDB，不把明文密码或原始密钥写入 localStorage。
该功能要求 HTTPS 或 localhost，以及浏览器允许本地存储；不可用时不会退回明文存储。
这只能降低 localStorage 单独泄露的风险，不能防御同源 XSS、恶意扩展或他人使用当前浏览器配置。
共享设备请勿勾选。设备 API 仍使用 HTTP Basic Auth，加密保存不等于网络传输加密。

## 目录结构

```text
src/
  api/          REST 客户端和类型
  app/          应用外壳、设备状态
  components/   通用组件和连接栏
  pages/        各功能页面
  styles.css    Geist / Vercel 风格设计系统
```
