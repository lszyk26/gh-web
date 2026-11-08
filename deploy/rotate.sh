#!/usr/bin/env bash
# ============================================================
# rotate.sh —— 轮换 GH·WEB 的免密登录令牌
#
# 作用：
#   · 生成新的访问令牌，写入 /opt/ghweb-auth/token（600）
#   · 同时轮换服务端 secret —— 这会让**所有已登录设备立即失效**
#     （Cookie 是用 secret 签的，换 secret 等于强制全体重新登录）
#
# 用法：
#   bash /opt/gh-web/deploy/rotate.sh              # 令牌 + secret 都换（踢掉所有设备）
#   bash /opt/gh-web/deploy/rotate.sh --keep-session  # 只换令牌，保留已登录设备
# ============================================================
set -euo pipefail

DIR="${GHW_AUTH_DIR:-/opt/ghweb-auth}"
SVC=ghweb-auth
[[ $EUID -eq 0 ]] || { echo "需要 root"; exit 1; }

KEEP=0
[[ "${1:-}" == "--keep-session" ]] && KEEP=1

python3 - "$KEEP" <<'PY'
import secrets, sys, os
keep = sys.argv[1] == "1"
alphabet = "abcdefghjkmnpqrstuvwxyz23456789"   # 避开 0/o/1/l/i

tok = "ghw-" + "-".join("".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(3))
fd = os.open("/opt/ghweb-auth/token", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, "w") as f:
    f.write(tok)

if not keep:
    sec = secrets.token_urlsafe(32)
    fd = os.open("/opt/ghweb-auth/secret", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write(sec)

print("=" * 46)
print("  新的访问令牌")
print("  " + tok)
print("=" * 46)
if keep:
    print("（secret 未变：已登录的设备不受影响）")
else:
    print("（secret 已轮换：所有设备都需要重新登录一次）")
PY

echo
echo "重启 $SVC 使新 secret 生效…"
systemctl restart "$SVC"
sleep 1
systemctl is-active "$SVC" && echo "完成。打开 https://${GHW_DOMAIN:-你的域名}/login 用新令牌登录。"
