'use strict';
/* =====================================================================
   CHỌN SETUP.  ⛔ MỞ 24/24 TUYỆT ĐỐI — KHÔNG CÒN CỔNG NÀO THEO GIỜ.

   File này TỪNG là "cổng khung giờ". Nay nó chỉ còn hai việc:

     1. CHỌN SETUP — xét điều kiện COIN của 4 setup, ở MỌI thời điểm.
        Không giờ nào bị chặn, kể cả 04:00–06:00.

     2. GẮN NHÃN `trongKhung` — 1 nếu lúc này đang trùng khung gốc của
        setup vừa chọn. ⚠ ĐÂY LÀ NHÃN DỮ LIỆU, KHÔNG PHẢI CỔNG. Không
        hàm nào ở file này được chặn lệnh vì giờ, và cũng không được
        trả về điểm số cộng vào S.

   Vì sao vẫn giữ nhãn `trongKhung` khi đã bỏ hết ràng buộc giờ:
   đó là phép thử duy nhất trả lời được câu "khung giờ có thật hay
   không". Trước đây nhóm "ngoài khung" bị chặn nên không bao giờ có
   thắng/thua để so. Giờ CẢ HAI nhóm đều là lệnh thật → so sánh mới có
   nghĩa. Xoá nhãn = mất vĩnh viễn khả năng trả lời (mục 16.2 XAY-BOT.md).
   ===================================================================== */

const phutCua = s => {
  const [h, m] = String(s).split(':').map(Number);
  return h * 60 + (m || 0);
};

function gioVN(ts = Date.now()) {
  const d = new Date(ts + 7 * 3600e3);
  return {
    gio: d.getUTCHours(),
    phut: d.getUTCMinutes(),
    tongPhut: d.getUTCHours() * 60 + d.getUTCMinutes(),
    ngay: d.toISOString().slice(0, 10),
    nhan: String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'),
  };
}

/** Xử lý cả khoảng vắt qua nửa đêm (23:00 → 03:00).
 *  ⚠ CHỈ dùng để GẮN NHÃN `trongKhung`, không dùng để chặn. */
function trongKhoang(tongPhut, tu, den) {
  const a = phutCua(tu), b = phutCua(den);
  return a <= b ? (tongPhut >= a && tongPhut < b) : (tongPhut >= a || tongPhut < b);
}

/** Nhãn: lúc `tongPhut` có trùng khung gốc của setup không. */
function trongKhungGoc(cfg, ten, tongPhut) {
  const k = cfg.SETUP[ten];
  return !!(k && k.khungGoc && trongKhoang(tongPhut, k.khungGoc.tu, k.khungGoc.den));
}

/**
 * Setup nào có coin đủ điều kiện. Xét ở MỌI thời điểm.
 *
 * ⛔ Điều kiện COIN của 4 setup giữ nguyên 100% so với bản có khung giờ.
 * Thứ duy nhất bị gỡ là câu hỏi "bây giờ là mấy giờ".
 *
 * @returns {{setup:string|null, huong:string|null, trongKhung:boolean, lyDo:string[]}}
 */
