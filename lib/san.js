'use strict';
/* =====================================================================
   BỘ CHUYỂN SÀN — Giai đoạn 10.

   ⭐ LÝ DO TỒN TẠI: cắt lỗ nằm trong RAM bot có ba tầng trễ không gỡ được
   bằng code —
       1. nhịp 2 giây: giá đi hết quãng cắt trong 2 giây thì cắt muộn
       2. Node đơn luồng: 20 lệnh cùng chạm cắt thì lệnh cuối chờ lệnh đầu
       3. bot chết / mất mạng: không ai cắt cả
   Máy khớp lệnh của sàn canh liên tục ở mức micro-giây, song song cho mọi
   vị thế, và sống độc lập với bot. Đưa SL sang sàn là cách DUY NHẤT xử lý
   được cả ba.

   ⭐ MỘT GIAO DIỆN, BA CHẾ ĐỘ — đường code KHÔNG rẽ nhánh:

     giay  (mặc định)  không gửi gì. Vẫn TÍNH đầy đủ lệnh SL sẽ gửi và
                       ghi vào DB + log, để soi trước khi có khoá.
     demo              gửi API OKX THẬT kèm header `x-simulated-trading`.
                       Tiền ảo, hạ tầng thật, đường code thật.
     that              y hệt `demo`, bỏ mỗi header đó.

   Nhờ vậy `giay` không phải là một nhánh code chết: nó chạy đúng logic,
   chỉ dừng ngay trước lúc bấm gửi. Sang `demo` rồi `that` không có đoạn
   nào "lần đầu được chạy".

   ⛔ FILE NÀY KHÔNG QUYẾT ĐỊNH GIAO DỊCH. Nó nhận `giaCat` từ
   `lib/lenh.js` rồi lo việc đưa nó tới sàn. Vùng chết là quyết định KỸ
   THUẬT (chống spam API), không phải quyết định giao dịch.
   ===================================================================== */

const TT = require('./okx-tt');
const R = require('./okx-rest');
const DB = require('./db');
const { ghi, canh } = require('./log');
const cfg = require('../config');
const S = cfg.SAN;

let _cheDo = 'giay';
let _sanSang = false;      // đã nạp khoá và gọi được sàn chưa

const laThat = () => _cheDo === 'demo' || _cheDo === 'that';
const cheDo = () => _cheDo;
const sanSang = () => _sanSang;

/**
 * Gọi một lần lúc khởi động.
 * ⛔ Thiếu khoá ở chế độ demo/that thì LÙI VỀ `giay` chứ không chạy tiếp
 * nửa vời — chạy thật mà không đặt được SL là tệ hơn hẳn chạy giấy.
 */
function khoiTao(cheDoMuon, khoa) {
  _cheDo = cheDoMuon || 'giay';
  if (!laThat()) {
    ghi('SAN: che do GIAY — tinh day du lenh SL nhung KHONG gui. '
      + 'Gan khoa API roi doi CHE_DO sang "demo" de gui that.');
    _sanSang = false;
    return _cheDo;
  }
  const ok = TT.napKhoa(khoa, _cheDo === 'demo');
  if (!ok) {
    canh('⛔ CHE_DO =', _cheDo, 'nhung THIEU khoa API trong config.local.js'
      + ' — lui ve che do GIAY. Xem config.local.mau.js.');
    _cheDo = 'giay';
    _sanSang = false;
    return _cheDo;
  }
  _sanSang = true;
  return _cheDo;
}

/* =================================================================== */
/*  QUY ĐỔI USD → SỐ HỢP ĐỒNG                                          */
/* =================================================================== */
/**
 * ⛔ BẪY LỚN NHẤT CỦA OKX SWAP: `sz` tính bằng HỢP ĐỒNG, không phải USD
 * và cũng không phải số coin. Quên nhân `ctVal` là sai hàng nghìn lần —
 * bẫy này đã nằm sẵn trong bảng bẫy của dự án.
 *
 * Làm tròn XUỐNG theo `lotSz`: thà vào thiếu một chút còn hơn vào thừa
 * rồi bị sàn từ chối cả lệnh.
 *
 * @returns {{sz:string, notionalThat:number}|null} null nếu dưới mức tối thiểu
 */
function soHopDong(sym, notionalUsd, gia) {
  const hd = R.hopDong(sym);
  if (!hd || !(gia > 0)) return null;
  const ctVal = hd.ctVal || 1;
  const lotSz = parseFloat(hd.lotSz) || 1;
  const minSz = parseFloat(hd.minSz) || lotSz;

  const thoSo = notionalUsd / (gia * ctVal);
  const so = Math.floor(thoSo / lotSz) * lotSz;
  if (!(so > 0) || so < minSz) return null;

  /* Số thập phân của lotSz quyết định cách in — in thừa số 0 là OKX từ chối */
  const soLe = (String(lotSz).split('.')[1] || '').length;
  return { sz: so.toFixed(soLe), notionalThat: so * ctVal * gia };
}

