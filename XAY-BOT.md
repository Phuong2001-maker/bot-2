# XÂY BOT GIAO DỊCH OKX — ĐẶC TẢ XÂY DỰNG

> **Cách dùng file này:** đưa nguyên file cho Claude Code trong thư mục `Coin 2`, nói *"đọc XAY-BOT.md rồi xây theo lộ trình ở mục 17, bắt đầu từ Giai đoạn 0"*. Khi dự án đã chạy, đổi tên file này thành `CLAUDE.md` để mọi phiên làm việc sau tự nạp.
>
> **Dự án tham khảo:** `C:\Users\TNDESKTOP0001\Desktop\Coin\so-lenh` — đọc `CLAUDE.md` của nó trước khi code. Nhiều thứ trong đó **đã đo thật**, và có vài kết quả **ngược với trực giác** được ghi ở mục 3 dưới đây.

---

## 1. VAI TRÒ

Khi làm việc trong repo này, bạn là **Kiến trúc sư Hệ thống kiêm Trader/Full-time Trader**. Cụ thể:

- **Nói thẳng khi phương án được yêu cầu không phải phương án tốt nhất**, kèm lý do và lựa chọn thay thế — rồi vẫn làm theo quyết định cuối cùng của chủ dự án.
- **Mọi con số về hiệu quả phải đi kèm cỡ mẫu và mốc so sánh nội tại.** Không bao giờ trình bày một tỷ lệ thắng trần trụi như thể nó là kết luận.
- **Không hứa "độ chính xác cao".** Thứ hứa được là: đo đúng, không tự lừa mình, loại bỏ thiên lệch.
- **Mọi thay đổi phải ghi vào file này ngay trong cùng lượt làm việc**, trước khi báo hoàn thành.
- Giao tiếp bằng **tiếng Việt**, thuật ngữ kỹ thuật giữ tiếng Anh.

---

## 2. BOT LÀM GÌ

Theo dõi **những coin có xu hướng** trên **OKX perpetual (USDT-SWAP)** — số lượng do bộ lọc quyết, không cố định, trần an toàn 20 (chỉ mở tối đa **3 lệnh** cùng lúc — số khác hẳn, xem mục 10.1), phát hiện đỉnh của cú pump để **SHORT** và đáy/đà tăng sớm để **LONG**, theo 4 setup do chủ dự án đúc kết. Chạy **24/24**, không giới hạn giờ giấc. Điểm khác biệt so với bot thường: **lọc lệnh ảo trong sổ lệnh** và dùng **tốc độ rút tường mua** làm tín hiệu dẫn — để vào lệnh **trước** khi giá giảm, không phải sau.

Bot **đề xuất và quản lý lệnh**; việc bật chế độ đặt lệnh thật là quyết định riêng của chủ dự án (mục 15).

---

## 3. ⚠ SỰ THẬT PHẢI BIẾT TRƯỚC KHI CODE

Bốn điều dưới đây **đã được đo trong dự án `so-lenh`**, không phải suy đoán. Đọc kỹ, vì chúng thay đổi cách thiết kế.

### 3.1 Hướng theo khung giờ là nhiễu — KHÔNG được cộng vào điểm số

Đo trên **17.999 nến 1H BTC** (20/07/2024–09/08/2026): giá trị `|t|` lớn nhất trong 24 khung giờ chỉ **2,66**, trong khi ngưỡng Bonferroni cho 24 phép thử là **2,87** → **không giờ nào sống sót**. Kiểm ngoài mẫu: dấu trùng **13/24** (tung đồng xu được 12/24).

Và con số đóng đinh: với σ = 49 bps/giờ, để phát hiện lợi thế thật cỡ 2 bps cần **2.401 mẫu mỗi ô giờ = 6,6 năm dữ liệu mỗi coin**. Đây không phải "chưa đủ dữ liệu" mà là **không bao giờ đủ**.

Thêm một phát hiện âm tính quan trọng: **"giờ funding là giờ biến động mạnh" là niềm tin SAI.** Đo trên OKX: khối lượng +60,2% nhưng biên độ chỉ +9,6% (t=1,33, không có ý nghĩa thống kê).

**Hệ quả thiết kế — đây là quyết định kiến trúc, không phải gợi ý:**

> Khung giờ tuyệt đối **không cộng một điểm nào** vào `S`.

**Nhưng đây chưa phải kết luận cuối về chiến lược của chủ dự án**, và phải nói rõ điều này: phép đo trên là **vô điều kiện** trên BTC. Giả thuyết của chủ dự án là **có điều kiện** — "coin *đã tăng >30%* VÀ *funding dương cao* VÀ *đang trong khung 23h–3h*". Đó là một tập con hoàn toàn khác, chưa ai đo. Phép đo cũ **không bác bỏ** nó, nhưng cũng **không ủng hộ** nó.

⭐ **CẬP NHẬT 2026-08-12 — khung giờ đã bị gỡ khỏi vai trò cổng.** Bot chạy **24/24 tuyệt đối**: không còn chặn theo giờ, kể cả vùng cấm 04:00–06:00. Bốn setup giữ nguyên **toàn bộ điều kiện coin**, chỉ khác là xét được ở mọi thời điểm.

Đây chính là cách kiểm giả thuyết có điều kiện ở trên: cột `trong_khung` (0/1) **vẫn được ghi** cho mọi tín hiệu **và mọi lệnh**, nhưng nay nó thuần tuý là **nhãn dữ liệu**, không chặn gì. Nhờ vậy phép thử mạnh hơn hẳn bản cũ — trước đây nhóm "ngoài khung" bị cổng chặn nên không bao giờ thành lệnh, không có thắng/thua để so; **giờ cả hai nhóm đều là lệnh thật**. Sau ~300 lệnh mỗi nhóm, so bằng SQL. Chi tiết ở mục 16.2.

### 3.2 Máy chấm điểm của dự án cũ CHƯA được chứng minh là có lãi

Lô dữ liệu thật đầu tiên: **26 kèo đã phân định** → thắng 26,9% · baseline 38,1% · **kém ngẫu nhiên 11,2 điểm** · tổng **−9,95 R**.

Không kết luận được vì n=26 quá nhỏ (Wilson 95%: 13,7–46,1%, có chứa baseline) và độ nhạy quy ước chấm là 11,5 điểm (gấp đôi ngưỡng chấp nhận).

**Hệ quả:** mang sang **hạ tầng và bộ đo** của `so-lenh` (bộ theo dõi tường, tách sổ, bản đồ API, kỷ luật đo lường) — đó là phần kỹ thuật đã kiểm chứng. **Đừng mang sang trọng số `S` như thể nó đúng.** Trọng số mới phải tự đo lại từ đầu.

### 3.3 Bốn giả thuyết còn treo từ dự án cũ

| Giả thuyết | Số lô đầu | Việc phải làm ở bot mới |
|---|---|---|
| Máy nguội tệ hơn máy ấm | nguội −15,5% (n=17) · ấm −3,1% (n=9) | Warmup tối thiểu **300 giây**/coin, không phải 90 giây |
| 21% lệnh chờ không khớp | 7/33 kèo | **Đặt lệnh vào theo giá thị trường hoặc limit sát giá**, không đặt ở tường xa |
| Nhóm bị chặn thắng **hơn** nhóm thật | +4,6% (n=27) vs −11,2% (n=26) | Ghi cả tín hiệu bị chặn kèm bitmask lý do → mới có nhóm đối chứng |
| Tường tin cao **không** tốt hơn | tin ≥55: −12,9% (n=10) · tin 35–54: −10,2% (n=16) | Công thức `wallTrust` có thể chỉ là trang trí. Vẫn dùng, nhưng **phải đo lại** |

### 3.4bis ⚠ `books` KHÔNG CÓ CHECKSUM — đo thực tế 2026-08-11

Đo trên `BTC-USDT-SWAP`, 10 gói liên tiếp (1 snapshot + 9 update): kênh `books` (400 mức) trả **`checksum = 0` ở MỌI gói**. Tức OKX **không** cấp checksum cho kênh này — chỉ `books-l2-tbt` / `books50-l2-tbt` mới có, mà hai kênh đó đòi VIP4/VIP5 (mục 3.4).

⚠ **Bẫy:** coi `0` là checksum thật thì mọi gói đều "sai" và bot bắn `unsubscribe`/`subscribe` liên tục cho tới khi bị sàn chặn tốc độ. Đã dính khi chạy lần đầu.

**Lưới an toàn thay thế** (không có gì tốt hơn, phải chấp nhận):
1. **Sổ bắt chéo** — `best bid ≥ best ask` là bằng chứng chắc chắn sổ đã hỏng → đăng ký lại
2. **Đồng bộ lại mỗi 30 phút** — chặn trôi chậm không triệu chứng
3. **Chốt 15 giây** giữa hai lần đăng ký lại, chống bão

Hệ quả phải chấp nhận: **mất một gói `update` giữa hai lần đồng bộ là sổ sai âm thầm tới 30 phút.** Không có cách nào phát hiện sớm hơn với dữ liệu công khai.

### 3.4 Trần dữ liệu sổ lệnh đã chạm

`books-l2-tbt` / `books50-l2-tbt` trả `{"code":"60011","msg":"Please log in"}` — cần API key **và hạng VIP4/VIP5**. Kênh `books` (400 mức, 100ms) **là mức cao nhất công khai**.

Nghĩa là: **chống lệnh ảo phải giải bằng thuật toán trên dữ liệu đang có.** Không API nào cứu được. Đây cũng chính là lĩnh vực **duy nhất** bot có lợi thế thông tin thật — vì nó đòi hỏi quan sát sổ lệnh liên tục qua thời gian, thứ không ai bán dưới dạng API.

### 3.5 ⛔ KHÔNG kế thừa cách chọn giá chốt lời của code cũ

Đây là **lỗi chí mạng** nếu port nguyên. Code cũ chọn giá chốt bằng:

```js
const res = bestWall(E, A.asksOkx, 'a', mid, cap, false);   // lọc: d <= cap
```

`cap` là **trung vị biên dao động** của khung tự chọn (1h/2h/4h), mặc định `atr4h || 0.03`. Thực tế nó ra khoảng **3–5%**. Với cắt lỗ 22% của chiến lược này:

```
R:R  = 3 / 22 = 0,14
baseline = 22 / (3 + 22) = 88%   ← tỷ lệ thắng cần để HÒA VỐN
```

**Cần thắng 88% mới huề.** Không hệ thống nào làm được điều đó một cách bền vững. Đây gần như chắc chắn là một phần lý do lô dữ liệu đầu tiên ra **−9,95 R** (mục 3.2): máy có thể đoán hướng không tệ, nhưng **kế hoạch giá thì vô phương thắng**.

Nguyên nhân gốc: code cũ được thiết kế cho **kèo scalp 1–4 giờ**, còn chiến lược này ôm lệnh **nhiều giờ tới nhiều ngày** với cắt lỗ rất rộng. Hai chân trời thời gian khác nhau hoàn toàn — mượn cơ chế chọn giá của cái này cho cái kia là sai từ gốc.

**Luật thay thế — thang chốt lời làm chủ, tường chỉ tinh chỉnh:**

| | Code cũ (SAI cho chiến lược này) | Bot mới |
|---|---|---|
| Ai quyết mốc chốt | `bestWall` trong tầm `cap` (~3%) | **Thang 10.5** (10/20/30/40%) |
| Vai trò của tường | Quyết định mốc | **Chỉ dịch giá limit trong ±1,5% quanh mốc thang** |
| Sàn tối thiểu | không có | **`TP_TOI_THIEU = 5%`**, cứng |
| Cổng R:R | không có | Từ chối lệnh nếu R:R tài khoản < 1,2 |

Chi tiết cách nối hai thứ ở mục 10.5.1.

### 3.6 ⛔ Giá VÀO phải là giá HIỆN TẠI — không phải tường

Code cũ chọn giá vào bằng chính hai tường đó:

```js
const sup = bestWall(E, A.bidsOkx, 'b', mid, cap, true);   // lọc d > 0 → tường DƯỚI giá
const res = bestWall(E, A.asksOkx, 'a', mid, cap, false);  // tường TRÊN giá
// keoCua(): LONG vào tại sup (THẤP hơn giá hiện tại) · SHORT vào tại res (CAO hơn)
```

Nghĩa là kèo LONG đặt giá vào **thấp hơn giá hiện tại**, kèo SHORT đặt **cao hơn** — đều là **lệnh chờ, chưa khớp**. Hậu quả đo được: **21% lệnh chờ không bao giờ khớp** (7/33 kèo).

Nhưng con số 21% chưa phải phần tệ nhất. Phần tệ nhất là **thiên lệch sống sót**:

> Lệnh chờ chỉ khớp khi **giá đi ngược lại phía bạn** trước đã. Nên bạn chỉ được vào đúng những kèo mà thị trường đã bắt đầu chống lại bạn — còn những kèo chạy thẳng (tức là **những kèo tốt nhất**) thì bạn đứng ngoài nhìn.

Đây không phải lỗi làm hỏng vài lệnh. Nó làm hỏng **cả tập dữ liệu**, theo hướng khiến mọi thống kê về sau trông tệ hơn thực tế mà không ai biết vì sao.

**Luật mới, gói trong một dòng:**

> ### **Tường KHÔNG BAO GIỜ quyết định giá VÀO. Tường chỉ quyết định giá RA.**

| | Code cũ | Bot mới |
|---|---|---|
| Giá vào **LONG** | tường đỡ **dưới** giá → lệnh chờ | **best ask hiện tại** → khớp ngay |
| Giá vào **SHORT** | tường kháng **trên** giá → lệnh chờ | **best bid hiện tại** → khớp ngay |
| Loại lệnh | `limit` treo ở xa | `market`, hoặc `limit` cách ≤ 0,15% kèm `IOC` |
| Vai trò của tường | quyết định **cả vào lẫn ra** | chỉ tinh chỉnh **cắt lỗ và chốt lời** |

Chi tiết đặt lệnh ở mục 15.4.

---

