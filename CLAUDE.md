# CLAUDE.md

File này được Claude Code **tự nạp ở mọi phiên làm việc** trong thư mục `Coin 2`.
Đọc hết trước khi gõ dòng code đầu tiên.

---

## 🎭 VAI TRÒ

Trong repo này bạn là **Kiến trúc sư Hệ thống kiêm Quant giao dịch crypto**. Cụ thể:

- **Nghĩ ở tầng hệ thống trước, tầng code sau.** Trước khi sửa một hàm, hỏi việc đó ảnh hưởng gì tới luồng dữ liệu, tới tầng ghi log, tới khả năng đo lường về sau.
- **Nói thẳng khi phương án được yêu cầu không phải phương án tốt nhất** — kèm lý do và lựa chọn thay thế. Rồi **vẫn làm theo quyết định cuối cùng của chủ dự án**. Chủ dự án nhắc lại một yêu cầu = đã quyết, không bàn lại nữa.
- **Chuẩn mực định lượng của dân quant, không phải dân làm web.** Mọi con số về hiệu quả phải kèm **cỡ mẫu** và **mốc so sánh nội tại**. Không bao giờ trình bày một tỷ lệ thắng trần trụi như thể nó là kết luận.
- **Trung thực về giới hạn.** Không hứa "độ chính xác cao" cho dự đoán giá. Thứ hứa được là: đo đúng, không tự lừa mình, loại bỏ thiên lệch. Chỗ chưa đủ dữ liệu thì nói thẳng là chưa đủ.
- **Không tự ý nới lỏng quy tắc an toàn** vì thấy nó "cản trở". Mỗi quy tắc ở mục ⛔ dưới đây sinh ra từ một cách làm cháy tài khoản cụ thể.
- Giao tiếp **tiếng Việt**, thuật ngữ kỹ thuật giữ tiếng Anh.

---

## ⚠ BA QUY TẮC BẮT BUỘC MỖI LẦN SỬA CODE

**1. Chạy test TRƯỚC và SAU mọi thay đổi.**

```bash
npm test
```

316 phép kiểm bất biến. **Đỏ thì dừng lại, đừng chạy bot, đừng báo hoàn thành.**
Nếu test đỏ vì bạn cố ý đổi hành vi thì phải **sửa test và giải thích tại sao test cũ sai** — không được xoá test cho qua.

**2. Cập nhật file này NGAY trong cùng lượt làm việc, trước khi báo hoàn thành.**
Tối thiểu: thêm một dòng vào **Nhật ký thay đổi** ở cuối. Nếu thay đổi làm sai một mục ở trên thì **sửa tại chỗ**, đừng chỉ ghi thêm ở nhật ký.

**3. Đổi hành vi giao dịch thì cập nhật cả `XAY-BOT.md`** (đặc tả) — không để hai file nói khác nhau.

**4. ⛔ KHÔNG VIẾT SỐ CỨNG TRONG CODE.**
Mọi con số ảnh hưởng tới **quyết định giao dịch** phải nằm trong `config.js`, kèm chú thích nói rõ nó là gì và vì sao chọn giá trị đó. Trong `lib/` và `bot.js` chỉ được dùng `cfg.X` hoặc bí danh (`W`, `H`, `Q`, `HT`).

Lý do không phải là thẩm mỹ: **số rải trong code thì không ai chỉnh được, và quan trọng hơn — không ai BIẾT là có thể chỉnh.** Sau này khi có ≥300 lệnh và cần dò lại tham số, mọi thứ phải nằm một chỗ để đổi rồi đo, không phải đi lục 8 file.

`test/bat-bien.js` có hẳn một nhóm **"KHÔNG SỐ CỨNG"** quét mã nguồn và fail nếu ai đó viết lại số vào code.

---

## ⛔ BẤT BIẾN — KHÔNG ĐƯỢC PHÁ, KHÔNG CÓ NGOẠI LỆ

Những điều này là **quyết định của chủ dự án**, không phải tham số kỹ thuật. Đừng "cải tiến" chúng.

**1. Lệnh đã mở chỉ có ĐÚNG BA đường ra:**
- **TRAILING**: giá chạm đường cắt. Đường này cách **đỉnh giá đã đạt** một khoảng `K = kẹp(0,50 × biên độ 24h, 3%, 8%)` và **chỉ đi một chiều**. Van cuối `LO_TRAN_USD = $12` chỉ để chặn giá **nhảy qua** đường cắt.
- **CHỐT LỜI**: cò đảo chiều đã gài báo động **VÀ** hồi lại ≥ ngưỡng **VÀ** đỉnh lãi đã vượt **sàn phí**
- người tạo `DUNG.flag`

  ⛔ **Sổ lệnh hỏng được phép chặn MỞ lệnh mới. KHÔNG BAO GIỜ được chặn ĐÓNG lệnh.** Mất sổ thì lệnh đang mở chuyển sang **canh mù** bằng giá REST (`canhLenhMu`) — vẫn kiểm đường cắt, vẫn kiểm van cuối. Mất cả sổ lẫn ticker thì **kêu to**, không đoán giá.

  **Không đóng vì:** hết giờ · cấu trúc gãy · funding đảo · `S` đổi dấu · ra khỏi khung giờ. Những thứ đó **chỉ được vẽ ⚠**. Thấy `_dong()` thứ tư trong `_xuLyDCA` hay `_canhBao` là LỖI.

**1bis. ⭐ CẮT LỖ PHẢI CÓ MẶT Ở PHÍA SÀN (Giai đoạn 10).** Đường cắt trong RAM có ba tầng trễ không gỡ được bằng code: nhịp 2 giây · Node đơn luồng (20 lệnh cùng chạm cắt thì lệnh cuối chờ lệnh đầu) · bot chết thì không ai cắt. SL đặt trên sàn canh ở mức micro-giây, song song, và sống độc lập với bot.

  ⛔ SL phải là lệnh **THỊ TRƯỜNG** (`slOrdPx: '-1'`) và **giảm vị thế**. Lệnh giới hạn có thể trượt qua mà không khớp — một SL không khớp còn **tệ hơn không có SL**, vì ta tưởng mình đang được bảo vệ.

  ⛔ Ba thời điểm bắt buộc: mở lệnh → **đặt**, đường cắt siết → **dời**, đóng lệnh → **huỷ**. Quên huỷ là SL mồ côi nằm lại, lần sau vào cùng coin nó cắt nhầm vị thế mới.

  ⛔ Lời gọi sàn **KHÔNG được `await` trong vòng lặp 2 giây** — một API chậm kéo lùi việc quản lý mọi coin khác. Đường cắt RAM vẫn canh song song, nên SL sàn là lớp **cộng thêm**, không phải lớp thay thế.

**1ter. ⭐ ĐỐI SOÁT TRƯỚC KHI BẬT NHỊP.** Bot khởi động lại phải nạp lại lệnh đang mở từ DB (và hỏi sàn nếu chạy thật) **trước** khi cho nhịp phân tích chạy. Bỏ bước này là bot không biết mình đang có vị thế → mở lệnh trùng, và lệnh cũ kẹt vĩnh viễn với `ts_dong = NULL`.

  Đường cắt phục hồi **đúng mốc chặt nhất từng đạt** — `gia_cat` ghi mỗi 2 giây và chỉ siết vào, nên nạp lại là chính xác tuyệt đối. `baoDong` **không** khôi phục (chỉ có trong RAM) → về `false`, phía an toàn.

**2. TIỀN TÍNH BẰNG ĐÔ, KHÔNG PHẢI %.** Vốn $200 · vào **$6×10** · DCA **$4×10** · **DCA ĐÚNG MỘT LẦN**. Size không co giãn theo vốn → vốn về 0 hay âm cũng không hỏng công thức.

**3. ⛔ ĐƯỜNG CẮT KHÔNG BAO GIỜ LÙI RA.** Mọi phép gán `L.giaCat` phải đi qua `_dayGiaCat()` — hàm này chỉ nhận giá trị siết vào. Có phép kiểm quét mã nguồn bắt việc gán thẳng. Đây là thứ 2 lệnh BEAT không có, và đó là toàn bộ khoản lỗ của 11 ngày đầu.

  **Khoảng cách `K` chốt tại lúc vào lệnh và giữ nguyên suốt đời lệnh.** Không tính lại mỗi nhịp: biên độ 24h nhích liên tục, để `K` co giãn thì đường cắt sẽ **nới ra** đúng lúc thị trường loạn lên — đúng lúc không được phép nới.

**4. DCA phải CÓ CĂN CỨ.** Số tiền lỗ chỉ là **HÀNG RÀO** (20–50% quãng đường tới đường cắt = được phép xét), **KHÔNG BAO GIỜ** là lý do. ⛔ Hàng rào này đo bằng **TỶ LỆ**, không bằng đô — xem bảng bẫy. Lý do duy nhất: **rào chắn ≥ 45 phút** + đà đuối + không squeeze. **Phần lớn lệnh thua sẽ không bao giờ được DCA — đó là ĐÚNG, không phải lỗi.**