/* =================================================================== */
/*  CẮT LỖ PHÍA SÀN                                                    */
/* =================================================================== */
/**
 * Đặt SL cho một lệnh vừa mở. Ghi lại vào `L` để lần sau còn sửa/huỷ.
 *
 * ⛔ Ở chế độ `giay` vẫn TÍNH đủ `sz` và giá kích hoạt rồi ghi sự kiện —
 * đó là cách soi trước khi có khoá thật. Chỉ bỏ đúng bước gửi.
 */
async function datSL(L) {
  const instId = L.sym + '-USDT-SWAP';
  const q = soHopDong(L.sym, L.notional, L.giaVaoTB);
  if (!q) {
    canh(`[${L.sym}] ⛔ KHONG QUY DOI DUOC SO HOP DONG — notional $${L.notional}`
      + ` @ ${L.giaVaoTB}. SL KHONG duoc dat.`);
    DB.ghiSuKien({ coin: L.sym, tu: 'SAN', den: 'SL_HONG', lyDo: 'khong_quy_doi_duoc',
                   chiTiet: { notional: L.notional, gia: L.giaVaoTB } });
    return null;
  }

  L.slGia = L.giaCat;
  L.slSz = q.sz;

  if (!laThat() || !_sanSang) {
    /* KHÔ — tính đủ, ghi lại, không gửi. */
    L.slAlgoId = null;
    DB.ghiSuKien({ coin: L.sym, tu: 'SAN', den: 'SL_KHO', lyDo: 'se_dat_SL',
                   chiTiet: { instId, huong: L.huong, sz: q.sz, giaKichHoat: L.giaCat } });
    ghi(`[${L.sym}] 🧪 SL (khô) ${L.huong} sz=${q.sz} kích hoạt @ ${L.giaCat}`);
    return { moPhong: true, gia: L.giaCat, sz: q.sz };
  }

  const kq = await thuLai(() => TT.datSL(instId, L.huong, q.sz, L.giaCat));
  if (!kq.ok) {
    /* ⛔ Không đặt được SL = vị thế đang TRẦN TRỤI trên sàn. Đây là tình
       huống nguy hiểm nhất của cả Giai đoạn 10 và phải kêu thật to. */
    canh(`[${L.sym}] ⛔⛔ DAT SL THAT BAI (${kq.code} ${kq.msg}) — VI THE DANG`
      + ' KHONG CO LUOI AN TOAN. Bot van canh trong RAM nhung do la lop yeu hon.');
    DB.ghiSuKien({ coin: L.sym, tu: 'SAN', den: 'SL_HONG', lyDo: 'dat_that_bai',
                   chiTiet: { code: kq.code, msg: kq.msg } });
    return null;
  }
  L.slAlgoId = (kq.data && kq.data[0] && kq.data[0].algoId) || null;
  ghi(`[${L.sym}] 🛡 SL đã đặt trên sàn · id ${L.slAlgoId} · kích hoạt @ ${L.giaCat}`);
  DB.ghiSuKien({ coin: L.sym, tu: 'SAN', den: 'SL_DAT', lyDo: 'ok',
                 chiTiet: { algoId: L.slAlgoId, gia: L.giaCat, sz: q.sz } });
  return { moPhong: false, algoId: L.slAlgoId, gia: L.giaCat, sz: q.sz };
}

/**
 * Dời SL theo đường cắt đã siết.
 *
 * ⭐ VÙNG CHẾT — đây là lý do hàm này tồn tại thay vì gọi thẳng.
 * Đường cắt siết mỗi 2 giây. Sửa lệnh mỗi lần siết = 20 vị thế × 1 lệnh
 * / 2 giây = 10 yêu cầu/giây chỉ riêng cho SL → đụng giới hạn tốc độ API
 * ĐÚNG LÚC thị trường loạn, tức đúng lúc SL quan trọng nhất.
 * Chỉ dời khi mốc mới tốt hơn mốc ĐÃ ĐẶT ít nhất `VUNG_CHET_PC`.
 *
 * ⛔ Và chỉ dời theo chiều SIẾT VÀO — cùng bất biến với `_dayGiaCat`.
 */