function chonSetup(cfg, coin, P, boiCanh) {
  const G = gioVN();
  const K = cfg.SETUP;
  const lyDo = [];

  const f8 = P.funding8h;
  const chg24 = coin.chg24;
  const oiTang = P.dOi25 !== null && P.dOi25 > 0.002;
  const oiGiam = P.dOi25 !== null && P.dOi25 < -0.002;

  const chot = (ten) => ({
    setup: ten, huong: K[ten].huong, gioVN: G, lyDo: [],
    trongKhung: trongKhungGoc(cfg, ten, G.tongPhut),
  });

  /* ---------------- SHORT-A · đỉnh pump ---------------- */
  {
    const k = K['SHORT-A'];
    const thieu = [];
    if (!(chg24 >= k.chg24Min)) thieu.push(`chg24 ${(chg24 * 100).toFixed(1)}% < ${k.chg24Min * 100}%`);
    if (!(f8 !== null && f8 >= k.fundingMin)) thieu.push(`funding ${f8 === null ? '?' : (f8 * 100).toFixed(3) + '%'} < ${k.fundingMin * 100}%`);
    if (f8 !== null && f8 < 0) thieu.push('⛔ funding ÂM — mồi squeeze');
    if (!oiTang) thieu.push('OI không tăng cùng giá');
    if (P.dP25 > 0 && oiGiam) thieu.push('⛔ OI giảm khi giá tăng — squeeze đang chạy');
    if (!thieu.length) return chot('SHORT-A');
    lyDo.push('SHORT-A: ' + thieu[0]);
  }

  /* ---------------- SHORT-B · nối tiếp sau cú pump ----------------
     Mốc 07:00 là MỐC THAM CHIẾU, không phải khung giờ: "đã tăng thêm bao
     nhiêu so với 07:00 gần nhất". `docMocGia` trả mốc GẦN NHẤT đã chụp
     nên setup này chạy được cả ngày lẫn đêm, không chết lúc 00:00–07:00
     như bản cũ (đọc mốc theo đúng-ngày-hôm-nay).
     Thiếu mốc = thiếu DỮ LIỆU → không vào lệnh. Đó là fail-closed, đúng. */
  {
    const k = K['SHORT-B'];
    const thieu = [];
    const moc = boiCanh.mocGia;
    if (!moc || !moc.da_tang30_hom_qua) thieu.push('chưa có cú tăng 30% để nối tiếp');
    else if (!moc.gia_7h) thieu.push('thiếu mốc giá 07:00');
    else {
      const tangThem = P.mid / parseFloat(moc.gia_7h) - 1;
      if (!(tangThem >= k.tangThemMin))
        thieu.push(`mới tăng thêm +${(tangThem * 100).toFixed(1)}% < ${k.tangThemMin * 100}%`);
    }
    if (!(f8 !== null && f8 >= k.fundingMin)) thieu.push('funding chưa đủ dương');
    if (f8 !== null && f8 < 0) thieu.push('⛔ funding ÂM — mồi squeeze');
    if (!thieu.length) return chot('SHORT-B');
    lyDo.push('SHORT-B: ' + thieu[0]);
  }

  /* ---------------- LONG-A · đà tăng sớm ---------------- */
  {
    const k = K['LONG-A'];
    const thieu = [];
    if (!(chg24 >= k.chg24[0] && chg24 <= k.chg24[1]))
      thieu.push(`chg24 ${(chg24 * 100).toFixed(1)}% ngoài ${k.chg24[0] * 100}–${k.chg24[1] * 100}%`);
    /* funding CÒN THẤP = chưa ai để ý = còn dư địa. Đây là chìa khoá
       phân biệt LONG với SHORT ở cùng một mức tăng. */
    if (!(f8 !== null && f8 < k.fundingMax))
      thieu.push(`funding ${f8 === null ? '?' : (f8 * 100).toFixed(3) + '%'} đã cao — hết dư địa`);
    if (!oiTang) thieu.push('OI không tăng cùng giá');
    if (!thieu.length) return chot('LONG-A');
    lyDo.push('LONG-A: ' + thieu[0]);
  }

  /* ---------------- LONG-B · bắt đáy ---------------- */
  {
    const k = K['LONG-B'];
    const thieu = [];
    if (!(chg24 <= k.chg24Max)) thieu.push(`chg24 ${(chg24 * 100).toFixed(1)}% > ${k.chg24Max * 100}%`);
    if (!boiCanh.khongTaoDayMoi2h) thieu.push('vẫn đang tạo đáy mới — chưa đi ngang');
    if (!oiGiam) thieu.push('OI chưa giảm — long chưa bị rũ hết');
    if (!(f8 !== null && f8 <= k.fundingMax)) thieu.push('funding chưa về 0 hoặc âm');
    /* Luật riêng: coin vừa pump lớn hôm trước thì hôm sau nó đang XẢ,
       không phải đang giảm. Xả kéo dài nhiều ngày — đừng đỡ dao rơi.
       ⛔ FAIL-CLOSED: THIẾU mốc cũng chặn. Bản cũ viết `if (mocGia && ...)`
       nên khi thiếu mốc thì luật này im lặng biến mất — và vì mốc chỉ có
       sau 07:00, LONG-B mỗi đêm lại được vào lệnh mà KHÔNG bị luật này
       soi. Thiếu dữ liệu phải là lý do TỪ CHỐI, không phải lý do cho qua. */
    if (!boiCanh.mocGia) thieu.push('thiếu mốc giá — không biết hôm trước có pump không');
    else if (boiCanh.mocGia.da_tang30_hom_qua)
      thieu.push('⛔ vừa pump >30% — đang XẢ, không phải đang giảm');
    if (!thieu.length) return chot('LONG-B');
    lyDo.push('LONG-B: ' + thieu[0]);
  }

  return {
    setup: null, huong: null, trongKhung: false, gioVN: G,
    lyDo: lyDo.length ? lyDo : ['chưa coin nào đủ điều kiện'],
  };
}

/** Nhãn hiển thị trên thanh trạng thái. Thuần thông tin — không chặn gì.
 *  Hiện khung gốc đang trùng để nhìn là biết lệnh rơi vào nhóm nào. */
function khungDangMo(cfg) {
  const G = gioVN();
  const r = [];
  for (const ten of Object.keys(cfg.SETUP)) {
    if (trongKhungGoc(cfg, ten, G.tongPhut)) r.push(ten);
  }
  return '24/24' + (r.length ? ' · trùng ' + r.join('+') : '');
}

module.exports = { gioVN, trongKhoang, trongKhungGoc, chonSetup, khungDangMo, phutCua };
