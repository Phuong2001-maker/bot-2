'use strict';
/* =====================================================================
   CẤU HÌNH — mọi tham số quyết định nằm ở đây, không rải trong code.

   Các dòng có dấu ⛔ là BẤT BIẾN, không phải tùy chọn. Test tự động
   (test/bat-bien.js) sẽ kiểm chúng và fail nếu bị đổi.
   ===================================================================== */

module.exports = {
  /* ---------------- chế độ chạy ---------------- */
  /* ⭐ BA CHẾ ĐỘ, CÙNG MỘT ĐƯỜNG CODE (Giai đoạn 10):
       'giay'  — không gửi gì tới sàn. Vẫn TÍNH đủ lệnh SL và ghi lại để
                 soi. Không cần API key. ⛔ MẶC ĐỊNH.
       'demo'  — gọi API OKX THẬT + header `x-simulated-trading: 1`.
                 Tiền ảo, hạ tầng thật, đường code thật. Cần khoá DEMO.
       'that'  — y hệt 'demo', bỏ mỗi header đó. ⛔ TIỀN THẬT.

     ⛔ Khác 'giay' thì bắt buộc có file `TOI-HIEU-RUI-RO.flag`, nếu không
     bot tự lùi về 'giay' (kiểm ở bot.js). Thiếu khoá cũng lùi về 'giay' —
     chạy thật mà không đặt được SL còn tệ hơn chạy giấy. */
  CHE_DO: 'giay',
  SAN: 'okx',
  KY_QUY: 'cheo',
  DON_BAY: 10,

  /* ================= QUY MÔ — HAI SỐ NÀY KHÔNG LIÊN QUAN NHAU =========
     Trước 2026-08-12 cả hai đều là 3 và bị khoá chung trong MỘT phép kiểm,
     làm như thể chúng là một quyết định. Không phải. Chúng ngược chiều
     nhau về rủi ro và phải chỉnh riêng.                                  */

  /* ⭐ CẦN GẠT LẤY MẪU — nhưng KHÔNG phải bằng một con số.

     Số coin theo dõi là KẾT QUẢ CỦA BỘ LỌC `LOC_COIN`, không phải chỉ
     tiêu đặt trước. Thị trường im thì có thể chỉ 2 coin, thị trường chạy
     thì 15. Con số dưới đây là VAN AN TOÀN cho hạ tầng — bình thường nó
     KHÔNG chạm, và khi nó chạm thì có nghĩa là đang có nhiều cơ hội hơn
     sức máy, chứ không phải "đã theo dõi đủ".

     Vì sao bỏ cách "lấy top N": cách cũ có dòng chốt gán điểm cho MỌI
     coin nên danh sách N LUÔN bị lấp đầy — bot theo dõi coin đi ngang
     chỉ để cho đủ chỗ. Nới N từ 3 lên 12 theo cách đó = thêm 9 coin rác.

     ⛔ ĐÃ BỎ TRẦN ĐẾM (chủ dự án chốt 2026-08-23): trần 20 đang cắt mất
     cơ hội thật. Thay bằng trần RAM — thứ ràng buộc thật sự của việc
     theo dõi thêm coin. Quan sát thêm coin không tốn xu nào, chỉ tốn
     RAM/CPU/băng thông, nên phải chặn bằng đúng thứ nó tiêu.

     `null` = không giới hạn theo số đếm. Xếp hạng `diemQuan` vẫn còn tác
     dụng: khi RAM chạm trần, coin điểm cao được giữ trước.               */
  SO_COIN_TRAN: null,

  /* ⛔ TRẦN RAM — van an toàn THẬT của cần gạt lấy mẫu.

     ĐO THẬT trên chính server đang chạy (bảng điều khiển hosting 23/08):
       · trần tài khoản  2 GB = 2048 MB  (CloudLinux LVE)
       · bot ở 20 coin   357,68 MB  →  ~15 MB/coin + nền Node ~60 MB
     → trần 1000 MB ≈ 63 coin, còn dư hơn 1 GB đệm.

     ⛔ ĐÂY LÀ HOSTING CHIA SẺ, CHẠM TRẦN LÀ BỊ GIẾT THẲNG — không swap,
     không ân hạn. Node lại dọn rác lười nên RSS vọt lên trước khi GC
     chạy. Vì vậy phải chừa đệm rộng, đừng ăn sát 2 GB.
     Bot chết = KHÔNG AI CANH LỆNH ĐANG MỞ, đúng cái lỗ hổng vừa vá ở
     nhóm `MAT_SO`. Thà theo dõi ít coin còn hơn chết giữa chừng.

     ⚠ Đổi server thì phải sửa `RAM_MAY_CHU_MB` trước — có phép kiểm bắt
     hai trần dưới đây phải nằm trong tỷ lệ an toàn của nó.

     ⚠ Thực tế RAM sẽ KHÔNG chạm trần: log cho thấy `loc=11/20`, tức bộ
     LỌC XU HƯỚNG mới là thứ quyết định số coin (10–13), không phải trần.
     Bỏ trần đếm 20 chỉ đưa lên ~15–25 coin ≈ 400–450 MB.                */
  RAM_MAY_CHU_MB: 2048,         // trần RAM của tài khoản hosting — ĐO, không đoán
  RAM_TRAN_MB: 1000,            // ngừng THÊM coin
  RAM_XA_BOT_MB: 1200,          // vượt mức này thì GỠ BỚT coin, không chỉ ngừng thêm

  /* ⛔ CẦN GẠT RỦI RO — KHÔNG nới theo số coin. Ba lý do:

     (a) Lỗ đồng thời tối đa = N × rủi ro mỗi lệnh. Từ 2026-08-23 rủi ro
         mỗi lệnh là `khoảng trailing × notional` (tối đa 8% × $60 =
         $4,80), trước đó là hằng số $20 → N=3 khi ấy đã là 30% vốn và
         N=10 là sạch vốn trong một cú quét. Ký quỹ thì thừa thãi
         ($30/$200 khi N=3) — thứ ràng buộc thật là lỗ cộng dồn.
         ⚠ Cỡ lỗ mỗi lệnh nay nhỏ đi 4–6 lần nên N CÓ THỂ xét lại, nhưng
         phải nới bằng TRẦN TỔNG RỦI RO chứ không bỏ trắng, và vẫn còn
         nguyên vấn đề (b) bên dưới.
     (b) Đòn bẩy ẩn qua tương quan: 10 lệnh SHORT trên 10 alt lúc BTC bật
         KHÔNG phải 10 lệnh, đó là 1 lệnh cỡ 10×. Tưởng đa dạng hoá, thực
         tế all-in. Nó cũng thổi phồng cỡ mẫu: 10 lệnh tương quan gần 1
         chỉ đáng ~1–2 lệnh độc lập, nên mốc 780 đến sớm hơn TRÊN GIẤY mà
         không đến sớm hơn trong thực tế.
     (c) Trần lệnh là MỘT PHẦN CỦA CHIẾN LƯỢC, không phải của môi trường.
         Chạy giấy với N=10 rồi vào tiền thật với N=3 thì bộ dữ liệu giấy
         KHÔNG chuyển được — lệnh thứ 4, 5, 6 (bản thật sẽ bỏ qua) đã nằm
         trong thống kê.

     ⛔ ĐÃ BỎ TRẦN ĐẾM (chủ dự án chốt 2026-08-23): trần 3 đang cắt mất
     cơ hội thật. Đo được: **29,3% thời gian** bot bị khoá vì đủ 3 lệnh,
     và **37/71** lần vào SẴN_SÀNG không bao giờ mở được lệnh.

     Thay bằng TRẦN RỦI RO — chính là thứ mà lý do (a) muốn nói. Trước
     đây phải chặn bằng số đếm vì mỗi lệnh rủi ro $20 cố định, 3 lệnh đã
     là 30% vốn. Nay đường cắt trailing chỉ 3–8% nên rủi ro mỗi lệnh còn
     $1,80–$4,80: CÙNG một ngân sách 30% vốn nay mua được 12–33 lệnh
     thay vì 3. Rủi ro y hệt, cơ hội gấp 4–10 lần.

     ⚠ Lý do (b) — tương quan — trần rủi ro KHÔNG giải quyết được. Đo
     thật: 53/54 lệnh là LONG. Nên có thêm cảnh báo tập trung cùng hướng,
     nhưng CHỈ CẢNH BÁO, không chặn (quyết định của chủ dự án).            */
  SO_LENH_MO_TOI_DA: null,      // null = không giới hạn số đếm

  /* ⛔ NGÂN SÁCH RỦI RO — van an toàn THẬT của cần gạt rủi ro.
     Tính bằng RỦI RO CÒN LẠI, không phải rủi ro lúc mở: lệnh đã khoá hoà
     vốn thì phần rủi ro của nó gần bằng 0 và TRẢ LẠI CHỖ cho lệnh mới.
     Đây là chỗ hay nhất của trailing — lệnh đang thắng không chiếm ngân
     sách như lệnh vừa mở.                                                */
  TRAN_RUI_RO: {
    TONG_PC: 0.30,              // = đúng ngân sách cũ (3 × $20 / $200)

    /* ⭐ TRẦN THEO HƯỚNG — thêm 2026-08-24 cùng lượt mở khoá SHORT.
       Trần rủi ro TỔNG không bắt được tương quan: N lệnh long trên N alt
       lúc BTC sập không phải N lệnh, đó là 1 lệnh cỡ N×. Đo thật trên 56
       lệnh đầu: 53 lệnh LONG, tức danh mục thực chất là MỘT vị thế.

       Nay không hướng nào được chiếm quá tỷ lệ này của ngân sách. Ở mức
       0,70 nghĩa là tối đa $42 trong $60 — luôn chừa $18 cho hướng kia.

       ⚠ Hôm nay nó KHÔNG chặn gì: long đang dùng ~$24 = 40%. Nó chỉ nổ
       khi danh mục bắt đầu dồn một phía, đúng lúc cần nổ.
       Đặt 1.0 = tắt (quay về chỉ cảnh báo). */
    TRAN_CUNG_HUONG_PC: 0.70,
  },

  /* ================= TIỀN — TÍNH BẰNG ĐÔ, KHÔNG PHẢI % =================
     Cố định theo yêu cầu chủ dự án. Không co giãn theo vốn: vốn lên hay
     xuống thì size vẫn thế. Nhờ vậy vốn về 0 hay âm cũng không làm hỏng
     công thức size (quan trọng cho chế độ test dài).                     */
  VON: 200,

  /* ⭐ MỐC TÍNH VỐN — chỉ cộng PnL của lệnh đóng SAU thời điểm này.
     Đặt 0 = cộng toàn bộ lịch sử.

     Vì sao cần: `napLaiVon()` dựng vốn từ `SUM(pnl_usd)` của cả bảng.
     Nhưng 57 lệnh đầu chạy bằng cơ chế HOÀN TOÀN KHÁC (cắt lỗ $20 cố
     định, chốt lời nhả nửa đỉnh, trần 3 lệnh) — trộn lãi lỗ của chúng
     vào bản mới là làm nhiễu chính phép đo.

     ⛔ KHÔNG xoá dữ liệu cũ. 57 lệnh đó là bộ dữ liệu đã dùng để hiệu
     chỉnh TOÀN BỘ cơ chế mới — sàn/trần trailing, sàn phí, ngưỡng SHORT.
     Xoá đi là mất mốc so sánh và sau này không trả lời được câu "bản mới
     có tốt hơn không". Chỉ NGỪNG TÍNH, không xoá.

     Giá trị hiện tại = 2026-08-24 08:05:00 UTC (15:05 giờ VN) — đúng lúc
     bot khởi động với cơ chế trailing + SHORT mới.
     Muốn reset lần nữa thì đổi con số này, không cần đụng DB.           */
  MOC_VON_MS: 1787558700000,
  KY_QUY_LAN_1: 6,              // × đòn bẩy 10 → $60 giá trị lệnh
  KY_QUY_DCA: 4,                // × 10 → $40.  ⛔ ĐÚNG MỘT LẦN
  SO_LAN_DCA_TOI_DA: 1,         // ⛔ bất biến

  /* ============ ĐƯỜNG CẮT ĐỘNG — BÁM ĐỈNH, CHỈ ĐI MỘT CHIỀU ============
     ⛔ ĐÃ BỎ mốc cắt lỗ cố định $20/$25 (chủ dự án chốt 2026-08-23).

     Vì sao bỏ — đo trên 54 lệnh thật của 11 ngày đầu:
       · $20 trên notional $60 = giá phải chạy 33%
       · chốt lời nhả ra ở ~0,64% giá (đỉnh trung vị 1,288%, nhả nửa)
       → mạo hiểm 33% để ăn 0,64%, tỷ lệ 1:50. Phải thắng ~96% mới hoà.
       · Toàn bộ khoản lỗ −$15,49 đến từ ĐÚNG 2 lệnh chạm mốc $20;
         52 lệnh còn lại cộng lại +$26,10.

     Nay chỉ còn MỘT đường cắt cho cả lỗ lẫn lãi, đặt cách ĐỈNH GIÁ đã
     đạt một khoảng K, và KHÔNG BAO GIỜ lùi ra xa:

         K = kẹp( HE_SO_BIEN_DO × biên độ 24h của coin , SÀN , TRẦN )

     Vì sao neo vào biên độ 24h thay vì một số cố định: khoảng cố định
     theo % thì coin êm bị stop quá rộng, coin loạn bị nhiễu quét sạch.
     `bienDo24()` đã có sẵn trong `lib/loc-coin.js` — trước nay chỉ dùng
     để lọc coin, chưa lần nào dùng để định cỡ rủi ro.

     SÀN/TRẦN chọn từ dữ liệu: dựng lại đường giá theo phút của 53 lệnh
     rồi đo độ sâu đi ngược tối đa của từng lệnh —
       cắt ở  2% → chạm 19 lệnh, giết oan 13 lệnh lãi (+$4,83)
       cắt ở  4% → chạm  9 lệnh, giết oan  5 lệnh lãi (+$0,95)
       cắt ở  6% → chạm  5 lệnh, giết oan  3 lệnh lãi (+$0,73)
       cắt ở 10% → chạm  3 lệnh, giết oan  1 lệnh lãi (+$0,62)
     Vùng 3–8% giết oan dưới $1 tiền lãi mà vẫn chặn được CẢ HAI lệnh
     BEAT (đi ngược −31,9% và −28,1%). Dưới 2% bắt đầu ăn vào lệnh lãi
     thật, trên 10% thì gần như không còn tác dụng chặn.                  */
  TRAILING: {
    HE_SO_BIEN_DO: 0.50,       // K = 0,50 × biên độ 24h
    KHOANG_SAN: 0.030,         // ⛔ sàn 3,0% giá — hẹp hơn là nhiễu quét
    KHOANG_TRAN: 0.080,        // ⛔ trần 8,0% giá — không để stop rộng vô hạn

    /* Khoá hoà vốn — đỉnh lãi đạt ngần này LẦN khoảng trailing thì ép
       đường cắt lên ít nhất bằng giá hoà vốn. Từ đó lệnh KHÔNG THỂ lỗ.
       Đây là thứ cứu đúng ca đã xảy ra: BEAT lệnh thứ hai từng lãi
       +1,34% rồi quay đầu về −$20,78 mà không có gì chặn lại. */
    NGUONG_KHOA_VON: 1.0,
    DEM_HOA_VON: 2.0,          // hoà vốn = giá vào ± DEM × phí khứ hồi
  },

  /* ============ MẤT SỔ — LỆNH ĐANG MỞ VẪN PHẢI ĐƯỢC CANH ============
     ⛔ Vòng lặp 2 giây trong `bot.js` có ba lối `continue` bỏ qua coin khi
     sổ lệnh chết: quá 20 giây không có gói dữ liệu · `E.so.hong` · sổ
     rỗng một phía. Trước 2026-08-23 chúng bỏ qua LUÔN cả việc quản lý
     lệnh ĐANG MỞ — không kiểm đường cắt, không kiểm van cuối, giá chạy
     bao xa cũng không ai đóng.

     Lỗ hổng đó vốn được ĐƯỜNG CẮT RỘNG che cho: cắt ở 33% giá thì mất sổ
     vài phút hiếm khi đủ để giá đi hết quãng đó. Đường cắt mới chỉ cách
     3–8% nên tấm che ấy biến mất — đây là lý do phải vá cùng lượt.

     ⛔ NGUYÊN TẮC: sổ hỏng được phép chặn MỞ LỆNH MỚI và chặn tính tín
     hiệu. KHÔNG BAO GIỜ được phép chặn ĐÓNG LỆNH.

     Phao cứu là REST ticker (`bangGia`, làm mới mỗi 60 giây) — đường dữ
     liệu ĐỘC LẬP với WebSocket nên hai bên khó chết cùng lúc.           */
  MAT_SO: {
    /* Ticker cũ hơn mức này thì KHÔNG tin nữa. Thà không có giá còn hơn
       quyết định đóng lệnh dựa trên một con số đã lỗi thời. */
    TUOI_TICKER_TOI_DA_MS: 180000,   // 3 phút = 3 vòng quét hụt liên tiếp
    /* Đóng lệnh lúc không nhìn thấy sổ thì gần như chắc chắn khớp xấu.
       Phạt trượt hẳn một khoản — cùng tinh thần "cố ý bi quan". */
    TRUOT_DONG_MU: 0.010,            // 1% giá
    /* Mất sổ lâu hơn mức này mà đang có lệnh mở thì kêu, và kêu lặp lại
       theo chu kỳ này chứ không kêu mỗi 2 giây. */
    CANH_BAO_SAU_MS: 60000,
  },

  /* ⛔ VAN AN TOÀN CUỐI — KHÔNG phải cơ chế cắt lỗ chính.
     Trailing 3–8% trên notional $60 = tối đa −$4,80 (sau DCA $100 là
     −$8,00), nên mốc này gần như không bao giờ chạm. Nó tồn tại cho
     trường hợp giá NHẢY QUA đường cắt (gap) chứ không phải để cắt lệnh
     thường. Hạ từ $25 xuống $12 vì cỡ lỗ thiết kế đã nhỏ đi 4–6 lần. */
  LO_TRAN_USD: 12,

  /* --- DCA: hàng rào KHÁC căn cứ ---
     Cửa sổ chỉ nói ĐƯỢC PHÉP hay không. Nó KHÔNG BAO GIỜ tự kích hoạt
     DCA. Lý do bấm nút duy nhất là RÀO CHẮN + đà đuối (xem lib/lenh.js).
     Phần lớn lệnh thua sẽ không bao giờ được DCA — đó là đúng, không phải lỗi.

     ⛔ ĐO BẰNG TỶ LỆ TRÊN RỦI RO THIẾT KẾ, không bằng đô (đổi 2026-08-23).
     Bản cũ là `[$4, $10]` cứng, hợp lý khi mức cắt luôn là $20 — tức
     cửa sổ nằm ở 20%–50% quãng đường tới điểm cắt. Nhưng đường cắt nay
     chỉ còn 3–8% giá = $1,80–$4,80 trên notional $60, nên cửa sổ đô cũ
     nằm NGOÀI tầm với: lệnh bị đóng trước khi kịp lỗ tới $4 và DCA sẽ
     chết âm thầm mà không ai biết. Giữ nguyên tỷ lệ 20%–50% thì hành vi
     tương đương bản cũ, và tự co giãn theo từng coin.                   */
  CUA_SO_DCA_TY_LE: [0.20, 0.50],
  RAO_CHAN_TOI_THIEU: 45,       // phút mua liên tục để xuyên tới điểm cắt

  /* --- Chốt lời theo cò đảo chiều — GIỮ cơ chế, siết hai chỗ ---
     Chốt khi: tín hiệu đảo chiều đã nổ (gài báo động) VÀ hồi lại ≥ ngưỡng.
       ngưỡng = min( max(HOI_LAI_TOI_THIEU, HOI_LAI_TY_LE × đỉnh), HOI_LAI_TRAN × đỉnh )

     ⭐ SIẾT 1 — `HOI_LAI_TRAN` 0,50 → 0,35.
        Đo được: 47/54 lệnh có đỉnh dưới 10%, mà ở vùng đó công thức luôn
        rơi về `0,50 × đỉnh` → bot LUÔN trả lại đúng một nửa. Tổng đỉnh
        lãi của 54 lệnh là +$71,56 nhưng về đích −$15,49: đã trả lại thị
        trường $87,05. Hạ trần xuống 0,35 thì giữ 65% thay vì 50%.

     ⭐ SIẾT 2 — `SAN_CHOT_LOI_PC`: đỉnh lãi chưa vượt mức này thì CẤM
        chốt lời. `pnlPcGia` đo giá GỘP, chưa trừ phí; phí khứ hồi
        = 2 × PHI_MOI_LAN = 0,12% giá. Chốt giữ lại nửa đỉnh, nên đỉnh
        dưới 0,24% thì chốt CHẮC CHẮN ra số âm — không phải xui, là toán.
        7/54 lệnh đã dính đúng vậy, và 17 lệnh đóng bằng `chot_loi` mà
        PnL âm. Dưới sàn này lệnh cứ để chạy, đã có đường trailing lo. */
  SAN_CHOT_LOI_PC: 0.0024,      // = 2 × phí khứ hồi = 2 × 2 × PHI_MOI_LAN
  HOI_LAI_TOI_THIEU: 5,         // điểm phần trăm
  HOI_LAI_TY_LE: 0.25,
  HOI_LAI_TRAN: 0.35,

  /* ============ SÀN — ĐƯA CẮT LỖ RA KHỎI RAM BOT (Giai đoạn 10) ============
     Cắt lỗ nằm trong RAM có ba tầng trễ không gỡ được bằng code:
       1. nhịp 2 giây — giá đi hết quãng cắt trong 2 giây thì cắt muộn.
          ⚠ Bản trailing 3–8% NHẠY CẢM hơn hẳn bản cắt $20 (=33% giá):
          một cú 2 giây khó đi hết 33%, nhưng đi hết 3% thì bình thường.
       2. Node đơn luồng — 20 lệnh cùng chạm cắt thì lệnh cuối chờ lệnh đầu
       3. bot chết / mất mạng — không ai cắt cả
     Máy khớp lệnh của sàn canh ở mức micro-giây, song song, và sống độc
     lập với bot. Đó là cách DUY NHẤT xử lý được cả ba.                   */
  SAN: {
    /* ⭐ VÙNG CHẾT — chỉ dời SL khi mốc mới tốt hơn mốc ĐÃ ĐẶT ngần này.
       Đường cắt siết mỗi 2 giây; sửa lệnh mỗi lần siết thì 20 vị thế =
       10 yêu cầu/giây chỉ riêng cho SL → đụng giới hạn tốc độ API ĐÚNG
       LÚC thị trường loạn, tức đúng lúc SL quan trọng nhất.
       0,3% cắt số lần sửa xuống hàng chục lần mà mốc SL vẫn bám sát. */
    VUNG_CHET_PC: 0.003,

    /* SL là lưới an toàn — đặt hỏng mà im lặng là tệ nhất, nên thử lại. */
    SL_THU_LAI: 2,

    /* Đối soát với sàn theo chu kỳ này (chỉ chế độ demo/that): vị thế nào
       đang mở thật, SL nào còn treo, SL nào mồ côi. */
    DOI_SOAT_MS: 300000,
  },

  /* --- Cổng thanh lý --- */
  DEM_THANH_LY_TOI_THIEU: 1.5,
  MMR_UOC_TINH: 0.005,       // tỷ lệ ký quỹ duy trì ước tính của OKX (bậc thấp)
  CAN_CHAY_TRAN: 0.5,        // trần cho khoảng cách cắt lỗ quy đổi ra % giá
  PHAT_SO_CAN: 0.005,        // sổ không đủ sâu → phần còn lại khớp xấu thêm 0,5%

  /* --- ngưỡng phụ --- */
  NGUONG_LAI_2: 0.20,        // lãi ≥ mức này thì hiển thị trạng thái LAI_2
  CUA_SO_DONG_TIEN_PHUT: 30, // cửa sổ dòng tiền dài (khớp thongKeDong)
  CUA_SO_DONG_TIEN_NGAN_PHUT: 5,

  /* ⛔ CHẾ ĐỘ TEST DÀI: vốn về 0 hoặc ÂM vẫn ghi lệnh, KHÔNG dừng.
     Dừng ở lúc cháy là cắt cụt mẫu — mất đúng phần dữ liệu cần nhất.
     Bot vẫn ĐÁNH DẤU khoảnh khắc tài khoản thật sẽ bị thanh lý, để sau
     này biết "đã cháy trên lý thuyết mấy lần" thay vì tưởng là lãi.
     ⛔ CHỈ CÓ HIỆU LỰC KHI CHE_DO === 'giay'. Test kiểm điều này.        */
  CHO_AM_VON: true,

  /* ---------------- ĐƯỜNG RA CỦA LỆNH ĐÃ MỞ ----------------
     ⛔ Bốn cờ dưới đây PHẢI là false. Chúng tồn tại để test kiểm, và để
     sau này đo đối chứng bằng SQL. KHÔNG bật cái nào khi chạy thật. */
  DONG_VI_HET_GIO: false,          // ⛔
  DONG_VI_CAU_TRUC: false,         // ⛔
  DONG_VI_FUNDING_DAO: false,      // ⛔
  DONG_VI_TIN_HIEU_NGUOC: false,   // ⛔
  CO_CHOT_CHI_KHI_LAI: true,       // ⛔ cò đảo chiều chỉ đóng khi ĐANG LÃI

  /* ---------------- phí · trượt giá · funding — CỐ Ý BI QUAN ----------------
     ⛔ Mọi con số ở đây phải XẤU HƠN thực tế. Dữ liệu chạy giấy mà đẹp hơn
     thực tế là tự lừa mình. Không bao giờ hạ mấy hệ số này xuống. */
  PHI_MOI_LAN: 0.0006,       // sàn thật: taker 0,05% · maker 0,02%
  HE_SO_TRUOT: 1.5,
  TRUOT_TOI_THIEU: 0.0005,
  TRUOT_TIN_TUONG: true,     // đi qua sổ ĐÃ CHIẾT KHẤU theo độ tin tường
  HE_SO_FUNDING_NHAN: 0.7,
  HE_SO_FUNDING_TRA: 1.3,

  /* ---------------- cò tín hiệu dẫn ---------------- */
  NG_BPR: 0.25,
  TY_LE_PULL_TREN_FILL: 2.0,   // BPR >= 2×BFR — điều kiện "bắt trước"
  NG_DBI: 0.25,                // |dDBI| tối thiểu (dấu do hướng quyết định)
  CUA_SO_PULL_GIAY: 300,
  SAT_DINH_TOI_DA: 0.015,

  /* ---------------- chống nhấp nháy + đóng băng ---------------- */
  XAC_NHAN_TICK: 15,           // 15 nhịp × 2s = 30s cò phải nổ LIÊN TỤC
  NGUONG_VAO: 25,
  NGUONG_DAO: 40,              // đảo hướng cần |S| cao hơn — bất đối xứng
  KHOA_HUONG_PHUT: 30,
  NGUOI_LANH_PHUT: 15,
  TROI_TOI_DA: 0.015,
  // ⛔ KHÔNG có HAN_CHO_VAO. Kế hoạch không hết hạn theo giờ.

  /* ---------------- đặt lệnh ---------------- */
  VAO_BANG_GIA_HIEN_TAI: true, // ⛔ tường KHÔNG quyết định giá vào
  LECH_VAO_TOI_DA: 0.0015,
  SO_LAN_THU_IOC: 3,

  /* ---------------- cổng coin ---------------- */
  TUOI_COIN_TOI_THIEU_NGAY: 7,
  VOL24_TOI_THIEU_USD: 20e6,
  WARMUP_GIAY: 300,            // 300, không phải 90

  /* ================= BỐN SETUP — ⛔ MỞ 24/24 TUYỆT ĐỐI =================
     Không còn BẤT KỲ chốt chặn nào theo giờ. Cả 4 setup được xét ở mọi
     thời điểm, kể cả 04:00–06:00.

     ⛔ ĐIỀU KIỆN COIN GIỮ NGUYÊN 100%. Bỏ ràng buộc GIỜ không có nghĩa
     là nới điều kiện: chg24 · funding · OI · mốc giá · "không tạo đáy
     mới" đều y như cũ. Mở 24/24 KHÔNG làm bot vào lệnh nhiều hơn bao
     nhiêu — phần lớn thời gian vẫn không coin nào đủ điều kiện.

     `khungGoc` KHÔNG CHẶN GÌ CẢ. Nó chỉ còn đúng một việc: ghi cột
     `trong_khung` (1 = lúc mở lệnh đang trùng khung gốc của setup).
     Đó là NHÃN DỮ LIỆU, không phải cổng. Giữ lại vì nó là phép thử duy
     nhất trả lời được câu "khung giờ có thật hay không" — và giờ cả hai
     nhóm trong/ngoài đều là LỆNH THẬT có thắng/thua để so.
     Xoá `khungGoc` = mất vĩnh viễn khả năng trả lời câu hỏi đó.        */
  SETUP: {
    /* ⭐ HẠ NGƯỠNG SHORT 2026-08-24 — chủ dự án chốt: bot phải có lệnh short.
       Đo trên 311.513 nhịp của 11,3 ngày để tìm ĐÚNG chỗ nghẽn:

         chg24 >= 30%        13.241 nhịp (4,25%)   ← KHÔNG phải nút thắt
         funding >= 0,05%    15.380 nhịp (4,94%)   ← KHÔNG phải nút thắt
         CẢ HAI cùng lúc        686 nhịp (0,22%)   ← đây
         qua cả 4 vế            395 nhịp (0,13%)   → chỉ 3 coin, 17 giờ-coin

       Hai điều kiện GẦN NHƯ LOẠI TRỪ NHAU: coin pump 30% thì funding thấp,
       coin funding cao thì lại không pump. Kết quả 11,3 ngày: 1 lệnh SHORT.

       Vì sao mốc funding cũ bất khả thi: 41% số nhịp nằm ở 0,01–0,02% —
       đó là MỨC NỀN của sàn. 0,05% là 5 lần mức nền.

       Chọn 20% / 0,02% từ bảng đo (giữ NGUYÊN mọi chốt chặn squeeze):
         30% / 0,05%   395 nhịp ·  3 coin · 17 giờ-coin   ← cũ
         25% / 0,02% 1.217 nhịp ·  5 coin · 50 giờ-coin
         20% / 0,02% 1.659 nhịp ·  5 coin · 57 giờ-coin   ← CHỌN, gấp 4,2×
         20% / 0,01% 8.231 nhịp · 27 coin ·304 giờ-coin   ⛔ gấp 20,8×

       ⛔ KHÔNG hạ funding xuống 0,01%. Đó là mức nền, hạ tới đó thì vế
       funding ngừng lọc gì cả và giả thiết "long đang chen chúc" tan luôn —
       biến SHORT-A thành "short bất cứ thứ gì vừa pump", tức short vào sức
       mạnh. 0,02% vẫn là GẤP ĐÔI mức nền, vẫn giữ được tín hiệu chen chúc.

       ⚠ Ngưỡng SHORT vẫn CAO HƠN LONG-A (20% so với 10–15%) — cố ý: short
       một cú pump cần bằng chứng kiệt sức rõ hơn là long một cú tăng. */
    'SHORT-A': { huong: 'short', chg24Min: 0.20, fundingMin: 0.0002,
                 khungGoc: { tu: '23:00', den: '03:00' } },
    'SHORT-B': { huong: 'short', tangThemMin: 0.10, fundingMin: 0.0002,
                 khungGoc: { tu: '07:00', den: '15:00' } },
    'LONG-A':  { huong: 'long',  chg24: [0.10, 0.15], fundingMax: 0.0003,
                 khungGoc: { tu: '18:00', den: '22:30' } },
    'LONG-B':  { huong: 'long',  chg24Max: -0.15, fundingMax: 0.00005,
                 khungGoc: { tu: '06:30', den: '09:00' } },
  },

  /* ============ LỌC COIN — thay cho "lấy top N" (lib/loc-coin.js) ============
     Quyết định coin nào ĐÁNG theo dõi. Chỉ dùng được dữ liệu REST ticker
     (last · open24 · high24 · low24 · chg24 · volUsd) vì máy quét chạy
     TRƯỚC khi engine tồn tại — chưa có sổ lệnh, OI hay funding.        */
  LOC_COIN: {
    /* Vế "có ĐỘNG hay không": (high24 − low24) / last.
       Đặt DƯỚI ngưỡng chg24 nhỏ nhất của 4 setup (LONG-A = 0,10) một
       cách cố ý — bộ lọc này để loại coin đi ngang, KHÔNG bao giờ được
       phép loại nhầm một coin mà setup có thể muốn. */
    BIEN_DO_24H_TOI_THIEU: 0.08,

    /* Vế "đúng HƯỚNG nào không": nới ngưỡng chg24 của setup ra khoảng
       này để LÀM NÓNG engine trước khi coin đủ điều kiện.
       ⛔ KHÔNG phải nới điều kiện vào lệnh — điều kiện COIN trong
       lib/khung.js giữ nguyên 100%. Đây chỉ là vùng tiền-setup.

       Phải NHỎ HƠN bề rộng vùng hẹp nhất (LONG-A = 0,15−0,10 = 0,05),
       nếu không vùng tiền-setup rộng hơn cả chính setup — có phép kiểm
       chặn việc này. 0,03 → LONG-A làm nóng ở [0,07 ; 0,18]. */
    DEM_TIEN_SETUP: 0.03,

    /* Trễ (hysteresis): coin ĐANG theo dõi được nới ngưỡng gấp ngần này
       mới bị loại. Thiếu nó thì coin nằm sát mép lọc bị bật/tắt engine
       liên tục, mà mỗi lần tắt là mất sạch lịch sử tường đã tích. */
    NOI_LONG_KHI_DA_THEO: 1.5,

    /* Trọng số XẾP HẠNG — chỉ có tác dụng khi TRẦN RAM bị chạm (từ
       2026-08-23; trước đó là khi `SO_COIN_TRAN` bị chạm).
       Không ảnh hưởng quyết định vào lệnh, nên chỉnh thoải mái. */
    DIEM_SHORT_A: 200, DIEM_LONG_A: 150, DIEM_LONG_B: 150,
    DIEM_NEN_HE_SO: 10,        // coin trong vùng tiền-setup: luôn thua coin đã đủ
    DIEM_SAT_MEP: 20,          // giá sát đỉnh/đáy 24h — suy đoán, để nhẹ
  },

  /* ---------------- ngắt mạch (chỉ NGỪNG MỞ LỆNH MỚI) ---------------- */
  NGAT_MACH: {
    thuaLienTiep: 2,
    loNgayToiDa: 0.15,
    lechSoDuToiDa: 0.01,
  },

  /* ================= TƯỜNG — bộ lọc lệnh ảo (lib/tuong.js) =================
     ⭐ Đây là lõi của cả bot. Mọi con số chấm điểm độ tin nằm ở đây, KHÔNG
     rải trong code. Chưa có mẫu nào chứng minh bộ trọng số này đúng —
     phải đo lại bằng `npm run bao-cao` sau ≥300 lệnh trước khi chỉnh.     */
  TUONG: {
    NGUONG_LA_TUONG: 0.25,     // mốc phải ≥ 25% mốc lớn nhất mới tính là "tường"
    /* ngưỡng "áp sát"/"rời xa": nền là bước giá, có SÀN và TRẦN theo %.
       Chỉ dùng bước giá thì coin tick mịn có ngưỡng bé tới mức không bao
       giờ bật; chỉ dùng % thì sổ dày bị chấm oan. */
    GAN_NHAN_BUOC: 3, GAN_SAN: 0.0008, GAN_TRAN: 0.005,
    ROI_NHAN_BUOC: 8, ROI_SAN: 0.0020, ROI_TRAN: 0.012,
    CHO_BIEN_MAT_MS: 4000,     // mất quá lâu này mới kết luận rút/khớp
    CON_NGUYEN_KHOI: 0.6,      // còn ≥60% khối khi biến mất = RÚT (lệnh ảo)
    CON_QUA_NUA: 0.5,          // còn >50% sau khi giá rời đi = SỐNG SÓT
    DON_DEP_GIO: 6,            // tường không thấy quá N giờ thì xoá
    BAN_KINH_DO_SAU: 0.005,    // ±0,5% quanh giá để tính DBI
    MAU_TOI_THIEU: 10,         // số mẫu tối thiểu mới tin BPR/BFR

    /* --- chấm điểm 0-100. Chưa biết gì = 30 (TRUNG TÍNH, không phải 0) --- */
    TIN_NEN: 30,
    TIN_TUOI_MOI_PHUT: 1.5,
    TIN_TUOI_TRAN_DA_THU: 30,   // đã bị giá thử -> cộng đủ điểm tuổi
    TIN_TUOI_TRAN_CHUA_THU: 15, // CHUA bị thử -> chỉ NỬA điểm: treo lệnh ảo
                                //   ở xa giá thì sống bao lâu cũng chẳng chứng minh gì
    TIN_SONG_SOT: 15,          // chịu được giá áp sát rồi giá rời đi
    TIN_KHOP_THAT: 8,          // bị ăn mòn dần = tiền thật
    TIN_BI_RUT: -30,           // biến mất nguyên khối = lệnh ảo, phạt nặng
    TIN_RUT_DEM_TOI_DA: 3,     // phạt tối đa 3 lần rút
    /* numOrders - dự án cũ bỏ phí trường này. CHUA KIỂM CHỨNG, để trọng số
       thấp cho tới khi có >=300 mẫu. */
    TIN_MOT_LENH: -15,         // tiền lớn mà CHỈ MỘT lệnh -> rút một cú là sạch
    TIN_MOT_LENH_TY_LE: 0.12,  // "tiền lớn" = >12% tổng sổ
    TIN_NHIEU_LENH: 10,        // >=20 lệnh -> khó điều phối, khó giả
    TIN_VUA_LENH: 5,           // >=8 lệnh
    N_ORD_NHIEU: 20, N_ORD_VUA: 8,
  },

  /* ============ TÍN HIỆU - chuẩn hoá và ngưỡng (lib/tinhieu.js) ============ */
  TIN_HIEU: {
    TRONG_SO: { pull: 0.30, flow30: 0.20, book: 0.15, liq: 0.15, oi: 0.10, fund: 0.10 },
    CHUAN_FLOW30: 0.05,        // dòng tiền 30' chia cho (tổng sổ × hệ số này)
    CHUAN_FLOW5: 0.015,
    CHUAN_LIQ: 0.01, LIQ_SAN_USD: 25000,
    CHUAN_FUND: 0.001,         // funding /8h chia cho hệ số này
    OI_CUA_SO_PHUT: 25,
    OI_NGUONG_GIA: 0.001, OI_NGUONG_OI: 0.002, OI_CHUAN: 0.02, OI_NGUOC_HE_SO: 0.4,
    HOAT_DONG_NGUONG: 0.15,    // |tín hiệu| > mức này mới tính là "đang hoạt động"
    DONG_NGUOC_NGUONG: 0.3,
    BAO_HOA_NGUONG: 0.99, BAO_HOA_XAC_NHAN: 0.2,
    GIA_HIST_GIO: 2,           // cửa sổ tìm đỉnh/đáy gần
    CHOT_DBI: 0.15, CHOT_TY_LE_MUA_BAN: 1.2,   // cò CHỐT LỜI - vế LỰC
  },

  /* ============ MÁY QUÉT + NẾN + BTC (bot.js) ============ */
  QUET: {
    VUNG_DEM_COIN: 3,          // chỉ gỡ coin khi rớt khỏi top (SO_COIN + N)
    GO_TOI_DA_MOI_VONG: 1,     // mỗi vòng quét gỡ tối đa 1 coin
    SO_LENH_HET_HAN_MS: 20000, // quá lâu không có GÓI DỮ LIỆU thì bỏ qua coin
    NAP_LAI_CACH_MS: 15000,    // chống bão đăng ký lại khi sổ hỏng
    OI_MAU_CACH_MS: 30000, OI_HIST_TRAN: 400,
    NHIP_GHI_MS: 60000,        // nhịp ghi bảng `nhip`
    MOC_GIA_CHG24: 0.25,       // chụp mốc 07:00 cho coin biến động >= mức này

    /* ⛔ "Hôm qua đã pump lớn" — ngưỡng cho cột `moc_gia.da_tang30_hom_qua`.
       Trước 2026-08-24 đây là SỐ CỨNG `0.30` nằm lạc trong `bot.js`, vi
       phạm quy tắc #4 và nhóm phép kiểm SỐ CỨNG đã để lọt.

       Cột này là CỔNG HAI CHIỀU, đổi nó ảnh hưởng cả hai setup:
         · SHORT-B cần nó TRUE  → hạ ngưỡng = SHORT-B dễ nổ hơn
         · LONG-B bị chặn nếu TRUE → hạ ngưỡng = LONG-B KHÓ hơn
       Cả hai chiều đều đẩy danh mục về phía cân bằng hơn, nên hạ xuống
       khớp với `SHORT-A.chg24Min` là hợp lý.

       ⚠ Tên cột trong DB vẫn là `da_tang30_hom_qua` (lý do lịch sử) —
       đừng đọc số 30 trong tên cột như một ngưỡng. */
    MOC_PUMP_LON: 0.20,
    NEN_RAU_NHAN: 1.5, NEN_RAU_SAN_BIEN: 0.15, NEN_DONG_LUI: 0.005,
    DAY_MOI_CUA_SO_PHUT: 30, DAY_MOI_MAU_TOI_THIEU: 30, DAY_MOI_BIEN: 0.001,
    BTC_PHA_DINH_SAT: 0.999, BTC_PHA_DINH_CHG24: 0.02,
    LICH_SU_GUI: 50,           // số lệnh gửi ra giao diện
  },

  /* ============ DCA - căn cứ (lib/lenh.js) ============ */
  DCA: {
    CHAM_LAI_TY_LE: 0.8,       // tốc độ 5' < 80% tốc độ 30' = đà đuối
    OI_DUNG_NGUONG: 0.002,     // dOI dưới mức này coi là đứng yên
    SQUEEZE_OI_NGUONG: 0.01,   // dOI trên mức này + không nến từ chối = squeeze THẬT
  },

  /* ============ CẢNH BÁO trên màn hình (chỉ vẽ, không đóng lệnh) ============ */
  CANH_BAO: {
    RAO_CHAN_MONG: 10,         // phút
    GAN_CHAY: 0.30,            // khoảng cách cháy dưới mức này thì kêu
    /* ⛔ ĐÃ XOÁ `HET_KHUNG_GIO_VN`. Cảnh báo "hết khung giờ" chỉ có nghĩa
       khi còn khung giờ. Chạy 24/24 thì nó kêu mỗi ngày từ 15:00 cho mọi
       lệnh short đang lỗ — nhiễu thuần tuý, không mang tin gì.          */
    FUNDING_LONG_CAO: 0.001,   // long mà funding vượt mức này = đám đông đã vào
  },

  /* ============ HẠ TẦNG - không phải tham số giao dịch ============ */
  HA_TANG: {
    WS_PING_MS: 20000, WS_NOI_LAI_TRAN_MS: 30000,
    /* GOM lệnh subscribe/unsubscribe trong một cửa sổ ngắn rồi gửi MỘT
       frame. Bắt buộc khi theo dõi nhiều coin: mỗi coin đăng ký 3 kênh
       (books · trades · open-interest), 20 coin = 60 frame bắn liên tiếp
       trong vài mili-giây → đúng kịch bản "bão subscribe → bị chặn tốc
       độ" đã ghi ở bảng bẫy. Đường nối lại (ws.onopen) vốn đã gom đúng
       cách; đây là đưa `dangKy`/`huy` về cùng một cách làm.              */
    WS_GOM_DANG_KY_MS: 50,     // cửa sổ gom
    WS_ARG_MOI_FRAME: 40,      // chẻ nhỏ nếu vượt, tránh frame quá to
    SO_DONG_BO_LAI_PHUT: 30,   // đồng bộ lại sổ định kỳ (books KHÔNG có checksum)
    REST_GIAN_CACH_MS: 120, REST_TIMEOUT_MS: 12000, REST_THU_LAI: 2,
    DB_TRAN_HANG_DOI: 20000, DB_XA_MOI_LAN: 500,
    DB_NHIP_XA_MS: 500, DB_NHIP_DEM_MS: 30000,
    LICH_SU_RAM: 200,
    LOG_TRAN_MB: 8,
  },

  /* ---------------- ghi log ---------------- */
  NGUONG_GHI: 15,          // < NGUONG_VAO — cố ý, để có nhóm đối chứng
  VER_TRONG_SO: null,      // tự sinh lúc chạy, xem lib/tinhieu.js

  /* ---------------- nhịp ---------------- */
  NHIP_PHAN_TICH: 2000,
  NHIP_QUET: 60000,
  NHIP_REST: 60000,
  NHIP_LOG: 60000,
  CONG_WEB: 8899,
};
