# HƯỚNG DẪN CHẠY

⚠ **Bot chạy TRÊN SERVER, không chạy ở máy cá nhân** — MySQL của hosting chỉ nghe `localhost`.
Các bước đưa lên: **[server/TRIEN-KHAI.md](server/TRIEN-KHAI.md)**

## Chạy (trên server)

```bash
cd ~/bot-coin && ./server/chay.sh
```

Mở **https://k7m2coin.hiteckqualityconstruction.com.au**

Dừng: `./server/dung.sh`. **Lệnh đang mở KHÔNG bị đóng khi tắt bot** (đúng luật mục 10.4bis).

## Kiểm bất biến — chạy TRƯỚC mỗi lần sửa code

```bash
npm test
```

178 phép kiểm. **Đỏ thì đừng chạy bot.** Mỗi bất biến ở đó tương ứng một cách làm cháy tài khoản đã biết.

## Đọc số

```bash
npm run bao-cao
```

## Ghim coin

Tạo `ghim.txt`, mỗi dòng một mã. Bot đọc lại sau 30 giây, **không cần khởi động lại**. Coin đã ghim không bao giờ bị máy quét gỡ.

```
PEPE
WIF
```

## DỪNG KHẨN

```bash
echo x > DUNG.flag
```

Bot **đóng mọi lệnh** và ngừng mở lệnh mới. Đây là đường ra thứ ba duy nhất ngoài cắt lỗ và thang chốt lời — và chỉ người mới bấm được. Xoá file để chạy lại.

---

## Trạng thái hiện tại

| | |
|---|---|
| Chế độ | **`giay`** — ghi lệnh vào DB, **không đặt lệnh thật**, không cần API key |
| Vốn | **$200** (`config.js` → `VON`) · vào $6×10 · DCA $4×10 một lần |
| Coin theo dõi | **không cố định** — coin nào có xu hướng thì theo, coin đi ngang bị loại. Trần an toàn 20 |
| Lệnh mở cùng lúc | **3** — ⛔ đây mới là con số ăn tiền, không nới theo số coin |
| Đòn bẩy | x10 · ký quỹ chéo |
| Cắt lỗ | **−$20 đến −$25** mỗi coin (theo tiền, không theo % giá) |
| Phí + trượt | tính **xấu hơn sàn thật** — xem mục dưới |
| Dữ liệu | **MySQL** `buwsofujhosting_coin_db_v1` · log ở `du-lieu/bot.log` |

**Bot luôn khởi động ở chế độ `giay`.** Muốn tiền thật phải làm HAI việc: sửa `CHE_DO` trong `config.js` **và** tạo file `TOI-HIEU-RUI-RO.flag`. Hai bước, cố ý. Tầng đặt lệnh thật (Giai đoạn 10 của XAY-BOT.md) **chưa viết** — hiện đổi cờ cũng chỉ chạy giấy.

---

## Đọc màn hình

### Thanh trên cùng
Nếu **cả thanh đỏ** = tuổi ảnh > 30 giây = **bot có thể đã chết**. Bot chết là hỏng im lặng: trang vẫn vẽ số cũ, trông như thị trường đang yên.

Cột **cháy khi ngược**: khoảng cách tới thanh lý của cả danh mục. Dưới 40% là đỏ. Ký quỹ chéo dùng chung một túi tiền — 3 lệnh full size đẩy điểm cháy về ~36%, tức gần trùng mức cắt lỗ.

### Bảng lệnh đang mở

| Dấu | Nghĩa |
|---|---|
| 🔒 (đầu dòng) | Kế hoạch **đóng băng** — số không đổi, cứ thế mà đặt lệnh |
| 🔒 (ô cắt lỗ) | Đã kéo về hoà vốn, lệnh không thể lỗ nữa |
| ✅ (ô TP) | Mốc đã chốt |
| ⚠ | **Có cảnh báo nhưng lệnh VẪN GIỮ** |

Bốn cảnh báo `FUNDING ĐẢO` · `RÀO CHẮN MỎNG` · `BÁO ĐỘNG` · `GẦN ĐIỂM CHÁY` **chỉ để bạn nhìn**. Bot không tự đóng vì bất kỳ cái nào. Chúng là thứ bạn dùng để quyết định đóng tay.

