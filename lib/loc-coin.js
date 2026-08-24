'use strict';
/* =====================================================================
   LỌC COIN — quyết định coin nào ĐÁNG theo dõi.

   ⭐ Ý chính: số coin theo dõi là KẾT QUẢ của bộ lọc, KHÔNG phải con số
   đặt trước. Thị trường im thì 2 coin, thị trường chạy thì 15. Trần
   Trần đếm `SO_COIN_TRAN` đã bỏ (2026-08-23); van an toàn nay là
   `RAM_TRAN_MB` — RAM mới là thứ việc theo dõi thêm coin thật sự tiêu.
   Dù là van nào thì nó cũng KHÔNG phải chỉ tiêu phải lấp đầy.

   Vì sao tách khỏi `bot.js`: `bot.js` require vào là khởi động cả bot
   (mở WS, nối DB), nên không test được. Bộ lọc là logic THUẦN — tách ra
   đây thì `test/bat-bien.js` kiểm được bằng HÀNH VI thật, không phải
   bằng regex quét mã nguồn.

   ⛔ Ràng buộc dữ liệu quyết định thiết kế: máy quét chạy TRƯỚC khi
   engine tồn tại, nên chỉ có dữ liệu REST ticker — `last`, `open24`,
   `high24`, `low24`, `chg24`, `volUsd`. KHÔNG có sổ lệnh, KHÔNG có OI,
   KHÔNG có funding. Mọi thứ dưới đây phải dựng từ đúng bấy nhiêu.
   ===================================================================== */

/* Biên độ 24h so với giá. Đây là thước đo "có xu hướng hay không" rẻ
   nhất và ít giả định nhất lấy được từ ticker — và trước 2026-08-12 nó
   KHÔNG hề được dùng, dù `high24`/`low24` vẫn nằm sẵn trong ticker.

   Coin đi ngang 2%/ngày thì không setup nào sống nổi trên nó: cắt lỗ
   $20 trên $60 giá trị lệnh tương đương giá chạy 33%. Tường của một coin
   như thế cũng chẳng nói lên điều gì — không có ai thật sự tranh nhau. */
function bienDo24(t) {
  if (!(t.high24 > 0) || !(t.low24 > 0) || !(t.last > 0)) return 0;
  return (t.high24 - t.low24) / t.last;
}

/* Vị trí giá trong biên độ 24h: 1 = sát đỉnh, 0 = sát đáy, 0,5 = giữa.
   CHỈ dùng để XẾP HẠNG, không dùng để loại. Lý do: giữa biên độ vừa có
   thể là "đi ngang vô hướng", vừa có thể là nhịp chỉnh trong xu hướng
   tăng (đúng vùng LONG-A). Lấy nó làm cổng là loại nhầm. */
function viTri24(t) {
  const bd = t.high24 - t.low24;
  if (!(bd > 0)) return 0.5;
  return Math.min(1, Math.max(0, (t.last - t.low24) / bd));
}

/* ------------------------------------------------------------------
   CỔNG 1 — lọc rác. Coin không đủ tư cách thống kê thì loại thẳng.
   ------------------------------------------------------------------ */
function quaLocCoBan(t, hopDong, cfg, bayGio) {
  if (!hopDong || hopDong.state !== 'live') return false;
  if (t.volUsd < cfg.VOL24_TOI_THIEU_USD) return false;
  const tuoiNgay = (bayGio - hopDong.listTime) / 86400e3;
  if (tuoiNgay < cfg.TUOI_COIN_TOI_THIEU_NGAY) return false;   // coin non = thống kê rác
  return true;
}

