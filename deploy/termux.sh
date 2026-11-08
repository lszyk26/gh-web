#!/usr/bin/env bash
# ============================================================
# 手机上部署（Termux）
#   bash deploy/termux.sh
#   GHW_PASSWORD=你的口令 bash deploy/termux.sh
#
# Termux 是 Android 上的 Linux 环境，装自 F-Droid 或 GitHub Release，
# 不要用 Google Play 版本（已停止更新）。
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

say() { printf '\033[1m==>\033[0m %s\n' "$*"; }

if ! command -v node >/dev/null 2>&1; then
  say "安装 Node.js（Termux 包管理器）"
  pkg update -y
  pkg install -y nodejs-lts
fi

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "需要 Node.js >= 18，当前 $(node -v)。执行：pkg install nodejs-lts"
  exit 1
fi

# 避免 Android 在息屏后冻结进程（需要 Termux:API 可选，失败不影响启动）
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock || true

export PORT="${PORT:-8787}"
export HOST="${HOST:-0.0.0.0}"

say "启动 GH·WEB（端口 $PORT）"
echo "  手机浏览器访问：http://127.0.0.1:$PORT/"
echo "  同一 WiFi 下的电脑：http://<手机局域网 IP>:$PORT/"
echo "  按 Ctrl+C 停止。想让它在后台跑：nohup node server.js > gh-web.log 2>&1 &"
echo

exec node server.js
