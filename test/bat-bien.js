'use strict';
/* =====================================================================
   KIỂM BẤT BIẾN — chạy: npm test

   Đây không phải test "cho có". Mỗi bất biến ở đây tương ứng một cách
   làm cháy tài khoản đã biết. Test đỏ thì ĐỪNG chạy bot.
   ===================================================================== */

const fs = require('fs');
const path = require('path');

/* --- chặn mọi lệnh ghi DB TRƯỚC khi nạp lenh.js --- */
process.env.BOT_TEST = '1';
const DB = require('../lib/db');
for (const k of ['ghiTinHieu', 'moLenh', 'capNhatLenh', 'dongLenh', 'ghiLanVao',
                 'ghiSuKien', 'ghiNhip', 'ghiMocGia']) DB[k] = () => 1;
DB.docMocGia = () => null;
DB.thuaLienTiep = () => 0;
DB.demLenhHomNay = () => ({});
DB.sucKhoe = () => ({ sanSang: true, hangDoi: 0, daGhi: 0, loi: 0, boRoi: 0 });

const cfg = require('../config');
const { QuanLyLenh, TT } = require('../lib/lenh');
const K = require('../lib/khung');
const T = require('../lib/tuong');
const { crc32 } = require('../lib/okx-ws');

let ok = 0, xau = 0;
function kiem(ten, dk, chiTiet) {
  if (dk) { ok++; console.log('  ✅', ten); }
  else { xau++; console.log('  ❌', ten, chiTiet !== undefined ? '→ ' + JSON.stringify(chiTiet) : ''); }
}
const nhom = t => console.log('\n' + t);
const G2 = x => Math.round(x * 100) / 100;

/* ------------------------------------------------------------ tiện ích */
function soGia(mid, buoc = null, n = 40) {
  const b = buoc || mid * 0.0002;
  const bids = [], asks = [];
  for (let i = 0; i < n; i++) {
    bids.push({ p: mid - b * (i + 1), sz: 100, nOrd: 5, m: 20000 - i * 200 });
    asks.push({ p: mid + b * (i + 1), sz: 100, nOrd: 5, m: 20000 - i * 200 });
  }
  return { bids, asks, mid };
}
const engineGia = () => ({ tuong: T.taoBoTuong(), dongTien: [], thanhLy: [], giaHist: [], oiHist: [], dbiHist: [] });

const P0 = (mid, extra = {}) => ({
  mid, S: -60, coSHORT: true, coLONG: false, coCHOT_short: false, coCHOT_long: false,
  dOi25: 0.01, dP25: 0.01, funding8h: 0.0008, dinhGan: mid, dayGan: mid,
  bookM: 1e6, mua30: 1e4, ban30: 1e4, mua5: 1.6e3, ban5: 1.6e3, hoatDong: 3, ...extra,
});
const P_KHONG_CO = (mid, extra = {}) => P0(mid, { coSHORT: false, coLONG: false, ...extra });
const BC = { tickSz: 0.0001, verTrongSo: 'test', dinhPump: null, nenTuChoi: false, mocGia: null, khongTaoDayMoi2h: false };
const CONG = { cho: true, setup: 'SHORT-A', huong: 'short', lyDo: [] };

/** mở một lệnh SHORT ở giá `gia` */
function moLenhThu(gia = 1.0, von = null) {
  const c = von ? { ...cfg, VON: von } : cfg;
  const QL = new QuanLyLenh(c);
  const E = engineGia();
  const st = QL.layTT('X');
  QL.capNhat('X', E, soGia(gia), P0(gia), CONG, BC);
  st.demXacNhan = cfg.XAC_NHAN_TICK;
  QL.capNhat('X', E, soGia(gia), P0(gia), CONG, BC);
  return { QL, E, st };
}
/** đẩy giá tới `g` (SHORT: g<1 là lãi) */
function dayGia(QL, E, st, g, extra = {}) {
  QL.capNhat('X', E, soGia(g), P0(g, { dinhGan: Math.max(1, g), dayGan: Math.min(1, g), ...extra }), CONG, BC);
}

/* ================================================================= */
nhom('CẤU HÌNH — các cờ BẤT BIẾN');
kiem('CHE_DO khởi động là "giay"', cfg.CHE_DO === 'giay', cfg.CHE_DO);
kiem('VỐN cứng $200', cfg.VON === 200, cfg.VON);
kiem('vào lần 1 = $6', cfg.KY_QUY_LAN_1 === 6, cfg.KY_QUY_LAN_1);
kiem('DCA = $4', cfg.KY_QUY_DCA === 4, cfg.KY_QUY_DCA);
kiem('⛔ DCA TỐI ĐA 1 LẦN', cfg.SO_LAN_DCA_TOI_DA === 1, cfg.SO_LAN_DCA_TOI_DA);
kiem('cắt lỗ $20, trần $25', cfg.CAT_LO_USD === 20 && cfg.CAT_LO_USD_TRAN === 25);
kiem('cắt lỗ tính bằng ĐÔ — không còn CAT_LO theo %', cfg.CAT_LO === undefined);
kiem('KHÔNG còn thang chốt lời cố định', cfg.THANG_CHOT === undefined);
kiem('KHÔNG còn TP_TOI_THIEU / NG_RR', cfg.TP_TOI_THIEU === undefined && cfg.NG_RR === undefined);
kiem('cửa sổ DCA là HÀNG RÀO $4–$10', Array.isArray(cfg.CUA_SO_DCA_USD) && cfg.CUA_SO_DCA_USD[1] <= 10);
kiem('rào chắn tối thiểu ≥ 30 phút', cfg.RAO_CHAN_TOI_THIEU >= 30, cfg.RAO_CHAN_TOI_THIEU);
kiem('hồi lại tối thiểu 5 điểm', cfg.HOI_LAI_TOI_THIEU === 5);
kiem('trần hồi lại ≤ 50% đỉnh (không trả lại quá nửa)', cfg.HOI_LAI_TRAN <= 0.5);
kiem('DONG_VI_HET_GIO = false', cfg.DONG_VI_HET_GIO === false);
kiem('DONG_VI_CAU_TRUC = false', cfg.DONG_VI_CAU_TRUC === false);
kiem('DONG_VI_FUNDING_DAO = false', cfg.DONG_VI_FUNDING_DAO === false);
kiem('VAO_BANG_GIA_HIEN_TAI = true', cfg.VAO_BANG_GIA_HIEN_TAI === true);
kiem('KHÔNG có HAN_CHO_VAO', cfg.HAN_CHO_VAO_PHUT === undefined);
kiem('NGUONG_DAO > NGUONG_VAO', cfg.NGUONG_DAO > cfg.NGUONG_VAO);
kiem('WARMUP_GIAY >= 300', cfg.WARMUP_GIAY >= 300);
/* ⛔ TRẦN LỆNH MỞ là bất biến TIỀN: lỗ đồng thời tối đa = N × CAT_LO_USD.
   N=3 → $60 = 30% vốn $200. Nới N là nới lỗ tối đa theo tỷ lệ thẳng, cộng
   thêm đòn bẩy ẩn qua tương quan giữa các alt. Đây là con số phải khoá. */
