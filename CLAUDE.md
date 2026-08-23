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

202 phép kiểm bất biến. **Đỏ thì dừng lại, đừng chạy bot, đừng báo hoàn thành.**
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
- lỗ ròng chạm **−$20** (được ôm tới **−$25** CHỈ KHI rào chắn còn dày)
- **CHỐT LỜI**: cò đảo chiều đã gài báo động **VÀ** hồi lại ≥ ngưỡng
- người tạo `DUNG.flag`

  **Không đóng vì:** hết giờ · cấu trúc gãy · funding đảo · `S` đổi dấu · ra khỏi khung giờ. Những thứ đó **chỉ được vẽ ⚠**. Thấy `_dong()` thứ tư trong `_xuLyDCA` hay `_canhBao` là LỖI.

**2. TIỀN TÍNH BẰNG ĐÔ, KHÔNG PHẢI %.** Vốn $200 · vào **$6×10** · DCA **$4×10** · **DCA ĐÚNG MỘT LẦN**. Size không co giãn theo vốn → vốn về 0 hay âm cũng không hỏng công thức.

**3. Cắt lỗ tính bằng SỐ TIỀN LỖ RÒNG**, không theo % giá. Nhờ vậy nó tự siết lại sau khi DCA: chưa DCA ($60) thì −$20 ≈ giá chạy 33%; đã DCA ($100) thì −$20 ≈ 24%.

**4. DCA phải CÓ CĂN CỨ.** Số tiền lỗ chỉ là **HÀNG RÀO** ($4–$10 = được phép xét), **KHÔNG BAO GIỜ** là lý do. Lý do duy nhất: **rào chắn ≥ 45 phút** + đà đuối + không squeeze. **Phần lớn lệnh thua sẽ không bao giờ được DCA — đó là ĐÚNG, không phải lỗi.**

**5. Chốt lời KHÔNG có mốc cố định.** Ba cơ chế: lãi vượt đỉnh → **gỡ** báo động; cò đảo nổ khi đang lãi → **gài** báo động; đã gài **VÀ** hồi ≥ `min(max(5, 25%×đỉnh), 50%×đỉnh)` → chốt. Cò đảo nổ lúc **đang lỗ thì KHÔNG đóng**.

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
| Đã chạy thật | 3 coin OKX, sổ live, RAM ~72MB ổn định — ⚠ mốc RAM này ĐO Ở 3 COIN, nay đã nới lên 12, **chưa đo lại** |
| Giờ giấc | **24/24 tuyệt đối** — không còn cổng giờ nào, kể cả vùng cấm |
| Test | **202/202 đạt** |
| Coin theo dõi | **động** — kết quả của `LOC_COIN`, không phải số đặt trước. Đo thật 12/08: 427 SWAP → 50 qua thanh khoản → **6 qua lọc xu hướng**; 27 coin bị loại vì đi ngang |
| Trần coin | **20** (`SO_COIN_TRAN`) — van an toàn hạ tầng, KHÔNG phải chỉ tiêu |
| Lệnh mở tối đa | **3** (`SO_LENH_MO_TOI_DA`) — ⛔ cần gạt RỦI RO, **không** nới theo coin |
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
| *(gốc)* | Vốn · $6/$4 · cắt lỗ $20/$25 · DCA · hồi lại | Chủ dự án đổi cách chơi |
| `SETUP` | 4 setup: điều kiện COIN + `khungGoc` (**nhãn**, không chặn) | Chủ dự án đổi cách chơi |
| `TUONG` ⭐ | **Chấm điểm lệnh ảo**: ±15/+8/−30, ngưỡng gần/rời, `numOrders` | Sau ≥300 lệnh, có số liệu |
| `TIN_HIEU` | Trọng số `S`, chuẩn hoá dòng tiền/OI/funding, cò chốt lời | Sau ≥780 lệnh — **đừng chỉnh sớm** |
| `LOC_COIN` ⭐ | **Bộ lọc coin**: biên độ 24h tối thiểu, đệm tiền-setup, trễ, trọng số xếp hạng | Đọc `loc=A/B` trong log trước đã |
| `QUET` | Máy quét, nến từ chối, chế độ BTC, vùng đệm coin | Khi thấy chọn coin sai |
| `DCA` | Ba căn cứ: đà chậm lại · OI đứng · ngưỡng squeeze | |
| `CANH_BAO` | Ngưỡng vẽ ⚠ — **không đụng tới quyết định** | Tuỳ ý |
| `HA_TANG` | Ping, timeout, **gom `subscribe`**, trần hàng đợi, xoay log | Khi hạ tầng có vấn đề |

⛔ **Số coin theo dõi và `SO_LENH_MO_TOI_DA` là HAI quyết định, không phải một.**

**Coin theo dõi = cần gạt lấy mẫu.** Không còn là một con số nữa: nó là **kết quả của `LOC_COIN`**. Quan sát thêm coin không tốn xu nào, chỉ tốn RAM/CPU/băng thông. `SO_COIN_TRAN` chỉ là van an toàn hạ tầng — chạm trần nghĩa là **cơ hội nhiều hơn sức máy**, không phải "đã theo dõi đủ".

**Lệnh mở = cần gạt rủi ro.** Lỗ đồng thời tối đa = `N × CAT_LO_USD`, và các alt tương quan gần 1 nên N lệnh ≈ **1 lệnh cỡ N×**; N lệnh tương quan cũng chỉ đáng ~1–2 lệnh độc lập khi đếm cỡ mẫu. Nới nhầm cái này vừa tăng rủi ro vừa **hỏng phép đo**.

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
- **`R` có mẫu số cố định** `= CAT_LO × (TRAN_KHI_LO × vốn × đòn bẩy) = $13,20`. Một lệnh cắt lỗ sạch luôn ra **≈ −1,00R**. Thấy −1,5R là có gì sai (trượt quá lớn / gap qua stop).
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

---

## ⛔ VIỆC TIẾP THEO (theo thứ tự)

0. ✅ ~~Đưa bot lên server~~ — **XONG 2026-08-12**. Chạy tại `~/bot-coin`, web ở `k7m2coin.hiteckqualityconstruction.com.au`, cron mỗi phút.
1. **Để bot chạy giấy vài ngày** qua vài khung giờ đêm → có lệnh thật để đọc. **Đây là việc quan trọng nhất**, không phải viết thêm code.
2. **Giai đoạn 10 — đặt lệnh thật OKX.** Chỉ sau **≥200 lệnh giấy**. Cần: API key **chỉ quyền Trade, KHÔNG bật Withdraw**, có giới hạn IP · cắt lỗ `trigger` **phía sàn** (cắt lỗ nằm trong RAM bot thì bot chết = không có cắt lỗ) · đối soát số dư.
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