## 4. KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────┐
│ TẦNG 1 · MÁY QUÉT (60s)                                 │
│ OKX /market/tickers → LOC_COIN → danh sách coin (động) │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ TẦNG 2 · KẾT NỐI (WebSocket, mỗi coin)                  │
│ books · trades · open-interest · liquidation-orders     │
│ + REST: funding-rate · instruments(listTime,ctVal)      │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ TẦNG 3 · LỌC LỆNH ẢO (2s) — wallBook + wallTrust        │
│ Phân loại mọi tường: RÚT(ảo) / KHỚP(thật) / SỐNG SÓT    │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ TẦNG 4 · TÍN HIỆU (2s)                                  │
│ Tín hiệu DẪN: BPR/APR (tốc độ rút tường)                │
│ Tín hiệu NỀN: dòng tiền · OI · funding · thanh lý       │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ TẦNG 5 · CỔNG (gate) — KHÔNG cộng điểm, chỉ cho/chặn    │
│ khung giờ · tuổi coin · chế độ BTC · số lệnh đang mở    │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ TẦNG 6 · MÁY TRẠNG THÁI LỆNH                            │
│ SAN → CHO_VAO → THAM_DO → DCA → LAI_1 → LAI_2 → DONG    │
└───────────────────────┬─────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
┌───────────────┐              ┌────────────────────┐
│ SQLite (log)  │              │ Giao diện web (2s) │
└───────────────┘              └────────────────────┘
```

**Ngăn xếp:** Node.js 20+ · `ws` · `better-sqlite3` · giao diện HTML tĩnh + `fetch` đọc `trangthai.json`.

**Ba nhịp tim** (tách riêng, đừng gộp):

| Nhịp | Chu kỳ | Việc |
|---|---|---|
| Phân tích | 2000 ms | `aggregate` → `updateWalls` → `analyze` → máy trạng thái |
| Ghi ảnh trạng thái | 2000 ms | ghi đè `trangthai.json` |
| Quét coin | 60000 ms | xếp hạng + đồng bộ danh sách theo dõi |

**Quy tắc kiến trúc bắt buộc — học từ dự án cũ:**
- Chỉ **một tiến trình** được ghi DB. Giao diện **chỉ đọc**, không ghi một byte nào.
- Giao diện đọc `trangthai.json` do bot ghi đè mỗi 2 giây. Trang **luôn hiện tuổi của ảnh**; quá 30 giây thì đổi thành cảnh báo đỏ. **Bot chết là hỏng IM LẶNG** — không có đồng hồ này thì trang vẫn vẽ dữ liệu cũ và người xem tưởng thị trường yên.

---

## 5. BẢN ĐỒ API — ĐÃ KIỂM CHỨNG

### 5.1 Lợi thế mới: chạy Node là KHÔNG dính CORS

Dự án cũ chạy trong trình duyệt nên bị bức tường CORS chặn mất nhóm `/api/v5/rubik/stat/*`. **Bot Node không có giới hạn đó** — mở thêm được:

| Endpoint | Cho gì |
|---|---|
| `/rubik/stat/contracts/long-short-account-ratio` | tỷ lệ tài khoản long/short |
| `/rubik/stat/taker-volume` | khối lượng taker mua/bán — **đối chiếu xem WebSocket có mất gói âm thầm không** |
| `/rubik/stat/contracts/open-interest-volume` | OI + volume theo chuỗi thời gian |

⚠ **Cảnh báo về tỷ lệ long/short "top trader":** nhóm top 5% theo giá trị vị thế là nơi tập trung dày nhất basis trade và phòng hộ delta-neutral — short của họ **không phải quan điểm giá**. Dùng **mức** sẽ làm bot lệch short vĩnh viễn mà tưởng là phát hiện. Chỉ được dùng **z-score của độ thay đổi** so với phân phối 30 ngày, và trước đó phải vẽ chuỗi hiệu số 90 ngày: nếu nó dao động quanh một trung bình khác 0 và ít biến động → đó là **cấu trúc**, vứt luôn.

### 5.2 WebSocket OKX (`wss://ws.okx.com:8443/ws/v5/public`) — không cần đăng nhập

| Kênh | Nhịp | Dùng cho |
|---|---|---|
| `books` (400 mức) | 100 ms | **Cốt lõi** — bộ theo dõi tường, độ sâu, số lượng lệnh |
| `trades` | mỗi lệnh khớp | dòng tiền mua/bán gross |
| `open-interest` | 8–9 gói/phút | `oiUsd` có sẵn → so chéo coin công bằng |
| `liquidation-orders` (`instType=SWAP`) | 1 sub cho **toàn sàn** | tín hiệu thanh lý |
| `instruments` (`instType=SWAP`) | khi có thay đổi | phát hiện coin vừa list |
| `bbo-tbt` | ~10 gói/giây | bắt chính xác mili-giây giá chạm tường |

### 5.3 ⭐ `numOrders` — trường dự án cũ CHƯA khai thác

Mỗi hàng trong `books` của OKX có **4 phần tử**:

```
[ "giá", "khối lượng", "0", "số lượng lệnh" ]
     0          1         2          3        ← chỉ số
```

Phần tử thứ 4 là **số lệnh thật đang đứng ở mức giá đó**. Dự án cũ chỉ dùng phần tử 1 (khối lượng), **bỏ phí hoàn toàn phần tử 3**. Đây chính là "số lượng lệnh mua / lệnh bán" mà chủ dự án yêu cầu, và nó cho một đòn bẩy chống lệnh ảo rất mạnh:

| Quan sát | Diễn giải |
|---|---|
| Khối lượng lớn · `numOrders = 1` | **Một lệnh khổng lồ duy nhất** — rút một cú là sạch. Nghi lệnh ảo cao nhất |
| Khối lượng lớn · `numOrders ≥ 20` | Nhiều người cùng đặt — không ai điều phối được, **khó giả** |
| `numOrders` tụt nhanh mà khối lượng giữ nguyên | Lệnh nhỏ rút đi, một lệnh to vào thay → **đang dựng tường giả** |
| Khối lượng tụt mà `numOrders` giữ nguyên | Bị **khớp thật**, ăn mòn dần → tiền thật |

⚠ **Chưa ai đo trường này.** Phải log `numOrders` từ ngày đầu, nhưng **đưa vào công thức chấm điểm ở trọng số thấp** cho tới khi có ≥300 mẫu chứng minh nó có tác dụng.

### 5.4 REST OKX

| Endpoint | Nhịp | Lấy gì | Bẫy |
|---|---|---|---|
| `/market/tickers?instType=SWAP` | 60 s | danh sách + %24h + volume | chỉ nhận cặp `-USDT-SWAP` |
| `/public/instruments?instType=SWAP` | 1×/khởi động | `listTime`, **`ctVal`** | **`ctVal` bắt buộc** — OKX tính khối lượng theo *hợp đồng*, quên nhân là sai hàng nghìn lần |
| `/public/funding-rate` | 60 s | funding + chu kỳ | **chu kỳ không phải lúc nào cũng 8h** — tự tính từ `prevFundingTime`/`fundingTime` rồi quy về mức /8h |
| `/market/candles` | theo yêu cầu | nến 1m/15m | giữ 1.440 nến 1m = 24h. Bỏ nến chưa đóng (`confirm='0'`) |
| `/market/history-candles` | backfill | lịch sử > 24h | **phân trang LÙI bằng `after`** — dùng `before`+`limit=300` khi khoảng cần lấy > 300 nến thì OKX trả 300 cây *mới nhất*, thủng đoạn giữa mà **không báo lỗi** |

### 5.5 Nguồn phụ (tùy chọn, Giai đoạn 3)

Thêm Binance/Bybit/Bitget chỉ để **xác nhận chéo tường** (`cx` trong `wallTrust`). Nhưng nhớ nguyên tắc **tách hai loại sổ** ở mục 7.3.

**Đã test và LOẠI, đừng đề xuất lại:** CoinGecko news (401), CryptoCompare (401), CryptoPanic (Cloudflare 403), TradingEconomics (410), mọi API tin tức miễn phí khác. Tin niêm yết làm giá chạy trong **100–500 ms**; bot poll 60 giây là chậm hơn 3–5 bậc độ lớn, và cú bơm niêm yết có hình gai nhọn rồi hồi mạnh → cờ "có tin tốt" bật ở t+60s đưa bạn vào **đúng đỉnh ngay trước nhịp hồi**.

---

## 6. TẦNG 1 — MÁY QUÉT & DANH SÁCH THEO DÕI

Mỗi 60 giây, gọi `/market/tickers?instType=SWAP`, tính cho từng coin:

```js
chg24  = last / open24h - 1
chg1h  = last / giaCachDay(60') - 1
volUsd = volCcy24h * last
```

**Cổng loại bỏ (cứng, không thương lượng):**

| Cổng | Ngưỡng | Lý do |
|---|---|---|
| `volUsd` | ≥ 20 triệu USD/24h | Sổ mỏng thì x10 bị quét bởi nhiễu |
| **Tuổi coin** | `now - listTime` ≥ **7 ngày** | Coin 3 ngày tuổi thì **mọi thống kê là rác**, và squeeze khủng khiếp. Dự án cũ đánh giá đây là *"tỷ lệ giá trị trên số dòng code cao nhất"* |
| Không nằm trong danh sách đen | — | Cấu hình tay |

**Xếp hạng và chọn:**

```js
// SHORT: coin tăng mạnh nhất
diemShort = chg24                         // chỉ nhận chg24 >= 0.30
// LONG-Đà: coin tăng vừa
diemLongDa = (chg24 >= 0.06 && chg24 <= 0.15) ? chg24 : -1
// LONG-Đáy: coin giảm mạnh
diemLongDay = -chg24                      // chỉ nhận chg24 <= -0.15
```

### Số coin theo dõi là KẾT QUẢ, không phải chỉ tiêu

⛔ **KHÔNG lấy "top N".** Mỗi vòng quét, coin nào qua `LOC_COIN` thì được theo dõi — thị trường im thì 2 coin, thị trường chạy thì 15. `SO_COIN_TRAN = 20` chỉ là **van an toàn hạ tầng**; chạm trần nghĩa là cơ hội nhiều hơn sức máy, không phải "đã đủ".

> **Vì sao bỏ top-N:** bản cũ chấm điểm coin rồi lấy N cái đầu, nhưng có dòng chốt `if (d < 0) d = |chg24| × 10` **gán điểm cho mọi coin** — nên N chỗ **luôn** được lấp đầy kể cả khi chẳng coin nào có xu hướng. Nới N chỉ là thêm coin rác.

Bộ lọc ([lib/loc-coin.js](lib/loc-coin.js)) chỉ dùng được dữ liệu **REST ticker**, vì máy quét chạy *trước* khi engine tồn tại — chưa có sổ lệnh, OI hay funding.

**Cổng 1 — lọc rác:** hợp đồng `live` · `volUsd ≥ $20M` · tuổi coin ≥ 7 ngày.

**Cổng 2 — xu hướng**, phải qua **cả hai vế**:

| Vế | Công thức | Trả lời câu hỏi |
|---|---|---|
| **Có ĐỘNG không** | `(high24 − low24) / last ≥ 0,08` | coin đi ngang thì loại — cắt lỗ $20 trên $60 tương đương giá chạy 33%, coin biến động 2%/ngày không setup nào sống nổi |
| **Đúng HƯỚNG nào không** | `chg24` nằm trong vùng **tiền-setup** của ít nhất 1 trong 4 setup | biến động vô hướng cũng loại |

⚠ `high24`/`low24` nằm sẵn trong ticker nhưng **trước nay không hề được dùng**. Đây là thước đo "có xu hướng" rẻ nhất và ít giả định nhất lấy được ở tầng này.

⛔ **Vùng tiền-setup KHÔNG phải nới điều kiện vào lệnh.** Điều kiện COIN của 4 setup trong `lib/khung.js` giữ nguyên 100%. Đệm `DEM_TIEN_SETUP = 0,03` chỉ để **làm nóng engine trước**: `wallTrust` cần thời gian tích luỹ, bật engine đúng lúc cần thì tín hiệu dẫn mù đúng lúc quan trọng nhất. Đệm phải **nhỏ hơn bề rộng vùng hẹp nhất** (LONG-A = 0,05), nếu không vùng tiền-setup rộng hơn cả chính setup — có phép kiểm chặn.

**Ba chốt chống nhảy loạn — bắt buộc, đừng gỡ:**
1. **Trễ theo ngưỡng:** coin *đang* theo dõi đi qua ngưỡng nới lỏng `× 1,5` mới bị loại. Thiếu nó thì coin sát mép bị bật/tắt engine liên tục, mà **mỗi lần tắt là mất sạch lịch sử tường đã tích**.
2. **Trễ theo thứ hạng:** chỉ có nghĩa khi trần bị chạm — coin tụt xuống ngay dưới trần (`SO_COIN_TRAN + 3`) thì chưa gỡ.
3. Mỗi vòng quét gỡ **tối đa 1 coin**.

**Đo thật trên OKX (12/08):** 427 SWAP USDT → 50 qua thanh khoản → **6 qua lọc xu hướng**; **27 coin bị loại vì đi ngang**. Log ghi `loc=A/B` mỗi phút — đó là con số để chỉnh ngưỡng bằng **dữ liệu**, không phải đoán.

**Chốt thứ ba, sinh ra cùng lúc với việc nới coin:** mỗi coin đăng ký **3 kênh WS** (`books` · `trades` · `open-interest`). 12 coin = 36 lệnh `subscribe`. Bắn liên tiếp trong vài mili-giây là đúng kịch bản **"bão subscribe → bị sàn chặn tốc độ"** ở bảng bẫy. Nên `dangKy`/`huy` **gom** vào hàng chờ rồi gửi **một frame** (`HA_TANG.WS_GOM_DANG_KY_MS`), `unsubscribe` luôn đi trước `subscribe` trong cùng một lượt xả.

> **Lý do:** mỗi lần gỡ engine là **mất sạch `wallBook`** đã tích được của coin đó, mà tuổi của tường là biến có sức giải thích cao nhất. Coin **đang có lệnh mở thì miễn nhiễm tuyệt đối** với việc gỡ.

**Ghim tay:** đọc `ghim.txt` mỗi 30 giây, một mã coin mỗi dòng. Coin đã ghim không bao giờ bị gỡ.

---

## 7. TẦNG 3 — LỌC LỆNH ẢO (phần cốt lõi)

Port từ `so-lenh/index.html` dòng 622–700. **Đây là thứ làm nên giá trị của bot.**

### 7.1 Vòng đời một bức tường

Mỗi mức giá có tiền lớn được lưu vào `wallBook`, khóa = `b:giá` hoặc `a:giá` (giá lấy 6 chữ số có nghĩa):

```js
{
  f:   thời điểm xuất hiện lần đầu,
  l:   thời điểm thấy lần cuối,
  p:   giá,
  cur: khối lượng hiện tại (USD),
  mx:  khối lượng lớn nhất từng thấy,
  sv:  số lần SỐNG SÓT qua một lần giá áp sát,
  fl:  số lần bị KHỚP THẬT (ăn mòn dần),
  pl:  số lần bị RÚT nguyên khối (lệnh ảo),
  cx:  số sàn nhiều nhất từng cùng có tiền ở mốc này,
  nOrd:    numOrders hiện tại,          // ⭐ MỚI
  nOrdMax: numOrders lớn nhất từng thấy // ⭐ MỚI
}
```

**Ngưỡng "áp sát" / "rời xa" tính theo BƯỚC GIÁ, không theo % cố định:**

```js
nearD  = Math.min(3 * step, 0.005 * mid)
leaveD = Math.min(8 * step, 0.012 * mid)
```

> Ngưỡng % cố định từng làm sổ dày (như BTC) bị chấm oan hàng loạt. Trần % là để coin sổ thưa — nơi `step` bị thổi phồng bởi mốc rác ở xa — vẫn đo được "chịu chạm".

**Phân loại khi tường biến mất** (chỉ kết luận khi tường mất > 4 giây và **giá vẫn còn ở gần**):

```js
pulled = w.cur >= 0.6 * w.mx   // còn gần nguyên khối → RÚT   → w.pl++
                               // đã ăn mòn dần       → KHỚP  → w.fl++
```

⚠ **Bẫy đổi tên bucket:** bước giá thay đổi làm khóa cũ biến mất dù tường không hề rút. Trước khi phạt, kiểm vùng `±1.5 × step` quanh giá cũ — nếu còn ≥ 40% tiền thì **xóa bản ghi lặng lẽ, không phạt oan**.

### 7.2 Chấm điểm tin cậy

```js
function wallTrust(E, side, p){
  const w = E.wallBook[wallKey(side, p)];
  if (!w) return 30;                                    // chưa biết gì → trung tính
  const ageMin = ((w.l || w.f) - w.f) / 60000;
  const tested = w.sv > 0 || (w.fl || 0) > 0;

  let s = 30
    + Math.min(tested ? 30 : 15, ageMin * 1.5)  // sống lâu; CHƯA bị thử thì chỉ nửa điểm
    + w.sv * 15                                 // chịu được giá áp sát rồi giá rời đi
    + (w.fl || 0) * 8                           // bị khớp thật = tiền thật
    - Math.min(w.pl, 3) * 30                    // rút nguyên khối = lệnh ảo, phạt nặng
    + (w.cx >= 2 ? 10 : 0) + (w.cx >= 3 ? 5 : 0);

  // ⭐ MỚI — chưa kiểm chứng, để trọng số thấp cho tới khi có >=300 mẫu
  if (w.nOrd === 1 && w.cur > 0.15 * bookM) s -= 15;    // một lệnh khổng lồ duy nhất
  if (w.nOrd >= 20) s += 10;                            // phân tán, khó giả

  return clamp(Math.round(s), 0, 100);
}
```

> **"Treo lệnh ảo ở xa giá thì chẳng tốn gì"** — đó là lý do tường chưa từng bị giá thử chỉ được cộng nửa điểm cho tuổi thọ. Đây là ý tưởng cốt lõi của cả bộ lọc.

### 7.3 ⚠ HAI LOẠI SỔ — nhầm là ra tín hiệu sai

| Bộ | Trường | Dùng cho |
|---|---|---|
| **Sổ gộp nhiều sàn** | `bids`/`asks` | Tín hiệu **áp lực** (`sBook`), chuẩn hóa dòng tiền, theo dõi vòng đời tường (giữ xác nhận chéo `cx`) |
| **Sổ riêng OKX** | `bidsOkx`/`asksOkx` | **Mọi mức giá có thể giao dịch**: giá vào, giá chốt, giá DCA, ETA |

**Đo thực tế trên 3 coin: sổ OKX chỉ chiếm 14–44% tiền của sổ gộp.** Một "tường $100k" gộp có khi chỉ có $14k trên OKX — đặt chốt lời ở đó là đặt vào chỗ **gần như trống**, giá đi xuyên qua.

Ở Giai đoạn 1 (chỉ OKX) hai bộ trùng nhau. **Vẫn phải tách sẵn hai trường ngay từ đầu**, nếu không thêm sàn ở Giai đoạn 3 sẽ phải sửa xuyên suốt.

---

## 8. TẦNG 4 — TÍN HIỆU

### 8.1 ⭐ TÍN HIỆU DẪN — bắt TRƯỚC khi giá giảm

Đây là yêu cầu cốt lõi của chủ dự án: *"vào lệnh khi số lượng đặt mua bắt đầu ít, là cái đoạn nó bắt đầu giảm, nhớ là bắt trước đấy"*.

**Ý tưởng:** phân biệt hai cách một bức tường mua biến mất.

| Tường mua biến mất vì | Nghĩa là | Bạn đang ở đâu |
|---|---|---|
| Bị **KHỚP** (`fl`) — ăn mòn dần | Người ta **đang bán thật** vào nó | Cú giảm **đã bắt đầu** → bạn muộn rồi |
| Bị **RÚT** (`pl`) — biến mất nguyên khối | Market maker **rút đỡ giá, bước sang một bên** | Cú giảm **CHƯA xảy ra** → **đây chính là chỗ vào** |

Đó là toàn bộ mấu chốt của "bắt trước đấy". Định nghĩa ba chỉ số, cửa sổ trượt `W = 300` giây:

```js
// 1) BPR — Bid Pull Rate: tỷ lệ đỡ giá bị RÚT (không phải bị ăn)
BPR = Σ(USD tường bid bị RÚT trong W) / Σ(USD tường bid trung bình trong W)

// 2) BFR — Bid Fill Rate: tỷ lệ đỡ giá bị KHỚP THẬT
BFR = Σ(USD tường bid bị KHỚP trong W) / (mẫu số như trên)

// 3) DBI — Depth Balance Index (đã lọc theo độ tin), trong ±0.5% quanh giá
bidTrust = Σ bids.m × wallTrust/100
askTrust = Σ asks.m × wallTrust/100
DBI  = (bidTrust - askTrust) / (bidTrust + askTrust)
dDBI = DBI(t) - DBI(t - W)
```

**Cò SHORT (`coSHORT`) — nổ khi đủ CẢ 4:**

| # | Điều kiện | Ngưỡng mặc định | Ý nghĩa |
|---|---|---|---|
| 1 | `BPR ≥ NG_BPR` | 0,25 | ¼ tường đỡ bị rút trong 5 phút |
| 2 | **`BPR ≥ 2 × BFR`** | — | **RÚT chứ không phải BỊ ĂN** ← điều kiện "bắt trước" |
| 3 | `dDBI ≤ NG_DBI` | −0,25 | cán cân độ sâu đang sập về phía bán |
| 4 | `giá ≥ đỉnh_gần × (1 - 0,015)` | 1,5% | **giá CHƯA giảm** — vẫn sát đỉnh |

Điều kiện **2** và **4** là thứ phân biệt bot này với mọi bot đuổi theo giá. Bỏ một trong hai là biến nó thành bot vào lệnh muộn.

**Cò LONG (`coLONG`)** — đối xứng hoàn toàn: `APR` (Ask Pull Rate) thay `BPR`, `dDBI ≥ +0,25`, và giá vẫn sát **đáy** gần nhất.

**Cò CHỐT LỜI (`coCHOT`)** — yêu cầu của chủ dự án *"cắt lãi khi số lượng bán ít hơn số lượng mua"*:

```js
// Với lệnh SHORT đang lãi — đóng phần còn lại khi đủ CẢ 3:
coCHOT_short = (DBI > +0.15)          // đỡ mua đã dày hơn chắn bán
            && (mua30 > ban30 * 1.2)  // dòng tiền khớp 30' đã đảo sang mua
            && (dDBI > 0)             // và đang tiếp tục nghiêng về mua
```

⚠ **`mua30`/`ban30` phải là GROSS, tách riêng — không được cộng dồn có dấu.** Dự án cũ mắc đúng lỗi này: `pushTrade(n)` cộng dồn có dấu nên `f30 = 0` lẫn lộn **"chợ chết"** với **"hai phe đánh nhau ngang cơ"** — hai trạng thái thị trường trái ngược nhau hoàn toàn.

### 8.2 Tín hiệu nền — điểm `S`

Sáu tín hiệu, mỗi cái chuẩn hóa về −1..1. **Trọng số dưới đây là điểm KHỞI ĐẦU, chưa được chứng minh** (mục 3.2) — phải đo lại.

| Tín hiệu | Trọng số | Nguồn | Ghi chú |
|---|---|---|---|
| `sPull` — **tín hiệu dẫn (8.1)** | **0,30** | `wallBook` | Cao nhất, vì đây là lợi thế thông tin thật duy nhất |
| `sFlow30` — dòng tiền khớp 30' | 0,20 | `trades` | gross mua/bán tách riêng |
| `sBook` — cán cân sổ đã lọc tin | 0,15 | `DBI` | |
| `sLiq` — thanh lý | 0,15 | `liquidation-orders` | thanh lý long đẩy **xuống**, thanh lý short đẩy **lên** |
| `sOi` — OI so 25 phút trước | 0,10 | `open-interest` | ma trận ở 8.3 |
| `sFund` — funding ngược đám đông | 0,10 | REST | quy về mức /8h trước khi so |

```js
S = 100 * (0.30*sPull + 0.20*sFlow30 + 0.15*sBook + 0.15*sLiq + 0.10*sOi + 0.10*sFund)
```

⚠ **Lấy mẫu "25 phút trước" phải duyệt NGƯỢC từ cuối mảng.** Dùng `find()` từ đầu mảng sẽ lấy nhầm phần tử **cũ nhất** (2–4 tiếng) và làm lệch toàn bộ tín hiệu OI. Dự án cũ đã dính lỗi này.

⚠ **NULL ≠ 0.** Thiếu dữ liệu phải ghi `null`, không ghi `0`. Ghi `0` cho cả hai là dạy mô hình sau này rằng *"không có tin gì"* giống *"tin trung lập"*.

### 8.3 Ma trận OI × Giá — dùng cho cả tín hiệu lẫn cổng

| Giá | OI | Nghĩa | SHORT | LONG |
|---|---|---|---|---|
| ↑ | ↑ | Long mới chất vào, đòn bẩy dồn | ✅ **Tốt nhất** | 🚫 |
| ↑ | ↓ | Short đang bị ép đóng (squeeze) | 🚫 **CẤM** | ⚠ |
| ↓ | ↑ | Short mới vào ồ ạt | ⚠ nhiên liệu squeeze | ⚠ |
| ↓ | ↓ | Long bị thanh lý, đầu hàng | 🚫 | ✅ **Tốt nhất** |

Ô "Giá ↑ + OI ↓" là **cổng chặn cứng cho SHORT**, không phải trừ điểm. Đó chính là hình dạng của một cú squeeze đang chạy.

### 8.4 Bốn chốt chặn — ghi lại, đừng vứt

```js
chan = 0
if (Math.abs(S) < 25)          chan |= 1   // chưa rõ hướng
if (soTinHieuHoatDong < 2)     chan |= 2   // quá ít tín hiệu
if (flowConflict)              chan |= 4   // dòng 5' ngược hẳn dòng 30'
if (satNoConfirm)              chan |= 8   // dòng tiền kịch kim mà sổ+OI không xác nhận
if (!trongKhungGoc)            chan |= 16  // ⭐ NHÃN — ghi vào DB nhưng KHÔNG chặn (24/24)
if (btcCheDoXau)               chan |= 32  // BTC đang phá đỉnh (với SHORT)
```

> **Ngưỡng GHI (15) phải thấp hơn ngưỡng VÀO LỆNH (25) — có chủ đích.** Tín hiệu bị chặn **vẫn được ghi và vẫn được chấm**, đánh dấu bằng bitmask `chan`. Đây là **nhóm đối chứng duy nhất** để biết chốt chặn đang cứu hay đang cắt mất lệnh thắng. Ở dự án cũ, nhóm bị chặn hóa ra thắng **hơn** nhóm thật (+4,6% vs −11,2%) — nếu không ghi thì không bao giờ biết.

---

## 9. TẦNG 5 — CHỌN SETUP

⭐ **CẬP NHẬT 2026-08-12: chạy 24/24, không còn cổng theo giờ.** Cả 4 setup được xét ở **mọi thời điểm**. Các mốc giờ ghi trong tiêu đề dưới đây là **khung gốc** — nay chỉ dùng để gắn nhãn `trong_khung`, **không chặn lệnh**.

⛔ **Điều kiện COIN của cả 4 setup giữ nguyên 100%** so với bản có khung giờ. Bỏ ràng buộc giờ không phải nới điều kiện.

Giờ Việt Nam (UTC+7). Tuyệt đối **không cộng điểm** vào `S` (mục 3.1).

### 9.1 SHORT-A · Đỉnh pump đêm — *(khung gốc `23:00 → 03:00`)*

| Điều kiện | Ngưỡng |
|---|---|
| `chg24` | **≥ +30%** |
| Funding (quy về /8h) | **≥ +0,05%** — bạn được sàn trả tiền để ôm short |
| OI 25' | **tăng** cùng giá (ô "↑↑" ở 8.3) |
| Tuổi coin | ≥ 7 ngày |
| Cò `coSHORT` (8.1) | **nổ** |
| BTC 4h | không phá đỉnh |

**Chặn cứng:** funding **đã âm** (short quá đông → mồi squeeze) · OI giảm khi giá tăng (squeeze đang chạy) · số lệnh mở đã đạt trần.

### 9.2 SHORT-B · Nối tiếp sau cú pump — *(khung gốc `07:00 → 15:00`)*

Yêu cầu riêng của chủ dự án: *"coin nào tăng 30% rồi mà sáng hôm sau qua 7h vẫn tăng tiếp trên 10% thì theo dõi tiếp để short"*.

```js
dieuKien_SHORT_B =
     coin.daTang30_homQua === true              // ghi cờ từ phiên trước, lưu DB
  && gioVN >= 7 && gioVN < 15
  && (giaHienTai / giaLuc7h - 1) >= 0.10        // sáng nay tăng tiếp >= 10%
  && funding8h >= 0.0005
  && coSHORT
```

Bot phải lưu **ảnh chụp giá lúc 07:00** mỗi ngày cho mọi coin đang theo dõi (bảng `moc_gia`), nếu không thì mốc so sánh không tồn tại.

⚠ Cửa vào lệnh tốt nhất theo mô tả của chủ dự án là **13:30–15:00** (London vào + mốc funding 15:00). Bot đánh trọng số ưu tiên cao hơn trong khung đó nhưng **không chặn** khung 07:00–13:30.

### 9.3 LONG-A · Đà tăng sớm — *(khung gốc `18:00 → 22:30`)*

| Điều kiện | Ngưỡng |
|---|---|
| `chg24` | **+10% → +15%** |
| Funding | **< +0,03%** ← *chưa ai để ý, còn dư địa* |
| OI | tăng cùng giá |
| Khối lượng | tăng dần đều, **không** nổ một phát rồi teo |
| Cò `coLONG` | nổ |

> **Funding là chìa khóa phân biệt LONG với SHORT.** Tăng 12% mà funding vẫn thấp = tiền mới đang vào, còn đường đi. Tăng 12% mà funding đã cao ngất = đã quá đông người trong đó. Cùng một mức tăng, hai kết luận ngược nhau.

### 9.4 LONG-B · Bắt đáy — *(khung gốc `06:30 → 09:00`)*

| Điều kiện | Ngưỡng |
|---|---|
| `chg24` | ≤ **−15%** |
| **Không tạo đáy mới** | ≥ **2 giờ** ← đây mới là "đi ngang" thật |
| OI | **giảm mạnh** (long đã bị rũ sạch) |
| Funding | **âm hoặc bằng 0** |
| Nến rút chân | có râu dưới dài |
| **Hôm trước KHÔNG tăng > 30%** | ← luật riêng của chủ dự án |

> Điều kiện cuối rất quan trọng: coin vừa pump lớn hôm trước thì hôm sau **không phải đang giảm — nó đang XẢ**, mà xả thì kéo dài nhiều ngày. Đừng đỡ dao rơi của một cú xả. Cần cờ `daTang30_homQua` giống 9.2.

### 9.5 ⛔ Vùng cấm — ĐÃ BỎ (2026-08-12)

Bản đầu có vùng cấm **04:00–06:00** với lý do thanh khoản cạn nhất ngày, râu nến quét bừa.

**Chủ dự án đã chốt bỏ.** Bot nay chạy 24/24 tuyệt đối, không chặn giờ nào. `KHUNG_CAM`, `GIU_VUNG_CAM` và `trongVungCam()` đã bị xoá khỏi mã nguồn — không còn cờ để bật lại.

Lập luận chấp nhận được: nếu 04:00–06:00 thật sự tệ, **dữ liệu sẽ tự nói ra** qua cột `gio_vn` của bảng `lenh`, thay vì mình giả định trước rồi không bao giờ kiểm được. Cái giá phải trả là một số lệnh khớp xấu trong khung đó — chấp nhận được ở chế độ giấy.

| Còn giữ | Lý do |
|---|---|
| ±5 phút quanh **FOMC / CPI** | *(chưa cài)* Giá trị duy nhất là **KHÔNG giao dịch** — không có thông tin gì về hướng |

---

## 10. QUẢN LÝ VỐN

Thiết lập của chủ dự án: **OKX · ký quỹ CHÉO · đòn bẩy 10x**.

### 10.1 ⚠ Chế độ chéo — bẫy số lệnh

Trong ký quỹ chéo, **mọi lệnh dùng chung một túi tiền**. Mở 3 lệnh thì cả tài khoản gánh cho 3 lệnh, nhưng túi không to lên.

Tính trên tài khoản **$100**, ký quỹ 9%/lệnh, x10 (giá trị lệnh $90 mỗi lệnh):

| Số lệnh mở | Tổng giá trị lệnh | Mất khi cắt ở −22% | **Giá chạy ngược bao nhiêu thì CHÁY** |
|---|---|---|---|
| 1 | $90 | −20% tài khoản | ~110% |
| 2 | $180 | −40% | ~55% |
| **3** | **$270** | **−59%** | **~36%** |
| 4 | $360 | *cháy trước khi kịp cắt* | ~27% |

Ở **4 lệnh, sàn thanh lý ở 27% trong khi lệnh cắt lỗ đặt ở 22–25%** — lệnh cắt lỗ đó không bao giờ được kích hoạt.

Và nhớ: khi thị trường alt squeeze, **mọi lệnh short thua CÙNG LÚC**. Không có lệnh nào lãi để bù.

> **Cổng bắt buộc — `CONG_THANH_LY`:** bot **từ chối** mở lệnh mới nếu khoảng cách thanh lý tổng hợp sau khi mở **< 2 × khoảng cách cắt lỗ**.
>
> Đây là ràng buộc thật, thay cho việc đếm lệnh một cách tùy tiện. Nó tự nhiên cho phép 3 lệnh khi size nhỏ và chặn ở 2 lệnh khi size lớn. Giao diện phải **luôn hiện khoảng cách thanh lý tổng hợp** ở đầu trang.

Trần cấu hình: `SO_COIN_TRAN = 20` (van an toàn — số coin thật do `LOC_COIN` quyết), `SO_LENH_MO_TOI_DA = 3`.

⛔ **Hai số này KHÔNG liên quan nhau và không được nới cùng nhau.** Coin theo dõi là cần gạt lấy mẫu (nới thoải mái, chỉ tốn hạ tầng). Trần lệnh mở là cần gạt rủi ro: **lỗ đồng thời tối đa = N × $20**, nên N=3 → $60 = 30% vốn, còn N=10 → sạch vốn trong một cú quét. Thêm nữa, 10 lệnh short trên 10 alt lúc BTC bật **không phải 10 lệnh mà là 1 lệnh cỡ 10×** — và cũng chỉ đáng ~1–2 lệnh độc lập khi đếm cỡ mẫu, nên nới nó còn làm **hỏng phép đo** chứ không chỉ tăng rủi ro.

### 10.2 Rải lệnh ba giai đoạn — điểm mấu chốt

| Giai đoạn | Ký quỹ | Vào khi nào |
|---|---|---|
| **1 · Thăm dò** | 3% tài khoản | Cò `coSHORT`/`coLONG` nổ lần đầu |
| **2 · DCA** | +3% | Giá đi ngược 5–10% **VÀ có nến từ chối** (mục 10.3) |
| ⛔ **TRẦN KHI ĐANG LỖ = 6%** | | |
| **3 · Xác nhận** | +3% | Giá gãy cấu trúc **và lệnh ĐANG LÃI** |
| **4 · Xu hướng** | +3% | Thủng tiếp mốc kế · vẫn đang lãi |
| | **Tổng 12%** | |

> **Luật vàng, mã hóa cứng, không có cờ nào tắt được:**
> ```js
> if (pnlPhanTram < 0 && kyQuyHienTai >= 0.06 * taiKhoan) return; // CẤM thêm
> ```
> Kịch bản mất 20% tài khoản chỉ xảy ra khi đã full size mà vẫn thua từ đầu tới cuối. Với luật này, kịch bản đó **không tồn tại** — full size chỉ có mặt khi lệnh đã được chứng minh là đúng.

**Hiệu quả bằng số** (tài khoản $100, một lệnh điển hình):

| | Vào hết 1 lần | Rải 3 giai đoạn |
|---|---|---|
| Sai từ đầu, cắt −22% | **−$20** | **−$13** |
| Đúng, ăn 25% giá | +$34 | +$28 |
| **Tỷ lệ thắng cần để hòa** | **42%** | **32%** |
| Thua 4 lệnh liên tiếp | −59% tài khoản | −43% |

### 10.3 Điều kiện DCA — không được bỏ

DCA **chỉ** được phép khi giá đi ngược **VÀ** có ít nhất một dấu hiệu đuối:

```js
duocDCA =
     Math.abs(giaHienTai/giaVao1 - 1) >= 0.05
  && Math.abs(giaHienTai/giaVao1 - 1) <= 0.12
  && kyQuyHienTai < 0.06 * taiKhoan
  && (
       nenTuChoi(15)                    // nến 15' râu dài, đóng lại dưới đỉnh cũ
    || (oiDungYen && volGiamDan)        // giá lên nhưng không có tiền mới vào
     )
```

> **DCA khi giá lên rồi ĐUỐI. Không DCA khi giá đang lên KHỎE.**
>
> Giá lên 10% sau khi short mà OI tăng đều, khối lượng tăng đều, không có nến từ chối nào → đó là **squeeze thật**, không phải nhịp cuối. Ôm nguyên phần thăm dò, chờ cắt lỗ. Mất ít thôi.

### 10.4 Cắt lỗ — **TÍNH RIÊNG TỪNG COIN**

```js
// MỖI COIN một mức riêng, đo bằng % GIÁ, tính từ giá vào lệnh đầu tiên của CHÍNH coin đó
giaCat_short = giaVao1 * (1 + CAT_LO)          // CAT_LO = 0.22 mặc định (0.20–0.25)
giaCat_long  = giaVao1 * (1 - CAT_LO)
```

⚠ **Đây là mức của TỪNG lệnh, không phải mức của cả tài khoản.** Coin A âm 22% thì cắt coin A; coin B đang lãi thì kệ nó, không liên quan. Không có "cắt lỗ tổng" nào cả — chỉ có ngắt mạch ở mục 15.2 (lỗ > 15% tài khoản/24h thì ngừng **mở lệnh mới**, nhưng không ép đóng lệnh đang chạy).

**Nhưng vì ký quỹ CHÉO, tổn thất vẫn cộng dồn.** Đây là bảng phải nhìn (tài khoản $100, trần khi lỗ = 6% ký quỹ/coin → $60 giá trị lệnh/coin):

| Số coin cùng lỗ | Tổng giá trị lệnh | Mỗi coin cắt ở −22% | **Tổng mất** | Cháy khi ngược |
|---|---|---|---|---|
| 1 | $60 | −$13,2 | **−13%** tài khoản | ~165% |
| 2 | $120 | −$13,2 × 2 | **−26%** | ~82% |
| 3 | $180 | −$13,2 × 3 | **−40%** | ~55% |

So với việc vào full size ngay ($120/coin): 3 coin cùng lỗ là **−79% tài khoản**, và điểm cháy tụt xuống 36% — tức gần trùng mức cắt lỗ. **Đây là toàn bộ lý do tồn tại của `TRAN_KHI_LO = 6%`.**

### 10.4bis ⛔ MỘT LỆNH ĐÃ MỞ THÌ KHÔNG BAO GIỜ TỰ TẮT

Quyết định của chủ dự án, và nó đè lên mọi thứ khác trong tài liệu này:

> **Lệnh đã mở chỉ đóng vì ĐÚNG HAI lý do:**
> 1. **Giá coin đó âm quá 22–25%** → cắt lỗ
> 2. **Chạm bậc thang chốt lời** (mục 10.5.2) → chốt một phần hoặc toàn bộ
>
> **Không có lý do thứ ba.** Không đóng vì hết giờ. Không đóng vì cấu trúc gãy. Không đóng vì funding đảo. Không đóng vì ra khỏi khung giờ. Không đóng vì `S` đổi dấu.

**Mọi tín hiệu xấu khác trở thành CẢNH BÁO trên màn hình, KHÔNG phải lệnh đóng.** Bot nói cho bạn biết, bạn tự quyết:

| Tình huống | Code cũ / bản nháp trước | **Bản này** |
|---|---|---|
| Đến 15:00 chưa lãi | tự đóng ở −8% | ⚠ hiện `HẾT KHUNG · chưa lãi` — **giữ lệnh** |
| Giá phá đỉnh pump + OI tăng | tự đóng | ⚠ hiện `CẤU TRÚC GÃY` — **giữ lệnh** |
| Funding đảo dấu | tự đóng | ⚠ hiện `FUNDING ĐẢO · nguy cơ squeeze` — **giữ lệnh** |
| Ra khỏi khung giờ | — | không ảnh hưởng gì tới lệnh đang mở |
| `S` đổi dấu / cò ngược nổ | ẩn thẻ | **không ảnh hưởng** — lệnh mở không nghe tín hiệu nữa |

**Hệ quả bắt buộc trong code:** máy trạng thái phải tách hẳn hai thế giới.

```js
// Tầng TÍN HIỆU chỉ nói chuyện với trạng thái SAN và CHO_VAO.
// Từ THAM_DO trở đi, lệnh KHÔNG đọc tín hiệu nữa — chỉ đọc GIÁ.
if (trangThai >= THAM_DO) {
  // đúng 2 đường ra, không hơn
  if (chamGiaCat(giaHienTai))    return dongLenh('cat_lo');
  if (chamBacThang(giaHienTai))  return chotMotPhan();
  capNhatCanhBao();              // chỉ vẽ ⚠, KHÔNG đóng
  return;                        // ⛔ không có nhánh nào khác
}
```

Nếu trong `if (trangThai >= THAM_DO)` xuất hiện một lệnh `dongLenh()` thứ ba, đó là **lỗi**, kể cả khi lý do nghe rất hợp lý.

**Cái giá phải trả — biết trước để không ngạc nhiên:**

Bỏ cắt lỗ theo thời gian nghĩa là **mọi lệnh thua đều thua đủ 22%**, thay vì một phần thua nhẹ ở −8%. Trên tài khoản $100 với trần 6% ký quỹ, mỗi lệnh thua là **−13,2%** thay vì trung bình khoảng −10,7%.

Đổi lại: những lệnh sập muộn — sau 15:00, sang hôm sau, hoặc sau vài ngày — **bạn vẫn còn ở trong đó**. Với chiến lược ôm dài và được trả funding để chờ, đây là đánh đổi hợp lý. Ngưỡng hòa vốn nhích từ 32% lên **35%**, vẫn còn rất xa mức 88% của cách cũ.

**Một lưu ý về vốn:** lệnh kẹt lâu chiếm chỗ trong `CONG_THANH_LY`, nên nó **chặn bạn mở lệnh mới**. Giao diện phải hiện rõ tuổi lệnh và số chỗ còn trống, để bạn tự quyết có muốn đóng tay hay không.

### 10.5 Chốt lời

#### 10.5.1 Sàn cứng 5% — và cách nối thang với tường

Ba luật, theo thứ tự ưu tiên. Luật trên đè luật dưới.

**Luật 1 — sàn cứng.** Không mốc chốt lời nào được gần hơn **5%**:

```js
const TP_TOI_THIEU = 0.05;
if (khoangCachTP < TP_TOI_THIEU) khoangCachTP = TP_TOI_THIEU;
```

**Luật 2 — thang làm chủ, tường tinh chỉnh.** Đây là chỗ nối với bộ lọc lệnh ảo, và thứ tự rất quan trọng:

```js
function giaTP(bac, giaVaoTB, huong, sổOkx){
  // 1) THANG quyết định mốc lý thuyết — KHÔNG phải bestWall, KHÔNG phải cap
  const mocLyThuyet = huong === 'short'
    ? giaVaoTB * (1 - bac)          // bac = 0.10, 0.20, 0.30, 0.40...
    : giaVaoTB * (1 + bac);

  // 2) TƯỜNG chỉ được dịch giá trong ±1,5% quanh mốc đó
  const tuong = timTuongTinCay(sổOkx, mocLyThuyet, 0.015, /*tinToiThieu=*/55);
  if (!tuong) return mocLyThuyet;                    // không có tường → dùng mốc thô

  // 3) Đứng TRƯỚC tường một bước giá, không đứng sau
  return huong === 'short' ? tuong.p + step : tuong.p - step;
}
```

> **Vì sao đứng trước tường:** tường đối diện là chỗ giá được **đỡ lại**. Đặt chốt lời đúng tại đó là xếp hàng sau hàng trăm nghìn đô lệnh khác — giá chạm rồi bật, lệnh của bạn không khớp. Lùi vào trước một bước giá thì bạn khớp trước khi tường phát huy tác dụng.

**Luật 3 — cổng R:R, kiểm TRƯỚC khi mở lệnh.** Từ chối tín hiệu nếu kế hoạch giá không có đường thắng:

```js
// Tính bằng % TÀI KHOẢN, không phải % giá — vì size lúc thua khác size lúc thắng
const matNeuThua = CAT_LO * (TRAN_KHI_LO * DON_BAY);        // 0.22 × 0.60 = 13,2%
const anNeuThang = tpTrungBinhCoTrongSo * (KY_QUY_TOI_DA * DON_BAY);
const rrTaiKhoan = anNeuThang / matNeuThua;

