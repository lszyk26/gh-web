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
- **两个限流区**：站点 2 r/s（拦口令爆破），API 6 r/s（防手滑打爆 5000/h 额度）。
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

## 备份

`/opt/gh-web` 已登记进 `ssh-git-autosync`，每 5 分钟镜像到私有仓 `lszyk26/gh-web`（`node_modules` 除外）。nginx 配置、htpasswd 随 `server-secrets-backup` 的 AES-256 加密包一起走。