kiem('trần lệnh mở = 3', cfg.SO_LENH_MO_TOI_DA === 3);
kiem('lỗ đồng thời tối đa <= 1/3 vốn',
  cfg.SO_LENH_MO_TOI_DA * cfg.CAT_LO_USD <= cfg.VON / 3);

/* Số coin theo dõi thì NGƯỢC LẠI — là tham số dò, không phải bất biến.
   Trước đây hai số này bị khoá chung trong một phép kiểm `=== 3 && === 3`,
   khiến việc nới cần gạt lấy mẫu không thể làm mà không đồng thời nới cần
   gạt rủi ro. Đó là lý do phép kiểm cũ sai và bị tách. Chỉ còn giữ hai
   ràng buộc thật sự có nghĩa: */
kiem('trần coin >= trần lệnh mở',
  cfg.SO_COIN_TRAN >= cfg.SO_LENH_MO_TOI_DA);
kiem('trần coin trong khoảng dò được',
  cfg.SO_COIN_TRAN >= 3 && cfg.SO_COIN_TRAN <= 40);

/* ================================================================= */
nhom('⭐ LỌC COIN — số lượng là KẾT QUẢ của bộ lọc, không phải chỉ tiêu');
{
  const LC = require('../lib/loc-coin');
  /* ticker giả, chỉ những trường máy quét thật sự có */
  const tk = (chg24, bienDo, viTri = 0.5) => {
    const last = 100, dai = last * bienDo;
    const low24 = last - dai * viTri, high24 = low24 + dai;
    return { sym: 'X', last, high24, low24, chg24, volUsd: 1e9, open24: last / (1 + chg24) };
  };

  kiem('biên độ 24h tính đúng', Math.abs(LC.bienDo24(tk(0.3, 0.20)) - 0.20) < 1e-9);
  kiem('vị trí 24h: sát đỉnh = 1', Math.abs(LC.viTri24(tk(0.3, 0.20, 1)) - 1) < 1e-9);
  kiem('vị trí 24h: sát đáy = 0', LC.viTri24(tk(0.3, 0.20, 0)) < 1e-9);
  kiem('biên độ = 0 thì KHÔNG chia cho 0',
    LC.bienDo24({ last: 100, high24: 100, low24: 100 }) === 0 &&
    LC.viTri24({ last: 100, high24: 100, low24: 100 }) === 0.5);

  /* ⭐ Bất biến trung tâm: coin ĐI NGANG bị loại, dù chg24 nhìn có vẻ to.
     Đây chính là thứ bản "lấy top N" cũ KHÔNG làm được — nó gán điểm cho
     mọi coin nên luôn lấp đầy N chỗ bằng coin rác. */
  kiem('⛔ coin ĐI NGANG bị loại (biên độ 24h quá nhỏ)',
    LC.quaLocXuHuong(tk(0.35, 0.01), cfg, false) === false);
  kiem('coin pump mạnh + biên độ rộng ĐƯỢC nhận',
    LC.quaLocXuHuong(tk(0.35, 0.40), cfg, false) === true);
  kiem('coin dump mạnh ĐƯỢC nhận (LONG-B)',
    LC.quaLocXuHuong(tk(-0.20, 0.25), cfg, false) === true);
  kiem('coin biến động nhưng KHÔNG hướng nào bị loại',
    LC.quaLocXuHuong(tk(-0.02, 0.12), cfg, false) === false);

  /* vùng TIỀN-setup: nhận coin CHƯA đủ điều kiện, để làm nóng wallTrust */
  const gan = cfg.SETUP['LONG-B'].chg24Max + cfg.LOC_COIN.DEM_TIEN_SETUP / 2;
  kiem('vùng tiền-setup nhận coin SẮP đủ điều kiện (làm nóng wallTrust)',
    LC.quaLocXuHuong(tk(gan, 0.25), cfg, false) === true);

  /* TRỄ: coin đang theo dõi phải khó bị loại hơn coin mới */
  const mep = cfg.LOC_COIN.BIEN_DO_24H_TOI_THIEU * 0.9;
  kiem('TRỄ: coin sát mép — chưa theo thì loại, đang theo thì giữ',
    LC.quaLocXuHuong(tk(0.35, mep), cfg, false) === false &&
    LC.quaLocXuHuong(tk(0.35, mep), cfg, true) === true);
  kiem('ngưỡng nới lỏng phải > 1 (nếu không thì KHÔNG có trễ)',
    cfg.LOC_COIN.NOI_LONG_KHI_DA_THEO > 1);

  /* ⛔ Bộ lọc KHÔNG được nới điều kiện vào lệnh — đệm phải nhỏ hơn
     khoảng cách giữa hai setup gần nhau nhất, nếu không vùng tiền-setup
     nuốt luôn cả vùng của setup khác. */
  kiem('đệm tiền-setup nhỏ hơn bề rộng vùng LONG-A',
    cfg.LOC_COIN.DEM_TIEN_SETUP < cfg.SETUP['LONG-A'].chg24[1] - cfg.SETUP['LONG-A'].chg24[0]);
  kiem('biên độ tối thiểu KHÔNG chặn nhầm setup nhỏ nhất',
    cfg.LOC_COIN.BIEN_DO_24H_TOI_THIEU < cfg.SETUP['LONG-A'].chg24[0]);

  /* xếp hạng: coin ĐÃ đủ điều kiện luôn trên coin mới ở vùng tiền-setup */
  kiem('xếp hạng: coin đủ điều kiện > coin vùng tiền-setup',
    LC.diemQuan(tk(0.35, 0.40), cfg) > LC.diemQuan(tk(0.12 - 0.04, 0.40), cfg));
  /* ⛔ Dòng `if (d < 0) d = ...` của bản cũ gán điểm cho MỌI coin nên
     danh sách top-N luôn bị lấp đầy bằng coin rác. Quét trên MÃ đã bỏ
     chú thích — chú thích có nhắc lại dòng cũ để giải thích. */
  const maLoc = fs.readFileSync(path.join(__dirname, '..', 'lib', 'loc-coin.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  kiem('xếp hạng KHÔNG còn dòng gán điểm cho mọi coin', !/d < 0/.test(maLoc));
}

/* ================================================================= */
nhom('BẤT BIẾN — LỆNH ĐÃ MỞ CHỈ CÓ 3 ĐƯỜNG RA (quét mã nguồn)');
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'lenh.js'), 'utf8');
  const than = ten => {
    const i = src.indexOf('  ' + ten + '(');
    if (i < 0) return '';
    let d = 0, j = src.indexOf('{', i);
    for (let k = j; k < src.length; k++) {
      if (src[k] === '{') d++;
      else if (src[k] === '}') { d--; if (!d) return src.slice(j, k); }
    }
    return '';
  };
  const dem = s => (s.match(/this\._dong\s*\(/g) || []).length;

  kiem('_xuLyLenhMo: 2 lời gọi _dong, cả hai là CẮT LỖ',
    dem(than('_xuLyLenhMo')) === 2 && /cat_lo/.test(than('_xuLyLenhMo')), dem(than('_xuLyLenhMo')));
  kiem('_xuLyChotLoi: 1 lời gọi _dong, là CHỐT LỜI',
    dem(than('_xuLyChotLoi')) === 1 && /chot_loi/.test(than('_xuLyChotLoi')), dem(than('_xuLyChotLoi')));
  kiem('⛔ _xuLyDCA KHÔNG BAO GIỜ đóng lệnh', dem(than('_xuLyDCA')) === 0, dem(than('_xuLyDCA')));
  kiem('⛔ _canhBao KHÔNG BAO GIỜ đóng lệnh (chỉ vẽ ⚠)', dem(than('_canhBao')) === 0, dem(than('_canhBao')));
  kiem('không đóng vì hết giờ', !/_dong\([^)]*het_gio/.test(src));
  kiem('không đóng vì cấu trúc gãy', !/_dong\([^)]*cau_truc/.test(src));
  kiem('không đóng vì funding đảo', !/_dong\([^)]*funding/.test(src));
  kiem('không còn thang chốt lời trong code', !/THANG_CHOT/.test(src));
}