/* ------------------------------------------------------------------
   CỔNG 2 — XU HƯỚNG. Đây là phần thay cho việc "lấy top N".

   Hai vế, phải qua CẢ HAI:
     (a) biên độ 24h đủ lớn        → coin có ĐỘNG hay không
     (b) chg24 nằm trong vùng TIỀN-SETUP của ít nhất 1 trong 4 setup
                                   → cái động đó có ĐÚNG HƯỚNG nào không

   Vế (b) nới ngưỡng gốc của setup ra một khoảng đệm `DEM_TIEN_SETUP`.
   ⛔ Đây KHÔNG phải nới điều kiện vào lệnh — điều kiện COIN của 4 setup
   trong `lib/khung.js` giữ nguyên 100%. Đệm ở đây chỉ để LÀM NÓNG engine
   TRƯỚC khi coin đủ điều kiện: `wallTrust` cần thời gian tích luỹ, bật
   engine đúng lúc cần thì tín hiệu dẫn mù đúng lúc quan trọng nhất.

   `dangTheo` = coin đang được theo dõi → nới ngưỡng ra (trễ / hysteresis).
   Không có vế này thì coin nằm sát mép lọc sẽ bị bật/tắt engine liên tục,
   và mỗi lần tắt là mất sạch lịch sử tường đã tích được.
   ------------------------------------------------------------------ */
function quaLocXuHuong(t, cfg, dangTheo) {
  const L = cfg.LOC_COIN;
  const k = dangTheo ? L.NOI_LONG_KHI_DA_THEO : 1;

  if (bienDo24(t) < L.BIEN_DO_24H_TOI_THIEU / k) return false;

  const S = cfg.SETUP, c = t.chg24, dem = L.DEM_TIEN_SETUP * k;
  if (c >= S['SHORT-A'].chg24Min - dem) return true;                 // đã pump mạnh
  if (c >= S['SHORT-B'].tangThemMin - dem) return true;              // đang pump tiếp
  if (c >= S['LONG-A'].chg24[0] - dem && c <= S['LONG-A'].chg24[1] + dem) return true;
  if (c <= S['LONG-B'].chg24Max + dem) return true;                  // đã dump mạnh
  return false;
}

/* ------------------------------------------------------------------
   XẾP HẠNG — chỉ có tác dụng KHI TRẦN AN TOÀN BỊ CHẠM.

   ⚠ Khác hẳn bản trước 2026-08-12: hồi đó hàm này có dòng chốt
   `if (d < 0) d = Math.abs(chg24) * 10` gán điểm cho MỌI coin, nên danh
   sách top-N LUÔN bị lấp đầy kể cả khi chẳng coin nào có xu hướng —
   theo dõi coin rác chỉ để cho đủ chỗ. Nay việc "được vào hay không" do
   `quaLocXuHuong` quyết; hàm này chỉ trả lời "ai trước ai sau" trong số
   những coin ĐÃ qua lọc.
   ------------------------------------------------------------------ */
function diemQuan(t, cfg) {
  const S = cfg.SETUP, L = cfg.LOC_COIN, c = t.chg24;
  let d = 0;
  if (c >= S['SHORT-A'].chg24Min) d = Math.max(d, L.DIEM_SHORT_A + c * 100);
  if (c >= S['LONG-A'].chg24[0] && c <= S['LONG-A'].chg24[1]) d = Math.max(d, L.DIEM_LONG_A + c * 100);
  if (c <= S['LONG-B'].chg24Max) d = Math.max(d, L.DIEM_LONG_B + Math.abs(c) * 100);
  /* coin còn trong vùng tiền-setup (chưa đủ điều kiện) vẫn có điểm nền,
     nhưng luôn thua coin đã đủ điều kiện */
  d = Math.max(d, Math.abs(c) * L.DIEM_NEN_HE_SO);

  /* Giá sát mép biên độ 24h = đang ở chỗ setup quan tâm (đỉnh pump để
     short, đáy dump để long). Giữa biên độ = lưỡng lự. Cộng nhẹ thôi —
     đây là suy đoán chưa có mẫu chứng minh. */
  const v = viTri24(t);
  d += Math.abs(v - 0.5) * 2 * L.DIEM_SAT_MEP;
  return d;
}

module.exports = { bienDo24, viTri24, quaLocCoBan, quaLocXuHuong, diemQuan };
