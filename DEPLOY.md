# gh-web

> 本文件由 `ssh-mcp` 自动生成（`/opt/ssh-mcp/gen_docs.py`），随代码一起备份；
> 服务器状态变化后重新生成即可，不要手改。

## 一、这是什么

`/opt/gh-web` 的自动备份仓库。

- 技术栈：**Node/前端 / Docker / Node 服务**
- 服务器路径：`/opt/gh-web`
- GitHub：`lszyk26/gh-web`
- 同步：ssh-mcp 自动同步，排除 `node_modules`、`*.bak*`、`*.db`、密钥等

## 二、版本状态

| 项 | 值 |
|---|---|
| 分支 | `main` |
| 最新提交 | `6cb0721 2026-11-23 dl: 下载主路改回页面同源 /dl/（源站 ghdl），CF 的 dl.0lt.top 降为自动兜底；探测加超时，避免链路被掐时卡死 (v=20261123a)` |
| 远端 | `https://github.com/lszyk26/gh-web.git` |

## 三、目录结构

### `/opt/gh-web`

```
.baksnapshot-20261011043229/
.baksnapshot-20261011050823-mobile/
deploy/
docs/
tests/
web/
.dockerignore
.env.example
.gitignore
Dockerfile
LICENSE
README.md
compose.yaml
package-lock.json
package.json
server.js
```

## 四、怎么跑起来

没有登记 systemd 服务，进程可能是手工/pm2/nohup 拉起的（见下面端口表里的命令行）。

nginx 站点：

| 配置文件 | 域名 | root / 反代 |
|---|---|---|
| `/etc/nginx/conf.d/zz-gh-web.conf` | _ ghs.0lt.top ghs.0lt.top on | root /var/www/certbot, /opt/gh-web/web, /var/www/certbot |

```bash
nginx -t && nginx -s reload
```

## 五、依赖与数据

- 未发现明显的数据库/中间件依赖

- 运行时数据（数据库、上传、缓存）**不进仓库**，只备份代码与配置模板。
- 敏感文件（`.env`、`config.php`、`*token*`、`*secret*`、私钥）一律排除。

## 六、更新与部署

```bash
cd /opt/gh-web
git status
git pull
nginx -t && nginx -s reload
```

改动会被自动同步到 GitHub（`lszyk26/gh-web`），不用手工提交。

## 七、排错

| 现象 | 先看什么 |
|---|---|
| 进程没了 | 按端口表里的命令行手工拉起来，或补一个 systemd unit |
| 502/504 | 后端端口在不在监听；`/var/log/nginx/error.log` |
| 页面没更新 | 构建产物（`dist/`）有没有重新生成；浏览器缓存 |
| 备份没推上去 | `tail -50 /var/log/ssh-git-sync.log` |

日志：systemd 用 `journalctl -u <服务>`；nginx 在 `/var/log/nginx/`；自动同步在 `/var/log/ssh-git-sync.log`。

## 八、备份说明

- 由 `ssh-mcp`（`/opt/ssh-mcp`）自动同步，一轮约 2 分钟，每 5 分钟一次。
- 单文件超过 10MB 会跳过并写入 `.git/info/exclude`。
- 连续失败 3 次进入 6 小时退避。
- 仓库为私有仓库；密钥类文件另有 AES-256 加密备份。