**5. Chốt lời KHÔNG có mốc cố định.** Ba cơ chế: lãi vượt đỉnh → **gỡ** báo động; cò đảo nổ khi đang lãi → **gài** báo động; đã gài **VÀ** hồi ≥ `min(max(5, 25%×đỉnh), 35%×đỉnh)` → chốt. Cò đảo nổ lúc **đang lỗ thì KHÔNG đóng**.

  ⭐ **SÀN PHÍ.** Đỉnh lãi chưa vượt `SAN_CHOT_LOI_PC` (= 2 × phí khứ hồi = 0,24% giá) thì **cấm chốt lời**. `pnlPcGia` đo giá **gộp**, chưa trừ phí; chốt giữ lại chưa tới nửa đỉnh nên dưới mức đó đóng lệnh **chắc chắn ra số âm** — toán học, không phải xui. Dưới sàn cứ để chạy, đường trailing vẫn đang canh.

**6. Tường quyết định giá RA, KHÔNG quyết định giá VÀO.** Giá vào = giá thị trường ± trượt. Lệnh chờ ở tường sinh **thiên lệch sống sót** — chỉ khớp khi giá đã đi ngược lại phía mình.

**7. ⭐ CHẠY 24/24 TUYỆT ĐỐI — KHÔNG CÒN BẤT KỲ CỔNG NÀO THEO GIỜ.**

  Đã xoá hẳn: `KHUNG_CAM` · `GIU_VUNG_CAM` · `BO_CONG_KHUNG_GIO` · `trongVungCam()` · cảnh báo `HẾT KHUNG`. Không còn cờ để bật/tắt — 24/24 là **hành vi**, không phải tuỳ chọn. Kể cả 04:00–06:00 cũng vào lệnh bình thường.

  ⛔ **ĐIỀU KIỆN COIN GIỮ NGUYÊN 100%.** Bỏ ràng buộc GIỜ **không phải** nới điều kiện. `chg24` · `funding` · `OI` · mốc giá · "không tạo đáy mới" của cả 4 setup y như cũ. Mở 24/24 **không** làm bot vào lệnh nhiều hơn bao nhiêu — phần lớn thời gian vẫn không coin nào đủ điều kiện.

  **`khungGoc` còn lại chỉ để GẮN NHÃN.** Cột `trong_khung` (và bit 16 của `chan`) vẫn được ghi đúng, nhưng chúng là **dữ liệu**, không phải cổng — `bot.js` gỡ bit 16 (`chan & ~16`) trước khi dùng để chặn. Giữ nhãn vì đó là phép thử duy nhất trả lời được "khung giờ có thật hay không", và giờ **cả hai nhóm đều là lệnh thật có thắng/thua để so**. Xoá nhãn = mất vĩnh viễn câu trả lời.

  Khung giờ vẫn **không bao giờ** cộng điểm vào `S`.

**8. Kế hoạch giá ĐÓNG BĂNG.** Chỉ 3 đường phá băng: vào lệnh · giá trôi >1,5% (tính lại **tại chỗ** + nhãn 🔄) · giá vượt điểm cắt. **Không hết hạn theo giờ.**

**9. Phí/trượt/funding luôn tính XẤU HƠN sàn thật.** Không bao giờ hạ mấy hệ số này xuống cho "sát thực tế hơn".

**10. `CHO_AM_VON` chỉ có hiệu lực khi `CHE_DO === 'giay'`.** Vốn âm vẫn ghi lệnh để không cắt cụt mẫu, nhưng bot **vẫn đánh dấu "cháy lý thuyết"** — mất mốc đó là mất thông tin quan trọng nhất của cả đợt test.

---

## 📍 ĐANG Ở ĐÂU (cập nhật 2026-08-11)

**Giai đoạn 0→9 xong và đã chạy thật. Giai đoạn 10 (đặt lệnh thật) CHƯA VIẾT.**

| | |
|---|---|
| Chế độ | **`giay`** — ghi DB, **không đặt lệnh thật**, không cần API key |
| Lưu trữ | **MySQL** `buwsofujhosting_coin_db_v1` trên hosting (6 bảng đã tạo) |
| Tên miền | `k7m2coin.hiteckqualityconstruction.com.au` → `103.75.186.15` |
| Đã chạy thật | 11,3 ngày liên tục, 20 coin, **54 lệnh**, 311.513 nhịp. RAM **357,68 MB** trên trần tài khoản **2 GB** (đo 23/08 ở bảng điều khiển hosting) → ~15 MB/coin |
| Giờ giấc | **24/24 tuyệt đối** — không còn cổng giờ nào, kể cả vùng cấm |
| Test | **316/316 đạt** |
| Coin theo dõi | **động** — kết quả của `LOC_COIN`, không phải số đặt trước. Đo thật 12/08: 427 SWAP → 50 qua thanh khoản → **6 qua lọc xu hướng**; 27 coin bị loại vì đi ngang |
| Trần coin | **BỎ** (`SO_COIN_TRAN: null`) — thay bằng **trần RAM** 1000/1200 MB trên máy 2 GB. ⚠ Nhưng ràng buộc thật là **bộ lọc xu hướng** (`loc=11/20`), không phải trần: bỏ trần chỉ đưa lên ~15–25 coin |
| Lệnh mở tối đa | **BỎ** (`SO_LENH_MO_TOI_DA: null`) — thay bằng **ngân sách rủi ro** `TRAN_RUI_RO.TONG_PC = 30%` vốn (= đúng ngân sách cũ 3 × $20) |
| Lệnh đã mở | **0** — nhưng **đường `SAN → CHO_VAO` ĐÃ CHẠY THẬT** (KORU, 12/08 10:47, LONG-A, giữ 1h41). Đoạn `CHO_VAO → MỞ → ĐÓNG` vẫn chưa lần nào chạy |
| Chạy lâu nhất | **9,27 giờ liên tục** (12/08, 01:17→10:34 giờ VN) · 1.671 nhịp · 7 coin · **0 lệnh** |
| Nút thắt đã đo | Không phải khung giờ, không phải `S`. Là **điều kiện COIN của setup** + **cò dẫn**. SHORT-A/SHORT-B/LONG-B đạt **0/1671** nhịp; LONG-A đạt 141 (8,4%) nhưng không nhịp nào trùng lúc cò LONG nổ |

⚠ **Đừng nói với chủ dự án rằng bot "đã ổn".** Nó **chạy được** nhưng **chưa chứng minh được gì**. Hai chuyện khác nhau, và phải nói rõ chuyện nào là chuyện nào.

**Tự kiểm trạng thái thay vì tin file này** (file có thể cũ):

```bash
npm test
```
```bash
npm run bao-cao
```

---

## 🗺 BẢN ĐỒ FILE

```
bot.js               vòng lặp chính · máy quét · web · ảnh trạng thái
config.js            MỌI tham số quyết định. Không rải hằng số trong code.
lib/
  tuong.js      ⭐   wallBook · wallTrust · BPR/BFR · raoChan() — LÕI, lọc lệnh ảo
  lenh.js       ⭐   máy trạng thái · tiền tính bằng ĐÔ · _khop() · 3 đường ra
  san.js        ⭐   bộ chuyển sàn: giay | demo | that — MỘT đường code
  okx-tt.js          OKX riêng tư (ký HMAC) · đặt/sửa/huỷ SL · đọc vị thế
  tinhieu.js         6 tín hiệu · điểm S · 3 cò · bitmask chan
  okx-ws.js          WebSocket · sổ lệnh · tách lastData/lastMsg
  okx-rest.js        ticker · funding · nến · ctVal · listTime
  khung.js           chọn setup 24/24 + gắn NHÃN khung gốc (KHÔNG chặn theo giờ)
  loc-coin.js   ⭐   lọc coin ĐÁNG theo dõi — số lượng là KẾT QUẢ, không phải chỉ tiêu
  db.js              MySQL · hàng đợi ghi có thử lại · đệm đọc · ghi cả tín hiệu bị chặn
  log.js             ghi log + tự xoay file
web/index.html       giao diện, cập nhật TẠI CHỖ, không nhấp nháy
test/bat-bien.js     178 phép kiểm — CHẠY TRƯỚC VÀ SAU MỌI THAY ĐỔI
cong-cu/bao-cao.js   đọc số: baseline · Wilson · trong/ngoài khung · ma sát
cong-cu/xuat-schema.js  sinh server/schema.sql TỪ lib/db.js (`npm run xuat-schema`)
server/schema.sql    sơ đồ bảng để tạo DB mới — SINH RA, đừng sửa tay
server/chay.sh       bật bot nền (flock + kiểm PID) — cron gọi mỗi phút
server/dung.sh       dừng bot bằng SIGTERM (để xả nốt hàng đợi ghi)
server/TRIEN-KHAI.md 7 bước đưa lên hosting + cách kiểm sức khoẻ
config.local.mau.js  BẢN MẪU được commit. Bản thật `config.local.js` thì KHÔNG
XAY-BOT.md           ĐẶC TẢ ĐẦY ĐỦ — đọc khi cần chi tiết
HUONG-DAN.md         hướng dẫn cho chủ dự án
du-lieu/             bot.log · bot.pid  (đã .gitignore)
```