*(`HẾT KHUNG` đã bỏ cùng lúc bỏ khung giờ — chạy 24/24 thì không có "hết khung" để cảnh báo.)*

### Bảng đang theo dõi — cột "Vì sao chưa vào"

Cột quan trọng nhất để gỡ lỗi. Nó luôn nói rõ đang chờ gì:

| Hiện gì | Nghĩa |
|---|---|
| `ấm máy 91/300s` | wallBook chưa đủ tuổi. **Bình thường 5 phút đầu mỗi coin** |
| `chờ cò · BPR 0.09` | Chưa đủ tường bị rút |
| `đang đếm xác nhận 7/15` | Cò đang nổ, cần liên tục 15 nhịp (30 giây) |
| `⛔ funding ÂM — mồi squeeze` | Short đã quá đông, bỏ qua |
| `⛔ OI giảm khi giá tăng` | Squeeze đang chạy, đừng nhảy vào |
| `chưa coin nào đủ điều kiện` | Không setup nào khớp. **Không liên quan giờ giấc** — bot chạy 24/24 |
| `SẴN SÀNG` | Đã dựng kế hoạch, chờ cò bấm nút |

**Hai bảng trống hoàn toàn là bình thường** trong 5 phút đầu, và bình thường cả ngày nếu không coin nào đủ điều kiện. Đọc cột này trước khi nghĩ bot hỏng.

---

## Ba chỉ số cần hiểu

**BPR** — tỷ lệ tường **bị RÚT** trong 5 phút. Market maker rút đỡ giá = cú giảm **chưa** xảy ra.

**BFR** — tỷ lệ tường **bị KHỚP**. Người ta đang bán thật = cú giảm **đã** bắt đầu, bạn muộn rồi.

> Cò SHORT cần **BPR ≥ 0,25 VÀ BPR ≥ 2×BFR VÀ giá còn trong 1,5% của đỉnh**.
> Ba điều kiện đó chính là "bắt trước". Bỏ bất kỳ cái nào là biến nó thành bot vào lệnh muộn.

**tin** (0–100) — độ tin của tường. Chưa biết gì = 30. Chịu được giá chạm +15/lần · bị khớp thật +8/lần · **bị rút nguyên khối −30/lần**. Tiền lớn mà `nOrd=1` bị trừ 15 — một lệnh khổng lồ duy nhất thì rút một cú là sạch.

Ví dụ tường giả điển hình trong bảng tường: *tiền nhiều nhất bảng · `nOrd=1` · mới 6 phút tuổi · đã rút 2 lần · tin 22*. Bot sẽ **không** dùng mốc đó làm giá chốt lời.

---

## Bốn setup — ⭐ CHẠY 24/24, KHÔNG CÒN GIỚI HẠN GIỜ

| Setup | Hướng | Điều kiện coin | Chạy lúc nào |
|---|---|---|---|
| SHORT-A | short | tăng ≥30% · funding ≥ +0,05% · OI tăng | **mọi lúc** |
| SHORT-B | short | đã có cú tăng 30% · tăng **tiếp ≥10%** so với mốc 07:00 gần nhất | **mọi lúc** |
| LONG-A | long | tăng 10–15% · funding **còn thấp** < 0,03% · OI tăng | **mọi lúc** |
| LONG-B | long | giảm ≥15% · không tạo đáy mới ≥2h · OI giảm · hôm trước không pump | **mọi lúc** |

⭐ **Không còn bất kỳ chốt chặn nào theo giờ**, kể cả 04:00–06:00 (vùng cấm cũ đã xoá hẳn). Không có cờ nào để bật/tắt — 24/24 là hành vi cố định.

⛔ **Nhưng điều kiện coin thì giữ nguyên 100%.** Bỏ giới hạn giờ **không phải** nới điều kiện. Vì vậy mở 24/24 **không** làm bot vào lệnh nhiều hơn bao nhiêu — phần lớn thời gian vẫn không coin nào đủ điều kiện. Bảng trống cả ngày vẫn là bình thường.

⚠ **Khung giờ chưa bao giờ là TÍN HIỆU** — nó không cộng một điểm nào vào `S`, và giờ cũng không còn chặn gì.

