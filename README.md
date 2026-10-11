# GH·WEB

GitHub 的高速只读镜像。跑在自己的服务器上，只为一个人服务。

打开 `https://ghs.0lt.top/`，贴上 Personal Access Token 就能用。

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

1. **不能直接收 `Authorization` 头**。浏览器发 `Authorization: Bearer <PAT>`，而站点的 basic auth 也用这个头——nginx 会先拿它去做口令校验，请求直接被 401 拒掉。所以前端改发自定义头 `X-GH-Token`，由 nginx 翻成 `Bearer` 转发给 GitHub。
2. **缓存键里不能放原始 token**。nginx 会把缓存键明文写进磁盘上的缓存文件（`KEY: gh|ghp_xxx|GET|/user`）。前端先在本地算一个不可逆摘要（FNV-1a 双路，16 个十六进制字符）放进 `X-GH-Cache-Bucket`，缓存键只用摘要。既能把不同凭证的缓存分开，又不留凭证。
3. **必须显式忽略上游的 `Cache-Control: private`**。GitHub 的响应都带这个头，不忽略就什么都缓存不上。


---

## 架构

```
浏览器 ──► ghs.0lt.top ──┬─ 静态资源：/opt/gh-web/web 本地直出
   (basic auth)         └─ /api/*：nginx proxy_cache ──► api.github.com
                                                  └─ 命中则 8ms 返回，未命中回源并落盘
```

前端是零构建的 Vue 3 单页应用：`vendor/vue.global.prod.js` 从本地加载，视图组件拆成独立文件按需引入，没有打包步骤——改完刷新即生效。

```
/opt/gh-web/
├── web/                     站点根目录（nginx root）
│   ├── index.html           外壳 + 脚本装载顺序
│   ├── styles/main.css      设计系统（全部样式）
│   ├── app/
│   │   ├── util.js          格式化 / markdown / 本地存储 / 提示条
│   │   ├── api.js           token 保管 + 缓存传输 + 全部 GitHub 接口
│   │   ├── components.js    图标集 + 复用组件（代码块、diff、分页器…）
│   │   ├── app.js           hash 路由 + 侧边栏 + 顶栏 + 挂载
│   │   └── views/*.js       22 个视图，一个文件一个页面
│   └── vendor/              vue / highlight.js / marked（本地副本）
├── deploy/
│   ├── gh-web.conf          nginx 站点配置（含缓存层）
│   └── install.sh           幂等安装脚本，装到 conf.d/zz-gh-web.conf
└── tests/
    ├── compile-check.js     编译全部 37 个模板，抓模板语法错误
    └── render-check.js      jsdom 真跑 22 条路由 + 内容断言
```

---

## 安全

- **Token 只存在浏览器 `localStorage`**。服务端从不接收、不落盘、不打日志。
- **全站 basic auth**（`/etc/nginx/.ghweb.htpasswd`）。URL 外泄也进不来，且拦住了 ACME 之外的路径。
- **`access_log off`**。basic auth 用户名和请求路径都不留痕。
- **两个限流区**：站点 30 r/s burst 100（只用来拦口令爆破；首屏要并发拉 31 个资源，早先设 2 r/s 会把正常访问打成 503/429），API 6 r/s burst 20（防手滑打爆 5000/h 额度）。命中返回 429 而非 503，便于与「服务不可用」区分。
- 缓存按 token 分桶，不会把 A 的响应喂给 B。

唯一手工留存的秘密：`/etc/nginx/.ghweb.htpasswd`（已纳入加密备份包）。重置方式——删掉它，重跑 `install.sh`，会打印新口令。

## 部署

```bash
sudo bash /opt/gh-web/deploy/install.sh              # 常规安装/更新
sudo bash /opt/gh-web/deploy/install.sh --with-cert  # 首次签发证书
```

幂等，可反复执行；覆盖 nginx 配置前会自动留 `.bak-install-<ts>`。

DNS 需要一条 A 记录：`ghs.0lt.top` → 本机公网 IP。**签发证书时必须灰云直连**，签完再考虑开橙云。

> ⚠️ **站点配置文件名必须保持 `zz-` 前缀**（`/etc/nginx/conf.d/zz-gh-web.conf`）。
> nginx 按 `conf.d` 字母序加载，**第一个**监听 80 端口的 `server` 会顺带成为该端口的默认服务器。
> 若叫 `gh-web.conf`，它会抢在 `memhub.conf` 前面，接管所有未匹配的 Host——
> 未知域名从原来的 404 变成 401，属于悄悄改变了既有站点的行为。`install.sh` 已按 `zz-` 命名安装。

## 测试

```bash
cd /opt/gh-web && npm i                       # 只需一次
node tests/compile-check.js                   # 模板语法
node tests/render-check.js                    # 路由渲染 + 内容断言
node tests/render-check.js '#/some/route'     # 单条路由
```

`render-check.js` 用 jsdom 挂载真实 DOM、喂假数据、逐条路由检查「无控制台错误 + 关键内容出现」。它抓到过真 bug——比如模板字符串里 `\/` 反斜杠被吃掉导致正则非法、以及 `window.VIEWS` 在视图脚本加载时还不存在。

