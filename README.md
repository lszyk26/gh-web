# GH·WEB

<img src="docs/banner.svg" alt="GH·WEB" width="100%">

GitHub 只读镜像。前端是零构建的 Vue 3 单页应用，服务端是一个零依赖的 Node 文件，可以把 `/api/*` 反代到 `api.github.com` 并缓存。

<!-- 截图：存成 docs/screenshot.png 后去掉下面这行的注释 -->
<!-- <img src="docs/screenshot.png" alt="界面截图" width="100%"> -->

## 运行

需要 Node.js 18 或更高。

```bash
git clone https://github.com/lszyk26/gh-web.git
cd gh-web
node server.js
```

默认监听 `0.0.0.0:8787`，打开 `http://localhost:8787/`，填入 GitHub Personal Access Token。

公网部署至少加一个口令，留空则不设防：

```bash
GHW_PASSWORD='你的口令' node server.js
```

## 部署

### Termux

```bash
pkg update && pkg install -y nodejs-lts git
git clone https://github.com/lszyk26/gh-web.git
cd gh-web
GHW_PASSWORD='你的口令' bash deploy/termux.sh
```

手机访问 `http://127.0.0.1:8787/`，同一 WiFi 下用手机内网 IP 访问。后台运行：

```bash
nohup node server.js > gh-web.log 2>&1 &
termux-wake-lock
```

### Windows / macOS / Linux

```bash
git clone https://github.com/lszyk26/gh-web.git
cd gh-web
GHW_PASSWORD='你的口令' node server.js
```

Windows PowerShell：

```powershell
$env:GHW_PASSWORD = "你的口令"
node server.js
```

配置可以写进 `.env`（复制 `.env.example`），之后直接 `node server.js`。

### Docker

```bash
GHW_PASSWORD='你的口令' docker compose up -d
```

或：

```bash
docker build -t gh-web .
docker run -d --name gh-web -p 8787:8787 -e GHW_PASSWORD='你的口令' --restart unless-stopped gh-web
```

镜像不执行 `npm install`，运行时零依赖。带 `/healthz` 健康检查。

### systemd

```bash
sudo git clone https://github.com/lszyk26/gh-web.git /opt/gh-web
cd /opt/gh-web
sudo cp .env.example .env
sudo sed -i "s/change-me/换成你的口令/" .env
sudo chmod 640 .env
sudo chown -R www-data:www-data /opt/gh-web
sudo cp deploy/gh-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gh-web
```

### nginx / Caddy

Node 监听 `127.0.0.1:8787`，TLS 交给前面一层。模板见 `deploy/nginx-proxy.conf`：

```bash
sudo cp deploy/nginx-proxy.conf /etc/nginx/conf.d/zz-gh-web.conf
sudo sed -i 's/gh.example.com/你的域名/g' /etc/nginx/conf.d/zz-gh-web.conf
sudo certbot --nginx -d 你的域名
sudo nginx -t && sudo systemctl reload nginx
```

Caddy：

```
gh.example.com {
    reverse_proxy 127.0.0.1:8787
}
```

nginx 配置文件名加 `zz-` 前缀。`conf.d` 按字母序加载，第一个监听 80 端口的 server 会成为默认服务器，名字排前会接管未匹配的 Host。

`deploy/gh-web.conf` 是另一套生产配置：nginx 直接反代 `api.github.com` 并用 `proxy_cache` 落盘，静态文件由 nginx 直出。依赖一个额外的免密登录服务，不是开箱即用。配套安装脚本：

```bash
GHW_DOMAIN=gh.example.com sudo -E bash deploy/install.sh
GHW_DOMAIN=gh.example.com sudo -E bash deploy/install.sh --with-cert
```

## 配置

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `8787` | 监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `GHW_PASSWORD` | 空 | 访问口令，留空不设防 |
| `GHW_ROOT` | `./web` | 站点根目录 |
| `GHW_API_ORIGIN` | `https://api.github.com` | 上游地址 |
| `GHW_CACHE_TTL` | `300` | API 缓存秒数 |
| `GHW_CACHE_MAX_MB` | `128` | API 内存缓存上限 |
| `GHW_UPSTREAM_TIMEOUT` | `20000` | 上游超时，毫秒 |
| `GHW_TLS_CERT` / `GHW_TLS_KEY` | 空 | 由 Node 直接提供 HTTPS 时使用 |

口令支持 Cookie（`/login`，一年有效）和 Basic Auth（用户名随意，密码为 `GHW_PASSWORD`）。`/logout` 清除 Cookie，`GET /healthz` 用于探活。

HTTPS 三种做法：Caddy 自动签发；nginx + certbot；Node 直接上 TLS（设上面两个变量，证书自行续期）。

## 说明

- Token 只存在浏览器 `localStorage`，服务端不接收、不落盘、不打日志。
- 浏览器发 `X-GH-Token`，服务端翻成 `Authorization: Bearer` 转发。不能直接用 `Authorization`，会和站点口令校验冲突。
- 缓存键用 token 的 FNV-1a 摘要（`X-GH-Cache-Bucket`），不放原始 token。缓存按摘要分桶，不同凭证不串。
- GitHub 响应带 `Cache-Control: private`，缓存层需要显式忽略。
- 搜索接口限流单独计算：未登录约 10 次/分，登录后约 30 次/分。热门页不做自动轮询。
- 评论、合并 PR、标记通知已读等操作会真实写入 GitHub。
- 列表行在 680px 以下换行，新增列表页复用 `.row` / `.row-main` / `.row-side`。

## 开发

改前端无需构建，刷新即可。测试需要先安装依赖：

```bash
npm install
node tests/compile-check.js
node tests/render-check.js
node tests/img-check.js
node tests/mobile-check.js
node tests/server-check.js
```

修改 `web/` 下任何文件后递增资源版本号，否则浏览器会继续用 7 天强缓存的旧文件：

```bash
bash deploy/bump.sh
```

## 已知限制

不支持 Actions 实时日志、Codespaces、Copilot、Discussions、Projects、Marketplace、完整账号设置和 Web IDE。这些依赖 GitHub 私有接口或前端专有协议。

## License

MIT