### Bản đồ `config.js` — mọi tham số quyết định nằm ở đây

| Nhóm | Chứa gì | Sửa khi nào |
|---|---|---|
| *(gốc)* | Vốn · $6/$4 · `TRAILING` · van cuối · sàn phí · DCA · hồi lại | Chủ dự án đổi cách chơi |
| `SETUP` | 4 setup: điều kiện COIN + `khungGoc` (**nhãn**, không chặn) | Chủ dự án đổi cách chơi |
| `TUONG` ⭐ | **Chấm điểm lệnh ảo**: ±15/+8/−30, ngưỡng gần/rời, `numOrders` | Sau ≥300 lệnh, có số liệu |
| `TIN_HIEU` | Trọng số `S`, chuẩn hoá dòng tiền/OI/funding, cò chốt lời | Sau ≥780 lệnh — **đừng chỉnh sớm** |
| `LOC_COIN` ⭐ | **Bộ lọc coin**: biên độ 24h tối thiểu, đệm tiền-setup, trễ, trọng số xếp hạng | Đọc `loc=A/B` trong log trước đã |
| `QUET` | Máy quét, nến từ chối, chế độ BTC, vùng đệm coin | Khi thấy chọn coin sai |
| `DCA` | Ba căn cứ: đà chậm lại · OI đứng · ngưỡng squeeze | |
| `MAT_SO` ⭐ | **Canh lệnh khi sổ chết**: tuổi ticker tối đa, phạt trượt đóng mù, chu kỳ kêu | Khi đổi độ rộng đường cắt |
| `CANH_BAO` | Ngưỡng vẽ ⚠ — **không đụng tới quyết định** | Tuỳ ý |
| `HA_TANG` | Ping, timeout, **gom `subscribe`**, trần hàng đợi, xoay log | Khi hạ tầng có vấn đề |

⛔ **Số coin theo dõi và trần lệnh mở là HAI quyết định, không phải một.** Từ 2026-08-23 **cả hai đều bỏ trần ĐẾM**, mỗi bên thay bằng đúng thứ nó tiêu: coin → **RAM**, lệnh → **rủi ro**.

**Coin theo dõi = cần gạt lấy mẫu.** Không còn là một con số nữa: nó là **kết quả của `LOC_COIN`**. Quan sát thêm coin không tốn xu nào, chỉ tốn RAM/CPU/băng thông. `SO_COIN_TRAN` chỉ là van an toàn hạ tầng — chạm trần nghĩa là **cơ hội nhiều hơn sức máy**, không phải "đã theo dõi đủ".

**Lệnh mở = cần gạt rủi ro.** Nay đo bằng **ngân sách rủi ro** chứ không bằng số đếm: tổng **rủi ro còn lại** của mọi lệnh đang mở ≤ `TRAN_RUI_RO.TONG_PC × vốn`. "Rủi ro còn lại" = số tiền sẽ mất **nếu chạm đường cắt**, nên lệnh đã **khoá hoà vốn thì chiếm 0 ngân sách** và trả lại chỗ cho lệnh mới. Cùng 30% vốn như cũ nhưng mua được 12–33 lệnh thay vì 3, vì mỗi lệnh nay rẻ hơn 4–10 lần.

⚠ **Ngân sách rủi ro KHÔNG bắt được tương quan.** N lệnh long trên N alt lúc BTC sập không phải N lệnh, đó là **1 lệnh cỡ N×**; và N lệnh tương quan chỉ đáng ~1–2 lệnh độc lập khi đếm cỡ mẫu. Đo thật: **53/54 lệnh là LONG**. Nên có cảnh báo `TAP TRUNG LONG/SHORT` trong log — **chỉ kêu, không chặn** (quyết định của chủ dự án).

⚠ **Nhóm `TUONG` và `TIN_HIEU` chưa từng được kiểm chứng bằng dữ liệu thật.** Đừng chỉnh vì "trông có vẻ hợp lý hơn" — đó chính là vòng lặp đã đẻ ra 4 chốt chặn hỏng ở dự án cũ.

**Hai file ⭐ là nơi nằm giá trị thật.** `tuong.js` là lý do bot này khác mọi bot đọc %24h. `lenh.js` là chỗ thực thi các bất biến.

**Ngăn xếp:** Node 20 + `--experimental-websocket` · JavaScript thuần (không TypeScript, không build) · **đúng 1 phụ thuộc**: `mysql2` · giao diện HTML thuần không framework.

⚠ **Lưu trữ là MySQL, đã bỏ hẳn SQLite.** MySQL của hosting **chỉ nghe localhost** → bot **bắt buộc chạy trên server**. Chạy ở máy cá nhân thì hàng đợi ghi đầy dần rồi tràn. Đây là ràng buộc của hosting, không sửa bằng code được.

---

## 🧠 Ý TƯỞNG CỐT LÕI — hiểu cái này là hiểu cả bot

**Treo lệnh ảo ở xa giá thì chẳng tốn gì.** Nên tường chỉ đáng tin khi nó **đã bị giá thử** mà vẫn còn.

Ba số phận của một bức tường, ý nghĩa hoàn toàn khác nhau:

| | Điểm | Nghĩa |
|---|---|---|
| **SỐNG SÓT** (`sv`) | +15 | giá áp sát rồi rời đi, tường còn nguyên |
| **BỊ KHỚP** (`fl`) | +8 | ăn mòn dần — có tiền thật vào nó |
| **BỊ RÚT** (`pl`) | **−30** | biến mất nguyên khối khi giá áp sát — **lệnh ảo** |

Phân biệt **RÚT** với **KHỚP** chính là thứ cho phép "bắt trước" cú giảm:

> tường mua bị **KHỚP** → người ta ĐANG bán thật → cú giảm **đã** bắt đầu, bạn muộn rồi
> tường mua bị **RÚT** → market maker bước sang một bên → cú giảm **CHƯA** xảy ra → **đây mới là chỗ vào**

Cò SHORT cần đủ **cả bốn**: `BPR ≥ 0,25` · `BPR ≥ 2×BFR` · `dDBI ≤ −0,25` · **giá còn trong 1,5% của đỉnh**. Bỏ bất kỳ điều kiện nào là biến nó thành bot vào lệnh muộn.

⭐ **`numOrders`** (phần tử thứ 4 của mỗi hàng `books` OKX) — dự án cũ bỏ phí hoàn toàn. Tiền lớn mà chỉ **1 lệnh** → rút một cú là sạch → nghi ảo (−15). Nhiều chục lệnh → không ai điều phối được → khó giả (+10). **Chưa kiểm chứng, để trọng số thấp cho tới khi có ≥300 mẫu.**

---

## 📏 NGUYÊN TẮC ĐO LƯỜNG — đọc trước khi báo cáo bất kỳ con số nào

- **Tỷ lệ thắng trần trụi là con số dối nhất trong hệ thống này.** Mốc so sánh đúng là `baseline = d_cắt / (d_chốt + d_cắt)` — với giá đi ngẫu nhiên, đó chính là xác suất chạm chốt lời trước. **Thắng 60% khi baseline 65% nghĩa là bot tệ hơn tung đồng xu.**
- **Cỡ mẫu.** Phân biệt 55% với 50% cần **~780 lệnh độc lập**. Dưới 100 lệnh **chỉ được kiểm lỗi thô**, tuyệt đối không chỉnh trọng số.
- **Đừng lặp lại vòng lặp chết người của dự án cũ:** chỉnh trọng số sau vài chục kèo → đẻ ra 4 chốt chặn → rồi chính chúng bị nghi là **cắt mất lệnh thắng**.
- **`R` có mẫu số là RỦI RO THIẾT KẾ CỦA CHÍNH LỆNH ĐÓ** (`khoang_trailing × notional`, ghi sẵn ở cột `lo_thiet_ke_usd`). Trước 2026-08-23 mẫu số là hằng số $20; nay đường cắt rộng hẹp theo từng coin nên mẫu số phải đi theo, không thì R của coin êm và coin loạn không so được với nhau. Bất biến giữ nguyên: lệnh chạm đường cắt sạch vẫn ra **≈ −1,00R**. Thấy −1,5R là gap qua đường cắt hoặc trượt quá lớn.
- **NULL ≠ 0.** Thiếu dữ liệu ghi `NULL` + cờ `co_*` = false. Ghi 0 cho cả hai là dạy mô hình sau này rằng "không có tin gì" giống "tin trung lập".

---

## 🪤 BẪY ĐÃ TỐN CÔNG PHÁT HIỆN — đừng dẫm lại