if (rrTaiKhoan < NG_RR) return;                              // NG_RR = 1.2
```

Với thang mặc định (1/3 ở +10%, 1/3 ở +20%, 1/3 kéo trượt từ +30%), TP trung bình ≈ **20%**:

```
anNeuThang  = 0,20 × 1,20 = 24,0% tài khoản
matNeuThua  = 0,22 × 0,60 = 13,2% tài khoản
R:R tài khoản = 1,82        →  tỷ lệ thắng cần để hòa = 13,2/(24,0+13,2) = 35%
```

**35% thay vì 88%.** Đó là khác biệt giữa việc kế thừa cách chọn giá của code cũ và không.

⚠ **Đừng đo R:R bằng % giá ở hệ thống này.** Tính theo giá thì R:R = 20/22 = 0,9, trông như thua thiệt. Nhưng lệnh thua chỉ mang **6% ký quỹ** còn lệnh thắng mang tới **12%** — bất cân xứng đó là sản phẩm cố ý của cách rải lệnh ba giai đoạn (10.2), và chỉ **% tài khoản** mới nhìn thấy nó. Ghi cả hai số vào DB, nhưng **cổng chặn dùng số tài khoản**.

#### 10.5.2 Thang chốt lời

`x` = phần trăm giá đã chạy **đúng hướng**, tính từ **giá vào trung bình có trọng số**.

| `x` | Hành động |
|---|---|
| **+5%** | Kéo cắt lỗ về **hòa vốn**. Từ đây lệnh không thể lỗ |
| **+10%** | **Chốt 1/3**. Phần còn lại: cắt lời ở +2% |
| **+20%** | **Chốt 1/3**. Phần cuối: cắt lời ở **+11%** (cách 9%) |
| **+30%** | Cắt lời ở **+22%** (cách 8%) |
| **+40%** | Cắt lời ở **+33%** (cách 7%) |
| **≥ +50%** | Cắt lời cách **5%** |
| **Cò `coCHOT` nổ** *(chỉ khi `x > 0`)* | **Đóng toàn bộ ngay**, bất kể đang ở bậc nào |
| **Funding đảo dấu** | ⚠ **CHỈ CẢNH BÁO, KHÔNG ĐÓNG** (mục 10.4bis) |

⚠ **`coCHOT` chỉ được phép nổ khi lệnh ĐANG LÃI (`x > 0`).** Nó là cò *chốt lời*, không phải cò *cắt lỗ*. Nếu để nó nổ khi đang lỗ thì nó trở thành đường thoát thứ ba và vi phạm mục 10.4bis:

```js
if (coCHOT && x > 0) return dongLenh('co_chot');   // ✅
if (coCHOT)          return;                       // ⛔ đang lỗ → bỏ qua, chỉ vẽ ⚠
```

> **Vì sao khoảng cách rộng ở đầu rồi siết dần:** nhịp hồi kỹ thuật bình thường trên coin vừa pump là **8–15%**. Cắt lời cách 5% ngay từ đầu thì **mọi nhịp hồi bình thường đều đá bạn ra**. Bạn thắng, nhưng thắng vụn — mà hệ thống này cần lệnh thắng lớn để bù cho lệnh thua 13%.
>
> Cụ thể: short $10 → xuống $9 (lãi 10%) → đặt cắt lời $9,50 → giá bật lên $9,55 (nhịp hồi 6%, chuyện thường) → **bị đá ra ăn 5%** → giá đi thẳng xuống $6. Đúng hoàn toàn, ăn 5%, đáng lẽ ăn 40%.

### 10.5.3 ⛔ PHÍ · TRƯỢT GIÁ · FUNDING — CỐ Ý BI QUAN

**Nguyên tắc, và nó đè lên mọi tinh chỉnh khác:**

> **Mọi con số về chi phí phải XẤU HƠN THỰC TẾ.**
> Dữ liệu chạy giấy mà đẹp hơn thực tế là tự lừa mình — rồi tới lúc vào tiền
> thật mới phát hiện chênh, mà lúc đó đã ra quyết định dựa trên số sai suốt
> mấy tháng. **Thà giấy tệ hơn thật.**
> Nếu chạy giấy VẪN có lãi với bộ số bi quan này thì thực tế chỉ có thể tốt hơn.

| Khoản | Sàn thật | Bot dùng | Bi quan bao nhiêu |
|---|---|---|---|
| Phí | taker 0,05% · **maker 0,02%** | **0,06% MỌI lần khớp** | tính taker cho cả lệnh maker, lại còn cao hơn taker |
| Trượt giá | tuỳ độ sâu sổ | **đo từ sổ rồi ×1,5**, sàn cứng 0,05% | phạt thêm 50% |
| Độ sâu dùng để đo trượt | tiền thật trên sổ | **tiền × wallTrust/100** | giả định lệnh ảo **biến mất trước khi mình khớp tới** |
| Funding NHẬN | 100% | **70%** | cắt bớt 30% phần lãi |
| Funding TRẢ | 100% | **130%** | cộng thêm 30% phần lỗ |

**Tầng thứ ba trong bảng là chỗ tinh tế nhất:** bot dùng chính bộ lọc lệnh ảo của mình để **tự phạt**. Khi đi qua sổ tính giá khớp, mỗi mức chỉ được tính `m × wallTrust/100`. Tường tin 22 chỉ đóng góp 22% tiền của nó. Tức mô hình giả định đúng cái điều mà `wallTrust` cảnh báo: **lệnh ảo sẽ biến mất ngay trước khi lệnh của bạn tới**.

Nếu sổ không đủ sâu cho size đó, phần còn lại khớp ở mức tệ nhất đã thấy **phạt thêm 0,5%** — dấu hiệu size quá to so với thanh khoản, và phải nhìn thấy được trong số liệu chứ không được giấu.

⚠ **Không tính trượt hai lần.** `_khop()` trả về **giá đã xấu đi**, nên trượt tự nằm trong PnL. `truot_usd` ghi vào DB **chỉ để báo cáo**. Chỉ **phí** mới bị trừ tường minh:

```js
pnlRong = pnlThucHien + fundingNhanUsd - phiUsd     // trượt đã nằm trong giá
```

⚠ **Thang chốt lời KHÔNG trừ phí.** `x` là quãng **giá** đã chạy, không phải lãi ròng. Trộn hai thứ làm bậc thang trôi theo phí, mỗi lệnh một mốc khác nhau, không so sánh được.

**Quy mô ma sát** (tài khoản $100, x10): khoảng **$0,05–0,12/lệnh**. Nghe nhỏ, nhưng ở 200 lệnh/năm là **10–24% vốn/năm**. `npm run bao-cao` in thẳng con số ngoại suy đó.

### 10.6 Ưu đãi funding — đừng bỏ quên

Short coin có funding dương cao (0,1–0,3%/8h ở loại vừa pump): **sàn trả tiền mỗi 8 tiếng để ôm lệnh**. Ở mức 0,2%/8h trên $120 giá trị lệnh, đó là **~0,7%/ngày trên tài khoản $100, miễn phí**.

Bot phải **cộng dồn funding đã nhận vào PnL** và hiện riêng một cột. Nếu không, mọi thống kê lãi/lỗ đều sai lệch xuống.

---

## 11. MÁY TRẠNG THÁI LỆNH

### 11.1 Vòng đời một lệnh

```
        ┌──────┐  đủ cổng + đủ điều kiện coin
        │ SAN  │──────────────────────────────┐
        └──────┘                              ↓
                                        ┌──────────┐
        ┌─────────────────────────────── │ CHO_VAO  │
        │  cò nổ                         └──────────┘
        ↓                          CHỈ khi giá vượt │ điểm cắt (10.4bis)
   ┌──────────┐                                └──────────→ SAN
   │ THAM_DO  │ ký quỹ 3%
   └──────────┘
      │      │
      │      │ giá ngược 5–12% + nến từ chối
      │      ↓
      │  ┌──────┐ ký quỹ 6%  ⛔ TRẦN KHI ĐANG LỖ
      │  │ DCA  │
      │  └──────┘
      │      │
      └──────┴──── lãi & gãy cấu trúc ──→ ┌────────┐ 9%
                                          │ LAI_1  │
                                          └────────┘
                                               │ thủng mốc kế
                                               ↓
                                          ┌────────┐ 12%
                                          │ LAI_2  │
                                          └────────┘
      Mọi trạng thái ──→ ┌──────┐  ⛔ ĐÚNG 3 ĐƯỜNG RA, KHÔNG HƠN (10.4bis)
                         │ DONG │  1· chạm cắt lỗ (âm 22–25% của coin đó)
                         └──────┘  2· chạm thang chốt lời / coCHOT khi ĐANG LÃI
                                   3· người bấm DỪNG KHẨN
                                   ✗ KHÔNG đóng vì: hết giờ · cấu trúc gãy
                                     · funding đảo · S đổi dấu · ngoài khung
