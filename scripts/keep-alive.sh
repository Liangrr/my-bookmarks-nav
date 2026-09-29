#!/usr/bin/env bash
# keep-alive.sh —— 定时 ping 站点，保持 Vercel 免费实例活性（避免冷启动）
# 用法：
#   ./keep-alive.sh                     # 默认每 9 秒 ping 首页
#   ./keep-alive.sh <URL> <秒数>         # 自定义目标与间隔
#   nohup ./keep-alive.sh > keepalive.log 2>&1 &   # 后台常驻运行
set -u

URL="${1:-https://bookmark-nav-site.vercel.app/}"
INTERVAL="${2:-9}"

echo "[keep-alive] 目标: $URL  间隔: ${INTERVAL}s  (Ctrl+C 停止)"
while true; do
  # 8 秒内没响应就放弃，不阻塞循环
  code=$(curl -sS -o /dev/null -w '%{http_code}' -m 8 "$URL" 2>/dev/null) || code="000"
  echo "$(date '+%F %T') ping -> HTTP ${code}"
  sleep "$INTERVAL"
done