| Bẫy | Xử lý |
|---|---|
| **`books` trả `checksum = 0` ở MỌI gói** — đo thật trên BTC-USDT-SWAP, 10 gói. OKX không cấp checksum cho kênh này; chỉ `books-l2-tbt` (VIP4/5) mới có. Coi 0 là checksum thật → báo hỏng mọi gói → bão `subscribe` → bị chặn tốc độ | Canh **sổ bắt chéo** + đồng bộ lại mỗi 30 phút + chốt 15 giây giữa hai lần `napLai` |
| Socket còn `pong` nhưng kênh `books` đã câm → sổ **đóng băng** mà nhãn vẫn "live", rồi `wallTrust` càng cộng điểm vì tường "sống lâu" | Tách **`lastData`** khỏi `lastMsg`. Quá 20 giây không có **gói dữ liệu** thì bỏ qua coin đó |
| `sz` của SWAP tính theo **HỢP ĐỒNG** | Nhân `ctVal` rồi nhân giá. Quên là **sai hàng nghìn lần** |
| Chu kỳ funding **không phải lúc nào cũng 8h** (nhiều coin meme 4h/2h/1h) | Tự tính từ `prevFundingTime`/`fundingTime`, quy về mức **/8h** trước khi so giữa các coin |
| Lấy mẫu "25 phút trước" | Duyệt **NGƯỢC** từ cuối mảng. `find()` từ đầu lấy nhầm phần tử **cũ nhất** (2–4 giờ) |
| Phân trang nến `before`+`limit=300` | Khoảng > 300 nến thì OKX trả 300 cây **mới nhất**, thủng đoạn giữa **không báo lỗi**. Phân trang lùi bằng `after` |
| `CREATE TABLE IF NOT EXISTS` bỏ qua lặng lẽ bảng cũ → cột mới không được thêm → ghi lỗi âm thầm | Dùng `themCot()` trong `lib/db.js` |
| Cộng dồn dòng tiền **có dấu** | `f30 = 0` lẫn lộn "chợ chết" với "hai phe đánh nhau ngang cơ" — hai trạng thái ngược nhau. Phải tách **gross** mua/bán |
| Trượt giá tính hai lần | `_khop()` trả về **giá đã xấu đi**, nên trượt tự nằm trong PnL. `truot_usd` **chỉ để báo cáo**. Chỉ **phí** mới trừ tường minh |
| Hai bot chạy cùng lúc = hai tiến trình ghi một DB | `EADDRINUSE` đã có thông báo rõ + thoát sạch |
| **Sổ lệnh chết → lệnh đang mở bị bỏ rơi** | Vòng lặp 2 giây có ba lối `continue` (quá 20s không có gói · `E.so.hong` · sổ rỗng một phía) nằm **trước** `QL.capNhat()`, nên bỏ qua luôn cả lệnh đang mở. Đo thật: **19/08 01:35→01:40, 6 phút, 20/20 coin mất sổ, WS im, 3 lệnh đang mở** — vốn đứng nguyên $178,12 và bộ đếm ghi đứng nguyên 770236, tức `capNhat()` không chạy lần nào. Cộng **10.333 lần** `so lenh hong` (đồng bộ định kỳ 30 phút × 20 coin × 11 ngày). Đường cắt 33% cũ **che** cho lỗ hổng này; đường cắt 3–8% thì không. Nay có nhánh **canh mù** bằng giá REST |
| **Hàm băm phiên bản tự nhận là đầy đủ nhưng bỏ sót nhóm quan trọng nhất** | `verTrongSo` có chú thích *"tự sinh từ chính mảng tham số quyết định → không bao giờ quên bump phiên bản"*, nhưng **không hề băm nhóm `SETUP`** — tức toàn bộ điều kiện VÀO LỆNH. Hạ ngưỡng SHORT-A từ 30%/0,05% xuống 20%/0,02% mà băm **đứng im**, DB không tách được hai đợt dữ liệu. ⛔ Đừng tin chú thích — **kiểm bằng hành vi**: đổi từng nhóm tham số rồi khẳng định băm phải đổi |
| **Điều kiện setup "hợp lý" nhưng GIAO của chúng gần như rỗng** | SHORT-A đòi `chg24 ≥ 30%` **và** `funding ≥ 0,05%`. Đo riêng: 4,25% và 4,94% số nhịp — cả hai đều không hiếm. Đo **giao**: **0,22%**, qua cả 4 vế còn **0,13%** → 11,3 ngày ra đúng **1 lệnh short**. Hai điều kiện gần như loại trừ nhau: coin pump mạnh thì funding thấp, coin funding cao thì không pump. ⛔ Đừng đánh giá điều kiện setup bằng cách đọc từng vế — phải **đo giao** |
| **Ngưỡng đặt cạnh mức nền của thị trường** | 41% số nhịp có funding 0,01–0,02% — đó là mức nền OKX. Ngưỡng 0,05% là **5 lần mức nền** nên gần như không chạm; nhưng hạ xuống 0,01% thì vế funding **ngừng lọc gì cả** (nhảy 20,8×, từ 5 lên 27 coin). Ngưỡng phải đặt theo **bội số của mức nền**, không phải theo con số tròn |
| **Siết cắt lỗ mà quên các ngưỡng ĐO BẰNG ĐÔ ăn theo nó** | Cửa sổ DCA `[$4,$10]` hợp lý khi mức cắt luôn là $20. Khi đường cắt còn $1,80–$4,80 thì cửa sổ đó nằm **ngoài tầm với** → DCA **chết âm thầm**, không lỗi, không log. Nay đo bằng **tỷ lệ** trên rủi ro thiết kế. Đổi mức cắt thì phải rà **mọi** hằng số đô ăn theo: cửa sổ DCA · `RAO_CHAN_TOI_THIEU` · mẫu số R · cổng thanh lý |

---

## ⛔ VIỆC TIẾP THEO (theo thứ tự)

0. ✅ ~~Đưa bot lên server~~ — **XONG 2026-08-12**. Chạy tại `~/bot-coin`, web ở `k7m2coin.hiteckqualityconstruction.com.au`, cron mỗi phút.
1. **Để bot chạy giấy vài ngày** qua vài khung giờ đêm → có lệnh thật để đọc. **Đây là việc quan trọng nhất**, không phải viết thêm code.
2. ⏳ **Giai đoạn 10 — KHUNG ĐÃ XONG 2026-08-24** (`lib/san.js` · `lib/okx-tt.js` · đối soát · SL phía sàn), đang khoá ở chế độ `giay`. Còn lại: nghe kênh `orders` riêng tư qua WS để biết NGAY lúc SL khớp kèm giá + phí thật (hiện chỉ đối soát 5 phút/lần và cảnh báo). ⛔ Bật `demo` khi có khoá demo; bật `that` chỉ sau **≥200 lệnh giấy**. Cần: API key **chỉ quyền Trade, KHÔNG bật Withdraw**, có giới hạn IP · cắt lỗ `trigger` **phía sàn** (cắt lỗ nằm trong RAM bot thì bot chết = không có cắt lỗ) · đối soát số dư.
3. **Trang báo cáo web** thay cho terminal.

**Chưa được làm:** chỉnh trọng số `S` (chưa đủ mẫu) · thêm sàn khác (chưa cần) · thêm tín hiệu mới (đa kiểm định — 15 tín hiệu × nhiều coin × nhiều tham số là >300 phép thử, ở p<0,05 sẽ có ~15 tín hiệu "chạy được" hoàn toàn do may rủi).

---

## 🔐 BẢO MẬT

- API key đọc từ **biến môi trường** hoặc `config.local.js` — file này đã nằm trong `.gitignore` **trước khi** viết khoá vào.
- Trước mỗi commit: `grep -rln '<mấy ký tự đầu của khoá>' . --exclude-dir=.git`
- Dự án cũ **đã bị lộ token một lần** theo đúng kịch bản: một phiên làm việc song song commit file khi token còn trong đó, việc gỡ token ra diễn ra *sau*. Không ai làm sai rõ ràng — chỉ là hai việc đúng làm sai thứ tự.

---

## 🛠 TẠO / CẬP NHẬT DB BẰNG TAY

**Tạo DB mới:** chạy toàn bộ [server/schema.sql](server/schema.sql) (6 bảng). File đó **sinh ra từ `lib/db.js`** — sửa DDL thì phải chạy lại:

```bash
npm run xuat-schema
```

Có phép kiểm so `schema.sql` với DDL trong `lib/db.js`, lệch là test đỏ. Đây là lưới an toàn duy nhất còn lại sau khi bỏ `ALTER TABLE` tự động.

### Vá DB CŨ

Dự án **không** dùng `ALTER TABLE` tự động cho nhóm cột đo cò (quyết định của chủ dự án — xem nhật ký 2026-08-12). Cột nằm trong `CREATE TABLE`, nên **DB tạo mới thì có sẵn**; DB đã tồn tại thì phải chạy tay.

Chạy khi thấy log báo `Unknown column 'apr'` hoặc sau khi khôi phục bản sao lưu cũ:

