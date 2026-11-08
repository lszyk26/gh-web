# GH·WEB

GitHub 的高速只读镜像。自己部署，自己用。

打开站点，填入自己的 Personal Access Token，就能以接近本地应用的速度浏览仓库、提交、议题、PR、Actions、通知。

同一份代码可以在三种地方跑：

| 在哪跑 | 怎么跑 | 适合 |
|---|---|---|
| 手机 | Termux + Node | 随身、没有服务器时临时用 |
| 电脑 | Windows / macOS / Linux + Node | 本机使用、内网共享 |
| 服务器 | Node、systemd、Docker、nginx | 长期在线、配自己的域名 |

服务端是**一个文件、零运行时依赖**的 `server.js`（Node 18+），只做三件事：发静态文件、把 `/api/*` 反代到 `api.github.com` 并缓存、可选的访问口令。

---

## 三步开始

```bash
git clone https://github.com/lszyk26/gh-web.git
cd gh-web
node server.js
```

打开 `http://localhost:8787/`，填入 GitHub Token。

> 公开到公网前一定要设口令：
> ```bash
> GHW_PASSWORD='你的口令' node server.js
> ```

---

## 部署

### 一、手机（Termux）

适合 Android。Termux 请从 **F-Droid** 或 GitHub Release 安装，Google Play 版本已停止更新。

```bash
# 1. 装环境
pkg update && pkg install -y nodejs-lts git

# 2. 取代码
git clone https://github.com/lszyk26/gh-web.git
cd gh-web

# 3. 启动（脚本会自动检查 Node 版本、申请唤醒锁）
GHW_PASSWORD='你的口令' bash deploy/termux.sh
```

- 手机浏览器：`http://127.0.0.1:8787/`
- 同一 WiFi 的电脑：`http://<手机局域网 IP>:8787/`（IP 在「设置 → 关于手机 → 状态信息」或 `ifconfig` 里看）
- 想让它在后台常驻：

```bash
nohup node server.js > gh-web.log 2>&1 &
termux-wake-lock          # 阻止系统在息屏后冻结
```

> Termux 卸载或清理数据会丢 `node_modules` 之外的所有东西，仓库本身建议放 `~/storage` 之外再定期备份。

### 二、电脑（Windows / macOS / Linux）

先装 **Node.js 18 或更高版本**：<https://nodejs.org/>

**macOS / Linux**

```bash
git clone https://github.com/lszyk26/gh-web.git
cd gh-web
GHW_PASSWORD='你的口令' node server.js
```

**Windows（PowerShell）**

```powershell
git clone https://github.com/lszyk26/gh-web.git
cd gh-web
$env:GHW_PASSWORD = "你的口令"
node server.js
```

**Windows（CMD）**

```cmd
set GHW_PASSWORD=你的口令
node server.js
```

也可以把配置写进 `.env`（复制 `.env.example`），之后直接 `node server.js` 即可。手机、电脑、服务器都认这个文件。

局域网里的其它设备访问 `http://<这台电脑的 IP>:8787/`。Windows 首次运行可能弹出防火墙提示，允许「专用网络」即可。

### 三、服务器

#### 方式 A：Node + systemd（推荐）

```bash
sudo mkdir -p /opt/gh-web
sudo git clone https://github.com/lszyk26/gh-web.git /opt/gh-web
cd /opt/gh-web

# 写配置
sudo cp .env.example .env
sudo sed -i "s/change-me/换成你的口令/" .env
sudo chmod 640 .env
sudo chown -R www-data:www-data /opt/gh-web

# 装服务
sudo cp deploy/gh-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gh-web
sudo systemctl status gh-web
```

默认只监听 `0.0.0.0:8787`。要绑域名和 HTTPS，在前面放一层 nginx 或 Caddy，见方式 C。

#### 方式 B：Docker

```bash
git clone https://github.com/lszyk26/gh-web.git
cd gh-web
GHW_PASSWORD='你的口令' docker compose up -d
```

或者不用 compose：

```bash
docker build -t gh-web .
docker run -d --name gh-web -p 8787:8787 \
  -e GHW_PASSWORD='你的口令' \
  --restart unless-stopped gh-web
```