/* ================================================================= */
nhom('TIỀN — $6 vào, $4 DCA, đều ×10, KHÔNG co giãn theo vốn');
{
  const a = moLenhThu(1.0);
  kiem('vào lệnh = $6 ký quỹ', a.st.lenh && a.st.lenh.kyQuy === 6, a.st.lenh && a.st.lenh.kyQuy);
  kiem('giá trị lệnh = $60', a.st.lenh && G2(a.st.lenh.notional) === 60, a.st.lenh && a.st.lenh.notional);
  const b = moLenhThu(1.0, 1000);
  kiem('vốn $1000 → size vẫn $6 (tính bằng ĐÔ, không phải %)', b.st.lenh && b.st.lenh.kyQuy === 6);
  const c = moLenhThu(1.0, 20);
  kiem('vốn $20 → size vẫn $6', c.st.lenh && c.st.lenh.kyQuy === 6);
}

/* ================================================================= */
nhom('CẮT LỖ — tính bằng SỐ TIỀN, tự siết sau khi DCA');
{
  const { QL, E, st } = moLenhThu(1.0);
  kiem('giá cắt ≈ +33% khi chưa DCA ($20 trên $60)',
    Math.abs(st.lenh.giaCat / st.lenh.giaVao1 - 1.3333) < 0.01, G2(st.lenh.giaCat / st.lenh.giaVao1));

  let dong = false;
  for (let g = 1.0; g <= 1.7 && !dong; g += 0.01) { dayGia(QL, E, st, g); if (!st.lenh) dong = true; }
  kiem('lệnh bị cắt khi lỗ chạm ngưỡng tiền', dong);
  const h = QL.lichSu[0];
  kiem('lỗ khi cắt nằm trong −$20…−$27', h && h.pnl <= -19.5 && h.pnl >= -27, h && G2(h.pnl));
  kiem('R ≈ −1 (mẫu số cố định = mức lỗ thiết kế)', h && h.R <= -0.95 && h.R >= -1.36, h && G2(h.R));
  kiem('lý do đóng là cắt lỗ', h && /cat_lo/.test(h.lyDo), h && h.lyDo);
}

/* ================================================================= */
nhom('DCA — hàng rào KHÁC căn cứ');
{
  const A = moLenhThu(1.0);
  let daDCA = false;
  for (let g = 1.02; g <= 1.14 && !daDCA; g += 0.01) {
    A.QL.capNhat('X', A.E, soGia(g), P0(g, { dinhGan: g, dayGan: 1.0, dOi25: 0 }),
      CONG, { ...BC, nenTuChoi: true });
    if (A.st.lenh && A.st.lenh.soLanDCA > 0) daDCA = true;
  }
  kiem('có căn cứ (rào chắn dày + nến từ chối) → DCA', daDCA);
  if (daDCA) {
    kiem('DCA thêm đúng $4 → tổng $10', A.st.lenh.kyQuy === 10, A.st.lenh.kyQuy);
    kiem('giá trị lệnh thành $100', G2(A.st.lenh.notional) === 100, A.st.lenh.notional);
    kiem('giá cắt SIẾT LẠI sau DCA (< 25% thay vì 33%)',
      (A.st.lenh.giaCat / A.st.lenh.giaVaoTB - 1) < 0.25, G2(A.st.lenh.giaCat / A.st.lenh.giaVaoTB - 1));
    for (let g = 1.15; g <= 1.28; g += 0.01) {
      A.QL.capNhat('X', A.E, soGia(g), P0(g, { dinhGan: g, dayGan: 1.0, dOi25: 0 }),
        CONG, { ...BC, nenTuChoi: true });
    }
    kiem('⛔ DCA ĐÚNG MỘT LẦN, không bao giờ hai',
      !A.st.lenh || A.st.lenh.soLanDCA === 1, A.st.lenh && A.st.lenh.soLanDCA);
  }

  const B = moLenhThu(1.0);
  for (let g = 1.02; g <= 1.12; g += 0.01) {
    B.QL.capNhat('X', B.E, soGia(g), P0(g, { dinhGan: g, dayGan: 1.0, dOi25: 0.05, mua5: 5e3 }),
      CONG, { ...BC, nenTuChoi: false });
  }
  kiem('⛔ squeeze đang chạy → KHÔNG DCA dù lỗ đúng trong hàng rào',
    B.st.lenh && B.st.lenh.soLanDCA === 0, B.st.lenh && B.st.lenh.soLanDCA);
  kiem('số tiền lỗ KHÔNG tự kích hoạt DCA', B.st.lenh && B.st.lenh.kyQuy === 6);
}

/* ================================================================= */
nhom('RÀO CHẮN — phiên bản đo được của "khả năng chạm cắt lỗ thấp"');
{
  const E = engineGia();
  const A = soGia(1.0);
  const rcCham = T.raoChan(E.tuong, A, 'short', 1.30, 100);
  const rcNhanh = T.raoChan(E.tuong, A, 'short', 1.30, 100000);
  kiem('dòng tiền chậm → rào chắn DÀY', rcCham > rcNhanh, { cham: Math.round(rcCham), nhanh: G2(rcNhanh) });
  kiem('rào chắn tỷ lệ nghịch với tốc độ', Math.abs(rcCham / rcNhanh - 1000) < 1);
  kiem('không có dòng tiền đe doạ → vô hạn', T.raoChan(E.tuong, A, 'short', 1.30, 0) === Infinity);
  kiem('mốc giá sát giá hiện tại → rào chắn mỏng hơn',
    T.raoChan(E.tuong, A, 'short', 1.0001, 100) < rcCham);
}