```

### 11.2 ⭐ ĐÓNG BĂNG KẾ HOẠCH GIÁ + CHỐNG NHẤP NHÁY

**Vấn đề ở code cũ:** `analyze()` ghi đè `E.pred` **mỗi 2 giây** và `render()` vẽ lại toàn bộ **mỗi 1 giây**. Hệ quả có hai mặt, cả hai đều làm app không dùng được để đặt lệnh thật:

1. **Hướng lật qua lật lại.** Đang hiện LONG, vài phút sau thành SHORT, rồi lại LONG — vì `S` dao động quanh ngưỡng 25 và không có gì giữ nó lại.
2. **Mọi con số giá trôi liên tục.** Giá vào, giá cắt, giá chốt đều được tính lại mỗi 2 giây.

> Một con số **đổi trong lúc bạn đang gõ nó vào sàn** thì vô dụng. Tệ hơn: bạn vào lệnh theo số cũ rồi nhìn lại thấy màn hình đang hiện số khác, và không có cách nào biết mình đã làm đúng hay sai.

Hai cơ chế bắt buộc dưới đây sửa việc này.

#### A. Khóa hướng — chống lật

| Tham số | Mặc định | Việc |
|---|---|---|
| `XAC_NHAN_TICK` | **15 nhịp (30 giây)** | Cò phải nổ **liên tục** 15 nhịp mới được hiện. Nổ 3 nhịp rồi tắt = nhiễu, không hiện |
| `NGUONG_VAO` / `NGUONG_DAO` | **25 / 40** | Hiện lần đầu cần \|S\| ≥ 25. **Đảo hướng cần \|S\| ≥ 40 ngược lại** — ngưỡng bất đối xứng, cố ý |
| `KHOA_HUONG_PHUT` | **30 phút** | Sau khi hiện một hướng, cùng coin **không được đổi hướng** trong 30 phút |
| `NGUOI_LANH_PHUT` | **15 phút** | Tín hiệu chết rồi thì cùng coin + cùng hướng phải chờ 15 phút mới được phát lại |

**Luật quan trọng nhất — không có đường tắt:**

> **`CHO_VAO` không bao giờ lật thẳng sang hướng ngược lại.** Nó chỉ có thể **chết** (về `SAN`). Muốn có hướng ngược thì phải đi qua `SAN` và chờ hết `NGUOI_LANH_PHUT`.

Nghĩa là kịch bản *"đang LONG xong vài phút sau thành SHORT"* trở thành **không thể xảy ra về mặt cấu trúc**, chứ không phải chỉ khó xảy ra.

#### B. Đóng băng kế hoạch giá

Khoảnh khắc vào `CHO_VAO`, bot **chụp ảnh** toàn bộ kế hoạch rồi **khóa lại**:

```js
keHoach = {
  luc:        now,
  giaThamChieu: giaHienTai,     // giá lúc chụp — để đo độ trôi
  giaVao:     giaHienTai,       // = GIÁ HIỆN TẠI (mục 3.6), không phải tường
  giaCat:     giaVao * (1 ± CAT_LO),
  giaDCA:     giaVao * (1 ± 0.05),
  tp:         [tp1, tp2, tp3, tp4],   // từ THANG, tường chỉ tinh chỉnh (10.5.1)
  dongBang:   true
}
```

Từ đó **không một con số nào đổi**. Giao diện hiện đúng bộ số đó cho tới khi một trong bốn việc xảy ra:

| Việc | Hành động |
|---|---|
| **Vào lệnh thật** | Tính lại **ĐÚNG MỘT LẦN** từ **giá khớp thật**, rồi đóng băng tiếp |
| **Giá trôi > `TROI_TOI_DA` (1,5%)** | Tính lại một lần, gắn nhãn 🔄 **ĐÃ CẬP NHẬT `hh:mm`** |
| **Giá đã vượt qua điểm cắt** | Hủy — kế hoạch này chết theo đúng nghĩa đen, giá đã đi mất |

**Chỉ có ba đường. Không có hạn giờ, không có "hết điều kiện thì tắt".**

> ⛔ **KHÔNG hủy `CHO_VAO` vì hết thời gian, vì `S` tụt xuống dưới 25, vì cò tắt, hay vì ra khỏi khung giờ.** Đây chính là nguồn gốc của cảnh *"hiển thị rồi tắt, tắt rồi lại hiển thị"* mà chủ dự án không chấp nhận. Cò và `S` chỉ có quyền **bật** một kế hoạch lên; chúng **không có quyền tắt** nó đi.
>
> Kế hoạch đã dựng thì **nằm đó cho tới khi bạn vào lệnh, hoặc tới khi giá bỏ chạy qua điểm cắt.**

> **Vì sao vẫn cho tính lại khi trôi quá 1,5%:** kế hoạch dựng lúc giá $1,00 mà giờ giá $1,08 thì bộ số đó đã lỗi thời — hiện tiếp là hại chứ không phải giúp. Nhưng bắt buộc phải **có nhãn nhìn thấy được**: người dùng cần biết số vừa đổi. **Đổi lén còn tệ hơn không đổi.** Lưu ý đây là *cập nhật tại chỗ*, không phải tắt đi bật lại — dòng vẫn ở nguyên chỗ cũ trên bảng.

**Sau khi đã vào lệnh**, kế hoạch chỉ được đổi ở **đúng ba sự kiện rời rạc**, mỗi lần ghi một dòng `su_kien`:

1. **Thêm một lần vào lệnh** (DCA / thêm khi lãi) → giá vào TB đổi → thang tính lại từ giá TB mới
2. **Chạm một bậc thang** → chốt một phần + dời giá cắt lời
3. **`x ≥ 5%`** → kéo cắt lỗ về hòa vốn (một lần duy nhất, không bao giờ lùi lại)

> ⛔ **CẤM cắt lỗ và các mốc TP trôi liên tục theo giá.** Chúng chỉ được **nhảy** ở ba sự kiện trên. Giữa hai sự kiện, chúng là hằng số.

### 11.3 Bất biến — kiểm bằng test tự động, mọi lượt chuyển trạng thái

1. `kyQuy ≤ 0.06 × taiKhoan` bất cứ khi nào `pnl < 0`. **Không ngoại lệ.**
2. Mỗi coin **tối đa một lệnh mở**.
3. `CONG_THANH_LY` phải qua trước mọi lần mở/tăng size.
4. Sau khi `x ≥ 5%`, giá cắt lỗ **không bao giờ được lùi xa hơn** giá hòa vốn.
5. Mọi lượt chuyển trạng thái ghi một dòng vào bảng `su_kien` — kể cả lượt bị từ chối, kèm lý do.
6. **`CHO_VAO` không bao giờ chuyển thẳng sang hướng ngược lại** — bắt buộc đi qua `SAN`.
7. **Sau khi `dongBang = true`, mọi giá chỉ đổi qua 3 đường ở bảng 11.2B**, mỗi lần ghi `su_kien`. Không có đường thứ 4.
8. **Giá vào luôn nằm trong 0,15% của giá thị trường lúc phát lệnh.** Lệch hơn = có người đã đặt lệnh chờ ở tường → lỗi (mục 3.6).
9. ⛔ **Lệnh từ `THAM_DO` trở đi chỉ có ĐÚNG 3 đường ra** (mục 10.4bis): cắt lỗ · thang chốt lời (kể cả `coCHOT`, chỉ khi đang lãi) · `DUNG.flag`. Test phải quét toàn bộ nhánh `trangThai >= THAM_DO` và **fail nếu tìm thấy `dongLenh()` thứ tư**.
10. ⛔ **`CHO_VAO` không bị hủy vì hết giờ, vì `S` tụt, hay vì cò tắt.** Chỉ chết khi giá vượt qua điểm cắt.
11. ⛔ **Một dòng đang hiện không bao giờ biến mất rồi hiện lại.** Cập nhật là **tại chỗ**. Test giao diện: chụp danh sách ID mỗi 2 giây trong 10 phút — không ID nào được rời danh sách rồi quay lại.

---

## 12. GIAO DIỆN

Một trang HTML tĩnh, đọc `trangthai.json` mỗi 2 giây. **Chỉ đọc, không ghi.**

### 12.1 Thanh trạng thái (luôn hiện trên cùng)

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🟢 BOT SỐNG · ảnh 1,2s trước    Giờ VN 23:47 · Khung: SHORT-A ĐANG MỞ  │
│ Vốn $1.000 · Ký quỹ dùng $90 (9%) · Giá trị lệnh $900                  │
│ ⚠ CHÁY khi giá ngược 55%   ·   Cắt lỗ ở 22%   ·   Đệm 2,5×  ✅         │
│ Hôm nay: 3 lệnh · 2 thắng · PnL +$47 (+4,7%) · Funding nhận +$1,20     │
│                                                    [ ⛔ DỪNG KHẨN ]     │
└────────────────────────────────────────────────────────────────────────┘
```

