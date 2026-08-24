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
/* ⛔ ĐÃ BỎ mốc cắt lỗ cố định $20/$25 (2026-08-23). Đường cắt nay là
   trailing bám đỉnh, rộng hẹp theo biên độ 24h của từng coin. */
kiem('KHÔNG còn mốc cắt lỗ cố định bằng đô',
  cfg.CAT_LO_USD === undefined && cfg.CAT_LO_USD_TRAN === undefined);
kiem('cắt lỗ tính bằng ĐÔ — không còn CAT_LO theo %', cfg.CAT_LO === undefined);
kiem('có nhóm TRAILING', !!cfg.TRAILING && typeof cfg.TRAILING === 'object');
kiem('trailing neo vào biên độ 24h (hệ số > 0)', cfg.TRAILING.HE_SO_BIEN_DO > 0);
/* Sàn/trần chọn từ dữ liệu 53 lệnh: dưới 2% giết oan 13 lệnh lãi, trên
   10% gần như không còn chặn được gì. Khoá lại vùng đã đo. */
kiem('sàn trailing trong [2%, 4%]',
  cfg.TRAILING.KHOANG_SAN >= 0.02 && cfg.TRAILING.KHOANG_SAN <= 0.04, cfg.TRAILING.KHOANG_SAN);
kiem('trần trailing trong [5%, 10%]',
  cfg.TRAILING.KHOANG_TRAN >= 0.05 && cfg.TRAILING.KHOANG_TRAN <= 0.10, cfg.TRAILING.KHOANG_TRAN);
kiem('sàn < trần', cfg.TRAILING.KHOANG_SAN < cfg.TRAILING.KHOANG_TRAN);
kiem('có khoá hoà vốn, đệm phí > 1', cfg.TRAILING.NGUONG_KHOA_VON > 0 && cfg.TRAILING.DEM_HOA_VON > 1);
/* Van cuối phải RỘNG HƠN mức lỗ trailing tối đa sau DCA, nếu không nó
   cướp việc của trailing và ta quay lại đúng cắt lỗ cố định. */
kiem('van cuối LO_TRAN_USD rộng hơn lỗ trailing tối đa sau DCA',
  cfg.LO_TRAN_USD > cfg.TRAILING.KHOANG_TRAN * (cfg.KY_QUY_LAN_1 + cfg.KY_QUY_DCA) * cfg.DON_BAY,
  cfg.LO_TRAN_USD);
kiem('KHÔNG còn thang chốt lời cố định', cfg.THANG_CHOT === undefined);
kiem('KHÔNG còn TP_TOI_THIEU / NG_RR', cfg.TP_TOI_THIEU === undefined && cfg.NG_RR === undefined);
/* ⛔ Cửa sổ DCA phải theo TỶ LỆ. Đo bằng đô cứng thì khi đường cắt hẹp
   lại, lệnh đóng trước khi kịp lỗ tới cửa sổ → DCA chết âm thầm. */
kiem('cửa sổ DCA là HÀNG RÀO theo TỶ LỆ, không phải đô',
  cfg.CUA_SO_DCA_USD === undefined && Array.isArray(cfg.CUA_SO_DCA_TY_LE));
kiem('cửa sổ DCA nằm trong quãng tới điểm cắt (< 1)',
  cfg.CUA_SO_DCA_TY_LE[0] > 0 && cfg.CUA_SO_DCA_TY_LE[1] < 1, cfg.CUA_SO_DCA_TY_LE);
kiem('rào chắn tối thiểu ≥ 30 phút', cfg.RAO_CHAN_TOI_THIEU >= 30, cfg.RAO_CHAN_TOI_THIEU);
kiem('hồi lại tối thiểu 5 điểm', cfg.HOI_LAI_TOI_THIEU === 5);
/* Siết 0,50 → 0,35: 47/54 lệnh có đỉnh <10% nên luôn rơi vào nhánh
   `TRAN × đỉnh` — trả lại đúng nửa. Tổng đỉnh +$71,56 về đích −$15,49. */
kiem('trần hồi lại ≤ 35% đỉnh (giữ ≥ 65%)', cfg.HOI_LAI_TRAN <= 0.35, cfg.HOI_LAI_TRAN);
/* Sàn phí: chốt giữ lại chưa tới nửa đỉnh, nên đỉnh phải > 2× phí khứ
   hồi mới có cửa hoà. Dưới mức đó chốt CHẮC CHẮN âm — 7/54 lệnh đã dính. */
kiem('sàn chốt lời ≥ 2× phí khứ hồi',
  cfg.SAN_CHOT_LOI_PC >= 2 * (2 * cfg.PHI_MOI_LAN), cfg.SAN_CHOT_LOI_PC);
kiem('DONG_VI_HET_GIO = false', cfg.DONG_VI_HET_GIO === false);
kiem('DONG_VI_CAU_TRUC = false', cfg.DONG_VI_CAU_TRUC === false);
kiem('DONG_VI_FUNDING_DAO = false', cfg.DONG_VI_FUNDING_DAO === false);
kiem('VAO_BANG_GIA_HIEN_TAI = true', cfg.VAO_BANG_GIA_HIEN_TAI === true);
kiem('KHÔNG có HAN_CHO_VAO', cfg.HAN_CHO_VAO_PHUT === undefined);
kiem('NGUONG_DAO > NGUONG_VAO', cfg.NGUONG_DAO > cfg.NGUONG_VAO);
kiem('WARMUP_GIAY >= 300', cfg.WARMUP_GIAY >= 300);
/* ⛔ ĐÃ BỎ TRẦN ĐẾM LỆNH (2026-08-23) — trần 3 khoá bot 29,3% thời gian
   và 37/71 lần SẴN_SÀNG không bao giờ vào được lệnh. Nhưng bất biến TIỀN
   thì KHÔNG được bỏ: nó chỉ chuyển từ "đếm lệnh" sang "đếm rủi ro". */