/* ================================================================= */
nhom('CHỐT LỜI — đỉnh lãi · báo động · hồi lại');
{
  const cong = d => Math.min(Math.max(cfg.HOI_LAI_TOI_THIEU, cfg.HOI_LAI_TY_LE * d), cfg.HOI_LAI_TRAN * d);
  kiem('đỉnh +6% → ngưỡng 3 điểm (không trả quá nửa)', G2(cong(6)) === 3, cong(6));
  kiem('đỉnh +10% → ngưỡng 5 điểm', G2(cong(10)) === 5, cong(10));
  kiem('đỉnh +20% → ngưỡng 5 điểm', G2(cong(20)) === 5, cong(20));
  kiem('đỉnh +40% → ngưỡng 10 điểm', G2(cong(40)) === 10, cong(40));
  kiem('không bao giờ trả lại quá 50% đỉnh', [4, 6, 10, 20, 40, 80].every(d => cong(d) <= 0.5 * d + 1e-9));

  /* --- đúng ví dụ của chủ dự án --- */
  const { QL, E, st } = moLenhThu(1.0);
  dayGia(QL, E, st, 0.90);
  kiem('lãi +10% → ghi nhận đỉnh lãi', st.lenh && st.lenh.dinhLai * 100 >= 9, G2(st.lenh.dinhLai * 100));

  dayGia(QL, E, st, 0.90, { coCHOT_short: true });
  kiem('cò đảo nổ khi ĐANG LÃI → GÀI báo động', st.lenh && st.lenh.baoDong === true);

  dayGia(QL, E, st, 0.92, { coCHOT_short: true });
  kiem('hồi 2 điểm < ngưỡng 5 → VẪN GỒNG ✅', !!st.lenh, st.trangThai);

  dayGia(QL, E, st, 0.87);
  kiem('đỉnh mới +13% → GỠ báo động ✅',
    st.lenh && st.lenh.baoDong === false && st.lenh.dinhLai * 100 >= 12,
    st.lenh && { baoDong: st.lenh.baoDong, dinh: G2(st.lenh.dinhLai * 100) });

  dayGia(QL, E, st, 0.87, { coCHOT_short: true });
  dayGia(QL, E, st, 0.95, { coCHOT_short: true });
  kiem('báo động + hồi đủ sâu → CHỐT LỜI', !st.lenh, st.trangThai);
  const h = QL.lichSu[0];
  kiem('lý do đóng là chot_loi', h && h.lyDo === 'chot_loi', h && h.lyDo);
  kiem('chốt lời ra PnL DƯƠNG', h && h.pnl > 0, h && G2(h.pnl));
}

/* ================================================================= */
nhom('CHỐT LỜI — cò đảo nổ lúc ĐANG LỖ thì KHÔNG đóng');
{
  const { QL, E, st } = moLenhThu(1.0);
  for (let i = 0; i < 30; i++) dayGia(QL, E, st, 1.05, { coCHOT_short: true });
  kiem('đang lỗ + cò đảo nổ liên tục → vẫn gồng', !!st.lenh, st.trangThai);
  kiem('không gài báo động khi đang lỗ', st.lenh && st.lenh.baoDong === false);
}

/* ================================================================= */
nhom('CHẾ ĐỘ TEST DÀI — vốn âm vẫn ghi lệnh');
{
  kiem('CHO_AM_VON đang bật', cfg.CHO_AM_VON === true);
  const QL = new QuanLyLenh(cfg);
  kiem('có hiệu lực vì CHE_DO = giay', QL.choAmVon === true);
  kiem('⛔ TIỀN THẬT thì CHO_AM_VON bị VÔ HIỆU',
    new QuanLyLenh({ ...cfg, CHE_DO: 'day' }).choAmVon === false);

  QL.von = -50;
  kiem('vốn âm vẫn tính được', QL.vonHienTai() === -50);
  kiem('cổng thanh lý KHÔNG chặn ở chế độ test', QL.congThanhLy(1000).qua === true);
  kiem('nhưng vẫn đánh dấu "đáng lẽ đã chặn"', QL.congThanhLy(1000).batBuocQua === true);
  QL._kiemChayLyThuyet();
  kiem('ghi nhận CHÁY LÝ THUYẾT', QL.soLanChayLyThuyet === 1, QL.soLanChayLyThuyet);
  kiem('theo dõi vốn thấp nhất', QL.vonThapNhat <= -50, QL.vonThapNhat);
  QL._kiemNgatMach();
  kiem('ngắt mạch KHÔNG dừng bot ở chế độ test', QL.dungMoMoi === false);

  const QL3 = new QuanLyLenh({ ...cfg, CHO_AM_VON: false });
  QL3.von = -50; QL3._kiemNgatMach();
  kiem('tắt CHO_AM_VON thì ngắt mạch DỪNG như thường', QL3.dungMoMoi === true);
}

/* ================================================================= */
nhom('PHÍ · TRƯỢT GIÁ · FUNDING — phải BI QUAN hơn sàn thật');
{
  kiem('phí 0,06% > taker thật 0,05%', cfg.PHI_MOI_LAN > 0.0005, cfg.PHI_MOI_LAN);
  kiem('hệ số trượt > 1', cfg.HE_SO_TRUOT > 1, cfg.HE_SO_TRUOT);
  kiem('trượt đi qua sổ đã chiết khấu độ tin', cfg.TRUOT_TIN_TUONG === true);
  kiem('funding NHẬN bị cắt bớt', cfg.HE_SO_FUNDING_NHAN < 1);
  kiem('funding TRẢ bị cộng thêm', cfg.HE_SO_FUNDING_TRA > 1);

  const QL = new QuanLyLenh(cfg), E = engineGia(), A = soGia(1.0);
  kiem('SHORT vào: khớp XẤU hơn best bid', QL._khop(E, A, 'short', 3000, true, 1.0).gia < A.bids[0].p);
  kiem('SHORT đóng: khớp XẤU hơn best ask', QL._khop(E, A, 'short', 3000, false, 1.0).gia > A.asks[0].p);
  kiem('LONG vào: khớp cao hơn best ask', QL._khop(E, A, 'long', 3000, true, 1.0).gia > A.asks[0].p);
  kiem('lệnh TO hơn → trượt LỚN hơn',
    QL._khop(E, A, 'short', 500000, true, 1.0).truotPc > QL._khop(E, A, 'short', 1000, true, 1.0).truotPc);

  const st = QL.layTT('F');
  st.lenh = { huong: 'short', notional: 1000, fundingNhanUsd: 0 };
  QL.ghiNhanFunding('F', 0.001);
  kiem('funding NHẬN chỉ tính 70%', Math.abs(st.lenh.fundingNhanUsd - 0.7) < 1e-9);
  st.lenh.fundingNhanUsd = 0; QL.ghiNhanFunding('F', -0.001);
  kiem('funding TRẢ tính 130%', Math.abs(st.lenh.fundingNhanUsd + 1.3) < 1e-9);
  st.lenh = null;

  const t2 = moLenhThu(1.0);
  kiem('phí ghi nhận ngay khi vào lệnh', t2.st.lenh.phiUsd > 0, G2(t2.st.lenh.phiUsd));
  kiem('giá vào đã bao gồm trượt (thấp hơn best bid)', t2.st.lenh.giaVao1 < soGia(1.0).bids[0].p);
  t2.QL._dong(t2.st, t2.st.lenh.giaVaoTB, 'test', t2.E, soGia(t2.st.lenh.giaVaoTB));
  kiem('đóng hoà giá → PnL RÒNG ÂM (phí + trượt ăn vào)', t2.QL.lichSu[0].pnl < 0, G2(t2.QL.lichSu[0].pnl));
}