**Vẫn ghi cột `trong_khung`** cho mọi lệnh (1 = lúc mở đang trùng khung gốc cũ của setup đó). Đây thuần tuý là **nhãn dữ liệu**, không chặn lệnh. Sau ~300 lệnh mỗi nhóm, `npm run bao-cao` trả lời được câu hỏi đắt giá nhất: **khung giờ có thật hay không** — và giờ cả hai nhóm đều là lệnh thật có thắng/thua, nên so sánh mới có nghĩa. Đừng đọc bảng đó trước n=300 — ở n=50 nó sẽ cho một con số, con số đó sẽ sai, và bạn sẽ tin nó.

---

## Tiền vào lệnh — tính bằng ĐÔ

| | |
|---|---|
| Vốn | **$200 cứng** |
| Vào lần 1 | **$6 × 10 = $60** |
| DCA | **$4 × 10 = $40** — ⛔ **đúng một lần** |
| Tối đa | $10 ký quỹ · $100 giá trị lệnh / coin |
| 3 lệnh mở | $300 giá trị lệnh = 150% vốn |

Size **không co giãn theo vốn**. Vốn lên hay xuống thì vẫn $6/$4.

### DCA phải CÓ CĂN CỨ

| | |
|---|---|
| **Hàng rào** *(được phép)* | lỗ trong **$4–$10** · chưa DCA lần nào |
| **Căn cứ** *(lý do bấm nút)* | **rào chắn ≥ 45 phút** + đà đuối + không squeeze |

**Rào chắn** = tiền chắn thật (đã lọc lệnh ảo) giữa giá hiện tại và điểm cắt, chia cho tốc độ dòng tiền. Ra **80 phút** → phải mua liên tục 80 phút mới xuyên tới điểm cắt → an toàn để DCA. Ra **12 phút** → tường mỏng → **không DCA**.

⚠ **Số tiền lỗ KHÔNG BAO GIỜ tự kích hoạt DCA.** Và **phần lớn lệnh thua sẽ không được DCA** — thấy nó hiếm là bộ lọc đang làm việc, không phải hỏng.

## Cắt lỗ — theo SỐ TIỀN

Chạm **−$20** (ôm tới **−$25** chỉ khi rào chắn còn dày). Tính trên **PnL ròng đã trừ phí**.

| | −$20 | −$25 |
|---|---|---|
| Chưa DCA ($60) | giá chạy 33% | 42% |
| Đã DCA ($100) | giá chạy 24% | 29% |

3 lệnh cùng cắt = **−$60 đến −$75 = 30–37,5%** vốn. Điểm cháy ở 66%.

⛔ **Đây là lý do trần lệnh mở đứng yên ở 3 dù bot nhìn 12 coin.** Lỗ đồng thời tối đa tăng thẳng theo số lệnh: 10 lệnh = **−$200 = sạch vốn trong một cú quét**. Và khi alt squeeze thì mọi lệnh short thua *cùng lúc* — 10 lệnh trên 10 coin không phải 10 lệnh, mà là **1 lệnh cỡ 10×**.

## Chốt lời — KHÔNG có mốc cố định

> **Còn xuống mạnh → cứ gồng. Xu hướng đảo sang lên → cắt.**
> Nhưng phải **hồi đủ sâu** mới cắt, không thì một nhịp thở 2 điểm cũng đá bạn ra.

Ba cơ chế:

1. **Lãi vượt đỉnh cũ** → đỉnh lãi cập nhật, **gỡ báo động**, hồi lại về 0
2. **Cò đảo chiều nổ khi đang lãi** → **gài báo động** (nhớ, kể cả sau đó cò tắt)
3. **Đã gài báo động VÀ hồi ≥ ngưỡng** → **CHỐT**

```
ngưỡng hồi = min( max(5 điểm, 25% đỉnh lãi), 50% đỉnh lãi )
```

| Đỉnh lãi | Ngưỡng hồi | Chốt ở | Giữ được |
|---|---|---|---|
| +6% | 3 điểm | +3% | 50% |
| +10% | 5 điểm | +5% | 50% |
| +20% | 5 điểm | +15% | 75% |
| +40% | 10 điểm | +30% | 75% |

**Cò đảo chiều** đọc bằng hai thứ, thấy một là đủ: **lực mua vượt lực bán**, hoặc **tường bán phía trên đang bị RÚT** (kháng cự bốc hơi → giá sắp bật).