kiem('trần ĐẾM lệnh đã bỏ (null = không giới hạn)',
  cfg.SO_LENH_MO_TOI_DA === null, cfg.SO_LENH_MO_TOI_DA);
kiem('có ngân sách RỦI RO thay thế', !!cfg.TRAN_RUI_RO && cfg.TRAN_RUI_RO.TONG_PC > 0);
/* ⛔ Đây mới là bất biến tiền thật sự. Ngân sách 30% vốn = ĐÚNG bằng
   ngân sách cũ (3 lệnh × $20 / $200). Rủi ro y hệt, chỉ khác là cùng số
   tiền đó nay mua được nhiều lệnh hơn vì mỗi lệnh rẻ hơn 4–10 lần. */
kiem('⛔ ngân sách rủi ro <= 1/3 vốn',
  cfg.TRAN_RUI_RO.TONG_PC <= 1 / 3, cfg.TRAN_RUI_RO.TONG_PC);
/* Ngân sách phải mua được ÍT NHẤT vài lệnh, nếu không bỏ trần đếm là vô
   nghĩa — chỉ đổi một trần chặt lấy một trần chặt khác. */
kiem('ngân sách mua được >= 4 lệnh ở khoảng trailing rộng nhất',
  (cfg.TRAN_RUI_RO.TONG_PC * cfg.VON) / (cfg.TRAILING.KHOANG_TRAN * cfg.KY_QUY_LAN_1 * cfg.DON_BAY) >= 4,
  Math.floor((cfg.TRAN_RUI_RO.TONG_PC * cfg.VON) / (cfg.TRAILING.KHOANG_TRAN * cfg.KY_QUY_LAN_1 * cfg.DON_BAY)));
/* ⛔ TRẦN THEO HƯỚNG — trần TỔNG không bắt được tương quan: N lệnh cùng
   phía lúc BTC quét là 1 lệnh cỡ N×. Đo thật: 53/56 lệnh đầu là LONG. */
kiem('có trần theo HƯỚNG, không chỉ cảnh báo',
  cfg.TRAN_RUI_RO.CANH_BAO_CUNG_HUONG_PC === undefined
  && cfg.TRAN_RUI_RO.TRAN_CUNG_HUONG_PC > 0);
kiem('⛔ trần theo hướng < 1 (luôn chừa chỗ cho hướng kia)',
  cfg.TRAN_RUI_RO.TRAN_CUNG_HUONG_PC < 1, cfg.TRAN_RUI_RO.TRAN_CUNG_HUONG_PC);
kiem('trần theo hướng đủ rộng để không chặn oan (>= 0,5)',
  cfg.TRAN_RUI_RO.TRAN_CUNG_HUONG_PC >= 0.5, cfg.TRAN_RUI_RO.TRAN_CUNG_HUONG_PC);

/* ⭐ SHORT phải CÓ CỬA NỔ. Đo trên 311.513 nhịp: mốc cũ 30%/0,05% chỉ đạt
   395 nhịp trên 3 coin trong 11,3 ngày → đúng 1 lệnh short. Nút thắt là
   GIAO của hai vế, không phải vế nào riêng lẻ. */
kiem('ngưỡng funding SHORT > mức nền sàn (0,01%)',
  cfg.SETUP['SHORT-A'].fundingMin > 0.0001 && cfg.SETUP['SHORT-B'].fundingMin > 0.0001,
  cfg.SETUP['SHORT-A'].fundingMin);
kiem('⛔ ngưỡng funding SHORT >= 2× mức nền (giữ tín hiệu chen chúc)',
  cfg.SETUP['SHORT-A'].fundingMin >= 0.0002, cfg.SETUP['SHORT-A'].fundingMin);
kiem('⛔ SHORT vẫn khắt khe hơn LONG-A (cần cú pump lớn hơn)',
  cfg.SETUP['SHORT-A'].chg24Min > cfg.SETUP['LONG-A'].chg24[1],
  { short: cfg.SETUP['SHORT-A'].chg24Min, longATran: cfg.SETUP['LONG-A'].chg24[1] });
/* Ngưỡng "hôm qua pump lớn" phải nằm trong config, không phải số cứng —
   nó là cổng hai chiều: SHORT-B cần TRUE, LONG-B bị chặn nếu TRUE. */
kiem('ngưỡng pump lớn nằm trong config, khớp ngưỡng SHORT-A',
  cfg.QUET.MOC_PUMP_LON === cfg.SETUP['SHORT-A'].chg24Min, cfg.QUET.MOC_PUMP_LON);
kiem('⛔ bot.js KHÔNG còn số cứng 0.30 cho da_tang30_hom_qua',
  !/chg24 >= 0\.30/.test(fs.readFileSync(path.join(__dirname, '..', 'bot.js'), 'utf8')));

/* Số coin theo dõi: cũng bỏ trần đếm, thay bằng trần RAM — thứ nó thật
   sự tiêu. Trần RAM đặt sai thì bot bị OOM kill, mà bot chết là KHÔNG AI
   CANH LỆNH ĐANG MỞ (xem nhóm MẤT SỔ). */
kiem('trần ĐẾM coin đã bỏ (null = không giới hạn)',
  cfg.SO_COIN_TRAN === null, cfg.SO_COIN_TRAN);
kiem('có trần RAM thay thế', cfg.RAM_TRAN_MB > 0 && cfg.RAM_XA_BOT_MB > cfg.RAM_TRAN_MB);
/* Mốc đo thật: 20 coin → RSS 357,68MB. Trần phải cao hơn mốc ấy, nếu
   không bot đứng ở mức coin thấp hơn cả bản cũ. */