/* ================================================================= */
nhom('KHÔNG LẬT HƯỚNG · KẾ HOẠCH KHÔNG HẾT HẠN');
{
  const QL = new QuanLyLenh(cfg), E = engineGia();
  const st = QL.layTT('W');
  QL.capNhat('W', E, soGia(1.0), P_KHONG_CO(1.0), CONG, BC);
  kiem('cổng mở + |S| đủ → vào CHO_VAO ngay, chưa cần cò', st.trangThai === TT.CHO_VAO, st.trangThai);
  kiem('kế hoạch dựng và đóng băng ngay', !!st.keHoach && st.keHoach.dongBang === true);
  const huongCu = st.huong, giaCu = st.keHoach.giaVao;

  const Pnguoc = P_KHONG_CO(1.0, { S: 30, coLONG: true });
  for (let i = 0; i < 50; i++) QL.capNhat('W', E, soGia(1.0), Pnguoc, { ...CONG, setup: 'LONG-A', huong: 'long' }, BC);
  kiem('cò ngược KHÔNG lật được hướng', st.huong === huongCu);
  for (let i = 0; i < 300; i++) QL.capNhat('W', E, soGia(1.0), P_KHONG_CO(1.0, { S: 2 }), { ...CONG, cho: false }, BC);
  kiem('|S| tụt về 0 + cổng đóng → kế hoạch VẪN CÒN', st.trangThai === TT.CHO_VAO && !!st.keHoach);
  kiem('giá kế hoạch KHÔNG đổi (đóng băng thật)', st.keHoach.giaVao === giaCu);

  const gTroi = 1.0 * (1 + cfg.TROI_TOI_DA * 1.5);
  QL.capNhat('W', E, soGia(gTroi), P_KHONG_CO(gTroi, { S: 2 }), { ...CONG, cho: false }, BC);
  kiem('giá trôi >1,5% → cập nhật TẠI CHỖ, vẫn CHO_VAO', st.trangThai === TT.CHO_VAO);
  kiem('đánh dấu để hiện nhãn 🔄', st.keHoach.lanCapNhat === 1);

  const gVuot = st.keHoach.giaCatTran * 1.01;
  QL.capNhat('W', E, soGia(gVuot), P_KHONG_CO(gVuot, { S: 2 }), { ...CONG, cho: false }, BC);
  kiem('giá vượt điểm cắt → kế hoạch chết (đường DUY NHẤT)', st.trangThai === TT.SAN, st.trangThai);
}

/* ================================================================= */
nhom('GIÁ VÀO = GIÁ THỊ TRƯỜNG, không phải tường');
{
  const { st } = moLenhThu(1.0);
  const A = soGia(1.0);
  kiem('SHORT vào lấy từ phía BID, không phải tường trên giá',
    st.lenh.giaVao1 <= A.bids[0].p && st.lenh.giaVao1 < A.mid);
  kiem('lệch khỏi best bid ĐÚNG BẰNG trượt giá',
    Math.abs(st.lenh.giaVao1 / A.bids[0].p - 1) <= cfg.LECH_VAO_TOI_DA + 1e-9);
}

/* ================================================================= */
nhom('NHÃN khung gốc — dữ liệu, KHÔNG phải cổng');
{
  kiem('23:00 trùng khung gốc SHORT-A (vắt qua nửa đêm)', K.trongKhoang(23 * 60, '23:00', '03:00'));
  kiem('02:00 trùng khung gốc SHORT-A', K.trongKhoang(2 * 60, '23:00', '03:00'));
  kiem('12:00 KHÔNG trùng khung gốc SHORT-A', !K.trongKhoang(12 * 60, '23:00', '03:00'));
  kiem('18:30 trùng khung gốc LONG-A', K.trongKhoang(18 * 60 + 30, '18:00', '22:30'));
  kiem('trongKhungGoc đọc đúng từ cfg.SETUP', K.trongKhungGoc(cfg, 'SHORT-A', 23 * 60)
    && !K.trongKhungGoc(cfg, 'SHORT-A', 12 * 60));
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tinhieu.js'), 'utf8');
  const hamS = src.slice(src.indexOf('const S = 100'), src.indexOf('const S = 100') + 300);
  kiem('⚠ khung giờ KHÔNG cộng điểm vào S', !/khung|gio|hour/i.test(hamS));
}