async function suaSL(L) {
  if (!L.slGia || !(L.giaCat > 0)) return false;

  const siet = L.huong === 'short'
    ? (L.slGia - L.giaCat) / L.slGia          // short: mốc mới THẤP hơn là siết
    : (L.giaCat - L.slGia) / L.slGia;         // long: mốc mới CAO hơn là siết
  if (!(siet >= S.VUNG_CHET_PC)) return false;

  const giaCu = L.slGia;
  L.slGia = L.giaCat;

  if (!laThat() || !_sanSang) {
    DB.ghiSuKien({ coin: L.sym, tu: 'SAN', den: 'SL_KHO', lyDo: 'se_doi_SL',
                   chiTiet: { cu: giaCu, moi: L.giaCat, siet: +(siet * 100).toFixed(2) } });
    return true;
  }
  if (!L.slAlgoId) return false;

  const kq = await thuLai(() => TT.suaSL(L.sym + '-USDT-SWAP', L.slAlgoId, L.giaCat));
  if (!kq.ok) {
    /* Sửa hỏng thì SL CŨ vẫn còn trên sàn — vẫn được bảo vệ, chỉ là ở mốc
       rộng hơn. Trả `slGia` về mốc cũ để lần sau thử lại đúng chênh lệch. */
    L.slGia = giaCu;
    canh(`[${L.sym}] ⚠ doi SL that bai (${kq.code}) — SL cu @ ${giaCu} VAN CON hieu luc`);
    return false;
  }
  DB.ghiSuKien({ coin: L.sym, tu: 'SAN', den: 'SL_DOI', lyDo: 'ok',
                 chiTiet: { cu: giaCu, moi: L.giaCat } });
  return true;
}

/**
 * Huỷ SL khi lệnh đã đóng bằng đường khác (chốt lời, trailing trong RAM).
 * ⛔ Quên huỷ = SL mồ côi nằm lại trên sàn, và lần sau vào lệnh cùng coin
 * nó có thể kích hoạt cắt nhầm vị thế mới.
 */
async function huySL(L) {
  if (!laThat() || !_sanSang) {
    if (L.slGia) DB.ghiSuKien({ coin: L.sym, tu: 'SAN', den: 'SL_KHO', lyDo: 'se_huy_SL',
                                chiTiet: { gia: L.slGia } });
    return true;
  }
  if (!L.slAlgoId) return true;
  const kq = await thuLai(() => TT.huySL(L.sym + '-USDT-SWAP', L.slAlgoId));
  if (!kq.ok) {
    canh(`[${L.sym}] ⚠ HUY SL that bai (${kq.code}) — id ${L.slAlgoId} co the con MO COI tren san`);
    DB.ghiSuKien({ coin: L.sym, tu: 'SAN', den: 'SL_MO_COI', lyDo: 'huy_that_bai',
                   chiTiet: { algoId: L.slAlgoId, code: kq.code } });
    return false;
  }
  DB.ghiSuKien({ coin: L.sym, tu: 'SAN', den: 'SL_HUY', lyDo: 'ok', chiTiet: { algoId: L.slAlgoId } });
  return true;
}

/** Thử lại — SL là lưới an toàn, hỏng mà im lặng là tệ nhất. */
async function thuLai(fn) {
  let kq = { ok: false, code: 'CHUA_CHAY' };
  for (let i = 0; i <= S.SL_THU_LAI; i++) {
    kq = await fn();
    if (kq.ok) return kq;
    if (kq.code === 'NO_KEY') return kq;          // thiếu khoá thì thử lại vô ích
    await new Promise(r => setTimeout(r, 300 * (i + 1)));
  }
  return kq;
}

/* =================================================================== */
/*  ĐỌC SỰ THẬT TỪ SÀN — nền của đối soát                              */
/* =================================================================== */
/** Vị thế đang mở trên sàn, chuẩn hoá về `{sym, huong, sz, giaVao}`. */
async function viTheThat() {
  if (!laThat() || !_sanSang) return [];
  const kq = await TT.viThe();
  if (!kq.ok) return [];
  return (kq.data || [])
    .filter(p => parseFloat(p.pos) !== 0)
    .map(p => ({
      sym: String(p.instId).replace('-USDT-SWAP', ''),
      instId: p.instId,
      huong: parseFloat(p.pos) > 0 ? 'long' : 'short',
      sz: Math.abs(parseFloat(p.pos)),
      giaVao: parseFloat(p.avgPx) || 0,
    }));
}

/** SL đang treo trên sàn — để tìm cái mồ côi. */
async function slThat() {
  if (!laThat() || !_sanSang) return [];
  const kq = await TT.slDangTreo();
  if (!kq.ok) return [];
  return (kq.data || []).map(a => ({
    sym: String(a.instId).replace('-USDT-SWAP', ''),
    instId: a.instId,
    algoId: a.algoId,
    giaKichHoat: parseFloat(a.slTriggerPx) || 0,
  }));
}

module.exports = {
  khoiTao, cheDo, laThat, sanSang,
  soHopDong, datSL, suaSL, huySL,
  viTheThat, slThat,
};
