'use strict';
/* =====================================================================
   CẤU HÌNH — mọi tham số quyết định nằm ở đây, không rải trong code.

   Các dòng có dấu ⛔ là BẤT BIẾN, không phải tùy chọn. Test tự động
   (test/bat-bien.js) sẽ kiểm chúng và fail nếu bị đổi.
   ===================================================================== */

module.exports = {
  /* ---------------- chế độ chạy ---------------- */
  CHE_DO: 'giay',          // 'giay' | 'nho' | 'day'  — luôn khởi động ở 'giay'
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

     ⚠ RAM: mốc ~72MB đo ở 3 coin. Chưa đo lại ở mức trần này. Xem
     `loc=` trong log để biết bộ lọc cho qua bao nhiêu coin mỗi vòng —
     có DỮ LIỆU rồi hãy chỉnh trần, đừng đoán. */
  SO_COIN_TRAN: 20,

  /* ⛔ CẦN GẠT RỦI RO — KHÔNG nới theo số coin. Ba lý do:

     (a) Lỗ đồng thời tối đa = N × CAT_LO_USD. N=3 → $60 = 30% vốn.
         N=10 → $200 = sạch vốn trong một cú quét. Ký quỹ thì thừa thãi
         ($30/$200 khi N=3) — thứ ràng buộc thật là cắt lỗ cộng dồn.
     (b) Đòn bẩy ẩn qua tương quan: 10 lệnh SHORT trên 10 alt lúc BTC bật
         KHÔNG phải 10 lệnh, đó là 1 lệnh cỡ 10×. Tưởng đa dạng hoá, thực
         tế all-in. Nó cũng thổi phồng cỡ mẫu: 10 lệnh tương quan gần 1
         chỉ đáng ~1–2 lệnh độc lập, nên mốc 780 đến sớm hơn TRÊN GIẤY mà
         không đến sớm hơn trong thực tế.
     (c) Trần lệnh là MỘT PHẦN CỦA CHIẾN LƯỢC, không phải của môi trường.
         Chạy giấy với N=10 rồi vào tiền thật với N=3 thì bộ dữ liệu giấy
         KHÔNG chuyển được — lệnh thứ 4, 5, 6 (bản thật sẽ bỏ qua) đã nằm
         trong thống kê.                                                   */
  SO_LENH_MO_TOI_DA: 3,

  /* ================= TIỀN — TÍNH BẰNG ĐÔ, KHÔNG PHẢI % =================
     Cố định theo yêu cầu chủ dự án. Không co giãn theo vốn: vốn lên hay
     xuống thì size vẫn thế. Nhờ vậy vốn về 0 hay âm cũng không làm hỏng
     công thức size (quan trọng cho chế độ test dài).                     */
  VON: 200,
  KY_QUY_LAN_1: 6,              // × đòn bẩy 10 → $60 giá trị lệnh
  KY_QUY_DCA: 4,                // × 10 → $40.  ⛔ ĐÚNG MỘT LẦN
  SO_LAN_DCA_TOI_DA: 1,         // ⛔ bất biến

  /* Cắt lỗ theo SỐ TIỀN LỖ RÒNG (đã trừ phí, trượt đã nằm trong giá).
     Tính theo tiền chứ không theo % giá → tự siết lại sau khi DCA:
       chưa DCA ($60):  −$20 ≈ giá chạy 33% · −$25 ≈ 42%
       đã DCA ($100):   −$20 ≈ giá chạy 24% · −$25 ≈ 29%                  */
  CAT_LO_USD: 20,               // cắt sớm nhất
  CAT_LO_USD_TRAN: 25,          // trần tuyệt đối

  /* --- DCA: hàng rào KHÁC căn cứ ---
     CUA_SO_DCA_USD chỉ nói ĐƯỢC PHÉP hay không. Nó KHÔNG BAO GIỜ tự kích
     hoạt DCA. Lý do bấm nút duy nhất là RÀO CHẮN + đà đuối (xem lib/lenh.js).
     Phần lớn lệnh thua sẽ không bao giờ được DCA — đó là đúng, không phải lỗi. */
  CUA_SO_DCA_USD: [4, 10],
  RAO_CHAN_TOI_THIEU: 45,       // phút mua liên tục để xuyên tới điểm cắt

  /* --- Chốt lời: KHÔNG có mốc cố định ---
     Chốt khi: tín hiệu đảo chiều đã nổ (gài báo động) VÀ hồi lại ≥ ngưỡng.
       ngưỡng = min( max(HOI_LAI_TOI_THIEU, HOI_LAI_TY_LE × đỉnh), HOI_LAI_TRAN × đỉnh )
     max(...) chặn bị đá ra bởi nhiễu vặt;
     min(..., TRAN) chặn lệnh thắng nhỏ trôi về gần 0.                     */
  HOI_LAI_TOI_THIEU: 5,         // điểm phần trăm
  HOI_LAI_TY_LE: 0.25,
  HOI_LAI_TRAN: 0.50,

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
    'SHORT-A': { huong: 'short', chg24Min: 0.30, fundingMin: 0.0005,
                 khungGoc: { tu: '23:00', den: '03:00' } },
    'SHORT-B': { huong: 'short', tangThemMin: 0.10, fundingMin: 0.0005,
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

    /* Trọng số XẾP HẠNG — chỉ có tác dụng khi SO_COIN_TRAN bị chạm.
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