镜像基于 `node:22-alpine`，不执行 `npm install`（运行时零依赖），构建很快。容器带 `/healthz` 健康检查。

#### 方式 C：nginx / Caddy 反代（配域名与 HTTPS）

Node 只监听 `127.0.0.1:8787`，由 nginx 负责 TLS。模板在 `deploy/nginx-proxy.conf`：

```bash
sudo cp deploy/nginx-proxy.conf /etc/nginx/conf.d/zz-gh-web.conf
sudo sed -i 's/gh.example.com/你的域名/g' /etc/nginx/conf.d/zz-gh-web.conf
sudo certbot --nginx -d 你的域名
sudo nginx -t && sudo systemctl reload nginx
```

Caddy 更简单，`Caddyfile` 两行：

```
gh.example.com {
    reverse_proxy 127.0.0.1:8787
}
```

> ⚠️ nginx 配置文件名建议带 `zz-` 前缀。nginx 按 `conf.d` 字母序加载，**第一个**监听 80 端口的 `server` 会顺带成为该端口的默认服务器；取名靠前会接管所有未匹配的 Host，悄悄改变既有站点的行为。

#### 方式 D：生产用的 nginx 直连配置（进阶）

`deploy/gh-web.conf` 是本站线上在用的配置：nginx 直接反代 `api.github.com` 并用 `proxy_cache` 落盘缓存，静态资源也由 nginx 直出，性能比 Node 中转略好。它依赖一个额外的免密登录服务（`auth_request`），不是开箱即用，适合想深度定制的人参考。

`deploy/install.sh` 是配套的幂等安装脚本（`--with-cert` 首次签发证书）。

### 配置项

环境变量（也可写进 `.env`）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `8787` | 监听端口 |
| `HOST` | `0.0.0.0` | 监听地址；只给本机用可设 `127.0.0.1` |
| `GHW_PASSWORD` | 空 | 访问口令。**留空 = 不设防**，只建议本机/局域网 |
| `GHW_ROOT` | `./web` | 站点根目录 |
| `GHW_API_ORIGIN` | `https://api.github.com` | 上游地址（可指向反向代理） |
| `GHW_CACHE_TTL` | `300` | API 缓存秒数 |
| `GHW_CACHE_MAX_MB` | `128` | API 内存缓存上限 |
| `GHW_UPSTREAM_TIMEOUT` | `20000` | 上游超时（毫秒） |
| `GHW_TLS_CERT` / `GHW_TLS_KEY` | 空 | 直接由 Node 提供 HTTPS 时使用 |

口令验证支持两种方式：

- **Cookie**：访问 `/login` 输入一次口令，下发一年有效的 HttpOnly Cookie；
- **Basic Auth**：用户名随意，密码为 `GHW_PASSWORD`，方便 `curl -u`。

两者任选其一即可。`/logout` 清除 Cookie。健康检查：`GET /healthz`。

### HTTPS

三种选择，按省事程度排：

1. **Caddy**：自动申请续期证书，两行配置。
2. **nginx + certbot**：`deploy/nginx-proxy.conf` 已按这个套路写好。
3. **Node 直接上 TLS**：设置 `GHW_TLS_CERT` / `GHW_TLS_KEY`。证书要自己续期，适合已有证书的场景。

---

## 使用

1. 打开站点，在登录页填入 **GitHub Personal Access Token**（不是账号密码）。
2. Token 需要这些权限：`repo`、`read:user`、`notifications`。快捷创建入口在登录页上有链接。
3. Token 只保存在浏览器的 `localStorage`，由前端直接发给 `api.github.com`（经本地代理转发），服务端不落盘、不打日志。

只读浏览不需要写权限；要发表评论、合并 PR、标记通知已读，才需要 `repo` 权限。这些操作会**真实写入 GitHub**，界面上都有二次确认。

---

## 为什么快

官方网页慢在几处：整页脚本要现场解析执行、接口请求呈瀑布式串行、头像徽章等杂项请求拖后腿。

这个站的做法是：

