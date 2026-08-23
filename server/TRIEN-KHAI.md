# TRIỂN KHAI LÊN SERVER

Bot chạy **trên hosting**, không cần máy cá nhân bật. Đây là lý do chính để lên server:
khung giờ quan trọng nhất là **23:00–03:00 sáng**, không ai để desktop chạy cả đêm mãi được.

⚠ **MySQL của hosting chỉ nghe `localhost`.** Bot **bắt buộc** chạy trên server; chạy ở máy cá nhân sẽ không kết nối được DB.

---

## ĐÃ XONG (không phải làm lại)

- ✅ Bản ghi DNS `k7m2coin.hiteckqualityconstruction.com.au` → `103.75.186.15`
- ✅ Addon domain trong 1Panel, thư mục gốc `/domains/k7m2coin.hiteckqualityconstruction.com.au`
- ✅ Database `buwsofujhosting_coin_db_v1` + user, **6 bảng đã tạo**

---

## 1. Cấp SSL

1Panel → **SSL Certificates** → cấp cho `k7m2coin.hiteckqualityconstruction.com.au`, bật **tự động gia hạn**.

## 2. Kiểm Node trên server

Terminal của 1Panel (hoặc SSH):

```bash
node -v
```

Cần **v20.10 trở lên** (bot dùng cờ `--experimental-websocket`). Nếu không có `node` hoặc bản quá cũ, cài qua nvm rồi ghi lại đường dẫn — `chay.sh` tự dò các vị trí thường gặp, nhưng cứ biết trước cho chắc.

## 3. Đưa code lên

Đặt code **NGOÀI thư mục web** — đừng để `bot.js`, `config.local.js` nằm chỗ trình duyệt với tới được.

```
~/bot-coin/          ← code bot (ngoài web)
   bot.js  config.js  config.local.js  lib/  server/  cong-cu/  package.json
```

**Không cần chép:** `node_modules/`, `du-lieu/`, `test/`, `.git/`

Rồi cài phụ thuộc:

```bash
cd ~/bot-coin && npm install --omit=dev
```

Chỉ đúng **một gói** (`mysql2`), rất nhanh.

## 4. Chép trang xem vào thư mục web

```bash
cp ~/bot-coin/web/index.html ~/domains/k7m2coin.hiteckqualityconstruction.com.au/index.html
```

Trang là file **tĩnh**. Bot ghi đè `trangthai.json` vào cùng thư mục đó mỗi 2 giây, trình duyệt chỉ việc đọc. **Không cổng, không reverse proxy, không PHP.**

## 5. Điền `config.local.js`

```bash
cd ~/bot-coin && cp config.local.mau.js config.local.js
```

Sửa 4 dòng:

```js
MYSQL: {
  host: 'localhost',
  database: 'buwsofujhosting_coin_db_v1',
  user: 'buwsofujhosting_coin_user_v1',
  password: '<mật khẩu DB>',
},
GOC_WEB: '/home/<tài khoản>/domains/k7m2coin.hiteckqualityconstruction.com.au',
BAT_WEB_NOI_BO: false,
```

`GOC_WEB` lấy đúng đường dẫn 1Panel hiện trong danh sách tên miền. Chạy `pwd` trong thư mục đó nếu không chắc.

⛔ `config.local.js` đã nằm trong `.gitignore`. Đừng commit, đừng chụp màn hình.

## 6. Chạy thử bằng tay

```bash
cd ~/bot-coin && node --experimental-websocket bot.js
```

Phải thấy:

```
BOT OKX · che do GIAY · von $100 · x10 · ver xxxxxxxx
MySQL san sang: ...@localhost/buwsofujhosting_coin_db_v1
web noi bo TAT — trang do may chu cua hosting phuc vu tu /home/.../domains/k7m2coin...
nap 428 hop dong SWAP
WS mo
+ engine ... (3 dòng)
dang chay. Warmup 300s/coin truoc khi phat tin hieu dau tien.
```

Nếu thấy `⛔ MySQL KHOI TAO THAT BAI` → sai thông tin trong `config.local.js`.
Nếu thấy `KHONG DOC DUOC config.local.js` → chưa chép file, hoặc sai chỗ.

Để chạy ~2 phút, mở `https://k7m2coin.hiteckqualityconstruction.com.au` xem có ra giao diện không, rồi `Ctrl+C`.