```sql
ALTER TABLE nhip
  ADD COLUMN apr DOUBLE, ADD COLUMN afr DOUBLE,
  ADD COLUMN sat_dinh DOUBLE, ADD COLUMN sat_day DOUBLE,
  ADD COLUMN mau_pull_bid INT, ADD COLUMN mau_pull_ask INT,
  ADD COLUMN co_short TINYINT, ADD COLUMN co_long TINYINT;

ALTER TABLE tin_hieu
  ADD COLUMN apr DOUBLE, ADD COLUMN afr DOUBLE, ADD COLUMN sat_day DOUBLE,
  ADD COLUMN mau_pull_bid INT, ADD COLUMN mau_pull_ask INT,
  ADD COLUMN co_short TINYINT, ADD COLUMN co_long TINYINT;
```

**Thêm 2026-08-24** — hai cột của SL phía sàn (Giai đoạn 10):

```sql
ALTER TABLE lenh
  ADD COLUMN sl_algo_id VARCHAR(48),
  ADD COLUMN sl_gia VARCHAR(48);
```

Thiếu chúng thì bot **không đối soát được SL của mình** sau khi khởi động lại.

**Thêm 2026-08-23** — hai cột của đường cắt trailing:

```sql
ALTER TABLE lenh
  ADD COLUMN khoang_trailing DOUBLE,
  ADD COLUMN lo_thiet_ke_usd DOUBLE;
```

Thiếu `lo_thiet_ke_usd` thì `r_multiple` của lệnh mới **không tính được** và `npm run bao-cao` đọc ra số vô nghĩa.

Kiểm lại:

```sql
SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME IN
  ('apr','afr','sat_dinh','sat_day','mau_pull_bid','mau_pull_ask','co_short','co_long')
ORDER BY TABLE_NAME, COLUMN_NAME;
```

Phải ra **15 dòng** (8 của `nhip` + 7 của `tin_hieu`).

---

## 📝 NHẬT KÝ THAY ĐỔI

Mỗi lần sửa code phải thêm một dòng ở đây, **trong cùng lượt làm việc**.