kiem('trần RAM cao hơn mốc đã đo (358MB ở 20 coin)', cfg.RAM_TRAN_MB > 400);
/* ⛔ Hosting chia sẻ: chạm trần tài khoản là bị GIẾT THẲNG, không swap.
   Node dọn rác lười nên RSS vọt lên trước khi GC chạy → phải chừa đệm
   rộng. Phép kiểm này tồn tại để lần sau ai nâng trần cho "theo dõi
   nhiều coin hơn" thì bị chặn lại, thay vì đẩy bot tới chỗ bị OOM kill —
   mà bot chết là KHÔNG AI CANH LỆNH ĐANG MỞ. */
kiem('⛔ mức xả RAM ≤ 65% RAM máy chủ (chừa đệm cho GC)',
  cfg.RAM_XA_BOT_MB <= 0.65 * cfg.RAM_MAY_CHU_MB,
  Math.round(cfg.RAM_XA_BOT_MB / cfg.RAM_MAY_CHU_MB * 100) + '%');
kiem('RAM máy chủ được KHAI BÁO, không để code tự đoán', cfg.RAM_MAY_CHU_MB > 0);

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

  /* 2 lời gọi: đường TRAILING (lý do `trailing` / `trailing_lai`) và VAN
     CUỐI `lo_tran`. Thêm lời gọi thứ ba ở đây là thêm một đường ra — phải
     sửa cả bất biến 1 trong CLAUDE.md trước, không lặng lẽ thêm. */
  kiem('_xuLyLenhMo: 2 lời gọi _dong (trailing + van cuối)',
    dem(than('_xuLyLenhMo')) === 2
    && /'trailing/.test(than('_xuLyLenhMo')) && /lo_tran/.test(than('_xuLyLenhMo')),
    dem(than('_xuLyLenhMo')));
  /* ⛔ Đường cắt CHỈ ĐƯỢC SIẾT VÀO. Mọi thay đổi `L.giaCat` phải qua
     `_dayGiaCat()`; gán thẳng ở chỗ khác là mở lại đúng lỗ hổng đã làm
     mất $41,58 trên 2 lệnh BEAT. Bỏ chú thích trước khi quét, nếu không
     chính đoạn văn mô tả bất biến này lại làm phép kiểm đỏ. */
  const boChuThich = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const srcSach = boChuThich(src);
  const ganGiaCat = (srcSach.match(/\bL\.giaCat\s*=/g) || []).length;
  const ganTrongDay = (boChuThich(than('_dayGiaCat')).match(/\bL\.giaCat\s*=/g) || []).length;
  kiem('⛔ mọi phép gán L.giaCat đều nằm trong _dayGiaCat',
    ganGiaCat > 0 && ganGiaCat === ganTrongDay, { tong: ganGiaCat, trongDay: ganTrongDay });
  kiem('_dayGiaCat chỉ siết vào — có Math.min cho short và Math.max cho long',
    /Math\.min\(L\.giaCat/.test(than('_dayGiaCat')) && /Math\.max\(L\.giaCat/.test(than('_dayGiaCat')));
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
nhom('ĐƯỜNG CẮT — trailing bám đỉnh, KHÔNG còn mốc đô cố định');
{
  const SAN = cfg.TRAILING.KHOANG_SAN;
  const { QL, E, st } = moLenhThu(1.0);
  /* boiCanh thử không có `bienDo24` → `_khoangTrailing` lùi về SÀN. */
  kiem('thiếu biên độ 24h → lùi về SÀN, không vỡ',
    Math.abs(st.lenh.khoangTrailing - SAN) < 1e-9, st.lenh.khoangTrailing);
  kiem('giá cắt đặt đúng 1 khoảng SÀN so với giá vào',
    Math.abs(st.lenh.giaCat / st.lenh.giaVao1 - (1 + SAN)) < 1e-6,
    G2(st.lenh.giaCat / st.lenh.giaVao1));
  kiem('rủi ro thiết kế = khoảng trailing × notional',
    Math.abs(st.lenh.loThietKeUsd - SAN * 60) < 1e-9, st.lenh.loThietKeUsd);

  let dong = false;
  for (let g = 1.0; g <= 1.7 && !dong; g += 0.005) { dayGia(QL, E, st, g); if (!st.lenh) dong = true; }
  kiem('lệnh bị cắt khi giá chạm đường trailing', dong);
  const h = QL.lichSu[0];
  /* Lỗ ≈ SÀN × $60 cộng phí hai chiều — nhỏ hơn mốc $20 cũ khoảng 10 lần. */
  kiem('lỗ khi cắt ≈ khoảng trailing × notional (KHÔNG còn −$20)',
    h && h.pnl <= -(SAN * 60) && h.pnl >= -(SAN * 60) - 1, h && G2(h.pnl));
  kiem('R ≈ −1 (mẫu số = rủi ro thiết kế của CHÍNH lệnh này)',
    h && h.R <= -0.95 && h.R >= -1.36, h && G2(h.R));
  kiem('lý do đóng là trailing', h && /^trailing/.test(h.lyDo), h && h.lyDo);
}

/* ================================================================= */
nhom('⛔ ĐƯỜNG CẮT CHỈ SIẾT VÀO — không bao giờ lùi ra');
{
  /* Lệnh SHORT: giá giảm là có lãi → đường cắt phải TỤT XUỐNG theo đáy
     và không bao giờ bò lên lại, kể cả khi giá bật ngược. Đây chính là
     thứ 2 lệnh BEAT không có: từng lãi rồi quay đầu mà không gì chặn. */
  const { QL, E, st } = moLenhThu(1.0);
  const catBanDau = st.lenh.giaCat;
  dayGia(QL, E, st, 0.94);                       // lãi 6%
  const catSauLai = st.lenh && st.lenh.giaCat;
  kiem('giá đi thuận → đường cắt SIẾT theo', catSauLai < catBanDau, G2(catSauLai));
  if (st.lenh) {
    dayGia(QL, E, st, 0.955);                    // bật ngược một nhịp
    kiem('giá bật ngược → đường cắt KHÔNG lùi ra',
      st.lenh && st.lenh.giaCat <= catSauLai + 1e-9, st.lenh && G2(st.lenh.giaCat));
  }
}

/* ================================================================= */
nhom('⭐ TRẦN RỦI RO thay cho TRẦN ĐẾM — lệnh thắng TRẢ LẠI chỗ');
{
  const { QL, st } = moLenhThu(1.0);
  const L = st.lenh;
  /* Lệnh vừa mở, giá chưa đi đâu → rủi ro còn lại ≈ rủi ro thiết kế. */
  kiem('rủi ro còn lại của lệnh mới ≈ rủi ro thiết kế',
    Math.abs(QL.ruiRoConLai(L) - L.loThietKeUsd) < 0.2, G2(QL.ruiRoConLai(L)));
  kiem('tổng rủi ro = tổng của từng lệnh',
    Math.abs(QL.ruiRoDangMo() - QL.ruiRoConLai(L)) < 1e-9);
  kiem('rủi ro tách được theo hướng',
    QL.ruiRoTheoHuong().short > 0 && QL.ruiRoTheoHuong().long === 0);

  /* ⭐ Đường cắt siết vào → rủi ro còn lại GIẢM. Đây là cơ chế trả lại
     chỗ trong ngân sách, và là lý do bỏ được trần đếm. */
  const truoc = QL.ruiRoConLai(L);
  dayGia(QL, st._E || null, st, 0.97);
  kiem('giá đi thuận → rủi ro còn lại GIẢM',
    st.lenh && QL.ruiRoConLai(st.lenh) < truoc,
    st.lenh && { truoc: G2(truoc), sau: G2(QL.ruiRoConLai(st.lenh)) });

  /* Lệnh đã khoá hoà vốn thì gần như không còn chiếm ngân sách. */
  const B = moLenhThu(1.0);
  dayGia(B.QL, B.E, B.st, 1 - cfg.TRAILING.NGUONG_KHOA_VON * B.st.lenh.khoangTrailing - 0.005);
  kiem('đã khoá hoà vốn → rủi ro còn lại ≈ 0 (trả lại chỗ)',
    B.st.lenh && B.st.lenh.daKhoaVon && QL.ruiRoConLai(B.st.lenh) <= 0.01,
    B.st.lenh && G2(QL.ruiRoConLai(B.st.lenh)));
}

/* ================================================================= */
nhom('⛔ MỌI LỐI CHẶN MỞ LỆNH PHẢI GHI SỰ KIỆN (quét mã nguồn)');
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
  const thanMo = than('_moLenh');
  /* Trước 2026-08-23 hai lối đầu là `return` trần: không log, không sự
     kiện. Hậu quả đo được: 37/71 lần SẴN_SÀNG không mở được lệnh mà DB
     không giải thích nổi vì sao. Chặn im lặng = mù. */
  kiem('⛔ _moLenh KHÔNG còn `return` trần (mọi lối chặn đều ghi sự kiện)',
    !/^\s*if \([^)]*\) return;\s*$/m.test(thanMo));
  for (const ly of ['chan_ngat_mach', 'chan_tran_rui_ro', 'chan_tran_cung_huong', 'chan_cong_thanh_ly'])
    kiem(`_moLenh ghi lý do "${ly}"`, thanMo.includes(ly));
  kiem('cổng trần rủi ro dùng RỦI RO CÒN LẠI, không phải rủi ro lúc mở',
    /ruiRoDangMo\(\)/.test(thanMo));
  const src2 = fs.readFileSync(path.join(__dirname, '..', 'bot.js'), 'utf8');
  kiem('máy quét chặn bằng RAM, không bằng số đếm',
    /RAM_TRAN_MB/.test(src2) && /RAM_XA_BOT_MB/.test(src2));
  kiem('RAM vượt ngưỡng xả thì GỠ BỚT coin, không chỉ ngừng thêm',
    /phaiXa/.test(src2));
  kiem('⛔ coin ĐANG CÓ LỆNH MỞ vẫn miễn nhiễm khỏi việc gỡ',
    /if \(st && st\.lenh\) continue;/.test(src2));
}