## 能力边界

**能做的**（覆盖 gh-mcp 全部只读能力）
仓库浏览、目录树与文件查看（语法高亮 + Markdown 渲染）、提交历史与单提交 diff、议题与 PR 列表/详情/时间线/评论、评审状态、PR 文件变更与检查项、分支与标签、Release 与附件下载、代码与议题搜索、用户/组织主页、星标、通知（可标已读）、Actions 运行与任务列表、两个引用之间的比较。

**做不了的**（依赖 GitHub 私有接口或前端专有协议）
Actions 实时日志流、Codespaces、Copilot、Discussions、Projects、Marketplace、完整的账号设置后台、Web IDE。

**有副作用但已实现**：评论、开关议题、合并/关闭 PR、加/取消星标、标记通知已读——这些会**真实写入 GitHub**，界面上都有二次确认或明确提示。

---

## 设计说明

视觉上刻意不用现在流行的那套：没有渐变、没有玻璃拟态、没有圆角大卡片堆叠、没有 emoji、没有紫色。

走的是「工程图纸」路线——暖纸底（`#fbfaf7`）配墨黑字（`#171614`），发丝级描边（1px `#e0ddd4`）代替阴影分层，等宽字体（JetBrains Mono）承担所有数字与标识符以保证列对齐，唯一的强调色是烧橙（`#c2410c`），只用在「当前项」和「需要你注意」的地方。

配色审计脚本在 `tests/`（HSV 判定 + emoji 码点扫描），当前结果：紫色 0 处、渐变 0 处、emoji 0 处。

---

## 移动端适配

### ⚠️ 列表行的坑（最容易踩）

`.row-side`（星标/复刻/时间/按钮）是 `flex:none`（**不收缩**）。在窄屏上它会把左侧
`.row-main` 挤到只剩一个字的宽度 —— 表现为仓库名显示成 `o…`、`s…`，描述被压成竖排。

修法在 `@media(max-width:680px)`：让 `.row-side` **整体换行**到第二行：

```css
.row{flex-wrap:wrap}
.row-side{flex:1 1 100%; order:9; justify-content:flex-start}
```

同时手机上标题改为允许折行（`white-space:normal`），因为仓库名普遍较长，
用省略号会丢信息。`@media(max-width:420px)` 再隐藏「复刻数」（`.u-fork`）。

**新增任何列表页时，务必复用 `.row` / `.row-main` / `.row-side` 这套结构**，
否则会重新踩这个坑。

### `.stat-inline` 的行内/块级差异

`.stat-inline .s .n` / `.l` 必须纵向排列。但有的页面写成 `<div class="s">`、
有的写成 `<span class="s">` —— 行内元素不会换行，会让「1,153」和「匹配项目」粘在一起。
CSS 里已统一加 `display:block`，两种写法都正确。

### 顶栏

手机上用 `.hide-sm` 隐藏次要读数（缓存命中率、额度条），只留面包屑与刷新按钮，
避免一行塞太多东西。

### 测试

`tests/mobile-check.js` 把视口固定为 **375px**（iPhone SE/12 mini 级）渲染
`#/trends`、`#/repos`、`#/`，断言列表行结构完整。这是**回归测试**：
改列表行结构或 CSS 后被挤压会立刻暴露。

---

## 登录：一次输入，一年免密

**不再每次弹浏览器密码框。** 访问 `https://ghs.0lt.top/` 会跳到本站登录页，
输入一次访问令牌 → 下发一个 **HttpOnly Cookie（有效期 1 年）**，之后自动登录。

```
访问令牌：[访问令牌已移除]     ← 与 basic auth 密码是两个不同的东西
```

### 实现（`/opt/ghweb-auth/`，纯标准库，监听 127.0.0.1:9093）

| 接口 | 用途 |
|---|---|
| `/_verify` | 供 nginx `auth_request` 调用：Cookie 正确 204，否则 401 |
| `/login` | 登录页；带 `?t=<令牌>` 正确则下发 Cookie 并 302 回首页 |
| `/logout` | 清 Cookie |

- Cookie 值 = `HMAC(secret, "ghw-session-v1")`，**不是令牌本身** —— 即使 Cookie 泄露也无法反推令牌。
- **无状态**：不存会话，校验时现算现比；轮换 secret 即可让所有设备立即失效。
- nginx 侧用 `satisfy any` 同时保留 `auth_request` 与 `auth_basic`：
  **Cookie 或原密码任选其一都能进**，认证服务故障时不会被自己锁在门外。

### 令牌轮换

```bash
bash /opt/gh-web/deploy/rotate.sh                 # 换令牌 + 换 secret（踢掉所有设备）
bash /opt/gh-web/deploy/rotate.sh --keep-session  # 只换令牌，已登录设备不受影响
```

### ⚠️ 别把我锁在外面