| 手段 | 效果（实测） |
|---|---|
| 页面与前端资源全部本地直出 | 静态资源毫秒级，不加载 GitHub 的任何脚本 |
| 反向代理层缓存 `api.github.com` 响应 | 命中 **8–14 ms**，直连约 **90 ms**，约 8 倍 |
| 内存缓存 + 请求去重 | 同一份数据在一次会话里只回源一次 |
| 只渲染可见内容 | 大文件、二进制、超长 diff 都有降级处理 |

缓存层有三个容易踩的坑，都已处理：

1. **不能直接收 `Authorization` 头**。浏览器发 `Authorization: Bearer <PAT>`，而站点自己的口令验证也用这个头——会先被口令校验拦掉。所以前端改发自定义头 `X-GH-Token`，由服务端翻成 `Bearer` 转发给 GitHub。
2. **缓存键里不能放原始 token**。落盘缓存会把键明文写进文件（`KEY: gh|ghp_xxx|GET|/user`）。前端先在本地算一个不可逆摘要（FNV-1a 双路，16 个十六进制字符）放进 `X-GH-Cache-Bucket`，缓存键只用摘要。既能把不同凭证的缓存分开，又不留凭证。
3. **必须显式忽略上游的 `Cache-Control: private`**。GitHub 的响应都带这个头，不忽略就什么都缓存不上。

---

## 架构

```
浏览器 ──► 你的域名 ──┬─ 静态资源：web/ 本地直出
   (可选口令)          └─ /api/*：缓存层 ──► api.github.com
                                  命中则毫秒返回，未命中回源并缓存
```

前端是零构建的 Vue 3 单页应用：`vendor/vue.global.prod.js` 从本地加载，视图组件拆成独立文件按需引入，没有打包步骤——改完刷新即生效。

```
gh-web/
├── server.js                自包含服务器（静态 + API 代理 + 口令）
├── web/                     站点根目录
│   ├── index.html           外壳 + 脚本装载顺序
│   ├── styles/main.css      设计系统（全部样式）
│   ├── app/
│   │   ├── util.js          格式化 / markdown / 本地存储 / 提示条
│   │   ├── api.js           token 保管 + 缓存传输 + 全部 GitHub 接口
│   │   ├── components.js    图标集 + 复用组件（代码块、diff、分页器…）
│   │   ├── app.js           hash 路由 + 侧边栏 + 顶栏 + 挂载
│   │   └── views/*.js       各页面视图，一个文件一个页面
│   └── vendor/              vue / highlight.js / marked（本地副本）
├── deploy/
│   ├── termux.sh            手机一键启动
│   ├── gh-web.service       systemd 服务
│   ├── nginx-proxy.conf     nginx 反代模板
│   ├── gh-web.conf          生产用 nginx 直连配置（进阶）
│   ├── install.sh           幂等安装脚本
│   ├── rotate.sh            轮换访问口令 / 会话密钥
│   └── bump.sh              递增前端资源版本号
├── tests/                   模板编译、路由渲染、图片改写、移动端回归
├── Dockerfile
├── compose.yaml
└── .env.example
```

---

## 安全

- **Token 只存在浏览器 `localStorage`**。服务端从不接收、不落盘、不打日志。
- **口令可选但公网必备**。Cookie 值是 `HMAC-SHA256(口令, 固定串)`，不是口令本身；改口令即可让所有设备立即失效。
- **缓存按凭证摘要分桶**，不会把 A 的响应喂给 B。
- **静态文件有目录穿越防护**，`/api` 只转发白名单请求头。
- 生产 nginx 配置里 `access_log off`，basic auth 用户名和请求路径都不留痕。
- 两个限流区（仅生产 nginx 配置）：站点 30 r/s burst 100（只用来拦口令爆破；首屏要并发拉 31 个资源），API 6 r/s burst 20（防手滑打爆 5000/h 额度）。命中返回 429 而非 503，便于与「服务不可用」区分。

---

## 开发与测试

改前端不需要构建，刷新即可。测试需要一次性安装开发依赖：

