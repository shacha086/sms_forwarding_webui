# 短信转发器 Web 控制台

基于 React、TypeScript 和 Vite，使用 Radix UI 提供无样式、可访问的交互组件，
TanStack Query 管理设备 REST API 状态。界面按 Vercel / Geist 风格设计，并针对手机操作优化。

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
`admin123`；凭据只保存在当前标签页的 `sessionStorage` 中。

## 目录结构

```text
src/
  api/          REST 客户端和类型
  app/          应用外壳、设备状态
  components/   通用组件和连接栏
  pages/        各功能页面
  styles.css    Geist / Vercel 风格设计系统
```
