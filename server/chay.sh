#!/bin/bash
# =====================================================================
# Bật bot chạy nền trên server. An toàn khi gọi lặp — cron mỗi phút gọi
# cái này, nếu bot đang sống thì thoát ngay, chi phí gần bằng 0.
#
# Cron (1Panel → Tính năng nâng cao → Công việc Cron), mỗi phút:
#   cd ~/bot-coin && ./server/chay.sh > /dev/null 2>&1
#
# Đặt mỗi phút thay vì mỗi 5 phút là CỐ Ý: bot chết thì được bật lại
# trong vòng 1 phút, mà `flock` + kiểm PID khiến lượt gọi thừa gần như
# miễn phí.
# =====================================================================
cd "$(dirname "$0")/.." || exit 1
GOC="$(pwd)"
PID_FILE="$GOC/du-lieu/bot.pid"
LOG="$GOC/du-lieu/bot.log"
mkdir -p "$GOC/du-lieu"

# --- khoá: chặn hai lượt cron chồng nhau ---
exec 9>"$GOC/du-lieu/.chay.lock"
flock -n 9 || exit 0

# --- bot còn sống thì thôi: quét TIẾN TRÌNH THẬT, KHÔNG tin file PID ---
# `bot.pid` chỉ nhớ được lần bật GẦN NHẤT. Một tiến trình sót lại từ lần
# triển khai trước trở thành VÔ HÌNH với nó, và lượt cron kế tiếp bật
# thêm một con nữa.
#
# 12/08/2026 đã dính đúng kịch bản này: 3 bot cùng ghi một DB, con cũ
# nhất sống từ 10/08 (282 giờ CPU) dù thư mục code đã bị xoá. Bắt kịp vì
# `lenh` còn 0. Nếu đã có lệnh thì lỗ đồng thời tối đa thành 3 × trần
# lệnh = 90% vốn, và bảng `lenh` có bản ghi trùng mà không ai biết.
#
# ⛔ Đừng đổi lại thành kiểm file PID. Nó KHÔNG phát hiện được tiến trình
# lạ, mà đó chính là trường hợp nguy hiểm duy nhất.
if command -v pgrep > /dev/null 2>&1; then
  pgrep -u "$(id -u)" -f "node.*bot\.js" > /dev/null 2>&1 && exit 0
else
  # Không có pgrep thì lùi về cách cũ — yếu hơn, nhưng còn hơn không có.
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" 2>/dev/null)
    if [ -n "$PID" ] && [ -d "/proc/$PID" ]; then
      grep -q "bot.js" "/proc/$PID/cmdline" 2>/dev/null && exit 0
    fi
  fi
fi

# --- tìm node: cron có PATH rất nghèo, phải dò tay ---
# $HOME/node-v*/bin/node là bản tự giải nén trong thư mục nhà — hosting
# này đang dùng đúng cách đó (node-v20.20.0-linux-x64), nên dò TRƯỚC
# các đường hệ thống.
NODE=""
for c in "$(command -v node 2>/dev/null)" \
         "$HOME"/node-v*/bin/node \
         /usr/local/bin/node /usr/bin/node \
         "$HOME"/.nvm/versions/node/*/bin/node \
         /opt/node*/bin/node; do
  [ -x "$c" ] && NODE="$c" && break
done
[ -z "$NODE" ] && { echo "$(date '+%F %T') KHONG TIM THAY node" >> "$LOG"; exit 1; }

VER=$("$NODE" -p "process.versions.node.split('.')[0]" 2>/dev/null)
if [ -z "$VER" ] || [ "$VER" -lt 20 ] 2>/dev/null; then
  echo "$(date '+%F %T') node v$VER QUA CU, can >=20 (dung --experimental-websocket)" >> "$LOG"
  exit 1
fi

echo "$(date '+%F %T') === bat bot ($NODE v$VER) ===" >> "$LOG"
# stdout -> /dev/null vi lib/log.js DA tu ghi vao bot.log roi. Chuyen huong
# ca stdout vao day nua thi moi dong bi ghi HAI LAN.
# stderr VAN do vao log — de bot chet vi loi thi con thay vet.
nohup "$NODE" --experimental-websocket "$GOC/bot.js" > /dev/null 2>> "$LOG" &
echo $! > "$PID_FILE"