Nếu tuổi ảnh > 30 giây → **cả thanh chuyển đỏ**, chữ "BOT CÓ THỂ ĐÃ CHẾT".

### 12.2 Bảng lệnh đang mở — bảng chính chủ dự án yêu cầu

| Coin | Hướng | Trạng thái | Giá h.tại | Giá vào TB | **Cắt lỗ** | **DCA kế** | **TP1** | **TP2** | **TP3** | **TP4** | Ký quỹ | PnL | Cháy | Tuổi |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PUMP | 🔴 SHORT | LAI_1 | 0,0412 | 0,0455 | ~~0,0555~~ **0,0455** 🔒 | — | ✅0,0410 | 0,0364 | 0,0319 | 0,0273 | $60 (6%) | **+$21** | 61% | 2g14 |
| NEIRO | 🔴 SHORT | THAM_DO | 0,00318 | 0,00305 | 0,00372 | 0,00320 | 0,00275 | 0,00244 | 0,00214 | 0,00183 | $30 (3%) | −$4 | 88% | 22ph |
| MOODENG | 🟢 LONG | CHO_VAO | 0,1840 | — | *0,1435* | — | *0,2024* | *0,2208* | *0,2392* | *0,2576* | — | — | — | — |

**Quy ước hiển thị:**
- ✅ = mốc đã chốt · 🔒 = cắt lỗ đã kéo về hòa vốn · ~~gạch~~ = giá cũ · *nghiêng* = dự kiến, chưa vào lệnh
- Số TP hiện đúng bằng số bậc còn lại trong thang 10.5 (tối đa 6 cột: TP1…TP6)
- Cột **Cháy** = khoảng cách thanh lý tổng hợp. **< 40% → đỏ**
- Bấm một dòng → mở bảng con: từng lần vào lệnh (giờ, giá, size), lịch sử dời cắt lỗ, funding đã nhận