改这块配置时务必确认**两条路至少有一条通**：
```bash
curl -sk -o /dev/null -w '%{http_code}\n' -u "gh-web:<密码>" https://ghs.0lt.top/   # 期望 200
curl -sk -o /dev/null -w '%{http_code}\n' https://ghs.0lt.top/login                 # 期望 200
```
`deploy/gh-web.conf` 里 `location @ghw_gate` 负责把未鉴权请求 302 到 `/login`
（而不是像原来那样弹 401 原生密码框）。

---

## 热门项目页（`#/trends`）

GitHub **没有**官方的 trending 接口（github.com/trending 是网页端私有渲染，无 API）。
本页用**搜索语法近似**，与 gh-mcp 的 `gh_trending` 同源但做了两处修正：

| 模式 | 搜索式 | 排序 |
|---|---|---|
| 新晋 | `created:>=<窗> stars:>=N fork:false archived:false` | 星标 |
| 活跃 | `pushed:>=<窗> stars:>=N fork:false archived:false` | 最近更新 |

时间窗：今日 / 本周(7d) / 本月(30d) / 近 90 天。星标门槛：新晋 5/20/50/100，活跃 300/300/150/80。

### ⚠️ 两个必须记住的坑（都实测过）

1. **不能用 `stars:<=N` 收窄**。GitHub 搜索不认这个语法，会把它当成**普通文本词**去匹配——
   结果是**暴涨**而不是收窄（实测 11 万 → 3.4 亿，巨头照旧霸榜）。
   正确的区间写法是 `stars:a..b`。

2. **「活跃」不能写成 `created:>=窗 + pushed:>=窗`**。时间窗内新建的仓库，其推送时间必然也落在窗内，
   条件完全冗余——实测结果与「新晋」一字不差（都是 1151 条）。
   真正的「活跃」应只看 `pushed:>=窗`（不限创建时间），再配星标门槛滤掉索引/机器人仓库，
   并按 `sort=updated` 排序，榜单才有新鲜感。

### 限流

搜索接口限流单独计算且严格（未登录约 10 次/分，登录后约 30 次/分），
**远低于**其余接口的 5000 次/小时。因此本页：

- 不做自动轮询；
- 切换筛选即发一次请求（每次都是新的搜索式，`noMem` 不走内存缓存）；
- nginx 的 `proxy_cache` 对相同搜索式仍有效（二次请求 `x-ghw-cache: HIT`）；
- 命中 403/429 时，页面上会给出「等一分钟再试」的明确提示，而不是抛 HTTP 403。

---

## 备份

`/opt/gh-web` 已登记进 `ssh-git-autosync`，每 5 分钟镜像到私有仓 `lszyk26/gh-web`（`node_modules` 除外）。nginx 配置、htpasswd 随 `server-secrets-backup` 的 AES-256 加密包一起走。

---

## 前端资源失效：`?v=` 版本号（改完必做）

nginx 给 js/css/字体发的是 `Cache-Control: public, max-age=604800, immutable`（7 天强缓存），
浏览器在这 7 天内**不会回源校验**。所以**改完 `web/` 下的任何文件后必须递增版本号**：

```bash
bash /opt/gh-web/deploy/bump.sh          # 用时间戳
bash /opt/gh-web/deploy/bump.sh 20261011d  # 或指定
```

`bump.sh` 会把 `index.html` 里全部 `?v=<旧版本>` 换成新版本，浏览器随即重新拉取所有前端资源。
静态文件由 nginx 直接从磁盘读取，**不需要 reload**。

> 历史教训：首版给资源发了 `immutable` 却没有版本号，改完前端后浏览器一直用旧 JS，
> 出现「图标不显示 / 过渡动画消失 / 新旧代码混用」等诡异现象，且极难排查。

---

## 已知的「多根模板」与过渡

`run / commit / compare / issue / pull / user` 这 6 个详情页的模板是
`v-if 加载态` / `v-else-if 错误态` / `v-else 正文` 三个并列根。

Vue 的 `<transition>` 要求直接子节点**单根**，否则过渡会**静默失效**（生产版无告警）。
因此 `app.js` 里过渡内套了一层单根 `.view-host` 作为 carrier，内层组件根节点数不再影响过渡。

`tests/root-check.js` 会列出当前的多根视图清单，便于日后新增页面时留意。
（该脚本只作提示，恒返回 0 —— 有 carrier 层兜底，多根本身不影响功能。）

---

## 测试

```bash
node /opt/gh-web/tests/compile-check.js   # 38 个模板语法
node /opt/gh-web/tests/render-check.js    # jsdom 跑 22 条路由 + 内容断言
node /opt/gh-web/tests/root-check.js      # 多根视图清单
```

`render-check.js` 会从 `app/views/` **读目录**加载脚本，所以它无法发现
「`index.html` 漏引某个 view」这类问题。历史上 `views/user.js` 就漏引过，
导致用户主页错落成概览页。**新增视图后请确认 `index.html` 里也加了对应的 `<script>`。**
（对照命令：`diff <(grep -oE 'app/views/[a-z]+\.js' web/index.html | sed 's|.*/||' | sort) <(ls web/app/views/*.js | sed 's|.*/||' | sort)`）