/* ================================================================= */
nhom('⛔ MỞ 24/24 TUYỆT ĐỐI — không còn cổng nào theo giờ');
{
  const srcKhung = fs.readFileSync(path.join(__dirname, '..', 'lib', 'khung.js'), 'utf8');
  const srcCfg = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
  const bo = fs.readFileSync(path.join(__dirname, '..', 'bot.js'), 'utf8');
  const srcLenh = fs.readFileSync(path.join(__dirname, '..', 'lib', 'lenh.js'), 'utf8');
  const S2 = require('../lib/tinhieu');

  /* --- vùng cấm đã bị xoá hẳn, không chỉ tắt cờ --- */
  kiem('KHÔNG còn KHUNG_CAM trong config', cfg.KHUNG_CAM === undefined && !/KHUNG_CAM/.test(srcCfg));
  kiem('KHÔNG còn cờ GIU_VUNG_CAM', cfg.GIU_VUNG_CAM === undefined && !/GIU_VUNG_CAM/.test(srcCfg));
  kiem('KHÔNG còn cờ BO_CONG_KHUNG_GIO (luôn mở, không phải tuỳ chọn)',
    cfg.BO_CONG_KHUNG_GIO === undefined && !/BO_CONG_KHUNG_GIO/.test(srcCfg + srcKhung + bo));
  kiem('KHÔNG còn hàm trongVungCam', typeof K.trongVungCam !== 'function' && !/trongVungCam/.test(srcKhung));
  kiem('chonSetup KHÔNG còn nhánh chặn theo giờ',
    !/vùng cấm|vung cam/i.test(srcKhung.slice(srcKhung.indexOf('function chonSetup'))));

  /* --- 4 setup còn nguyên, kèm khung gốc để gắn nhãn --- */
  kiem('4 setup VẪN còn trong config', Object.keys(cfg.SETUP).length === 4);
  kiem('mỗi setup còn khungGoc (để ghi cột trong_khung)',
    Object.values(cfg.SETUP).every(k => k.khungGoc && k.khungGoc.tu && k.khungGoc.den));
  kiem('mỗi setup khai báo rõ hướng',
    Object.values(cfg.SETUP).every(k => k.huong === 'short' || k.huong === 'long'));

  /* --- chọn được setup ở BẤT KỲ giờ nào, kể cả 04:00–06:00 cũ --- */
  const P = { funding8h: 0.0009, dOi25: 0.02, dP25: 0.01, mid: 1 };
  const sel = K.chonSetup(cfg, { sym: 'X', chg24: 0.35 }, P, { mocGia: null, khongTaoDayMoi2h: false });
  const G = K.gioVN();
  kiem('coin đủ điều kiện → CHỌN ĐƯỢC setup, giờ nào cũng vậy', sel.setup === 'SHORT-A',
    { setup: sel.setup, gio: G.nhan });
  kiem('nhãn trong_khung ghi ĐÚNG khung gốc (không phải luôn true)',
    sel.trongKhung === K.trongKhoang(G.tongPhut, '23:00', '03:00'),
    { trongKhung: sel.trongKhung, gio: G.nhan });

  /* --- ⛔ điều kiện COIN giữ nguyên: bỏ giờ KHÔNG phải nới điều kiện --- */
  const sel2 = K.chonSetup(cfg, { sym: 'Y', chg24: 0.05 }, P, { mocGia: null, khongTaoDayMoi2h: false });
  kiem('coin không đủ chg24 vẫn bị loại', sel2.setup === null);
  const sel3 = K.chonSetup(cfg, { sym: 'Z', chg24: 0.35 },
    { ...P, funding8h: -0.0001 }, { mocGia: null, khongTaoDayMoi2h: false });
  kiem('funding ÂM vẫn loại SHORT-A (mồi squeeze)', sel3.setup === null, sel3.setup);
  const sel4 = K.chonSetup(cfg, { sym: 'W', chg24: 0.35 },
    { ...P, dOi25: -0.01 }, { mocGia: null, khongTaoDayMoi2h: false });
  kiem('OI không tăng vẫn loại SHORT-A', sel4.setup === null, sel4.setup);

  /* --- LONG-B: thiếu mốc giá phải FAIL-CLOSED --- */
  const pLongB = { funding8h: 0, dOi25: -0.01, dP25: -0.01, mid: 1 };
  const bcLongB = { khongTaoDayMoi2h: true, mocGia: null };
  kiem('LONG-B thiếu mốc giá → TỪ CHỐI (fail-closed, không phải cho qua)',
    K.chonSetup(cfg, { sym: 'B', chg24: -0.20 }, pLongB, bcLongB).setup === null);
  kiem('LONG-B có mốc + hôm trước KHÔNG pump → vào được',
    K.chonSetup(cfg, { sym: 'B', chg24: -0.20 }, pLongB,
      { ...bcLongB, mocGia: { da_tang30_hom_qua: 0, gia_7h: '1' } }).setup === 'LONG-B');
  kiem('LONG-B có mốc + hôm trước VỪA PUMP → vẫn bị chặn (đang xả)',
    K.chonSetup(cfg, { sym: 'B', chg24: -0.20 }, pLongB,
      { ...bcLongB, mocGia: { da_tang30_hom_qua: 1, gia_7h: '1' } }).setup === null);

  /* --- mốc 07:00: GẦN NHẤT, không phải "của riêng hôm nay" --- */
  const srcDb = fs.readFileSync(path.join(__dirname, '..', 'lib', 'db.js'), 'utf8');
  kiem('docMocGia lấy mốc GẦN NHẤT theo coin (SHORT-B không chết lúc 00:00–07:00)',
    /MAX\(ngay\)/.test(srcDb) && /docMocGia = coin =>/.test(srcDb));
  kiem('bot.js gọi docMocGia bằng 1 tham số', /docMocGia\(E\.sym\)/.test(bo));

  /* --- bit 16: vẫn ghi, không bao giờ chặn --- */
  kiem('bit 16 VẪN được ghi vào `chan` (giữ nhóm đối chứng)',
    /c \|= 16/.test(fs.readFileSync(path.join(__dirname, '..', 'lib', 'tinhieu.js'), 'utf8')));
  kiem('bit 16 LUÔN bị gỡ khỏi cổng chặn', /chan & ~16/.test(bo));
  kiem('bit 16 KHÔNG BAO GIỜ hiện ra như lý do chặn',
    !S2.taiSaoChan(16 | 1).some(x => /khung/.test(x)) && S2.taiSaoChan(16 | 1).length === 1);

  /* --- máy quét --- */
  /* Logic này đã chuyển sang lib/loc-coin.js (tách ra để test được bằng
     hành vi). Bất biến giữ nguyên: bộ lọc phải xét CẢ 4 setup và không
     được có bất kỳ ràng buộc giờ nào. */
  const srcLoc = fs.readFileSync(path.join(__dirname, '..', 'lib', 'loc-coin.js'), 'utf8');
  kiem('MÁY QUÉT xét coin của cả 4 setup, không lọc theo giờ',
    !/khungMo|gioVN|khungGoc/.test(srcLoc) &&
    ['SHORT-A', 'SHORT-B', 'LONG-A', 'LONG-B'].every(s => srcLoc.includes(`S['${s}']`)));

  /* --- cột trong_khung của BẢNG LỆNH không còn ghi cứng --- */
  kiem('bảng `lenh` KHÔNG còn ghi cứng trongKhung: true',
    !/trongKhung: true/.test(srcLenh));
  kiem('trongKhung của lệnh tính từ khung gốc của chính setup đó',
    /trongKhungGoc\(cfg, st\.setup/.test(srcLenh));

  /* --- cảnh báo theo giờ đã xoá --- */
  kiem('KHÔNG còn ĐẨY cảnh báo "HẾT KHUNG" ra màn hình',
    !/push\(\s*'HẾT KHUNG'/.test(srcLenh));
  kiem('KHÔNG còn tham số CANH_BAO.HET_KHUNG_GIO_VN',
    cfg.CANH_BAO.HET_KHUNG_GIO_VN === undefined);
}

/* ================================================================= */
nhom('BỘ LỌC LỆNH ẢO — wallTrust');
{
  const B = T.taoBoTuong();
  const k = T.khoa('b', 1.0);
  B.sach.set(k, { f: Date.now() - 60 * 60e3, l: Date.now(), p: 1.0, phia: 'b',
                  sv: 0, pl: 0, fl: 0, mx: 1e5, cur: 1e5, nOrd: 5, nOrdMx: 5 });
  const chuaThu = T.tinTuong(B, 'b', 1.0, 1e6);
  B.sach.get(k).sv = 3;
  const daChiu = T.tinTuong(B, 'b', 1.0, 1e6);
  kiem('tường chịu được giá chạm → tin CAO hơn', daChiu > chuaThu, { chuaThu, daChiu });
  B.sach.get(k).pl = 3;
  kiem('tường bị RÚT 3 lần → tin sụp', T.tinTuong(B, 'b', 1.0, 1e6) < daChiu - 60);

  B.sach.set(T.khoa('a', 2.0), { f: Date.now() - 6 * 60e3, l: Date.now(), p: 2.0, phia: 'a',
                                  sv: 0, pl: 0, fl: 0, mx: 3e5, cur: 3e5, nOrd: 1, nOrdMx: 1 });
  const motLenh = T.tinTuong(B, 'a', 2.0, 1e6);
  B.sach.get(T.khoa('a', 2.0)).nOrd = 40;
  kiem('⭐ tiền lớn + numOrders=1 → tin THẤP hơn nhiều lệnh', motLenh < T.tinTuong(B, 'a', 2.0, 1e6));
  kiem('tường chưa biết gì = 30 (trung tính, không phải 0)', T.tinTuong(B, 'b', 99, 1e6) === 30);

  B.suKien = [{ t: Date.now(), phia: 'b', usd: 5e4, loai: 'rut' },
              { t: Date.now(), phia: 'b', usd: 1e4, loai: 'khop' }];
  B.mauDoSau = Array.from({ length: 30 }, () => ({ t: Date.now(), bidUsd: 1e5, askUsd: 1e5 }));
  const r = T.tyLeRutKhop(B, 'b', 300);
  kiem('BPR tính đúng (50k rút / 100k TB = 0,5)', Math.abs(r.pr - 0.5) < 1e-9);
  kiem('BPR ≥ 2×BFR → thoả điều kiện "bắt trước"', r.pr >= 2 * r.fr);
}

/* ================================================================= */
nhom('CÒ ĐẢO CHIỀU — đọc bằng LỰC và LỆNH ẢO');
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tinhieu.js'), 'utf8');
  kiem('có vế LỰC (mua vs bán)', /luc_short[\s\S]{0,200}mua30 > dong\.ban30/.test(src));
  kiem('⭐ có vế LỆNH ẢO (tường bị rút)', /ao_short[\s\S]{0,160}K\.pr >= nBPR/.test(src));
  kiem('thấy MỘT trong hai là đủ (OR)', /coCHOT_short = luc_short \|\| ao_short/.test(src));
  kiem('LONG đối xứng', /coCHOT_long = luc_long \|\| ao_long/.test(src));
}

/* ================================================================= */
nhom('TẦNG LƯU TRỮ — MySQL');
{
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  kiem('phụ thuộc mysql2', !!pkg.dependencies.mysql2);
  kiem('đã gỡ node-sqlite3-wasm', !pkg.dependencies['node-sqlite3-wasm']);
  const dbSrc = fs.readFileSync(path.join(__dirname, '..', 'lib', 'db.js'), 'utf8');
  const dbMa = dbSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  kiem('giá lưu CHUỖI VARCHAR, không phải số thực', /VARCHAR\(48\)/.test(dbSrc));
  kiem('có hàng đợi ghi chống rớt kết nối', /hangDoi/.test(dbSrc) && /xaHangDoi/.test(dbSrc));
  kiem('hàng đợi tràn thì KÊU TO', /HANG DOI GHI TRAN/.test(dbSrc));
  kiem('id sinh phía bot (không AUTO_INCREMENT)', /nextId/.test(dbMa) && !/AUTO_INCREMENT/i.test(dbMa));
  kiem('đóng bot thì XẢ NỐT hàng đợi', /async function dong/.test(dbSrc));
  kiem('config.local.mau.js tồn tại', fs.existsSync(path.join(__dirname, '..', 'config.local.mau.js')));
  kiem('.gitignore chặn config.local.js',
    /config\.local\.js/.test(fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8')));
  kiem('file mẫu KHÔNG chứa mật khẩu',
    !/password:\s*'[^']+'/.test(fs.readFileSync(path.join(__dirname, '..', 'config.local.mau.js'), 'utf8')));
  const bs = fs.readFileSync(path.join(__dirname, '..', 'server', 'chay.sh'), 'utf8');
  /* ⛔ server/schema.sql là NGUỒN THỨ HAI của sơ đồ bảng — nguy hiểm vì
     nó lệch trong im lặng. Nay không còn ALTER TABLE tự động, một cột
     thêm vào lib/db.js mà quên xuất lại file này = DB tạo mới thiếu cột
     và bot ghi lỗi âm thầm. Phép kiểm này là thứ duy nhất chặn được. */
  const XS = require('../cong-cu/xuat-schema');
  const fSchema = path.join(__dirname, '..', 'server', 'schema.sql');
  kiem('server/schema.sql tồn tại', fs.existsSync(fSchema));
  if (fs.existsSync(fSchema)) {
    const tren = fs.readFileSync(fSchema, 'utf8').replace(/\r\n/g, '\n');
    const can = (XS.DAU + XS.sinhSql()).replace(/\r\n/g, '\n');
    kiem('server/schema.sql KHỚP với DDL trong lib/db.js',
      tren.trim() === can.trim(), 'chạy: npm run xuat-schema');
  }
  kiem('schema.sql có đủ 6 bảng', XS.soBang === 6, `thấy ${XS.soBang}`);

  kiem('chay.sh có flock', /flock/.test(bs));
  kiem('chay.sh kiểm PID qua /proc', /\/proc\//.test(bs));
  kiem('chay.sh tự dò node (cron PATH nghèo)', /command -v node/.test(bs));
  kiem('dung.sh dùng SIGTERM để xả hàng đợi',
    /kill -TERM/.test(fs.readFileSync(path.join(__dirname, '..', 'server', 'dung.sh'), 'utf8')));
}

/* ================================================================= */
nhom('KHÔNG SỐ CỨNG — mọi tham số quyết định phải ở config.js');
{
  const doc = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');   // bỏ chú thích

  kiem('config có nhóm TUONG (chấm điểm lệnh ảo)', !!cfg.TUONG && !!cfg.TUONG.TIN_BI_RUT);
  kiem('config có nhóm TIN_HIEU (trọng số + chuẩn hoá)', !!cfg.TIN_HIEU && !!cfg.TIN_HIEU.TRONG_SO);
  kiem('config có nhóm QUET (máy quét + nến)', !!cfg.QUET && !!cfg.QUET.NEN_RAU_NHAN);
  kiem('config có nhóm DCA (căn cứ)', !!cfg.DCA && !!cfg.DCA.CHAM_LAI_TY_LE);
  kiem('config có nhóm CANH_BAO', !!cfg.CANH_BAO && !!cfg.CANH_BAO.RAO_CHAN_MONG);
  kiem('config có nhóm HA_TANG', !!cfg.HA_TANG && !!cfg.HA_TANG.WS_PING_MS);

  /* trọng số S phải LẤY TỪ CONFIG, không khai báo lại trong code */
  const th = doc('lib/tinhieu.js');
  kiem('trọng số S lấy từ config, không viết cứng trong tinhieu.js',
    /TRONG_SO = H\.TRONG_SO/.test(th) && !/TRONG_SO = \{\s*pull:/.test(th));

  /* điểm chấm tường phải lấy từ config */
  const tu = doc('lib/tuong.js');
  kiem('điểm wallTrust lấy từ config, không viết cứng',
    /W\.TIN_SONG_SOT/.test(tu) && /W\.TIN_BI_RUT/.test(tu) && !/w\.sv \* 15/.test(tu));
  kiem('ngưỡng gần/rời lấy từ config', /W\.GAN_NHAN_BUOC/.test(tu) && !/0\.0008 \* mid/.test(tu));
  kiem('ngưỡng "là tường" lấy từ config', /W\.NGUONG_LA_TUONG/.test(tu) && !/0\.25 \* maxM/.test(tu));

  /* căn cứ DCA phải lấy từ config */
  const le = doc('lib/lenh.js');
  kiem('căn cứ DCA lấy từ config', /cfg\.DCA\.CHAM_LAI_TY_LE/.test(le) && /cfg\.DCA\.SQUEEZE_OI_NGUONG/.test(le));
  kiem('ngưỡng cảnh báo lấy từ config', /CANH_BAO\.RAO_CHAN_MONG/.test(le) && /CANH_BAO\.GAN_CHAY/.test(le));
  kiem('MMR ước tính lấy từ config', /cfg\.MMR_UOC_TINH/.test(le) && !/MMR = 0\.005/.test(le));

  /* máy quét + nến từ chối */
  const bo = doc('bot.js');
  kiem('nến từ chối lấy từ config', /Q\.NEN_RAU_NHAN/.test(bo) && !/1\.5 \* Math\.max\(than/.test(bo));
  kiem('vùng đệm máy quét lấy từ config', /QUET\.VUNG_DEM_COIN/.test(bo));
  const lc = doc('lib/loc-coin.js');
  kiem('bộ lọc coin KHÔNG có số cứng — mọi ngưỡng từ cfg.LOC_COIN/SETUP',
    /L\.BIEN_DO_24H_TOI_THIEU/.test(lc) && /L\.DEM_TIEN_SETUP/.test(lc) &&
    /L\.NOI_LONG_KHI_DA_THEO/.test(lc) && !/0\.08|0\.03|1\.5\b/.test(lc));
  kiem('trọng số xếp hạng lấy từ config',
    /L\.DIEM_SHORT_A/.test(lc) && /L\.DIEM_NEN_HE_SO/.test(lc) && !/200 \+|150 \+/.test(lc));
  kiem('ngưỡng sổ hết hạn lấy từ config', /QUET\.SO_LENH_HET_HAN_MS/.test(bo) && !/instId\) > 20000/.test(bo));
  kiem('số lệnh gửi giao diện lấy từ config', /QUET\.LICH_SU_GUI/.test(bo));

  /* hạ tầng */
  kiem('WS ping/nối lại lấy từ config',
    /HT\.WS_PING_MS/.test(doc('lib/okx-ws.js')) && /HT\.WS_NOI_LAI_TRAN_MS/.test(doc('lib/okx-ws.js')));
  kiem('WS gom đăng ký lấy từ config',
    /HT\.WS_GOM_DANG_KY_MS/.test(doc('lib/okx-ws.js')) &&
    /HT\.WS_ARG_MOI_FRAME/.test(doc('lib/okx-ws.js')));
  kiem('REST timeout lấy từ config', /HT\.REST_TIMEOUT_MS/.test(doc('lib/okx-rest.js')));
  kiem('trần hàng đợi DB lấy từ config', /HT\.DB_TRAN_HANG_DOI/.test(doc('lib/db.js')));

  /* ⭐ Chặn lỗi TRỎ TỚI THAM SỐ KHÔNG TỒN TẠI — `cfg.X` mà config không có
     thì ra `undefined`, rồi mọi phép tính thành NaN mà KHÔNG báo lỗi.
     Đã dính một lần: đổi VON_GIAY → VON làm banner in "von $undefined",
     và một lần khác PHI_MOI_LAN bị xoá làm mọi giá thành NaN. */
  /* Phải trả CẢ node trung gian lẫn lá: code hay viết `const W = cfg.TUONG`
     rồi mới `W.NGUONG_LA_TUONG`. Chỉ trả lá thì `cfg.TUONG` bị báo thiếu oan.
     ⚠ Lỗi này nằm im từ đầu vì regex ở dưới có một byte 0x08 (backspace) lọt
     vào giữa `\b` và `cfg`, khiến nó không khớp gì và phép kiểm luôn xanh. */
  const phang = (o, tien = '') => Object.entries(o).flatMap(([k, v]) =>
    (v && typeof v === 'object' && !Array.isArray(v))
      ? [tien + k, ...phang(v, tien + k + '.')] : [tien + k]);
  const coTrongCfg = new Set(phang(cfg));
  const thieu = [];
  for (const f of ['bot.js', 'lib/lenh.js', 'lib/tinhieu.js', 'lib/tuong.js',
                   'lib/okx-rest.js', 'lib/okx-ws.js', 'lib/db.js', 'lib/log.js',
                   'lib/khung.js', 'lib/loc-coin.js', 'cong-cu/bao-cao.js']) {
    const src = doc(f);
    for (const m of src.matchAll(/cfg\.([A-Z_][A-Z0-9_]*)(?:\.([A-Z_][A-Z0-9_]*))?/g)) {
      const ten = m[2] ? m[1] + '.' + m[2] : m[1];
      if (!coTrongCfg.has(ten) && !coTrongCfg.has(m[1])) thieu.push(f + ' → cfg.' + ten);
    }
  }
  kiem('KHÔNG có cfg.X nào trỏ tới tham số không tồn tại',
    thieu.length === 0, thieu.slice(0, 6));
}

/* ================================================================= */
nhom('HẠ TẦNG');
{
  kiem('CRC32 đúng chuẩn', crc32('123456789') === (0xCBF43926 | 0));
  const { OkxWs } = require('../lib/okx-ws');
  const w = new OkxWs(); w.lastMsg = Date.now();
  kiem('lastData TÁCH khỏi lastMsg', w.tuoiData('books', 'X-USDT-SWAP') === Infinity);

  /* ⭐ GOM subscribe — chốt chặn bắt buộc khi theo dõi nhiều coin.
     Mỗi coin đăng ký 3 kênh; không gom thì 20 coin = 60 frame bắn liên
     tiếp trong vài mili-giây, đúng kịch bản "bão subscribe → bị chặn tốc
     độ" ở bảng bẫy. Kiểm bằng HÀNH VI, không phải bằng regex.           */
  {
    const w2 = new OkxWs();
    const frame = [];
    w2._gui = o => { frame.push(o); return true; };
    const SO = cfg.SO_COIN_TRAN;
    for (let i = 0; i < SO; i++)
      for (const ch of ['books', 'trades', 'open-interest'])
        w2.dangKy(ch, 'C' + i + '-USDT-SWAP');

    kiem('dangKy KHÔNG bắn frame ngay (xếp hàng chờ)', frame.length === 0);
    w2._xaGom();
    const nArg = SO * 3, nFrame = Math.ceil(nArg / cfg.HA_TANG.WS_ARG_MOI_FRAME);
    kiem(`${nArg} đăng ký gom lại còn ${nFrame} frame`,
      frame.length === nFrame && frame.reduce((s, f) => s + f.args.length, 0) === nArg,
      `thực tế ${frame.length} frame`);

    /* máy quét gỡ coin A rồi thêm coin B trong cùng cửa sổ gom → phải
       gửi unsubscribe TRƯỚC subscribe, nếu không sẽ huỷ nhầm cái vừa đăng ký */
    frame.length = 0;
    w2.dangKy('books', 'MOI-USDT-SWAP');
    w2.huy('books', 'C0-USDT-SWAP');
    w2._xaGom();
    kiem('unsubscribe luôn đi TRƯỚC subscribe trong một lượt gom',
      frame.length === 2 && frame[0].op === 'unsubscribe' && frame[1].op === 'subscribe');
  }
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  kiem('giao diện cập nhật TẠI CHỖ (veBang có khoá)', /dataset\.k/.test(html) && /veBang/.test(html));
  kiem('giao diện KHÔNG có animation', !/@keyframes|transition:/.test(html));
}

/* ================================================================= */
console.log(`\n${'='.repeat(52)}`);
console.log(`  ${ok} đạt · ${xau} hỏng`);
console.log('='.repeat(52));
if (xau) { console.log('\n⛔ CÓ BẤT BIẾN BỊ VI PHẠM — ĐỪNG CHẠY BOT.\n'); process.exit(1); }
console.log('\n✅ Mọi bất biến đều giữ.\n');
process.exit(0);