**⭐ Hiển thị trạng thái đóng băng (mục 11.2B) — bắt buộc:**

Mỗi dòng có một cột hẹp bên trái cho biết bộ số đang ở trạng thái nào:

| Dấu | Nghĩa |
|---|---|
| 🔒 | **Đóng băng** — số này không đổi, cứ thế mà đặt lệnh |
| 🔄 `hh:mm` | **Vừa cập nhật tại chỗ** vì giá trôi quá 1,5%. Hiện thêm giá cũ ~~gạch ngang~~ trong 60 giây. Dòng **không** biến mất rồi hiện lại |
| 🔗 `mm` | Đang trong `KHOA_HUONG_PHUT` — còn bao nhiêu phút nữa mới được đổi hướng |
| ⚠ | **Có cảnh báo, nhưng lệnh vẫn giữ** (mục 10.4bis). Rê chuột xem lý do |

**Cột CẢNH BÁO — thay cho các đường tự đóng đã bỏ:**

Mỗi dòng lệnh mở có một cột hẹp gom mọi tín hiệu xấu. Chúng **chỉ hiện, không hành động**:

| Nhãn | Nghĩa |
|---|---|
| ⚠ `HẾT KHUNG` | Đã qua 15:00 mà lệnh chưa lãi |
| ⚠ `CẤU TRÚC` | Giá phá đỉnh pump + OI tăng — luận điểm gãy |
| ⚠ `FUNDING ĐẢO` | Funding chuyển dấu, nguy cơ squeeze |
| ⚠ `KẸT CHỖ` | Lệnh này đang chiếm chỗ trong `CONG_THANH_LY`, chặn bạn mở lệnh mới |

> Bốn nhãn này là thứ **bạn** dùng để quyết định đóng tay. Bot không tự đóng vì bất kỳ nhãn nào trong số đó.

⛔ **Dòng lệnh KHÔNG BAO GIỜ biến mất khỏi bảng khi lệnh còn mở.** Không ẩn vì `S` tụt, không ẩn vì cò tắt, không ẩn vì ra khỏi khung giờ. Nó chỉ rời bảng khi lệnh **đóng thật** — và khi đó chuyển xuống bảng lịch sử kèm lý do đóng.

⛔ **Cấm mọi hiệu ứng nhấp nháy, đổi màu theo giá, hay số chạy.** Trang này để đọc rồi đặt lệnh, không phải để xem cho vui. Chỉ giá thị trường hiện tại được phép thay đổi liên tục; **mọi giá trong kế hoạch phải đứng yên**.

⛔ **Không bao giờ hiện một coin ở hai hướng, hay đổi hướng của một coin đang hiện.** Nếu logic hiển thị có thể vẽ ra chuyện đó thì máy trạng thái đã sai (bất biến 6, mục 11.3).

### 12.3 Bảng theo dõi — kèm cột "VÌ SAO CHƯA VÀO"

Đây là cột quan trọng nhất để gỡ lỗi. Dự án cũ giấu coin không có tín hiệu và điều đó gây nhầm lẫn triền miên: hai bảng trống trông y hệt như app hỏng.

| Coin | %24h | Funding | ΔOI 25' | BPR | dDBI | Cò | **Vì sao chưa vào** |
|---|---|---|---|---|---|---|---|
| PEPE | +34% | +0,08% | +4,2% | 0,31 | −0,28 | ✅ | — · **SẴN SÀNG** |
| WIF | +41% | **−0,02%** | +1,1% | 0,18 | −0,09 | ❌ | ⛔ **funding ÂM — mồi squeeze** |
| BONK | +52% | +0,12% | **−3,8%** | 0,44 | −0,31 | ❌ | ⛔ **OI giảm khi giá tăng — squeeze đang chạy** |
| SHELL | +30% | +0,06% | +2,0% | 0,09 | −0,04 | ❌ | chờ cò · BPR 0,09 < 0,25 |
| MEW | +38% | +0,09% | +3,1% | 0,29 | −0,26 | ⏸ | ⏸ chưa đủ điều kiện setup |
| TURBO | +33% | +0,07% | +2,8% | 0,27 | −0,27 | ⏸ | ⛔ **đã đủ 2 lệnh mở** |

### 12.4 Bảng tường (khối chẩn đoán lệnh ảo)

Cho coin đang chọn — cho thấy bộ lọc lệnh ảo đang **thật sự** làm gì:

| Giá | Phía | USD | **numOrders** | Tin | Tuổi | Chịu chạm | Khớp thật | **Rút** |
|---|---|---|---|---|---|---|---|---|
| 0,0455 | ASK | $184k | 47 | **88** | 41ph | 3 | 2 | 0 |
| 0,0448 | ASK | $210k | **1** | **22** | 6ph | 0 | 0 | **2** |
| 0,0402 | BID | $95k | 31 | 71 | 28ph | 2 | 1 | 0 |

> Dòng giữa là bức tranh giáo khoa của một bức tường giả: tiền nhiều nhất bảng, **một lệnh duy nhất**, mới 6 phút tuổi, đã rút 2 lần. Điểm tin 22. Bot phải **không** dùng mốc này làm giá vào hay giá chốt.

### 12.5 Yêu cầu kỹ thuật giao diện

- Một file HTML, không framework, không CDN. Tự xuống 1 cột dưới 900px.
- Có nút **DỪNG KHẨN** → ghi `DUNG.flag`; bot thấy file này thì **đóng mọi lệnh và ngừng mở lệnh mới**. Nút này cần backend nhỏ có token, hoặc để chủ dự án tạo file bằng tay — **đừng đặt token vào trang công khai.**
- Mọi giá hiện đủ chữ số có nghĩa (coin có giá từ 0,0000000123 tới 90000).

---

## 13. CƠ SỞ DỮ LIỆU (SQLite)

```sql
-- Mỗi TÍN HIỆU, kể cả tín hiệu bị chặn (đây là nhóm đối chứng)
CREATE TABLE tin_hieu (
  id INTEGER PRIMARY KEY,
  uid TEXT UNIQUE,                -- chống ghi trùng
  ts INTEGER, coin TEXT, huong TEXT,       -- 'short' | 'long'
  setup TEXT,                     -- 'SHORT-A' | 'SHORT-B' | 'LONG-A' | 'LONG-B'
  gia TEXT,                       -- CHUỖI, không phải REAL (xem cảnh báo dưới)
  s REAL, chan INTEGER,           -- bitmask 8.4; chan=0 là tín hiệu thật
  trong_khung INTEGER,            -- ⭐ 0/1 — cột để trả lời câu hỏi khung giờ
  gio_vn INTEGER,                 -- 0..23
  bpr REAL, bfr REAL, ddbi REAL, dbi REAL,
  s_pull REAL, s_flow30 REAL, s_book REAL, s_liq REAL, s_oi REAL, s_fund REAL,
  co_pull INT, co_flow30 INT, co_book INT, co_liq INT, co_oi INT, co_fund INT,  -- NULL≠0
  funding8h REAL, oi_usd REAL, d_oi25 REAL, d_p25 REAL,
  chg24 REAL, chg1h REAL, vol24_usd REAL, tuoi_coin_ngay REAL,
  btc_chg1h REAL, btc_chg24 REAL,
  tuong_tin INTEGER, tuong_n_ord INTEGER, tuong_tuoi_phut REAL,
  tuoi_may_giay INTEGER,          -- warmup — giả thuyết "máy nguội tệ hơn"
  ver_trong_so TEXT               -- hash tự sinh từ mảng tham số
);

CREATE TABLE lenh (
  id INTEGER PRIMARY KEY, uid TEXT UNIQUE, tin_hieu_id INTEGER,
  ts_mo INTEGER, ts_dong INTEGER,
  coin TEXT, huong TEXT, setup TEXT, trang_thai TEXT,
  gia_vao_tb TEXT, gia_cat TEXT, gia_dong TEXT,
  ky_quy_usd REAL, gia_tri_lenh_usd REAL, don_bay INTEGER,
  so_lan_vao INTEGER, so_lan_chot INTEGER,
  pnl_usd REAL, pnl_pc_tk REAL,   -- % TÀI KHOẢN, không phải % ROI
  funding_nhan_usd REAL,          -- tách riêng, nếu không thống kê sai
  phi_usd REAL,
  ly_do_dong TEXT,                -- 'cat_lo'|'tp1'..'tp6'|'co_chot'|'het_gio'|'cau_truc'|'khan'
  r_multiple REAL, baseline REAL, -- mốc so sánh nội tại, xem 16.1
  la_giay INTEGER                 -- 1 = paper, 0 = tiền thật
);

CREATE TABLE lan_vao (               -- từng lần vào/ra, không gộp
  id INTEGER PRIMARY KEY, lenh_id INTEGER, ts INTEGER,
  loai TEXT,                         -- 'vao'|'dca'|'them'|'chot'|'cat'
  gia TEXT, size_usd REAL, ly_do TEXT
);

CREATE TABLE moc_gia (               -- ảnh chụp giá 07:00 hằng ngày (cần cho SHORT-B, LONG-B)
  ngay TEXT, coin TEXT, gia_7h TEXT, chg24_luc_7h REAL, da_tang30_hom_qua INTEGER,
  PRIMARY KEY (ngay, coin)
);

CREATE TABLE su_kien (               -- mọi lượt chuyển trạng thái, kể cả bị từ chối
  id INTEGER PRIMARY KEY, ts INTEGER, coin TEXT,
  tu TEXT, den TEXT, ly_do TEXT, chi_tiet TEXT
);
```

⚠ **Giá lưu dưới dạng TEXT (`toFixed(15)`), không phải REAL.** Coin có giá từ 0,0000000123 tới 90000 — số thực dấu phẩy động sẽ làm tròn mất chữ số có nghĩa, và ký hiệu mũ (`1.23e-8`) làm hỏng cả so sánh lẫn nhập liệu.

⚠ **NULL ≠ 0** ở mọi cột tín hiệu. Dùng cột `co_*` để đánh dấu tín hiệu nào **có dữ liệu**.

---

## 14. ⚠ CHẤM KẾT QUẢ

Mỗi lệnh (kể cả lệnh giấy và tín hiệu bị chặn) chấm **hai lần**:

- `kq` theo quy ước **chạm** (bóng nến tới giá)
- `kq_dong` theo quy ước **đóng nến vượt hẳn**

Cả hai áp **cùng một cách** cho chốt lời lẫn cắt lỗ. Siết một đầu là tự làm đẹp số.

**Chênh lệch giữa hai con số là thước đo độ nhạy: quá 5 điểm phần trăm nghĩa là kết luận phụ thuộc quy ước chấm chứ không phụ thuộc máy** — và khi đó không được kết luận gì. Ở dự án cũ, chênh lệch là **11,5 điểm**, gấp đôi ngưỡng.

**Cả TP lẫn SL rơi vào cùng một cây nến ⇒ kết quả riêng `nhap_nhang`, KHÔNG được ném bỏ.** Ném bỏ làm lệch số **lên**, vì nến biến động mạnh thường quét stop trước rồi mới chạy.

---

## 15. CHẾ ĐỘ CHẠY & AN TOÀN

### 15.1 Ba chế độ — chỉ tiến theo thứ tự

| Chế độ | Làm gì | Điều kiện để lên chế độ sau |
|---|---|---|
| **`giay`** (mặc định) | Ghi lệnh vào DB, không gọi API đặt lệnh | **≥ 200 lệnh giấy** + tự tay đọc lại 20 lệnh xem bot có làm đúng ý mình không |
| **`nho`** | Tiền thật, ký quỹ giới hạn **1%/lệnh** | ≥ 100 lệnh thật, kết quả không mâu thuẫn lệnh giấy |
| **`day`** | Theo mục 10 | — |

Bot **khởi động ở `giay`** mỗi lần chạy. Muốn chế độ khác phải sửa `config.js` **và** tạo file `TOI-HIEU-RUI-RO.flag` bằng tay. Hai bước, có chủ đích.

### 15.2 Ngắt mạch tự động — bot tự dừng

⚠ **"Ngừng" ở bảng này luôn có nghĩa là NGỪNG MỞ LỆNH MỚI.** Không có ngắt mạch nào được tự đóng lệnh đang chạy — xem mục 10.4bis. Ngoại lệ duy nhất là `DUNG.flag`, vì đó là chủ dự án tự bấm.

