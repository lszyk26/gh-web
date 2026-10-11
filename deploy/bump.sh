#!/usr/bin/env bash
# ============================================================
# bump.sh — 递增 index.html 里的静态资源版本号（?v=...）
#
# 为什么必须这么做：
#   nginx 给 js/css/字体发的是 `max-age=604800, immutable`（7 天强缓存），
#   浏览器在这 7 天内**不会**再回源校验。改完前端文件如果不换版本号，
#   已经访问过的浏览器会一直用旧文件，出现「改了但没生效 / 新旧混用」。
#
# 用法：
#   bash deploy/bump.sh                 # 用时间戳当版本号
#   bash deploy/bump.sh 20261011c       # 指定版本号
#
# 正常发布流程：改完 web/ 下的文件 → bash deploy/bump.sh → 完成
# （静态文件由 nginx 直接从磁盘读取，无需 reload）
# ============================================================
set -euo pipefail

IDX=/opt/gh-web/web/index.html
[[ -f $IDX ]] || { echo "找不到 $IDX"; exit 1; }

NEW="${1:-$(date +%Y%m%d%H%M%S)}"
OLD=$(grep -oE '\?v=[A-Za-z0-9._-]+' "$IDX" | head -1 | cut -d= -f2 || true)

if [[ -z "${OLD:-}" ]]; then
  echo "index.html 里没有找到 ?v= 版本号（首次使用请先手动加上）"; exit 1
fi
if [[ "$OLD" == "$NEW" ]]; then
  echo "版本号未变化（$OLD），无需处理"; exit 0
fi

python3 - "$IDX" "$OLD" "$NEW" <<'PY'
import sys
path, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(path, encoding='utf-8').read()
n = s.count('?v=' + old)
s = s.replace('?v=' + old, '?v=' + new)
open(path, 'w', encoding='utf-8').write(s)
print('版本号 %s -> %s（替换 %d 处）' % (old, new, n))
PY

echo "完成。静态文件已更新，浏览器下次加载会重新拉取全部前端资源。"
