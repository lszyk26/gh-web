#!/usr/bin/env bash
# ============================================================
# gh-web 部署 / 重装脚本
#   用法： sudo bash /opt/gh-web/deploy/install.sh
#          sudo bash /opt/gh-web/deploy/install.sh --with-cert   # 首次签发证书
# 幂等：可反复执行。写 nginx 配置前会自动备份。
# ============================================================
set -euo pipefail

ROOT=/opt/gh-web
WEB=$ROOT/web
CONF_SRC=$ROOT/deploy/gh-web.conf
# 必须以 zz- 开头：nginx 按字母序加载 conf.d，第一个 listen 80 的
# server 会成为默认服务器。用 zz- 排到最后，才不会接管未知 Host。
CONF_DST=/etc/nginx/conf.d/zz-gh-web.conf
CACHE_DIR=/var/cache/nginx/gh-api
HTPASSWD=/etc/nginx/.ghweb.htpasswd
DOMAIN=gh.0lt.top

say() { printf '\033[1m==>\033[0m %s\n' "$*"; }

[[ $EUID -eq 0 ]] || { echo "需要 root：sudo bash $0"; exit 1; }

# ---------- 1. 依赖 ----------
say "检查运行依赖"
command -v nginx >/dev/null || { echo "nginx 未安装"; exit 1; }
command -v certbot >/dev/null || echo "  提示：未装 certbot，证书需另行处理"
mkdir -p /var/www/certbot

# ---------- 2. 缓存目录 ----------
say "准备缓存目录 $CACHE_DIR"
mkdir -p "$CACHE_DIR"
chown -R www-data:www-data "$CACHE_DIR"

# ---------- 3. basic auth ----------
if [[ ! -f $HTPASSWD ]]; then
  say "生成访问口令（$HTPASSWD）"
  PW="0lt-$(python3 -c "import secrets,string;print(''.join(secrets.choice(string.ascii_lowercase+string.digits) for _ in range(6)))")-$(python3 -c "import secrets,string;print(''.join(secrets.choice(string.ascii_lowercase+string.digits) for _ in range(6)))")"
  python3 - "$PW" > "$HTPASSWD" <<'PY'
import crypt, sys
print("gh-web:" + crypt.crypt(sys.argv[1], crypt.mksalt(crypt.METHOD_SHA512)))
PY
  chmod 640 "$HTPASSWD"
  chown root:www-data "$HTPASSWD"
  echo
  echo "  ┌──────────────────────────────────────────┐"
  echo "  │  请立刻记录访问口令                        │"
  echo "  │  用户名： gh-web                           │"
  printf "  │  密　码： %-31s │\n" "$PW"
  echo "  └──────────────────────────────────────────┘"
  echo
else
  say "已存在口令文件，保持不变（重置：删除 $HTPASSWD 后重跑本脚本）"
fi

# ---------- 4. 静态权限 ----------
say "修正静态资源权限"
chmod -R a+rX "$WEB"

# ---------- 5. nginx 配置 ----------
say "安装 nginx 站点配置"
if [[ -f $CONF_DST ]] && ! cmp -s "$CONF_SRC" "$CONF_DST"; then
  BAK="$CONF_DST.bak-install-$(date +%Y%m%d%H%M%S)"
  cp -p "$CONF_DST" "$BAK"
  say "  原配置已备份 → $BAK"
fi
install -m 644 "$CONF_SRC" "$CONF_DST"

# 首次签发证书时，443 会因缺证书导致 nginx -t 失败，先用 80-only 版本过渡
if [[ ! -d /etc/letsencrypt/live/$DOMAIN ]]; then
  say "尚未签发证书，先启用 80-only 过渡配置"
  cat > "$CONF_DST" <<EOF
limit_req_zone \$binary_remote_addr zone=ghweb:10m rate=2r/s;
server {
    listen 80;
    server_name $DOMAIN;
    access_log off;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 "gh-web: waiting for certificate\n"; }
}
EOF
fi

say "nginx 配置检查"
nginx -t

say "重载 nginx"
systemctl reload nginx

# ---------- 6. 证书 ----------
if [[ ! -d /etc/letsencrypt/live/$DOMAIN ]]; then
  if [[ "${1:-}" == "--with-cert" ]]; then
    say "申请证书（$DOMAIN）"
    certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
      --non-interactive --agree-tos --register-unsafely-without-email
    say "装回完整 443 配置"
    install -m 644 "$CONF_SRC" "$CONF_DST"
    nginx -t && systemctl reload nginx
  else
    say "跳过证书。DNS 指向本机后执行：sudo bash $0 --with-cert"
    exit 0
  fi
fi

# ---------- 7. 自检 ----------
say "自检"
CODE_ANON=$(curl -s -o /dev/null -w '%{http_code}' -k "https://$DOMAIN/" || echo 000)
CODE_AUTH=$(curl -s -o /dev/null -w '%{http_code}' -k -u "gh-web:$(true; echo -)" "https://$DOMAIN/" || echo 000)
echo "  未鉴权访问 → $CODE_ANON（期望 401）"
H1=$(curl -s -o /dev/null -w '%{http_code}' -k --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" || echo 000)
echo "  本地解析访问 → $H1（期望 401）"
if [[ -f $HTPASSWD ]]; then
  H2=$(curl -s -o /dev/null -w '%{http_code}' -k --resolve "$DOMAIN:443:127.0.0.1" \
        -H "Authorization: Basic $(printf 'gh-web:%s' "${PW:-x}" | base64 -w0)" "https://$DOMAIN/" || echo 000)
  echo "  静态首页 → $H2（期望 200）"
  H3=$(curl -s -o /dev/null -w '%{http_code}' -k --resolve "$DOMAIN:443:127.0.0.1" \
        -H "Authorization: Basic $(printf 'gh-web:%s' "${PW:-x}" | base64 -w0)" "https://$DOMAIN/api/rate_limit" || echo 000)
  echo "  缓存层 /api/ → $H3（期望 200）"
fi
say "完成。打开 https://$DOMAIN/"
