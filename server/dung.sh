#!/bin/bash
# Dừng bot. LỆNH ĐANG MỞ KHÔNG BỊ ĐÓNG — bot chỉ thoát, vị thế trên sàn
# giữ nguyên. Muốn đóng hết thì dùng DUNG.flag (xem HUONG-DAN.md).
cd "$(dirname "$0")/.." || exit 1
PID_FILE="$(pwd)/du-lieu/bot.pid"
[ -f "$PID_FILE" ] || { echo "khong co bot.pid"; exit 0; }
PID=$(cat "$PID_FILE")
if [ -d "/proc/$PID" ]; then
  kill -TERM "$PID"                    # SIGTERM để bot xả nốt hàng đợi ghi
  for i in $(seq 1 20); do [ -d "/proc/$PID" ] || break; sleep 0.5; done
  [ -d "/proc/$PID" ] && kill -9 "$PID"
  echo "da dung bot (PID $PID)"
else
  echo "bot khong chay"
fi
rm -f "$PID_FILE"