```bash
npm install --omit=optional        # 只装 devDependencies 里的 jsdom 与 Vue 编译器
node tests/compile-check.js        # 模板语法
node tests/render-check.js         # jsdom 跑全部路由 + 内容断言
node tests/render-check.js '#/some/route'
node tests/img-check.js            # Markdown 相对图片/链接的改写
node tests/mobile-check.js         # 375px 视口下的列表行回归
node tests/server-check.js         # 服务器端到端：静态/口令/代理/缓存（23 项断言）
node tests/root-check.js           # 多根视图清单（提示用）
```

`render-check.js` 用 jsdom 挂载真实 DOM、喂假数据、逐条路由检查「无控制台错误 + 关键内容出现」。它抓到过真 bug——比如模板字符串里 `\/` 反斜杠被吃掉导致正则非法、以及 `window.VIEWS` 在视图脚本加载时还不存在。

### 改完前端记得递增版本号

生产 nginx 给 js/css/字体发的是 `Cache-Control: public, max-age=604800, immutable`（7 天强缓存），浏览器在这 7 天内**不会回源校验**。所以改完 `web/` 下的任何文件后必须递增版本号：

```bash
bash deploy/bump.sh            # 用时间戳
bash deploy/bump.sh 20261108f  # 或指定
```

`bump.sh` 会把 `index.html` 里全部 `?v=<旧版本>` 换成新版本。静态文件由服务器直接从磁盘读取，不需要重启。

> 历史教训：首版给资源发了 `immutable` 却没有版本号，改完前端后浏览器一直用旧 JS，出现「图标不显示 / 过渡动画消失 / 新旧代码混用」等诡异现象，且极难排查。

---

## 能力边界

**能做的**：仓库浏览、目录树与文件查看（语法高亮 + Markdown 渲染）、提交历史与单提交 diff、议题与 PR 列表/详情/时间线/评论、评审状态、PR 文件变更与检查项、分支与标签、Release 与附件下载、代码与议题搜索、用户/组织主页、星标、通知（可标已读）、Actions 运行与任务列表、两个引用之间的比较。

**做不了的**：Actions 实时日志流、Codespaces、Copilot、Discussions、Projects、Marketplace、完整的账号设置后台、Web IDE——这些依赖 GitHub 私有接口或前端专有协议。

**有副作用但已实现**：评论、开关议题、合并/关闭 PR、加/取消星标、标记通知已读。这些会**真实写入 GitHub**。

---

## 设计说明

视觉上刻意不用现在流行的那套：没有渐变、没有玻璃拟态、没有圆角大卡片堆叠、没有 emoji、没有紫色。

走的是「工程图纸」路线——暖纸底（`#fbfaf7`）配墨黑字（`#171614`），发丝级描边（1px `#e0ddd4`）代替阴影分层，等宽字体（JetBrains Mono）承担所有数字与标识符以保证列对齐，唯一的强调色是烧橙（`#c2410c`），只用在「当前项」和「需要你注意」的地方。

配色审计脚本在 `tests/`（HSV 判定 + emoji 码点扫描），当前结果：紫色 0 处、渐变 0 处、emoji 0 处。

---

## 移动端适配

### 列表行的坑（最容易踩）

`.row-side`（星标/复刻/时间/按钮）是 `flex:none`（**不收缩**）。在窄屏上它会把左侧 `.row-main` 挤到只剩一个字的宽度——表现为仓库名显示成 `o…`、`s…`，描述被压成竖排。

修法在 `@media(max-width:680px)`：让 `.row-side` **整体换行**到第二行：

```css
.row{flex-wrap:wrap}
.row-side{flex:1 1 100%; order:9; justify-content:flex-start}
```

同时手机上标题改为允许折行（`white-space:normal`），因为仓库名普遍较长，用省略号会丢信息。`@media(max-width:420px)` 再隐藏「复刻数」（`.u-fork`）。

**新增任何列表页时，务必复用 `.row` / `.row-main` / `.row-side` 这套结构**，否则会重新踩这个坑。

### 顶栏

手机上用 `.hide-sm` 隐藏次要读数（缓存命中率、额度条），只留面包屑与刷新按钮，避免一行塞太多东西。

### 测试