## 7. Bật chạy nền + cron tự bật lại

```bash
cd ~/bot-coin && chmod +x server/*.sh && ./server/chay.sh
```

1Panel → **Tính năng nâng cao → Công việc Cron**, thêm lịch **mỗi phút**:

```
cd ~/bot-coin && ./server/chay.sh > /dev/null 2>&1
```

Mỗi phút thay vì mỗi 5 phút là **cố ý**: `chay.sh` có `flock` + kiểm PID qua `/proc` nên khi bot đang sống thì thoát ngay, chi phí gần bằng 0 — đổi lại bot chết thì được bật lại trong vòng 1 phút.

---

## Dùng hằng ngày

| Việc | Lệnh |
|---|---|
| Xem lệnh | `https://k7m2coin.hiteckqualityconstruction.com.au` |
| Xem log | `tail -f ~/bot-coin/du-lieu/bot.log` |
| Đọc số | `cd ~/bot-coin && npm run bao-cao` |
| Dừng bot | `~/bot-coin/server/dung.sh` — **lệnh đang mở KHÔNG bị đóng** |
| Đóng hết + dừng | `touch ~/bot-coin/DUNG.flag` |
| Ghim coin | sửa `~/bot-coin/ghim.txt`, bot đọc lại sau 30 giây |

⚠ Nhớ **xoá `DUNG.flag`** trước khi chạy lại, không thì bot đóng lệnh ngay khi bật.

---

## Kiểm sức khoẻ

**Dòng nhịp tim** in mỗi phút vào `bot.log`:

```
3 coin · 3 so live · 0 lenh mo · von $100.00 · khung SHORT-A · db ok/1247ghi/0cho · RAM 74MB
```

| Thấy gì | Nghĩa |
|---|---|
| `db ok/…/0cho` | MySQL khoẻ, hàng đợi rỗng |
| `db CHUA/…` | **Chưa kết nối được MySQL** — mọi lệnh ghi đang nằm chờ |
| `…/500cho` trở lên | Hàng đợi ứ — MySQL chậm hoặc rớt |
| `DA BO ROI n lenh ghi` | ⛔ **Đã mất dữ liệu.** Phải xử lý ngay |
| `so live` < số coin | Có coin mất sổ lệnh |

**Kiểm dữ liệu có vào DB thật không** — chạy trong phpMyAdmin sau vài tiếng:

```sql
SELECT 'nhip' t, COUNT(*) n, FROM_UNIXTIME(MAX(ts)/1000) moi_nhat FROM nhip
UNION ALL SELECT 'tin_hieu', COUNT(*), FROM_UNIXTIME(MAX(ts)/1000) FROM tin_hieu
UNION ALL SELECT 'lenh', COUNT(*), FROM_UNIXTIME(MAX(ts_mo)/1000) FROM lenh
UNION ALL SELECT 'su_kien', COUNT(*), FROM_UNIXTIME(MAX(ts)/1000) FROM su_kien;
```

`nhip` phải tăng khoảng **3 dòng mỗi phút** (3 coin × 1 ảnh/60 giây). Đứng yên = bot chết hoặc DB rớt.

---

## ⚠ Bot chết là hỏng IM LẶNG

Trang web vẫn vẽ số cũ, trông y như thị trường đang yên. Nên trang **luôn hiện tuổi ảnh** ở góc trái; quá 30 giây thì **cả thanh chuyển đỏ** kèm chữ *"BOT CÓ THỂ ĐÃ CHẾT"*.

Nhìn dòng đó trước khi tin bất cứ con số nào trên màn hình.

---

## Ba việc KHÔNG làm

1. **Đừng chạy hai bot cùng lúc** (một ở máy, một trên server). Hai tiến trình cùng ghi một DB → dữ liệu hỏng theo cách không phát hiện được. Bot đã chặn trùng cổng, nhưng khi tắt web nội bộ thì không còn lưới đó.
2. **Đừng để code bot trong thư mục web.** `config.local.js` có mật khẩu DB.
3. **Đừng đổi `CHE_DO` sang tiền thật.** Tầng đặt lệnh thật (Giai đoạn 10) **chưa viết** — đổi cờ cũng vẫn chạy giấy, nhưng đừng tạo thói quen.