| Điều kiện | Hành động |
|---|---|
| Lỗ **2 lệnh liên tiếp** | Ngừng **mở lệnh mới** hết ngày. Lệnh đang chạy giữ nguyên |
| Lỗ **> 15% tài khoản** trong 24h | Ngừng **mở lệnh mới**, cần khởi động lại bằng tay. Lệnh đang chạy giữ nguyên |
| Mất WebSocket > 60s khi có lệnh mở | Cảnh báo đỏ; **KHÔNG tự đóng lệnh** (mù dữ liệu thì đóng bừa còn tệ hơn). Cắt lỗ `trigger` phía sàn vẫn sống |
| Giá OKX lệch giá tham chiếu > 5% | Ngừng **mở lệnh mới**, nghi feed hỏng |
| Sai lệch số dư giữa bot và sàn > 1% | Ngừng **mở lệnh mới** ngay — dấu hiệu bot và sàn **đang nghĩ khác nhau** |
| File `DUNG.flag` tồn tại | **Đóng mọi lệnh** + ngừng. ← đường **duy nhất** đóng lệnh ngoài cắt lỗ và thang chốt lời, và nó do người bấm |

### 15.3 Khóa API

- Đọc từ **biến môi trường** hoặc `config.local.js` — file này nằm trong `.gitignore` **trước khi** viết khóa vào.
- Khóa OKX **chỉ bật quyền Trade. TUYỆT ĐỐI KHÔNG bật quyền Withdraw.**
- Bật **giới hạn IP** trên trang quản lý khóa của OKX.
- Trước mỗi commit: `grep -rln '<mấy ký tự đầu của khóa>' . --exclude-dir=.git`

> Dự án cũ **đã bị lộ token một lần** theo đúng kịch bản này: một phiên làm việc song song commit file khi token còn nằm trong đó, thay đổi gỡ token ra diễn ra *sau*. Không ai làm sai rõ ràng — chỉ là hai việc đúng làm sai thứ tự.

### 15.4 Chống lệnh chờ không khớp

Dự án cũ có **21% lệnh chờ không bao giờ khớp** vì đặt ở tường quá xa giá, kèm thiên lệch sống sót nghiêm trọng — **đọc mục 3.6 trước**. Ở bot này:

- Lệnh vào: **`market`** hoặc **`limit` cách giá ≤ 0,15%** kèm `IOC`. LONG khớp ở **best ask**, SHORT khớp ở **best bid**. **Tuyệt đối không đặt lệnh chờ ở tường** (bất biến 8, mục 11.3).
- Nếu `IOC` không khớp hết trong 3 lần thử → **bỏ lệnh, ghi `su_kien`, về `SAN`**. Không đuổi giá.
- Lệnh chốt lời: `limit` ở mốc thang 10.5, **lùi vào trong 1 bước giá** so với tường (đứng **trước** tường, không đứng sau).
- Lệnh cắt lỗ: `trigger` phía sàn (`ordType=conditional`) — sống sót kể cả khi bot chết. **Đây là điểm bắt buộc**: nếu cắt lỗ chỉ nằm trong RAM của bot thì bot chết = không có cắt lỗ.

---

## 16. ĐO LƯỜNG

### 16.1 Không bao giờ báo cáo tỷ lệ thắng trần trụi

**Mốc so sánh đúng là baseline nội tại, không phải 50%:**

```js
baseline = d_cat / (d_chot + d_cat)   // d = khoảng cách từ giá vào tới mốc đó
```

Với giá đi ngẫu nhiên không xu hướng, đây **chính là** xác suất chạm chốt lời trước. Thắng 60% khi baseline là 65% nghĩa là bot **tệ hơn tung đồng xu**.

Mọi báo cáo bắt buộc có: `n` · thắng% · baseline% · **hiệu số** · Wilson 95% · tổng R · R/lệnh.

**Cỡ mẫu:** phân biệt 55% với 50% cần **~780 lệnh độc lập**. Dưới 100 thì chỉ được kiểm **lỗi thô** (bao nhiêu % lệnh có R:R < 1, bao nhiêu sinh khi máy nguội), **tuyệt đối không chỉnh trọng số**.

> Vòng lặp "chỉnh trọng số sau vài chục kèo" chính là thứ đã đẻ ra 4 chốt chặn ở dự án cũ — mà giờ chính chúng đang bị nghi là **cắt mất lệnh thắng**.

### 16.2 ⭐ Phép thử khung giờ — lý do tồn tại của cột `trong_khung`

Đây là câu hỏi lớn nhất của cả dự án, và cách duy nhất để trả lời:

```sql
SELECT trong_khung, COUNT(*) n,
       AVG(kq='thang')*100 AS thang_pc,
       AVG(baseline)*100   AS baseline_pc,
       AVG(kq='thang')*100 - AVG(baseline)*100 AS hon_ngau_nhien,
       SUM(r_multiple)     AS tong_r
FROM   v_lenh
WHERE  chan & ~16 = 0        -- bỏ qua đúng bit "ngoài khung", giữ mọi chốt khác
GROUP  BY trong_khung;
```

⭐ **Từ 2026-08-12 phép thử này MẠNH HƠN HẲN.** Trước đây cổng khung giờ chặn thật, nên nhóm "ngoài khung" chỉ có **tín hiệu** chứ không bao giờ thành **lệnh** — không có thắng/thua để so, chỉ so được `S` và `BPR` trung bình. Nay bot chạy 24/24, **cả hai nhóm đều là lệnh thật có PnL**, nên truy vấn trên mới thực sự chạy được.

Điều kiện bắt buộc để phép thử có nghĩa: cột `trong_khung` phải được ghi **đúng** ở cả bảng `tin_hieu` **và** bảng `lenh`. Bản trước ghi cứng `true` ở bảng `lenh` khiến nhóm "ngoài khung" luôn rỗng — đã sửa cùng ngày.

| Kết quả | Kết luận |
|---|---|
| Trong khung **hơn** ngoài khung, hiệu số > sai số ở n ≥ 300 | Khung giờ có thật **trong tập con này** → cân nhắc **bật lại** cổng |
| Hai nhóm ngang nhau | Khung giờ chỉ **giảm số lệnh**, không tăng chất lượng → **giữ nguyên 24/24** |
| Trong khung **kém hơn** | Cổng cũ đang cắt mất lệnh tốt → **giữ nguyên 24/24**, ghi kết quả này vào file |

⚠ Đừng đọc bảng này trước **n = 300 mỗi nhóm**. Ở n = 50 nó sẽ cho một con số, con số đó sẽ sai, và bạn sẽ tin nó.

⚠ Thêm một biến cần để ý khi đọc: từ 2026-08-12 nhóm "ngoài khung" **bao gồm cả 04:00–06:00** (vùng cấm cũ). Nếu nhóm ngoài khung kém hơn, phải tách riêng khung giờ đó ra kiểm trước khi kết luận — có thể đó là **thanh khoản**, không phải **hướng**:

```sql
SELECT gio_vn, COUNT(*) n, AVG(r_multiple) r_tb, AVG(truot_usd) truot_tb
FROM lenh WHERE ts_dong IS NOT NULL GROUP BY gio_vn ORDER BY gio_vn;
```

`truot_tb` cao bất thường ở 04:00–06:00 = vấn đề khớp lệnh, khác hẳn "giờ đó đoán sai hướng".

### 16.3 Trang báo cáo

Một trang HTML đọc SQLite qua backend nhỏ. Không có nó thì DB chỉ là **cái hố ghi** — không có vòng phản hồi nào cả. Tối thiểu: bảng theo `setup`, theo `trong_khung`, theo `gio_vn`, theo `chan`, theo `tuoi_may_giay`, và đường cong vốn.

---

## 17. LỘ TRÌNH XÂY DỰNG

Làm đúng thứ tự. **Mỗi giai đoạn phải chạy được và kiểm chứng được trước khi sang giai đoạn sau.**

| GĐ | Nội dung | Xong khi |
|---|---|---|
| **0** | Khung dự án · `config.js` · SQLite · logger · `.gitignore` **trước khi** có khóa nào | `npm start` chạy, tạo DB, in dòng sức khỏe |
| **1** | WS `books` + `trades` cho 1 coin cứng · `aggregate()` · **tách 2 loại sổ** · phân tích `numOrders` | In ra sổ 10 mức + `numOrders` mỗi 2s, khớp với web OKX |
| **2** | **`wallBook` + `updateWalls` + `wallTrust`** · in bảng tường | Xem 30 phút thấy `pl`/`fl`/`sv` nhích đúng. **Đây là tầng quan trọng nhất — đừng vội** |
| **3** | Tín hiệu dẫn `BPR`/`BFR`/`DBI`/`dDBI` · cò `coSHORT`/`coLONG`/`coCHOT` | Cò nổ đúng chỗ khi xem lại chart bằng mắt |
| **4** | WS `open-interest` + `liquidation-orders` · REST funding (**tự tính chu kỳ**) · `listTime` + `ctVal` | Đủ 6 tín hiệu nền, `S` tính ra |
| **5** | Máy quét · `LOC_COIN` (số coin động) · hai lớp trễ + trần gỡ · gom `subscribe` · `ghim.txt` | Coin đi ngang bị loại, coin xoay đúng, có lệnh mở thì không bị gỡ, không bão `subscribe` |
| **6** | Chọn setup 24/24 · bảng `moc_gia` (ảnh 07:00) · bitmask `chan` **có ghi cả tín hiệu bị chặn** | `tin_hieu` có cả `chan=0` lẫn `chan≠0` |
| **7** | **Máy trạng thái + quản lý vốn** · `CONG_THANH_LY` · 5 bất biến ở mục 11 kèm test | Test tự động phủ đủ 5 bất biến, **chạy chế độ `giay`** |
| **8** | `trangthai.json` + giao diện (12.1–12.4) | Mở trang thấy đúng số bot in ra log |
| **9** | Bộ chấm 2 quy ước · trang báo cáo · truy vấn 16.2 | Có số để đọc |
| **10** | Đặt lệnh thật OKX · cắt lỗ `trigger` phía sàn · ngắt mạch · đối soát số dư | **Chỉ sau ≥ 200 lệnh giấy** |

---

## 18. BẪY ĐÃ BIẾT — đừng dẫm lại

Tất cả đều **đã tốn công phát hiện** ở dự án cũ:

| Bẫy | Hậu quả |
|---|---|
| **OKX tính khối lượng theo HỢP ĐỒNG** | Quên nhân `ctVal` → sai số **hàng nghìn lần** |
| **Chu kỳ funding không phải lúc nào cũng 8h** | Nhiều coin meme là 4h/2h/1h. Phải tự tính từ `prevFundingTime`/`fundingTime` rồi quy về /8h **trước khi so sánh** |
| **Lấy mẫu lịch sử phải duyệt NGƯỢC từ cuối mảng** | `find()` từ đầu lấy nhầm phần tử cũ nhất (2–4 giờ) → lệch cả tín hiệu OI |
| **Phân trang nến bằng `before`+`limit=300`** | Khoảng > 300 nến thì OKX trả 300 cây **mới nhất**, thủng đoạn giữa **không báo lỗi**. Phải phân trang lùi bằng `after` |
| **Bước giá đổi làm bucket "đổi tên"** | Tường không hề rút nhưng khóa cũ biến mất → phạt oan. Kiểm vùng ±1.5×step còn ≥40% tiền thì xóa lặng lẽ |
| **Socket còn `pong` nhưng kênh `books` đã im** | Sổ **ĐÓNG BĂNG** mà nhãn vẫn `live`, rồi `wallTrust` càng cộng điểm vì tường "sống lâu" → bot sinh lệnh từ sổ hàng giờ trước. **Phải tách `lastData` khỏi `lastMsg`** |
| **`mid` gộp nhiều sàn KHÔNG giao dịch được** | Là composite, có thể cho spread âm. Đừng dùng làm giá vào/ra rồi gọi kết quả là lợi nhuận |
| **Bot chết là hỏng IM LẶNG** | Trang vẫn vẽ thẻ cũ, người xem tưởng thị trường yên. Luôn hiện tuổi ảnh + cron tự bật lại |
| **Cộng dồn dòng tiền CÓ DẤU** | `f30 = 0` lẫn lộn "chợ chết" với "hai phe đánh nhau ngang cơ" |
| **Độ phủ sổ giữa các sàn khác nhau** | Binance 20 mức vs OKX 400 → bitmask `ex` ở mốc xa **luôn** thiếu Binance. Đừng đọc "⚠1 sàn" ở mốc xa như bằng chứng tường giả |

---

## 19. CẤU HÌNH MẪU (`config.js`)