⚠ Cò nổ lúc **đang lỗ** thì **không đóng** — gồng tới −$20/−$25.

## Phí · trượt giá · funding — cố ý tính XẤU hơn sàn

Mọi con số PnL bạn thấy **đã trừ phí và trượt giá**, và cả ba đều tính nghiêng về phía bất lợi:

| | Sàn thật | Bot tính |
|---|---|---|
| Phí | taker 0,05% · maker 0,02% | **0,06% mọi lần khớp** |
| Trượt giá | tuỳ sổ | **đo từ sổ rồi ×1,5**, tối thiểu 0,05% |
| Sổ dùng để đo trượt | tiền thật | **tiền × độ tin tường** — giả định lệnh ảo biến mất trước khi mình khớp |
| Funding nhận | 100% | **70%** |
| Funding trả | 100% | **130%** |

**Vì sao:** dữ liệu giấy đẹp hơn thực tế là tự lừa mình. Nếu chạy giấy **vẫn lãi** với bộ số này thì thực tế chỉ có thể tốt hơn.

Quy mô: khoảng **$0,05–0,12 mỗi lệnh** trên tài khoản $100. Ở 200 lệnh/năm là **10–24% vốn/năm** — `npm run bao-cao` in thẳng con số đó ra.

## Muốn chỉnh tham số

**Mọi con số đều ở `config.js`**, không có số nào rải trong code. Sáu nhóm:

| Nhóm | Chứa gì |
|---|---|
| *(gốc)* | Vốn · $6/$4 · cắt lỗ $20/$25 · hồi lại |
| `SETUP` | 4 setup: điều kiện coin + `khungGoc` (**chỉ là nhãn**, không chặn) |
| `TUONG` | Chấm điểm lệnh ảo: +15 sống sót · +8 khớp thật · **−30 bị rút** · `numOrders` |
| `TIN_HIEU` | Trọng số điểm `S` và cách chuẩn hoá |
| `QUET` | Máy quét coin, nến từ chối, chế độ BTC |
| `DCA` | Ba căn cứ để được DCA |
| `CANH_BAO` · `HA_TANG` | Ngưỡng vẽ ⚠ · ping, timeout, hàng đợi |

⚠ **Đừng chỉnh `TUONG` và `TIN_HIEU` trước khi có ≥300 lệnh thật.** Hai nhóm đó chưa từng được kiểm chứng bằng dữ liệu — chỉnh theo cảm giác là đúng cái vòng lặp đã làm hỏng dự án trước.

## Ba việc còn phải làm

1. **Giai đoạn 10 — đặt lệnh thật OKX.** Cần API key (chỉ quyền Trade, **KHÔNG bật Withdraw**, có giới hạn IP), cắt lỗ `trigger` phía sàn để sống sót kể cả khi bot chết, và đối soát số dư. **Chỉ làm sau ≥200 lệnh giấy.**
2. ✅ ~~Chạy 24/24~~ — xong, xem `server/TRIEN-KHAI.md`.
3. **Trang báo cáo web.** Hiện `npm run bao-cao` in ra terminal.

## Bẫy đã xử lý — ghi lại để không dẫm lại

| Bẫy | Xử lý |
|---|---|
| **`books` trả `checksum = 0`** ở mọi gói — đo thực tế trên BTC-USDT-SWAP, 10 gói liên tiếp. OKX **không** cấp checksum cho kênh này; chỉ `books-l2-tbt` (VIP4/5) mới có | Canh **sổ bắt chéo** (best bid ≥ best ask) + đồng bộ lại mỗi 30 phút |
| Socket còn `pong` nhưng kênh `books` đã câm → sổ đóng băng mà nhãn vẫn "live" | Tách `lastData` khỏi `lastMsg`; quá 20 giây không có **gói dữ liệu** thì bỏ qua coin đó |
| `sz` của SWAP tính theo **hợp đồng** | Nhân `ctVal` rồi nhân giá. Quên là sai hàng nghìn lần |
| Chu kỳ funding không phải lúc nào cũng 8h | Tự tính từ `prevFundingTime`/`fundingTime`, quy về mức /8h trước khi so |
| Lấy mẫu "25 phút trước" | Duyệt **ngược** từ cuối mảng |
| Bão đăng ký lại khi sổ hỏng | Chốt 15 giây giữa hai lần `napLai` |