/* ================================================================= */
nhom('⭐ GIAI ĐOẠN 10 — CẮT LỖ PHÍA SÀN (cấu hình + quét mã nguồn)');
{
  const San = require('../lib/san');
  const TT10 = require('../lib/okx-tt');
  const srcSan = fs.readFileSync(path.join(__dirname, '..', 'lib', 'san.js'), 'utf8');
  const srcTT = fs.readFileSync(path.join(__dirname, '..', 'lib', 'okx-tt.js'), 'utf8');
  const srcL = fs.readFileSync(path.join(__dirname, '..', 'lib', 'lenh.js'), 'utf8');
  const srcB = fs.readFileSync(path.join(__dirname, '..', 'bot.js'), 'utf8');

  kiem('⛔ CHE_DO mặc định vẫn là "giay"', cfg.CHE_DO === 'giay', cfg.CHE_DO);
  kiem('có nhóm SAN trong config', !!cfg.SAN && cfg.SAN.VUNG_CHET_PC > 0);
  /* Vùng chết quá nhỏ = spam sửa lệnh đúng lúc thị trường loạn; quá lớn =
     SL tụt xa đường cắt thật. Khoá lại khoảng đã cân nhắc. */
  kiem('vùng chết trong [0,1% ; 1%]',
    cfg.SAN.VUNG_CHET_PC >= 0.001 && cfg.SAN.VUNG_CHET_PC <= 0.01, cfg.SAN.VUNG_CHET_PC);
  kiem('⛔ vùng chết NHỎ HƠN khoảng trailing hẹp nhất (SL luôn bám sát được)',
    cfg.SAN.VUNG_CHET_PC < cfg.TRAILING.KHOANG_SAN);
  kiem('SL có thử lại (lưới an toàn không được hỏng im lặng)', cfg.SAN.SL_THU_LAI >= 1);

  /* ⛔ SL phải khớp THỊ TRƯỜNG. Lệnh giới hạn có thể trượt qua mà không
     khớp — một SL không khớp còn tệ hơn không có SL, vì ta tưởng mình
     đang được bảo vệ. */
  kiem('⛔ SL đặt kiểu THỊ TRƯỜNG (slOrdPx = -1)', /slOrdPx:\s*'-1'/.test(srcTT));
  kiem('⛔ SL là lệnh GIẢM vị thế (reduceOnly)', /reduceOnly:\s*true/.test(srcTT));
  kiem('SL dùng endpoint ALGO, không phải lệnh thường',
    /trade\/order-algo/.test(srcTT) && /trade\/cancel-algos/.test(srcTT));
  /* Chế độ demo khác chế độ thật ĐÚNG một header — không có nhánh code
     riêng nào, để `demo` kiểm chứng được đúng đường sẽ chạy thật. */
  kiem('demo và thật khác nhau ĐÚNG một header', /x-simulated-trading/.test(srcTT));
  /* ⛔ Dự án cũ ĐÃ LỘ TOKEN một lần theo kiểu "in ra để debug rồi quên". */
  kiem('⛔ KHÔNG log apiSecret / passphrase ở bất kỳ đâu',
    !/(ghi|canh)\([^)]*apiSecret/.test(srcTT) && !/(ghi|canh)\([^)]*passphrase/.test(srcTT));

  kiem('thiếu khoá thì LÙI VỀ giay, không chạy nửa vời', /lui ve che do GIAY|_cheDo = 'giay'/.test(srcSan));
  kiem('quy đổi USD → hợp đồng có nhân ctVal (bẫy sz của SWAP)', /ctVal/.test(srcSan));
  kiem('làm tròn XUỐNG theo lotSz (thà thiếu còn hơn bị từ chối)', /Math\.floor/.test(srcSan));

  /* Ba thời điểm bắt buộc: mở → đặt, siết → dời, đóng → huỷ. */
  kiem('mở lệnh → đặt SL', /San\.datSL/.test(srcL));
  kiem('đường cắt siết → dời SL', /San\.suaSL/.test(srcL));
  kiem('⛔ đóng lệnh → HUỶ SL (kẻo mồ côi cắt nhầm lệnh sau)', /San\.huySL/.test(srcL));
  /* ⛔ Lời gọi mạng KHÔNG được chặn vòng lặp 2 giây — một API chậm sẽ kéo
     lùi việc quản lý MỌI coin khác. Đường cắt RAM vẫn canh song song. */
  kiem('⛔ gọi sàn KHÔNG chặn nhịp (không await trong vòng lặp lệnh)',
    !/await San\.(datSL|suaSL|huySL)/.test(srcL));

  kiem('bot.js đối soát TRƯỚC khi bật nhịp phân tích',
    srcB.indexOf('doiSoatKhoiDong()') < srcB.indexOf('setInterval(nhipPhanTich'));
  kiem('đối soát cảnh báo khi SÀN có vị thế mà DB không có', /san_co_db_khong/.test(srcB));
  kiem('đối soát cảnh báo SL mồ côi', /SL_MO_COI/.test(srcB));
  /* SL trên sàn khớp thì KHÔNG AI báo cho bot — bot phải tự đi hỏi. */
  kiem('có đối soát ĐỊNH KỲ (bắt lúc SL sàn đã khớp)',
    /doiSoatDinhKy/.test(srcB) && /san_da_dong_ram_chua/.test(srcB));
  /* ⛔ Đóng sổ sách bằng giá ĐOÁN sẽ làm hỏng chính bộ dữ liệu dự án dựng
     lên để đo. Thà lệch và kêu to còn hơn ghi một con số sai. */
  kiem('⛔ đối soát định kỳ CHỈ cảnh báo, KHÔNG tự đóng sổ sách',
    !/doiSoatDinhKy[\s\S]{0,1600}?_dong\(/.test(srcB));
  kiem('San.laThat() sai ở chế độ giay', San.laThat() === false);
  kiem('chưa nạp khoá thì okx-tt báo chưa sẵn sàng', TT10.daNapKhoa() === false);
}

/* ================================================================= */
nhom('⭐ NẠP LẠI LỆNH ĐANG MỞ KHI KHỞI ĐỘNG (vá lỗi mất trạng thái)');
{
  const QL = new QuanLyLenh(cfg);
  const K = 0.05, giaVao = 100, notional = 60;
  /* long: đường cắt đã siết lên 98 (đỉnh 103,16) */
  const n = QL.napLaiLenhMo([{
    id: 1, uid: 'X-1', coin: 'ZZZ', huong: 'long', setup: 'LONG-A',
    ts_mo: Date.now() - 3600e3, trang_thai: 'THAM_DO', trong_khung: 0, gio_vn_mo: 10,
    gia_vao_tb: '100', gia_cat: '98', gia_vao_1: '100',
    ky_quy_usd: 6, gia_tri_lenh_usd: notional, so_lan_dca: 0, so_lan_chot: 0,
    khoang_trailing: K, lo_thiet_ke_usd: K * notional,
    phi_usd: 0.036, truot_usd: 0.03, funding_nhan_usd: 0,
    sl_algo_id: null, sl_gia: null,
  }]);
  kiem('nạp lại được 1 lệnh', n === 1, n);
  const st = QL.layTT('ZZZ');
  kiem('lệnh sống lại trong RAM', !!st.lenh);
  /* ⛔ Bất biến quan trọng nhất: đường cắt phục hồi ĐÚNG mốc chặt nhất,
     không được nới ra. */
  kiem('⛔ đường cắt phục hồi ĐÚNG mốc cũ, không nới ra',
    st.lenh && Math.abs(st.lenh.giaCat - 98) < 1e-9, st.lenh && st.lenh.giaCat);
  kiem('đỉnh giá suy ngược đúng (98 / (1−5%) ≈ 103,16)',
    st.lenh && Math.abs(st.lenh.giaDinh - 98 / 0.95) < 1e-6, st.lenh && G2(st.lenh.giaDinh));
  kiem('số coin dựng lại từ notional / giá vào TB',
    st.lenh && Math.abs(st.lenh.soCoin - notional / giaVao) < 1e-9);
  /* ⚠ baoDong chỉ có trong RAM → phải về false, phía an toàn: cần cò nổ
     LẠI mới chốt, chứ không chốt nhầm ngay sau khi khởi động. */
  kiem('⚠ báo động KHÔNG khôi phục (phía an toàn)', st.lenh && st.lenh.baoDong === false);
  kiem('nạp lại lần hai KHÔNG đè lên lệnh đang có',
    QL.napLaiLenhMo([{ id: 1, coin: 'ZZZ', huong: 'long', gia_vao_tb: '100',
                       gia_cat: '98', gia_tri_lenh_usd: 60 }]) === 0);
  kiem('bản ghi thiếu dữ liệu thì BỎ QUA, không dựng lệnh rác',
    QL.napLaiLenhMo([{ id: 9, coin: 'QQQ', huong: 'long' }]) === 0 && !QL.layTT('QQQ').lenh);

  /* Vốn dựng lại từ DB thay vì đặt về VON mỗi lần khởi động lại. */
  const Q2 = new QuanLyLenh(cfg);
  Q2.napLaiVon(-15.65);
  kiem('vốn dựng lại = vốn gốc + PnL đã đóng',
    Math.abs(Q2.von - (cfg.VON - 15.65)) < 1e-9, G2(Q2.von));
}

/* ================================================================= */
nhom('⛔ MẤT SỔ — lệnh đang mở VẪN phải được canh');
{
  /* Sổ hỏng được phép chặn MỞ lệnh mới. KHÔNG được chặn ĐÓNG lệnh.
     Trước 2026-08-23 ba lệnh `continue` trong bot.js bỏ qua luôn lệnh
     đang mở → coin đi ngược lúc mất sổ chạy bao xa cũng không ai đóng. */
  const A = moLenhThu(1.0);
  const catBanDau = A.st.lenh.giaCat;
  kiem('không có lệnh mở → canhLenhMu trả null',
    new QuanLyLenh(cfg).canhLenhMu('KHONG_CO', 1.0) === null);

  /* mù hoàn toàn: không sổ, không cả ticker */
  kiem('mất CẢ sổ lẫn ticker → báo khong_co_gia, KHÔNG đoán, KHÔNG đóng',
    A.QL.canhLenhMu('X', null) === 'khong_co_gia' && !!A.st.lenh);
  kiem('mù hoàn toàn KHÔNG được đụng vào đường cắt',
    A.st.lenh.giaCat === catBanDau, A.st.lenh.giaCat);

  /* có giá REST, chưa chạm cắt → canh bình thường */
  kiem('có giá REST, chưa chạm → canh', A.QL.canhLenhMu('X', 1.01) === 'canh');
  kiem('canh mù vẫn cập nhật PnL', A.st.lenh.pnlUsd < 0, G2(A.st.lenh.pnlUsd));

  /* giá REST vượt đường cắt → PHẢI đóng dù không có sổ */
  const kq = A.QL.canhLenhMu('X', catBanDau * 1.02);
  kiem('giá REST vượt đường cắt → ĐÓNG dù không có sổ', kq === 'dong' && !A.st.lenh, kq);
  const h = A.QL.lichSu[0];
  kiem('lý do đóng ghi rõ là đóng mù', h && h.lyDo === 'trailing_mu', h && h.lyDo);
  /* ⛔ Đóng mù mà giả định khớp hoàn hảo là tự lừa mình đúng lúc thị
     trường tệ nhất. Phải có phạt trượt. */
  kiem('đóng mù bị PHẠT TRƯỢT, không phải trượt 0',
    h && h.truot > 0, h && G2(h.truot));

  /* đường cắt mù dùng CHUNG hàm với đường cắt thường */
  const B = moLenhThu(1.0);
  const catB = B.st.lenh.giaCat;
  B.QL.canhLenhMu('X', 0.94);                       // lãi 6% khi đang mù
  kiem('canh mù cũng SIẾT đường cắt theo đỉnh', B.st.lenh.giaCat < catB, G2(B.st.lenh.giaCat));
  const catSau = B.st.lenh.giaCat;
  B.QL.canhLenhMu('X', 0.955);                      // bật ngược nhưng CHƯA chạm cắt
  kiem('canh mù cũng KHÔNG nới đường cắt ra',
    B.st.lenh && B.st.lenh.giaCat <= catSau + 1e-9, B.st.lenh && G2(B.st.lenh.giaCat));
}

/* ================================================================= */
nhom('⛔ MẤT SỔ — quét mã nguồn');
{
  const srcL = fs.readFileSync(path.join(__dirname, '..', 'lib', 'lenh.js'), 'utf8');
  const srcB = fs.readFileSync(path.join(__dirname, '..', 'bot.js'), 'utf8');
  const than = (src, ten) => {
    const i = src.indexOf('  ' + ten + '(');
    if (i < 0) return '';
    let d = 0, j = src.indexOf('{', i);
    for (let k = j; k < src.length; k++) {
      if (src[k] === '{') d++;
      else if (src[k] === '}') { d--; if (!d) return src.slice(j, k); }
    }
    return '';
  };
  const thanMu = than(srcL, 'canhLenhMu');
  kiem('canhLenhMu: đúng 2 lời gọi _dong (trailing_mu + lo_tran_mu)',
    (thanMu.match(/this\._dong\s*\(/g) || []).length === 2
    && /trailing_mu/.test(thanMu) && /lo_tran_mu/.test(thanMu));
  /* Cò đảo chiều cần sổ lệnh mới tính được — chạy chốt lời khi mù là
     quyết định trên dữ liệu không tồn tại. */
  kiem('⛔ canhLenhMu KHÔNG chạy chốt lời (cò cần sổ)',
    !/_xuLyChotLoi/.test(thanMu));
  kiem('⛔ canhLenhMu KHÔNG mở lệnh mới và KHÔNG DCA',
    !/_moLenh|_xuLyDCA/.test(thanMu));
  /* Hai nhánh phải dùng CHUNG một hàm cập nhật đường cắt. Chép ra hai
     bản là bất biến "không bao giờ lùi" sẽ thủng ở nhánh ít ai để mắt. */
  kiem('hai nhánh dùng CHUNG _capNhatDuongCat',
    /_capNhatDuongCat/.test(than(srcL, '_xuLyLenhMo')) && /_capNhatDuongCat/.test(thanMu));
  kiem('đóng mù đi qua _khopMu (có phạt trượt), không phải trượt 0',
    /_khopMu/.test(than(srcL, '_dong')) && /TRUOT_DONG_MU/.test(than(srcL, '_khopMu')));
  /* bot.js: vòng lặp KHÔNG được có `continue` trần trước khi canh lệnh */
  kiem('bot.js gọi canhMu ở nhánh sổ chết', /canhMu\(E, now\); continue;/.test(srcB));
  kiem('bot.js KHÔNG còn `continue` trần khi sổ hỏng',
    !/if \(E\.so\.hong\) continue;/.test(srcB)
    && !/SO_LENH_HET_HAN_MS\) continue;/.test(srcB));
  kiem('giá dự phòng có kiểm TUỔI ticker (không dùng giá lỗi thời)',
    /TUOI_TICKER_TOI_DA_MS/.test(than(srcB, 'giaDuPhong') || srcB));
}

/* ================================================================= */
nhom('KHOÁ HOÀ VỐN — lệnh đã lãi đủ thì không thể thành lỗ');
{
  const { QL, E, st } = moLenhThu(1.0);
  const giaVao = st.lenh.giaVao1;
  const K = st.lenh.khoangTrailing;
  /* đẩy lãi vượt NGUONG_KHOA_VON × K rồi thả cho giá quay hẳn lại */
  dayGia(QL, E, st, 1 - cfg.TRAILING.NGUONG_KHOA_VON * K - 0.005);
  kiem('lãi vượt ngưỡng → đã khoá hoà vốn', st.lenh && st.lenh.daKhoaVon === true);
  kiem('đường cắt không còn nằm dưới giá vào (short: không trên giá vào)',
    st.lenh && st.lenh.giaCat <= giaVao, st.lenh && G2(st.lenh.giaCat / giaVao));
  let dong = false;
  for (let g = 1 - cfg.TRAILING.NGUONG_KHOA_VON * K; g <= 1.2 && !dong; g += 0.005) {
    dayGia(QL, E, st, g); if (!st.lenh) dong = true;
  }
  kiem('giá quay hẳn về → lệnh đóng, và KHÔNG lỗ', dong && QL.lichSu[0].pnl >= 0,
    QL.lichSu[0] && G2(QL.lichSu[0].pnl));
}

/* ================================================================= */
nhom('DCA — hàng rào KHÁC căn cứ');
{
  /* ⚠ Bước giá phải NHỎ hơn hẳn bản cũ. Cửa sổ DCA nay là 20–50% quãng
     đường tới đường cắt, mà đường cắt chỉ còn 3% giá → cửa sổ nằm ở
     0,6%–1,5% giá. Bước 0,01 của bản cũ nhảy thẳng qua nó. */
  const A = moLenhThu(1.0);
  let daDCA = false;
  for (let g = 1.004; g <= 1.022 && !daDCA; g += 0.002) {
    A.QL.capNhat('X', A.E, soGia(g), P0(g, { dinhGan: g, dayGan: 1.0, dOi25: 0 }),
      CONG, { ...BC, nenTuChoi: true });
    if (A.st.lenh && A.st.lenh.soLanDCA > 0) daDCA = true;
  }
  kiem('có căn cứ (rào chắn dày + nến từ chối) → DCA', daDCA);
  if (daDCA) {
    kiem('DCA thêm đúng $4 → tổng $10', A.st.lenh.kyQuy === 10, A.st.lenh.kyQuy);
    kiem('giá trị lệnh thành $100', G2(A.st.lenh.notional) === 100, A.st.lenh.notional);
    /* Sau DCA, đường cắt vẫn phải nằm trong đúng MỘT khoảng trailing so
       với giá vào TB — và tuyệt đối không được nới ra. */
    kiem('sau DCA đường cắt vẫn ≤ 1 khoảng trailing',
      (A.st.lenh.giaCat / A.st.lenh.giaVaoTB - 1) <= A.st.lenh.khoangTrailing + 1e-9,
      G2(A.st.lenh.giaCat / A.st.lenh.giaVaoTB - 1));
    kiem('rủi ro thiết kế tính lại theo notional MỚI',
      Math.abs(A.st.lenh.loThietKeUsd - A.st.lenh.khoangTrailing * 100) < 1e-9,
      A.st.lenh.loThietKeUsd);
    for (let g = 1.024; g <= 1.05; g += 0.002) {
      A.QL.capNhat('X', A.E, soGia(g), P0(g, { dinhGan: g, dayGan: 1.0, dOi25: 0 }),
        CONG, { ...BC, nenTuChoi: true });
    }
    kiem('⛔ DCA ĐÚNG MỘT LẦN, không bao giờ hai',
      !A.st.lenh || A.st.lenh.soLanDCA === 1, A.st.lenh && A.st.lenh.soLanDCA);
  }

  const B = moLenhThu(1.0);
  for (let g = 1.004; g <= 1.022; g += 0.002) {
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
  /* TRAN hạ 0,50 → 0,35 (2026-08-23): giữ 65% đỉnh thay vì 50%. */
  kiem('đỉnh +6% → ngưỡng 2,1 điểm (giữ 65%)', G2(cong(6)) === 2.1, cong(6));
  kiem('đỉnh +10% → ngưỡng 3,5 điểm (giữ 65%)', G2(cong(10)) === 3.5, cong(10));
  kiem('đỉnh +20% → ngưỡng 5 điểm (giữ 75%)', G2(cong(20)) === 5, cong(20));
  kiem('đỉnh +40% → ngưỡng 10 điểm (giữ 75%)', G2(cong(40)) === 10, cong(40));
  kiem('không bao giờ trả lại quá 35% đỉnh',
    [4, 6, 10, 20, 40, 80].every(d => cong(d) <= 0.35 * d + 1e-9));

  /* --- đúng ví dụ của chủ dự án ---
     ⚠ Biên độ nhỏ hơn bản cũ là CỐ Ý. Với đỉnh lớn, đường trailing (3%)
     siết chặt hơn ngưỡng hồi (35% × đỉnh) nên trailing sẽ đóng lệnh
     TRƯỚC — đó chính là mục đích. Muốn kiểm riêng nhánh `chot_loi` thì
     phải ở vùng đỉnh nhỏ, nơi 35% × đỉnh < khoảng trailing. */
  const { QL, E, st } = moLenhThu(1.0);
  dayGia(QL, E, st, 0.96);
  kiem('lãi +4% → ghi nhận đỉnh lãi', st.lenh && st.lenh.dinhLai * 100 >= 3.9, G2(st.lenh.dinhLai * 100));

  dayGia(QL, E, st, 0.96, { coCHOT_short: true });
  kiem('cò đảo nổ khi ĐANG LÃI → GÀI báo động', st.lenh && st.lenh.baoDong === true);

  dayGia(QL, E, st, 0.968, { coCHOT_short: true });
  kiem('hồi 0,8 điểm < ngưỡng 1,4 → VẪN GỒNG ✅', !!st.lenh, st.trangThai);

  dayGia(QL, E, st, 0.95);
  kiem('đỉnh mới +5% → GỠ báo động ✅',
    st.lenh && st.lenh.baoDong === false && st.lenh.dinhLai * 100 >= 4.9,
    st.lenh && { baoDong: st.lenh.baoDong, dinh: G2(st.lenh.dinhLai * 100) });

  dayGia(QL, E, st, 0.95, { coCHOT_short: true });
  dayGia(QL, E, st, 0.972, { coCHOT_short: true });
  kiem('báo động + hồi đủ sâu → CHỐT LỜI', !st.lenh, st.trangThai);
  const h = QL.lichSu[0];
  kiem('lý do đóng là chot_loi', h && h.lyDo === 'chot_loi', h && h.lyDo);
  kiem('chốt lời ra PnL DƯƠNG', h && h.pnl > 0, h && G2(h.pnl));
}

/* ================================================================= */
nhom('⭐ SÀN PHÍ — đỉnh quá nhỏ thì CẤM chốt lời (chốt là chắc chắn âm)');
{
  /* 17/54 lệnh đầu đóng bằng `chot_loi` mà PnL âm; 7 lệnh có đỉnh dưới
     2× phí khứ hồi — ở đó chốt KHÔNG THỂ dương. Nay bị chặn. */
  const { QL, E, st } = moLenhThu(1.0);
  const duoiSan = 1 - cfg.SAN_CHOT_LOI_PC * 0.5;      // đỉnh chỉ bằng nửa sàn
  dayGia(QL, E, st, duoiSan);
  dayGia(QL, E, st, duoiSan, { coCHOT_short: true });
  dayGia(QL, E, st, 1.0, { coCHOT_short: true });      // hồi hết đỉnh
  kiem('đỉnh dưới sàn phí + cò nổ + hồi hết → KHÔNG chốt, vẫn gồng',
    !!st.lenh, st.trangThai);
  kiem('sàn phí đúng bằng 2× phí khứ hồi',
    Math.abs(cfg.SAN_CHOT_LOI_PC - 2 * (2 * cfg.PHI_MOI_LAN)) < 1e-12, cfg.SAN_CHOT_LOI_PC);
}

/* ================================================================= */
nhom('CHỐT LỜI — cò đảo nổ lúc ĐANG LỖ thì KHÔNG đóng');
{
  /* ⚠ Mức lỗ phải NÔNG hơn khoảng trailing, nếu không lệnh bị đường cắt
     đóng và phép kiểm hoá ra đang kiểm nhầm thứ khác. 1,05 của bản cũ
     (lỗ 5%) nay vượt cả đường cắt 3%. */
  const { QL, E, st } = moLenhThu(1.0);
  const loNong = 1 + cfg.TRAILING.KHOANG_SAN * 0.5;
  for (let i = 0; i < 30; i++) dayGia(QL, E, st, loNong, { coCHOT_short: true });
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
    /* ⚠ Số coin ở đây là của PHÉP KIỂM, cố ý KHÔNG lấy từ cfg: trần coin
       đã bỏ (null) và phép kiểm này đo hành vi GOM, không đo trần. */
    const SO = 20;
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