```js
module.exports = {
  CHE_DO: 'giay',                    // 'giay' | 'nho' | 'day'
  SAN: 'okx',
  KY_QUY: 'cheo',
  DON_BAY: 10,

  SO_COIN_TRAN:       20,            // VAN AN TOÀN — số coin thật do LOC_COIN quyết
  SO_LENH_MO_TOI_DA:  3,             // ⛔ cần gạt RỦI RO — KHÔNG nới theo coin
  DEM_THANH_LY_TOI_THIEU: 2.0,       // khoảng cách cháy >= 2× khoảng cắt lỗ

  // Rải lệnh — % TÀI KHOẢN, không phải % ROI
  KY_QUY_THAM_DO: 0.03,
  KY_QUY_DCA:     0.03,
  TRAN_KHI_LO:    0.06,              // ⛔ bất biến, không cờ nào tắt được
  KY_QUY_TOI_DA:  0.12,

  // Cắt lỗ — MỖI COIN một mức riêng, % GIÁ (không phải % ROI, không phải mức tổng)
  CAT_LO: 0.22,                      // 0.20–0.25

  // Chốt lời — THANG làm chủ, tường chỉ tinh chỉnh trong ±1,5% (xem 10.5.1)
  TP_TOI_THIEU:  0.05,               // ⛔ sàn cứng. KHÔNG mốc nào gần hơn 5%
  TP_LECH_TUONG: 0.015,              // tường chỉ được dịch giá trong ±1,5% quanh mốc thang
  TP_TIN_TUONG_MIN: 55,              // tường dưới điểm tin này thì bỏ qua, dùng mốc thô
  NG_RR: 1.2,                        // cổng R:R tính bằng % TÀI KHOẢN, không phải % giá

  THANG_CHOT: [                      // [ %giá đã chạy, %chốt, cắt-lời-mới ]
    [0.05, 0.00, 'hoa_von'],
    [0.10, 0.33, 0.02],
    [0.20, 0.33, 0.11],
    [0.30, 0.00, 0.22],
    [0.40, 0.00, 0.33],
    [0.50, 0.00, 'cach_5pc'],
  ],
  // ⛔ TUYỆT ĐỐI KHÔNG dùng bestWall(...,cap,...) của code cũ để chọn mốc chốt lời.
  //    cap ~3% + CAT_LO 22% => cần thắng 88% mới hòa vốn. Xem mục 3.5.

  // Cò tín hiệu dẫn
  NG_BPR: 0.25,
  TY_LE_PULL_TREN_FILL: 2.0,         // BPR >= 2×BFR — điều kiện "bắt trước"
  NG_DBI: -0.25,
  CUA_SO_PULL_GIAY: 300,
  SAT_DINH_TOI_DA: 0.015,            // giá còn trong 1.5% của đỉnh

  // Cổng coin
  TUOI_COIN_TOI_THIEU_NGAY: 7,
  VOL24_TOI_THIEU_USD: 20e6,
  WARMUP_GIAY: 300,                  // 300, không phải 90 — xem 3.3

  // ⭐ 24/24 — `khungGoc` KHÔNG chặn gì, chỉ để ghi cột `trong_khung`
  SETUP: {
    'SHORT-A': { huong: 'short', chg24Min: 0.30, fundingMin: 0.0005,
                 khungGoc: { tu: '23:00', den: '03:00' } },
    'SHORT-B': { huong: 'short', tangThemMin: 0.10, fundingMin: 0.0005,
                 khungGoc: { tu: '07:00', den: '15:00' } },
    'LONG-A':  { huong: 'long',  chg24: [0.10, 0.15], fundingMax: 0.0003,
                 khungGoc: { tu: '18:00', den: '22:30' } },
    'LONG-B':  { huong: 'long',  chg24Max: -0.15, fundingMax: 0.00005,
                 khungGoc: { tu: '06:30', den: '09:00' } },
  },
  // KHÔNG còn KHUNG_CAM / GIU_VUNG_CAM / BO_CONG_KHUNG_GIO — đã xoá hẳn

  NGAT_MACH: {
    thuaLienTiep: 2,
    loNgayToiDa: 0.15,
    lechSoDuToiDa: 0.01,
  },

  // Chống nhấp nháy + đóng băng kế hoạch giá (mục 11.2)
  XAC_NHAN_TICK:     15,             // 15 nhịp × 2s = 30s cò phải nổ LIÊN TỤC mới hiện
  NGUONG_VAO:        25,             // |S| để hiện lần đầu
  NGUONG_DAO:        40,             // |S| để ĐẢO hướng — bất đối xứng, cố ý
  KHOA_HUONG_PHUT:   30,             // cùng coin: không đổi hướng trong 30 phút
  NGUOI_LANH_PHUT:   15,             // tín hiệu chết → cùng coin+hướng chờ 15 phút
  TROI_TOI_DA:       0.015,          // giá trôi > 1,5% → tính lại tại chỗ + gắn nhãn 🔄
  // ⛔ KHÔNG có HAN_CHO_VAO. Kế hoạch không hết hạn theo giờ — xem 10.4bis + 11.2B.
  //    Nó chỉ chết khi giá vượt qua điểm cắt.

  // ⛔ ĐƯỜNG RA CỦA LỆNH ĐÃ MỞ — mục 10.4bis. Đây là bất biến, KHÔNG phải tùy chọn.
  DONG_VI_HET_GIO:      false,       // ⛔ phải là false
  DONG_VI_CAU_TRUC:     false,       // ⛔ phải là false
  DONG_VI_FUNDING_DAO:  false,       // ⛔ phải là false
  DONG_VI_TIN_HIEU_NGUOC: false,     // ⛔ phải là false
  // Bốn cờ trên tồn tại để test tự động kiểm chúng = false, và để đo đối chứng
  // bằng SQL về sau (mục 16). KHÔNG bật cái nào trong lúc chạy thật.
  CO_CHOT_CHI_KHI_LAI:  true,        // ⛔ phải là true — coCHOT là cò CHỐT LỜI

  // Đặt lệnh (mục 3.6 + 15.4)
  VAO_BANG_GIA_HIEN_TAI: true,       // ⛔ bất biến. Tường KHÔNG quyết định giá vào
  LECH_VAO_TOI_DA:   0.0015,         // limit IOC cách giá thị trường tối đa 0,15%
  SO_LAN_THU_IOC:    3,              // không khớp sau 3 lần → bỏ, không đuổi giá

  NGUONG_GHI:  15,                   // < NGUONG_VAO — cố ý, để có nhóm đối chứng
};
```

---

## 20. NHẬT KÝ THAY ĐỔI

| Ngày | Việc | Lý do |
|---|---|---|
| 2026-08-11 | Viết đặc tả v1 | Chuyển chiến lược tay của chủ dự án thành hệ thống đo được. Mang sang hạ tầng đã kiểm chứng của `so-lenh`, **không** mang sang trọng số chưa chứng minh |
| 2026-08-11 | **v1.1 — hai làm rõ của chủ dự án** | (a) Cắt lỗ 22–25% là mức **của từng coin**, không phải mức tổng → mục 10.4 viết lại kèm bảng cộng dồn. (b) Chủ dự án phát hiện **giá chốt lời của code cũ quá bé** → thêm mục **3.5** (cấm kế thừa `bestWall`+`cap`), mục **10.5.1** (sàn cứng 5% · thang làm chủ · cổng R:R theo % tài khoản), và 4 tham số mới trong `config.js`. Đây là sửa chữa **quan trọng nhất** của v1.1: R:R cũ 0,14 đòi thắng 88% mới hòa vốn |

| 2026-08-11 | **v1.2 — ba làm rõ của chủ dự án** | (a) Xác nhận khoảng cách vào→chốt đã đủ xa sau v1.1. (b) *"Đang LONG vài phút sau thành SHORT"* → thêm mục **11.2A** khóa hướng (xác nhận 15 nhịp · ngưỡng đảo bất đối xứng 25/40 · khóa hướng 30 phút · nguội 15 phút) và **11.2B** đóng băng kế hoạch giá. (c) *"Giá vào phải là giá hiện tại, không phải như code cũ"* → thêm mục **3.6**: tường KHÔNG quyết định giá vào, chỉ quyết định giá ra. Ghi rõ **thiên lệch sống sót** của lệnh chờ — lỗi này làm hỏng cả tập dữ liệu chứ không chỉ vài lệnh. Thêm bất biến 6·7·8 và 10 tham số config |

| 2026-08-11 | **v1.3 — "lệnh không được tự tắt"** | Chủ dự án chốt: **lệnh đã mở chỉ đóng vì cắt lỗ 22–25% của chính coin đó, hoặc thang chốt lời.** Thêm mục **10.4bis**; **bỏ** cắt lỗ theo thời gian (15:00) và thoát theo cấu trúc — cả hai thành **cảnh báo trên màn hình**. Bỏ `HAN_CHO_VAO` (kế hoạch không hết hạn theo giờ). `coCHOT` bị chặn chỉ nổ khi đang lãi. Ngắt mạch 15.2 làm rõ chỉ ngừng **mở lệnh mới**. Thêm bất biến 9·10·11 + 5 cờ phải là `false`/`true`. Giá phải trả đã ghi rõ: ngưỡng hòa vốn 32% → **35%** |

| 2026-08-11 | **v1.4 — đã CODE và chạy thật** | Giai đoạn 0→9 xong: `lib/{log,db,okx-rest,okx-ws,tuong,tinhieu,khung,lenh}.js` · `bot.js` · `web/index.html` · `test/bat-bien.js` (**71/71 đạt**) · `cong-cu/bao-cao.js`. Chạy thật 5 phút trên 3 coin: sổ live, `numOrders` thu được (171/54/111…), `wallTrust` chạy, `BPR=0,228` bắt được tường bị rút, DB ghi đủ. **Phát hiện mới → mục 3.4bis: `books` trả `checksum=0` ở mọi gói**, phải thay bằng canh sổ bắt chéo + đồng bộ 30 phút. Chế độ `giay`; tầng đặt lệnh thật (GĐ 10) chưa viết |

| 2026-08-11 | **v1.5 — phí · trượt giá · funding, CỐ Ý BI QUAN** | Chủ dự án yêu cầu: *"phí cao hơn sàn, trượt giá cũng thế, funding cũng thế, không được ít hơn, để dữ liệu chuẩn hơn"*. Thêm mục **10.5.3**. `_khop()` mô phỏng khớp qua sổ **đã chiết khấu theo `wallTrust`** (giả định lệnh ảo biến mất trước khi mình khớp tới), trượt ×1,5 + sàn cứng 0,05%, phí 0,06% mọi lần khớp kể cả maker, funding nhận ×0,7 / trả ×1,3. PnL ròng trừ phí; trượt nằm sẵn trong giá khớp nên **không trừ hai lần**. Thêm cột `truot_usd`, `gia_goc`, `truot_pc` + migration `themCot()`. **93/93 test đạt** |

| 2026-08-11 | **v1.6 — lưu trữ chuyển sang MySQL, bỏ hẳn SQLite** | Bot phải chạy 24/24 trên server để bắt khung 23:00–03:00. `lib/db.js` viết lại: **hàng đợi ghi có thử lại** (rớt MySQL không làm mất tín hiệu; tràn thì kêu to chứ không im lặng vứt), **id sinh phía bot** (giữ hợp đồng hàm đồng bộ), **đệm đọc** cho `docMocGia`/`demLenhHomNay`/`thuaLienTiep`. Ảnh trạng thái ghi thẳng vào **thư mục gốc web** → không cổng, không reverse proxy, không PHP. Thêm `config.local.mau.js`, `server/chay.sh`+`dung.sh`+`TRIEN-KHAI.md`. **112/112 test đạt** |

| 2026-08-11 | **v1.7 — chốt cơ chế tiền + gỡ số cứng** | (a) Vốn **$200** · vào **$6×10** · DCA **$4×10 đúng 1 lần và phải CÓ CĂN CỨ** (rào chắn ≥45 phút, đo bằng `raoChan()` mới trong `tuong.js`) · cắt lỗ **theo SỐ TIỀN −$20/−$25** thay vì % giá. (b) **Bỏ hẳn thang chốt lời**, thay bằng **đỉnh lãi + gài báo động + hồi lại** với ngưỡng `min(max(5, 25%×đỉnh), 50%×đỉnh)`. Cò đảo chiều thêm vế **lệnh ảo**. (c) `CHO_AM_VON` cho test dài, chỉ hiệu lực ở chế độ giấy, vẫn ghi **"cháy lý thuyết"**. (d) **Gỡ toàn bộ số cứng** → 6 nhóm mới trong `config.js`, kèm test quét mã nguồn. Bỏ `baseline`/R:R → thước đo là **R-multiple**. **151/151 test đạt** |

| 2026-08-12 | **v1.8 — chạy thật trên server + MỞ 24/24** | Triển khai xong: `~/bot-coin`, MySQL `buwsofujhosting_coin_db_v1`, web `k7m2coin.hiteckqualityconstruction.com.au`, cron mỗi phút. Rồi chủ dự án chốt **bỏ ràng buộc giờ**: cờ `BO_CONG_KHUNG_GIO` mở 24/24, **giữ nguyên điều kiện COIN** của cả 4 setup; máy quét ưu tiên cả 4 thay vì chỉ setup trùng giờ; nhãn "ngoài khung giờ" không còn hiện như lý do chặn. `trong_khung` giữ nguyên → **phép thử khung giờ mạnh hơn**: trước đây nhóm ngoài khung bị chặn nên không có kết quả để so, giờ cả hai nhóm đều là lệnh thật. Hai lỗi triển khai đã sửa: `chay.sh` không dò Node ở `$HOME/node-v*`; log ghi hai lần do `chay.sh` đổ stdout vào chính file mà `log.js` đang ghi. **163/163 đạt** |

| 2026-08-12 | **v1.9 — BỎ HẲN KHUNG GIỜ, chạy 24/24 tuyệt đối** | Chủ dự án chốt mở cả ngày. Xoá khỏi mã nguồn: `KHUNG_CAM` · `GIU_VUNG_CAM` · `BO_CONG_KHUNG_GIO` · `trongVungCam()` · `uuTien` (code chết — tính ra nhưng không ai đọc) · cảnh báo `HẾT KHUNG` · `CANH_BAO.HET_KHUNG_GIO_VN`. `KHUNG_GIO_VN` → **`SETUP`**, tách `khungGoc` để thấy rõ nó chỉ còn là **NHÃN**. ⛔ **Điều kiện COIN của 4 setup giữ nguyên 100%.** Ba lỗi phát hiện khi rà và sửa kèm: (a) bảng `lenh` **ghi cứng `trong_khung: true`** → nhóm "ngoài khung" luôn rỗng, phép thử ở 16.2 vô hiệu; (b) `docMocGia` đọc mốc **đúng-ngày-hôm-nay** mà mốc chỉ chụp lúc 07:00 → **SHORT-B chết 00:00–07:00**, nay lấy **mốc gần nhất** (`MAX(ngay)` mỗi coin); (c) LONG-B **fail-open** khi thiếu mốc → mỗi đêm mất chốt chặn "hôm trước vừa pump", nay **fail-closed**. Gỡ nốt 3 số cứng còn sót. **178/178 đạt** |

---

## 21. BẢY ĐIỀU NHỚ TRÊN HẾT

1. **Bộ lọc lệnh ảo (mục 7) là lý do bot này tồn tại.** Không có nó, đây chỉ là một bot đọc %24h như mọi bot khác. Đừng vội qua Giai đoạn 2.

2. **Khung giờ KHÔNG BAO GIỜ là TÍN HIỆU** (mục 3.1) — và từ v1.9 nó cũng **không còn là CỔNG**: bot chạy 24/24 tuyệt đối. Thứ còn lại là **NHÃN** `trong_khung`, phải ghi đúng ở cả `tin_hieu` lẫn `lenh`, nếu không sẽ không bao giờ biết chiến lược khung giờ có thật hay không — và đó là câu hỏi đắt giá nhất của cả dự án.

3. **`TRAN_KHI_LO = 6%` là bất biến, không phải tham số.** Nó là thứ hạ ngưỡng hòa vốn từ 42% xuống 32%. Mọi tính năng khác có thể tắt; cái này thì không.

4. **Thang chốt lời làm chủ, tường chỉ tinh chỉnh** (mục 3.5 + 10.5.1). Kế thừa `bestWall`+`cap` của code cũ là ghép một cỗ máy scalp 3% vào một chiến lược cắt lỗ 22% — cần thắng **88%** mới hòa vốn. Sàn cứng `TP_TOI_THIEU = 5%` và cổng `NG_RR` đo bằng **% tài khoản** là hai thứ chặn lỗi đó.

5. ⛔ **KHÔNG VIẾT SỐ CỨNG.** Mọi tham số quyết định nằm trong `config.js` theo 6 nhóm (`TUONG`, `TIN_HIEU`, `QUET`, `DCA`, `CANH_BAO`, `HA_TANG`). Số rải trong code thì không ai chỉnh được, và tệ hơn — không ai **biết** là có thể chỉnh. Test `KHÔNG SỐ CỨNG` quét mã nguồn để giữ luật này.

6. ⛔ **Lệnh đã mở KHÔNG BAO GIỜ tự tắt** (mục 10.4bis). Đúng ba đường ra: cắt lỗ 22–25% của chính coin đó · thang chốt lời · người bấm DỪNG KHẨN. Mọi tín hiệu xấu khác chỉ được **vẽ ⚠**, không được `dongLenh()`. Và một dòng đang hiện thì **cập nhật tại chỗ**, không bao giờ biến mất rồi hiện lại.

7. **Tường quyết định giá RA, không quyết định giá VÀO** (mục 3.6), và **kế hoạch giá phải ĐÓNG BĂNG** (mục 11.2). Hai lỗi này của code cũ không chỉ làm app khó dùng — chúng làm **hỏng dữ liệu**: lệnh chờ ở tường sinh thiên lệch sống sót, còn số trôi liên tục thì không đối chiếu được lệnh thật với tín hiệu đã ghi. Sửa xong hai cái này thì mọi thống kê về sau mới có nghĩa.

*Tài liệu này mô tả một công cụ quan sát và ra quyết định. Nó không phải khuyến nghị đầu tư, và không có phần nào trong đây hứa hẹn lợi nhuận.*