`tests/mobile-check.js` 把视口固定为 **375px**（iPhone SE/12 mini 级）渲染 `#/trends`、`#/repos`、`#/`，断言列表行结构完整。这是**回归测试**：改列表行结构或 CSS 后被挤压会立刻暴露。

---

## 一些踩过的坑

### Markdown 里的相对图片与链接

README 写成相对路径是 GitHub 上的常规写法：

```html
<img src="assets/showcase/hero.png" width="100%" />
```

但 SPA 里浏览器按**当前页面地址**解析相对路径，于是会去要 `https://你的站点/<owner>/<repo>/assets/...` → 命中 SPA 兜底 → 图片全部破图。

做法（`util.js` + `components.js`）：

- `U.rewriteImg(html)` / `U.rewriteLinks(html)`：把相对路径改写为绝对地址，图片 → `raw.githubusercontent.com/<o>/<r>/<ref>/<path>`，链接 → 站内代码路由 `#/<o>/<r>/code/blob/<ref>/<path>`（README 里写死的本仓 GitHub 绝对链接也一并拉回站内）。
- 在 `U.md()` 返回前统一调用，**必须在 marked 解析之后**。
- 仓库上下文由 `<markdown>` 组件的 `owner` / `repo` / `branch` 属性传入。

> ⚠️ **别把那个属性叫 `ref`**：`ref` 是 Vue 的保留属性，写在组件上**不会**作为 prop 传进去，只会静默丢失——表现就是「上下文永远为空、图片照样破」。

> ⚠️ **`tests/render-check.js` 里必须补 `w.TextDecoder`**：jsdom 的 `window` 不带 `TextDecoder`，而 `repo.js` 用它解 base64 README，缺了会被 `catch` 成空串 → **静默**落到「这个仓库没有 README」的空状态，测试却因为页面里另有「README」字样而假通过。

### 多根模板与过渡

`run / commit / compare / issue / pull / user` 这些详情页的模板是 `v-if 加载态` / `v-else-if 错误态` / `v-else 正文` 三个并列根。

Vue 的 `<transition>` 要求直接子节点**单根**，否则过渡会**静默失效**（生产版无告警）。因此 `app.js` 里过渡内套了一层单根 `.view-host` 作为 carrier。

`tests/root-check.js` 会列出当前的多根视图清单，便于新增页面时留意。

### 视图脚本漏引

`render-check.js` 会从 `app/views/` **读目录**加载脚本，所以它无法发现「`index.html` 漏引某个 view」这类问题。历史上 `views/user.js` 就漏引过，导致用户主页错落成概览页。**新增视图后请确认 `index.html` 里也加了对应的 `<script>`。**

---

## 热门项目页

GitHub **没有**官方的 trending 接口（github.com/trending 是网页端私有渲染，无 API）。本页用**搜索语法近似**：

| 模式 | 搜索式 | 排序 |
|---|---|---|
| 新晋 | `created:>=<窗> stars:>=N fork:false archived:false` | 星标 |
| 活跃 | `pushed:>=<窗> stars:>=N fork:false archived:false` | 最近更新 |

时间窗：今日 / 本周(7d) / 本月(30d) / 近 90 天。

两个必须记住的坑：

1. **不能用 `stars:<=N` 收窄**。GitHub 搜索不认这个语法，会把它当成普通文本词去匹配——结果是**暴涨**而不是收窄（实测 11 万 → 3.4 亿）。正确的区间写法是 `stars:a..b`。
2. **「活跃」不能写成 `created:>=窗 + pushed:>=窗`**。时间窗内新建的仓库，其推送时间必然也落在窗内，条件完全冗余——实测结果与「新晋」一字不差。真正的「活跃」应只看 `pushed:>=窗`，再配星标门槛滤掉索引/机器人仓库，并按 `sort=updated` 排序。

搜索接口限流单独计算且严格（未登录约 10 次/分，登录后约 30 次/分），远低于其余接口的 5000 次/小时。因此本页不做自动轮询，切换筛选才发请求，命中 403/429 时给出「等一分钟再试」的明确提示。

---

## 许可

MIT