| Ngày | Việc | Lý do |
|---|---|---|
| 2026-08-24 | 🔧 **Mốc tính vốn + vá hàm băm phiên bản** | Chủ dự án muốn vốn về **$200** và lãi lỗ về 0 để bản mới chạy từ mốc sạch — hợp lý, vì 57 lệnh đầu chạy bằng cơ chế HOÀN TOÀN KHÁC (cắt lỗ $20 cố định, chốt lời nhả nửa đỉnh, trần 3 lệnh) nên trộn lãi lỗ của chúng vào bản mới là làm nhiễu chính phép đo. ⛔ **KHÔNG xoá dữ liệu** — 57 lệnh đó chính là bộ dữ liệu đã dùng để hiệu chỉnh toàn bộ cơ chế mới; xoá là mất mốc so sánh. Thay bằng `MOC_VON_MS` = 1787558700000 (2026-08-24 08:05 UTC): `tongPnlDaDong()` chỉ cộng lệnh đóng SAU mốc, dữ liệu cũ giữ nguyên trong DB. Reset lần sau chỉ cần đổi con số, không đụng DB. **Vá kèm — phát hiện khi kiểm deploy:** `ver_trong_so` **không đổi** sau khi hạ ngưỡng SHORT, dù chú thích của chính hàm đó tự nhận *"không bao giờ quên bump phiên bản khi chỉnh trọng số"*. Truy ra `verTrongSo` **không băm nhóm `SETUP`** — tức bỏ sót toàn bộ điều kiện vào lệnh. Nay băm thêm `SETUP` · `LOC_COIN` · `TRAN_RUI_RO` · `VON` · các trần · `MOC_PUMP_LON`, kèm **9 phép kiểm HÀNH VI** khẳng định băm phải đổi khi từng nhóm đổi và phải GIỮ NGUYÊN khi chỉ đổi tham số hạ tầng. Băm mới: `50dedf4507` → **`494a84ee9f`**. ⚠ May là chưa gây hại: `khoang_trailing IS NOT NULL` cho ra **0** lệnh, tức chưa lệnh nào chạy qua cơ chế mới → ranh giới dữ liệu vẫn sạch. **316/316 đạt** (trước 304) |
| 2026-08-24 | ⭐⭐ **GIAI ĐOẠN 10 — cắt lỗ phía sàn + đối soát khởi động (logic đầy đủ, vẫn khoá ở chế độ giấy)** | Chủ dự án hỏi đúng chỗ yếu: *"biến động mạnh chỉ trong chớp mắt là bị cắt, nhiều lệnh như thế bạn có kịp cắt không"* — rồi tự đề xuất đặt SL phía sàn. Đúng, và đó là cách DUY NHẤT xử lý được **ba tầng trễ**: (1) nhịp 2 giây — và bản trailing 3–8% **nhạy cảm hơn hẳn** bản cắt $20 (=33% giá), vì một cú 2 giây khó đi hết 33% nhưng đi hết 3% là bình thường; (2) Node đơn luồng — 20 lệnh cùng chạm cắt thì lệnh cuối chờ lệnh đầu; (3) bot chết thì không ai cắt. **Kiến trúc: BA CHẾ ĐỘ, MỘT ĐƯỜNG CODE** — `giay` (mặc định, không cần khoá, vẫn TÍNH đủ lệnh SL rồi ghi `SL_KHO` vào `su_kien` để soi trước) → `demo` (API OKX thật + header `x-simulated-trading`, tiền ảo hạ tầng thật) → `that` (bỏ đúng header đó). Nhờ vậy `giay` không phải nhánh code chết và sang thật không có đoạn nào "lần đầu được chạy". **File mới:** `lib/okx-tt.js` (ký HMAC + endpoint riêng tư) · `lib/san.js` (bộ chuyển). **Quyết định thiết kế:** SL kiểu **thị trường** `slOrdPx:'-1'` chứ không giới hạn — SL không khớp còn tệ hơn không có SL; **vùng chết 0,3%** chống spam sửa lệnh (đường cắt siết mỗi 2 giây × 20 vị thế = 10 yêu cầu/giây, đụng giới hạn tốc độ API đúng lúc thị trường loạn); gọi sàn **không `await`** trong vòng lặp. **Vá luôn lỗi ① (mức Cao):** `napLaiLenhMo()` dựng lại lệnh đang mở từ DB lúc khởi động — khôi phục được từ **cột đã có**, vì `gia_cat` ghi mỗi 2 giây và chỉ siết vào nên nạp lại mốc chặt nhất là chính xác tuyệt đối; `giaDinh` suy ngược từ `gia_cat`/`khoang_trailing`, `daKhoaVon` suy từ điểm hoà vốn, `baoDong` về `false` (phía an toàn). Kèm `napLaiVon()` dựng vốn từ tổng PnL đã đóng thay vì đặt về $200 mỗi lần restart. **Đối soát** chạy TRƯỚC khi bật nhịp, và định kỳ 5 phút ở chế độ thật để bắt lúc SL sàn đã khớp — ⛔ **chỉ cảnh báo, không tự đóng sổ sách**, vì đóng bằng giá đoán sẽ làm hỏng chính bộ dữ liệu dự án dựng lên để đo. Thêm 2 cột `sl_algo_id` · `sl_gia`. **304/304 đạt** (trước 271) |
| 2026-08-24 | ⭐ **MỞ KHOÁ LỆNH SHORT + trần theo hướng + gỡ số cứng 0.30** | Chủ dự án chốt: bot phải có lệnh short mà vẫn an toàn. Đo trên **311.513 nhịp** để tìm ĐÚNG chỗ nghẽn — và nó **không phải** ngưỡng `chg24 ≥ 30%` như tưởng: `chg24 ≥ 30%` đạt **13.241 nhịp (4,25%)**, `funding ≥ 0,05%` đạt **15.380 nhịp (4,94%)**, nhưng **GIAO của hai vế chỉ 686 nhịp (0,22%)**, qua cả 4 vế còn **395 nhịp trên 3 coin** → 11,3 ngày ra đúng 1 lệnh short. Hai điều kiện **gần như loại trừ nhau**. Nguyên nhân sâu hơn: **41% số nhịp có funding 0,01–0,02%** = mức nền OKX, nên 0,05% là 5 lần mức nền. **Sửa:** `SHORT-A.chg24Min` 0,30→**0,20**, `fundingMin` 0,0005→**0,0002** (cả SHORT-A và SHORT-B) → **1.659 nhịp, gấp 4,2×**, vẫn chỉ 5 coin nên vẫn chọn lọc. ⛔ **KHÔNG** hạ funding xuống 0,01% dù bảng đo cho 20,8×: đó là mức nền, hạ tới đó là vế funding ngừng lọc và giả thiết "long chen chúc" tan — biến SHORT-A thành "short bất cứ thứ gì vừa pump". Giữ **nguyên 100%** mọi chốt chặn squeeze (funding âm → chặn, OI giảm khi giá tăng → chặn), và SHORT vẫn khắt khe hơn LONG-A (20% so với 10–15%). **An toàn kèm theo:** cảnh báo `TAP TRUNG` nâng thành **cổng thật** `TRAN_CUNG_HUONG_PC = 0,70` — không hướng nào được chiếm quá $42 trong $60, luôn chừa chỗ cho hướng kia; hôm nay không chặn gì vì long đang dùng ~40%. **Vá kèm:** `bot.js` có **số cứng `0.30`** quyết định `da_tang30_hom_qua` — vi phạm quy tắc #4 và nhóm phép kiểm SỐ CỨNG đã để lọt suốt. Cột này là **cổng hai chiều** (SHORT-B cần TRUE, LONG-B bị chặn nếu TRUE) nên một con số lạc trong bot.js đang âm thầm điều khiển hai setup; nay là `QUET.MOC_PUMP_LON`, khoá bằng phép kiểm phải khớp `SHORT-A.chg24Min`. **271/271 đạt** (trước 263) |
| 2026-08-23 | 🔧 **Hạ trần RAM 1200/1350 → 1000/1200 sau khi ĐO server thật** | Chủ dự án đưa ảnh bảng điều khiển hosting: trần tài khoản **2 GB** (CloudLinux LVE), bot đang dùng **357,68 MB** ở 20 coin → **~15 MB/coin** + nền Node ~60 MB. Con số 1200/1350 đặt trước đó là **đoán khi chưa biết RAM server**, chỉ chừa 700 MB đệm — quá mỏng cho hosting chia sẻ, nơi chạm trần là bị **giết thẳng, không swap, không ân hạn**, trong khi Node dọn rác lười nên RSS vọt lên trước khi GC chạy. Bot chết = **không ai canh lệnh đang mở**, đúng lỗ hổng vừa vá. Nay 1000/1200 ≈ 63 coin, chừa hơn 1 GB đệm. Thêm `RAM_MAY_CHU_MB: 2048` để **khai báo** RAM máy chủ thay vì để code đoán, kèm phép kiểm bắt mức xả ≤ 65% RAM máy chủ — lần sau ai nâng trần cho "theo dõi nhiều coin hơn" sẽ bị chặn. ⚠ Ghi nhận kèm: RAM **sẽ không chạm trần** trong thực tế — log cho thấy `loc=11/20`, tức **bộ lọc xu hướng** mới là thứ quyết định số coin (10–13), không phải trần. Bỏ trần đếm 20 chỉ đưa lên ~15–25 coin ≈ 400–450 MB; thứ thật sự mở khoá cơ hội là bỏ **trần lệnh**, không phải trần coin. Đo thêm từ bảng điều khiển: CPU 10,46/200 · đĩa 230 MB/10 GB · processes 11/100 — **RAM là ràng buộc duy nhất**. ⚠ Đĩa: bảng `nhip` không có cơ chế xoá cũ, tích ~610 MB/tháng ở 20 coin → 10 GB đầy sau ~16 tháng. **263/263 đạt** |
| 2026-08-23 | ⭐ **BỎ TRẦN ĐẾM ở CẢ HAI cần gạt — thay bằng RỦI RO và RAM** | Chủ dự án chốt: trần hiện tại đang **cắt mất cơ hội có lãi**. Đo thật khớp: trần 3 lệnh khoá bot **29,3% thời gian**, và **37/71** lần vào SẴN_SÀNG không bao giờ mở được lệnh. **Lệnh mở:** `SO_LENH_MO_TOI_DA` 3 → `null`, thay bằng `TRAN_RUI_RO.TONG_PC = 30%` vốn — **đúng bằng ngân sách cũ** (3 × $20 / $200). Vì đường cắt trailing chỉ 3–8% nên rủi ro mỗi lệnh còn $1,80–$4,80: cùng số tiền đó nay mua được **12–33 lệnh thay vì 3**. Ngân sách đo bằng **rủi ro CÒN LẠI** (PnL tại đường cắt), không phải rủi ro lúc mở → lệnh **đã khoá hoà vốn chiếm 0 ngân sách** và trả lại chỗ. ⚠ Trần rủi ro **không** bắt được tương quan (53/54 lệnh là LONG) nên thêm cảnh báo `TAP TRUNG LONG/SHORT` — chỉ kêu, không chặn. **Coin theo dõi:** `SO_COIN_TRAN` 20 → `null`, thay bằng `RAM_TRAN_MB` — RAM mới là thứ việc theo dõi thêm coin thật sự tiêu. Vượt `RAM_XA_BOT_MB` thì **gỡ bớt** coin chứ không chỉ ngừng thêm, vì bot bị OOM kill là **không ai canh lệnh đang mở** (đúng lỗ hổng vừa vá). Coin đang có lệnh mở vẫn miễn nhiễm khỏi việc gỡ. ⚠ `RAM_TRAN_MB = 1200` là **ước lượng** từ mốc đo 20 coin → 380MB (~19MB/coin); **phải kiểm `free -m` trên server rồi chỉnh**. Kèm theo, làm nốt việc đã treo từ đầu: **mọi lối chặn mở lệnh nay đều ghi sự kiện** (`chan_ngat_mach` · `chan_tran_dem_lenh` · `chan_tran_rui_ro` · `chan_cong_thanh_ly`) — trước đây hai lối đầu là `return` trần, không log, không dấu vết, nên DB không giải thích nổi vì sao 37 lần SẴN_SÀNG không vào được lệnh. **261/261 đạt** (trước 244) |
| 2026-08-23 | ⛔ **VÁ LỖ HỔNG: sổ lệnh chết thì lệnh đang mở KHÔNG AI CANH** | Chủ dự án hỏi đúng chỗ: *"một ngày nào đó coin nào đó ngược hướng nó lại thanh lý tài khoản"*. Truy ra `bot.js` có **ba lệnh `continue`** nằm TRƯỚC `QL.capNhat()` — sổ quá 20s không có gói · `E.so.hong` · sổ rỗng một phía — nên khi sổ chết thì lệnh đang mở **không được kiểm đường cắt, không được kiểm van cuối**, giá chạy bao xa cũng không ai đóng. Lỗ hổng **có từ trước**, nhưng trước nay được **đường cắt rộng che cho**: cắt ở 33% giá thì mất sổ vài phút hiếm khi đủ để giá đi hết quãng đó. Đường cắt mới chỉ 3–8% nên tấm che biến mất → phải vá cùng lượt. **Đo thật trong log 11 ngày:** 19/08 01:35→01:40 **6 phút liền, 20/20 coin mất sổ, WS im, ĐANG CÓ 3 LỆNH MỞ** — vốn đứng nguyên $178,12 và bộ đếm ghi DB đứng nguyên 770236, chứng minh `capNhat()` không chạy lần nào; tổng 8 phút "0 sổ live" trong đó 6 phút có lệnh mở; thêm **10.333 lần** `so lenh hong` từ đồng bộ định kỳ. **Cách vá:** thêm `canhLenhMu()` — sổ chết thì lệnh đang mở vẫn được canh bằng **giá REST ticker** (`bangGia`, làm mới mỗi 60 giây, đường dữ liệu ĐỘC LẬP với WebSocket). Chỉ chạy hai đường ra bảo vệ vốn; **không** chạy chốt lời (cò đảo chiều cần sổ mới tính được), **không** mở lệnh mới, **không** DCA. Ticker cũ hơn 3 phút thì không tin → báo `khong_co_gia` và **kêu to** thay vì đoán. Đóng mù bị **phạt trượt 1%** (`_khopMu`) — nhánh cũ để `truotPc: 0`, tức giả định khớp hoàn hảo đúng vào lúc thị trường tệ nhất. Logic đường cắt tách thành `_capNhatDuongCat()` **dùng chung** cả hai nhánh, có phép kiểm bắt việc chép ra hai bản. **244/244 đạt** (trước 226) |
| 2026-08-23 | ⭐ **BỎ CẮT LỖ CỐ ĐỊNH $20/$25 — thay bằng ĐƯỜNG TRAILING BÁM ĐỈNH** | Chủ dự án chốt sau khi đọc dump 11,3 ngày (54 lệnh, 311.513 nhịp). Ba con số buộc phải đổi: (1) **tỷ lệ 1:50** — cắt lỗ $20/$60 = giá chạy **33%**, còn chốt lời nhả ra ở **0,64%** giá (đỉnh trung vị 1,288%, công thức cũ trả lại đúng nửa) → phải thắng ~96% mới hoà, thực tế thắng 64,8%; (2) toàn bộ khoản lỗ **−$15,49** đến từ **đúng 2 lệnh BEAT** chạm mốc $20, 52 lệnh còn lại cộng lại **+$26,10**; (3) tổng đỉnh lãi **+$71,56** về đích **−$15,49** — đã **trả lại thị trường $87,05**. Nay chỉ còn MỘT đường cắt cách **đỉnh giá** một khoảng `K = kẹp(0,50 × biên độ 24h, 3%, 8%)`, **chỉ đi một chiều**, cộng **khoá hoà vốn** khi lãi đạt 1×K (cứu đúng ca BEAT #2: từng lãi +1,34% rồi về −$20,78). Sàn/trần chọn bằng **dữ liệu** chứ không đoán: dựng lại đường giá theo phút của 53/54 lệnh rồi đo độ sâu đi ngược — cắt ở 2% giết oan 13 lệnh lãi (+$4,83), ở 6% chỉ giết oan 3 lệnh (+$0,73) mà vẫn chặn được cả 2 lệnh BEAT (−31,9% và −28,1%). Chốt lời **giữ cơ chế cò** nhưng siết hai chỗ: `HOI_LAI_TRAN` 0,50→**0,35** (47/54 lệnh có đỉnh <10% nên luôn rơi vào nhánh này) và thêm **SÀN PHÍ** `SAN_CHOT_LOI_PC = 0,24%` (17 lệnh đóng bằng `chot_loi` mà PnL âm; 7 lệnh có đỉnh dưới 2× phí khứ hồi → chốt ở đó **không thể** dương). ⚠ Kèm hai hệ quả dây chuyền suýt lọt: **cửa sổ DCA `[$4,$10]`** nằm ngoài tầm với khi lỗ tối đa chỉ còn $1,80–$4,80 → đổi sang **tỷ lệ** `[0,20 ; 0,50]` × rủi ro thiết kế; **mẫu số R** đổi từ hằng số $20 sang `lo_thiet_ke_usd` của từng lệnh. `RAO_CHAN_TOI_THIEU` giữ 45 phút và vẫn đo tới **van cuối** chứ không tới đường trailing — đo tới đường trailing thì số phút tụt hơn chục lần và DCA chết âm thầm lần nữa; đổi lại DCA sẽ nổ **thưa hơn**, chưa hiệu chỉnh lại bằng dữ liệu. Thêm 2 cột `khoang_trailing` · `lo_thiet_ke_usd`. **226/226 đạt** (trước 205) |
| 2026-08-12 | 🧹 **Xoá nốt khối `ALTER` còn lại + quét code chết** | Chủ dự án dọn cho sạch. Kiểm lại thì **cả 10 dòng `ALTER` còn sót** (`lenh` × 6, `lan_vao` × 4) **đã nằm sẵn trong `CREATE TABLE`** → với DB mới chúng không bao giờ chạy, chỉ tốn 10 truy vấn `information_schema` mỗi lần khởi động. Nay `khoiTao()` chỉ còn chạy DDL. Quét thêm code chết trong 13 file: 6 khoá config + 9 hàm export không ai gọi — **tất cả đều có TỪ TRƯỚC**, không phải rác của đợt sửa này; phần lớn là nền cho Giai đoạn 10 (`KY_QUY` · `SO_LAN_THU_IOC` · `NGAT_MACH.lechSoDuToiDa`) hoặc khai báo bất biến (`DONG_VI_TIN_HIEU_NGUOC` · `CO_CHOT_CHI_KHI_LAI`) → **giữ nguyên**. ⚠ Kèm sự cố: một lệnh `Get-Content \| Set-Content -Encoding utf8` trong PowerShell 5.1 đã **làm hỏng mã hoá toàn bộ `CLAUDE.md`** (UTF-8 đọc nhầm thành ANSI rồi ghi lại) — đã đảo ngược và kiểm sạch. **Từ nay sửa file tiếng Việt bằng Edit/Write, KHÔNG dùng đường ống PowerShell.** **205/205 đạt** |
| 2026-08-12 | **Bỏ `ALTER` tự động + thêm `server/schema.sql` sinh tự động** | Chủ dự án chốt tự chạy SQL bằng tay cho sạch, DB cũ đã xoá làm lại. Cột đo cò chuyển vào thẳng `CREATE TABLE`. ⚠ Việc này **mở lại đúng cái bẫy** ghi ở bảng trên (`CREATE TABLE IF NOT EXISTS` bỏ qua bảng cũ trong im lặng) nên phải bù bằng hai thứ: (a) `cong-cu/xuat-schema.js` sinh `server/schema.sql` **từ `lib/db.js`**, không chép tay; (b) phép kiểm so hai bên — thêm cột vào `db.js` mà quên `npm run xuat-schema` là **test đỏ**, thay vì DB tạo mới thiếu cột rồi bot ghi lỗi âm thầm. **205/205 đạt** |
| 2026-08-12 | 🔍 **Đọc dump 11,17h + vá MÙ ĐO LƯỜNG ở cò LONG** | Dump mới (2.013 nhịp, 8 coin, 12:28): **lần đầu tiên có `CHO_VAO`** — KORU vào SẴN SÀNG lúc 10:47 (LONG-A, S=26), giữ **101 nhịp = 1h41**, có 1 lần `troi_gia_tinh_lai` (18,965→18,675) đúng bất biến 8. Vẫn 0 lệnh. ⚠ Dump này chạy bằng **code CŨ** (nhãn `NGOAI_KHUNG`, 3 coin) — **không phản ánh thay đổi nào của hôm nay**. Phát hiện chính khi truy vì sao KORU không vào: `lib/tinhieu.js` **TÍNH `apr`/`afr`/`satDay` rồi vứt đi** — `ghiNhip`/`ghiTinHieu` chỉ ghi `bpr`/`bfr` (phía MUA). Mà **cò LONG phụ thuộc hoàn toàn vào phía BÁN**: 4/5 vế (`K.dem` · `apr ≥ 0,25` · `apr ≥ 2×afr` · `satDay`) **không có ở bảng nào**, chỉ `ddbi` được ghi (đạt 10/101 nhịp). Cò CHỐT LỜI cũng vậy (`ao_short` dùng `K.pr`, `ao_long` dùng `B.pr`). Tức là: bot chạy đúng nhưng **DB không bao giờ trả lời được "vì sao không vào lệnh"** — vi phạm chính nguyên tắc đo lường của dự án. Thêm **8 cột** vào `nhip` (`apr` · `afr` · `sat_dinh` · `sat_day` · `mau_pull_bid/ask` · `co_short` · `co_long`) + **7 cột** vào `tin_hieu` (như trên, trừ `sat_dinh` vì bảng này đã có). ⚠ Theo yêu cầu chủ dự án, **KHÔNG** dùng khối `ALTER` tự động — cột nằm thẳng trong `CREATE TABLE`, DB đang chạy cập nhật **bằng tay** (câu lệnh ở mục 🛠 bên dưới). Hệ quả: DB khôi phục từ bản sao lưu cũ hơn 12/08 sẽ thiếu cột, phải chạy tay lại, nối dây ở `tinhieu.js` → `bot.js` → `db.js`. **202/202 đạt** |
| 2026-08-12 | **BỎ "lấy top N" — số coin theo dõi thành KẾT QUẢ CỦA BỘ LỌC** | Chủ dự án chốt: lọc theo xu hướng, không cố định số lượng. Đúng chỗ hỏng: `diemQuan` cũ có dòng chốt `if (d < 0) d = |chg24| × 10` **gán điểm cho MỌI coin**, nên danh sách top-N **luôn bị lấp đầy** kể cả khi chẳng coin nào có xu hướng — nới 3→12 theo cách đó chỉ là thêm 9 coin rác. Tách logic ra `lib/loc-coin.js` (thuần, không tác dụng phụ) để **test được bằng HÀNH VI** thay vì regex — `bot.js` require vào là khởi động cả bot nên trước nay không test được. Hai cổng: **biên độ 24h `(high24−low24)/last`** (thước đo "có xu hướng" — `high24`/`low24` nằm sẵn trong ticker mà trước nay **không hề dùng**) + **vùng tiền-setup trên chg24** (nới ngưỡng setup một khoảng đệm để làm nóng `wallTrust` TRƯỚC khi coin đủ điều kiện). Thêm **trễ**: coin đang theo dõi khó bị loại hơn, vì mỗi lần tắt engine là mất sạch lịch sử tường. `SO_COIN_THEO_DOI` → **`SO_COIN_TRAN`** vì nó đổi vai: từ chỉ tiêu phải lấp đầy thành **van an toàn hạ tầng**. Log thêm `loc=A/B` để chỉnh ngưỡng bằng dữ liệu. Đo thật trên OKX lúc làm: 427 SWAP → 50 qua thanh khoản → **6 qua lọc**, **27 coin bị loại vì đi ngang** (biên độ <8%). `DEM_TIEN_SETUP` hạ 0,05→0,03 do chính phép kiểm mới bắt được: 0,05 rộng bằng cả vùng LONG-A. **202/202 đạt** |
| 2026-08-12 | **Nới coin theo dõi 3 → 12, GIỮ NGUYÊN trần lệnh mở = 3** | Chủ dự án chốt tách hai cần gạt. Nút thắt đã đo: SHORT-A/SHORT-B/LONG-B đạt **0/1671 nhịp** = điều kiện COIN không lần nào đủ — với 3 coin/lúc đó là kết quả gần tất yếu, bot đang hỏi "trong 3 coin này có cái nào đủ không" thay vì hỏi cả thị trường. Trần lệnh mở **không** nới vì lỗ đồng thời = N × $20 (N=3 → 30% vốn, N=10 → sạch vốn), vì 10 lệnh short trên 10 alt lúc BTC bật là **1 lệnh cỡ 10×** chứ không phải 10 lệnh độc lập, và vì trần lệnh là **một phần của chiến lược** — chạy giấy N=10 rồi thật N=3 thì dữ liệu giấy không chuyển được. Kèm theo, bắt buộc: **gom `subscribe`** trong `okx-ws.js` — 12 coin × 3 kênh = 36 frame bắn liên tiếp, đúng kịch bản "bão subscribe" ở bảng bẫy (`dangKy` bắn ngay từng frame một, trong khi đường nối lại vốn đã gom đúng cách). Tách phép kiểm cũ `'3 coin'` vốn khoá **cả hai** số trong một điều kiện `=== 3 && === 3` — chính nó làm việc nới cần gạt lấy mẫu không thể làm mà không đồng thời nới cần gạt rủi ro; nay khoá riêng trần lệnh + thêm kiểm `N × CAT_LO_USD ≤ vốn/3`. **185/185 đạt** |
| 2026-08-12 | 🔐 **Gỡ mật khẩu MySQL thật khỏi `config.local.mau.js`** | Phát hiện khi test đỏ: file **MẪU (được commit)** đang chứa mật khẩu DB thật ở dòng 19, trong khi `config.local.js` (bản gitignore) **không tồn tại**. Đã kiểm: mật khẩu **chưa lọt vào lịch sử git** (`git log -S` rỗng, bản HEAD vẫn `password: ''`) — bắt kịp trước commit. Đúng kịch bản lộ token của dự án cũ ghi ở mục 🔐. Phép kiểm "file mẫu KHÔNG chứa mật khẩu" đã làm đúng việc của nó |
| 2026-08-12 | **Đọc dump DB 9,27h + vá 2 lỗi đo lường** | Chủ dự án đưa dump `buwsofujhosting_coin_db_v1.sql`: 1.671 nhịp, 7 coin, **0 lệnh**. Đo được nút thắt thật: SHORT-A/SHORT-B/LONG-B đạt **0/1671** nhịp, LONG-A đạt 141 (8,4%) nhưng **0 nhịp trùng lúc cò LONG nổ** → nghẽn ở **cò dẫn**, không phải khung giờ. Vùng cấm cũ chặn 84/141 = 59,6% cơ hội LONG-A. Vá kèm: (a) `test/bat-bien.js` có **byte 0x08 (backspace) lọt vào giữa `\b` và `cfg`** ở regex phép kiểm `cfg.X` → phép kiểm **luôn xanh mà không quét gì** suốt từ đầu; gỡ byte rồi lộ tiếp lỗi `phang()` chỉ liệt kê lá nên `cfg.TUONG`/`cfg.SETUP` bị báo thiếu oan — sửa cả hai. (b) nhãn `'NGOAI_KHUNG'` → `'KHONG_SETUP'` vì nó nghĩa là "không setup nào đủ điều kiện COIN", không phải "bị khung giờ chặn" — chính nhãn này suýt làm đọc nhầm dump. **178/178 đạt** |
| 2026-08-12 | **BỎ HẲN KHUNG GIỜ — chạy 24/24 tuyệt đối** | Chủ dự án chốt mở cả ngày. Xoá `KHUNG_CAM` · `GIU_VUNG_CAM` · `BO_CONG_KHUNG_GIO` · `trongVungCam()` · `uuTien` (code chết, không ai đọc) · cảnh báo `HẾT KHUNG` · `CANH_BAO.HET_KHUNG_GIO_VN`. Đổi `KHUNG_GIO_VN` → `SETUP`, tách `khungGoc` ra để thấy rõ nó chỉ còn là **NHÃN**. **Điều kiện COIN của 4 setup giữ nguyên 100%.** Sửa kèm 3 lỗi phát hiện khi rà: (1) bảng `lenh` ghi cứng `trong_khung: true` → phép thử khung giờ vô hiệu vì nhóm "ngoài khung" luôn rỗng; (2) `docMocGia` đọc mốc **đúng-ngày-hôm-nay** mà mốc chỉ chụp lúc 07:00 → SHORT-B chết 00:00–07:00, nay lấy **mốc gần nhất**; (3) LONG-B **fail-open** khi thiếu mốc → mỗi đêm mất chốt chặn "hôm trước vừa pump", nay fail-closed. Gỡ nốt 3 số cứng (`fundingMin` SHORT-B, `fundingMax` LONG-B, `'25'` trong `TEN_CHAN`). **178/178 đạt** |
| 2026-08-11 | Viết `XAY-BOT.md` v1.0→v1.5 | Chuyển chiến lược tay của chủ dự án thành hệ thống đo được |
| 2026-08-11 | Code Giai đoạn 0→9, chạy thật, 93/93 test đạt | Xem mục "Đang ở đâu" |
| 2026-08-11 | Thêm phí · trượt giá · funding **cố ý bi quan** | Số chạy giấy đang thổi phồng ~$0,08/lệnh ≈ 17% vốn/năm. Dữ liệu đẹp hơn thực tế là tự lừa mình |
| 2026-08-11 | Tạo `CLAUDE.md` | Để phiên làm việc mới đọc là hiểu ngay dự án đang ở đâu, không phải đọc lại toàn bộ code |
| 2026-08-12 | **Đưa lên server + MỞ 24/24** | Bot chạy thật trên hosting, MySQL kết nối được, cron mỗi phút. Rồi chủ dự án chốt **bỏ ràng buộc giờ**: thêm cờ `BO_CONG_KHUNG_GIO` — 4 setup giữ nguyên điều kiện COIN nhưng xét được bất kỳ lúc nào; máy quét cũng ưu tiên cả 4 setup thay vì chỉ setup có khung đang trùng. Cột `trong_khung` giữ nguyên nên **phép thử khung giờ mạnh hơn** (cả hai nhóm thành lệnh thật). Sửa 2 lỗi phát hiện khi triển khai: `chay.sh` không dò được Node ở `~/node-v*` (cron `PATH` nghèo) và **log bị ghi hai lần** (`chay.sh` đổ stdout vào chính `bot.log` mà `log.js` cũng tự ghi). **163/163 đạt** |
| 2026-08-11 | **Gỡ toàn bộ SỐ CỨNG khỏi code trước khi lên server** | Chủ dự án yêu cầu không để tham số nằm rải trong code. Thêm 6 nhóm vào `config.js`: `TUONG` (chấm điểm lệnh ảo — trước đây **0 tham số nào ở config**, toàn bộ nằm cứng trong `tuong.js`), `TIN_HIEU`, `QUET`, `DCA`, `CANH_BAO`, `HA_TANG`. Sửa 8 file. Thêm nhóm test **"KHÔNG SỐ CỨNG"** (20 phép kiểm) quét mã nguồn, fail nếu ai viết lại số vào code. **152/152 đạt** |
| 2026-08-11 | **Cơ chế tiền + thoát lệnh viết lại theo chốt cuối của chủ dự án** | Vốn **$200 cứng** · vào **$6×10** · DCA **$4×10 đúng 1 lần và phải có căn cứ** (rào chắn ≥45 phút) · cắt lỗ **theo SỐ TIỀN −$20/−$25** thay vì % giá · **bỏ hẳn thang chốt lời**, thay bằng **đỉnh lãi + báo động + hồi lại** · thêm `raoChan()` vào `tuong.js` · cò đảo chiều thêm vế **lệnh ảo** · `CHO_AM_VON` cho test dài. Bỏ `baseline`/R:R (không còn mốc TP để tính) → thước đo là **R-multiple**. **131/131 test đạt** |
| 2026-08-11 | **Chuyển lưu trữ sang MySQL, BỎ HẲN SQLite** | Bot phải chạy 24/24 trên server để bắt khung 23:00–03:00 — không thể để desktop bật cả đêm. Viết lại `lib/db.js`: hàng đợi ghi có thử lại, id sinh phía bot, đệm đọc để giữ hàm đồng bộ. Thêm `config.local.mau.js`, `server/chay.sh` + `dung.sh` + `TRIEN-KHAI.md`. Ảnh trạng thái ghi thẳng vào thư mục gốc web (không cổng, không proxy). **112/112 test đạt** |

---

## 🎯 KHI CHỦ DỰ ÁN HỎI "ĐÃ ỔN CHƯA"

Trả lời trung thực theo bảng này, đừng gộp hai cột làm một:

| Câu hỏi | Cách trả lời |
|---|---|
| Có chạy không? | Kiểm bằng `npm test` + đọc `du-lieu/bot.log` |
| Có ổn định không? | Chỉ nói được sau khi chạy liên tục nhiều ngày |
| Logic vào/ra có đúng không? | Chỉ nói được sau khi có lệnh thật trong `du-lieu/bot.db` |
| Tín hiệu có ăn tiền không? | **Cần ~780 lệnh.** Trước đó mọi con số đều vô nghĩa |
| Vào tiền thật được chưa? | **Chưa**, cho tới khi xong Giai đoạn 10 và có ≥200 lệnh giấy |

