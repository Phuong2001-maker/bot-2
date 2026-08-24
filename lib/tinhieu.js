'use strict';
/* =====================================================================
   TẦNG TÍN HIỆU.

   Quy ước dấu:  S > 0 nghiêng LONG   ·   S < 0 nghiêng SHORT.

   ⚠ KHUNG GIỜ KHÔNG BAO GIỜ CỘNG ĐIỂM VÀO S (mục 3.1 của XAY-BOT.md).
   Đo trên 17.999 nến 1H BTC: |t| lớn nhất trong 24 giờ là 2,66 < ngưỡng
   Bonferroni 2,87; ngoài mẫu dấu trùng 13/24 (tung đồng xu được 12/24).
   Khung giờ là CỔNG, xử lý ở lib/khung.js.

   ⚠ NULL ≠ 0. Tín hiệu thiếu dữ liệu trả null và cờ `co.*` = false.
   Ghi 0 cho cả hai là dạy mô hình sau này rằng "không có tin gì" giống
   "tin trung lập".
   ===================================================================== */

const crypto = require('crypto');
const T = require('./tuong');
const cfgGoc = require('../config');
const H = cfgGoc.TIN_HIEU;    // mọi con số chuẩn hoá/ngưỡng nằm ở config.js

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* Hash tự sinh từ chính mảng tham số quyết định → không bao giờ quên
   bump phiên bản khi chỉnh trọng số. */
const TRONG_SO = H.TRONG_SO;
function verTrongSo(cfg) {
  const v = [
    TRONG_SO.pull, TRONG_SO.flow30, TRONG_SO.book, TRONG_SO.liq, TRONG_SO.oi, TRONG_SO.fund,
    cfg.NG_BPR, cfg.TY_LE_PULL_TREN_FILL, cfg.NG_DBI, cfg.CUA_SO_PULL_GIAY,
    cfg.SAT_DINH_TOI_DA, cfg.NGUONG_VAO, cfg.NGUONG_DAO, cfg.XAC_NHAN_TICK,
    cfg.TRAILING.HE_SO_BIEN_DO, cfg.TRAILING.KHOANG_SAN, cfg.TRAILING.KHOANG_TRAN,
    cfg.TRAILING.NGUONG_KHOA_VON, cfg.TRAILING.DEM_HOA_VON,
    cfg.LO_TRAN_USD, cfg.SAN_CHOT_LOI_PC, cfg.KY_QUY_LAN_1, cfg.KY_QUY_DCA,
    cfg.RAO_CHAN_TOI_THIEU, cfg.HOI_LAI_TOI_THIEU, cfg.HOI_LAI_TY_LE, cfg.HOI_LAI_TRAN,
  ].join('|');
  return crypto.createHash('sha1').update(v).digest('hex').slice(0, 10);
}

/* ------------------------------------------------------------ dòng tiền */
/** ⚠ mua/bán GROSS, tách riêng. Cộng dồn có dấu thì f=0 lẫn lộn
 *  "chợ chết" với "hai phe đánh nhau ngang cơ" — hai trạng thái ngược nhau. */
function themKhop(E, usd, laMua) {
  const s = Math.floor(Date.now() / 1000);
  const cuoi = E.dongTien[E.dongTien.length - 1];
  if (cuoi && cuoi.t === s) {
    if (laMua) cuoi.mua += usd; else cuoi.ban += usd;
  } else {
    E.dongTien.push({ t: s, mua: laMua ? usd : 0, ban: laMua ? 0 : usd });
  }
  const cat = s - 7200;
  while (E.dongTien.length && E.dongTien[0].t < cat) E.dongTien.shift();
  if (E.dongTien.length > 20000) E.dongTien.splice(0, E.dongTien.length - 20000);
}

function thongKeDong(E) {
  const s = Math.floor(Date.now() / 1000);
  let m30 = 0, b30 = 0, m5 = 0, b5 = 0;
  for (let i = E.dongTien.length - 1; i >= 0; i--) {
    const x = E.dongTien[i];
    const tuoi = s - x.t;
    if (tuoi > 1800) break;
    m30 += x.mua; b30 += x.ban;
    if (tuoi <= 300) { m5 += x.mua; b5 += x.ban; }
  }
  return { mua30: m30, ban30: b30, mua5: m5, ban5: b5, f30: m30 - b30, f5: m5 - b5 };
}

function themThanhLy(E, usd, viTheLong) {
  const now = Date.now();
  E.thanhLy.push({ t: now, usd, long: viTheLong });
  const cat = now - 1800e3;
  while (E.thanhLy.length && E.thanhLy[0].t < cat) E.thanhLy.shift();
  if (E.thanhLy.length > 20000) E.thanhLy.splice(0, E.thanhLy.length - 20000);
}

function thongKeThanhLy(E) {
  const cat = Date.now() - 1800e3;
  let L = 0, S = 0;
  for (let i = E.thanhLy.length - 1; i >= 0; i--) {
    const x = E.thanhLy[i];
    if (x.t < cat) break;
    if (x.long) L += x.usd; else S += x.usd;
  }
  return { liqLong: L, liqShort: S };
}

/* ---- mẫu "gần 25 phút trước": duyệt NGƯỢC từ cuối mảng.
   find() từ đầu mảng lấy nhầm phần tử CŨ NHẤT (2–4 giờ) và làm lệch
   toàn bộ tín hiệu OI — bẫy đã dính ở dự án cũ. ---- */
function mau25(arr) {
  const now = Date.now();
  const cua = H.OI_CUA_SO_PHUT * 60e3;
  for (let i = arr.length - 1; i >= 0; i--) if (now - arr[i].t > cua) return arr[i];
  return null;
}

/* ------------------------------------------------------------ phân tích */
function phanTich(E, A, cfg) {
  const now = Date.now();
  const mid = A.mid;

  E.giaHist.push({ t: now, p: mid });
  while (E.giaHist.length && now - E.giaHist[0].t > H.GIA_HIST_GIO * 3600e3) E.giaHist.shift();

  const dong = thongKeDong(E);
  const tl = thongKeThanhLy(E);
  const ds = T.doSauTin(E.tuong, A);
  const scale = Math.max(ds.bookM, 1e5);

  /* --- cửa sổ RÚT/KHỚP hai phía --- */
  const W = cfg.CUA_SO_PULL_GIAY;
  const B = T.tyLeRutKhop(E.tuong, 'b', W);   // tường MUA
  const K = T.tyLeRutKhop(E.tuong, 'a', W);   // tường BÁN

  /* --- dDBI: so với chính nó W giây trước --- */
  E.dbiHist.push({ t: now, v: ds.dbi });
  while (E.dbiHist.length && now - E.dbiHist[0].t > 3600e3) E.dbiHist.shift();
  let dbiCu = null;
  for (let i = E.dbiHist.length - 1; i >= 0; i--) {
    if (now - E.dbiHist[i].t >= W * 1000) { dbiCu = E.dbiHist[i].v; break; }
  }
  const ddbi = dbiCu === null ? null : ds.dbi - dbiCu;

  /* --- đỉnh/đáy gần (2 giờ) để biết giá ĐÃ chạy chưa --- */
  let dinhGan = mid, dayGan = mid;
  for (const x of E.giaHist) { if (x.p > dinhGan) dinhGan = x.p; if (x.p < dayGan) dayGan = x.p; }
  const satDinh = (mid - dinhGan) / dinhGan;   // 0 = đang ở đỉnh, âm = đã rơi
  const satDay = (mid - dayGan) / dayGan;      // 0 = đang ở đáy, dương = đã bật

  /* ------------------------- 6 TÍN HIỆU ------------------------- */
  const co = { pull: false, flow30: false, book: false, liq: false, oi: false, fund: false };

  /* 1. sPull — tín hiệu DẪN. Tường BÁN bị rút = bò; tường MUA bị rút = gấu. */
  let sPull = null;
  if (B.dem >= cfg.TUONG.MAU_TOI_THIEU && K.dem >= cfg.TUONG.MAU_TOI_THIEU) {
    const netB = B.pr - B.fr;   // >0: tường mua bị RÚT nhiều hơn bị ăn
    const netK = K.pr - K.fr;
    sPull = clamp((netK - netB) / 0.5, -1, 1);
    co.pull = true;
  }

  /* 2. sFlow30 */
  const sFlow30 = clamp(dong.f30 / (scale * H.CHUAN_FLOW30), -1, 1);
  const sFlow5 = clamp(dong.f5 / (scale * H.CHUAN_FLOW5), -1, 1);
  co.flow30 = E.dongTien.length > 0;

  /* 3. sBook */
  const sBook = ds.dbi;
  co.book = (ds.bid + ds.ask) > 0;

  /* 4. sLiq — thanh lý SHORT ép mua (đẩy LÊN), thanh lý LONG ép bán (đẩy XUỐNG) */
  const sLiq = clamp((tl.liqShort - tl.liqLong) / Math.max(scale * H.CHUAN_LIQ, H.LIQ_SAN_USD), -1, 1);
  co.liq = true;

  /* 5. sOi — ma trận OI × Giá */
  let sOi = 0, dOi25 = null, dP25 = null;
  const o0 = mau25(E.oiHist), p0 = mau25(E.giaHist);
  if (E.oiUsd && o0 && p0 && o0.v > 0 && p0.p > 0) {
    dOi25 = (E.oiUsd - o0.v) / o0.v;
    dP25 = (mid - p0.p) / p0.p;
    co.oi = true;
    if (Math.abs(dP25) > H.OI_NGUONG_GIA && Math.abs(dOi25) > H.OI_NGUONG_OI) {
      const manh = Math.min(1, Math.abs(dOi25) / H.OI_CHUAN);
      const nguoc = H.OI_NGUOC_HE_SO;
      if (dP25 > 0) sOi = dOi25 > 0 ? manh : -nguoc * manh;   // ↑↑ long chất vào
      else sOi = dOi25 > 0 ? -manh : nguoc * manh;            // ↓↓ long đầu hàng
    }
  }

  /* 6. sFund — NGƯỢC đám đông. Funding dương cao = long đông = nghiêng gấu. */
  let sFund = 0;
  if (E.funding && isFinite(E.funding.f8)) { sFund = clamp(-E.funding.f8 / H.CHUAN_FUND, -1, 1); co.fund = true; }

  const p = {
    pull: sPull === null ? 0 : sPull,
    flow30: sFlow30, book: sBook, liq: sLiq, oi: sOi, fund: sFund,
  };
  const S = 100 * (TRONG_SO.pull * p.pull + TRONG_SO.flow30 * p.flow30
    + TRONG_SO.book * p.book + TRONG_SO.liq * p.liq
    + TRONG_SO.oi * p.oi + TRONG_SO.fund * p.fund);

  const hoatDong = Object.values(p).filter(x => Math.abs(x) > H.HOAT_DONG_NGUONG).length;
  const dongNguoc = Math.sign(sFlow5) !== Math.sign(sFlow30)
    && Math.abs(sFlow5) > H.DONG_NGUOC_NGUONG && Math.abs(sFlow30) > H.DONG_NGUOC_NGUONG;
  const baoHoa = Math.abs(sFlow30) >= H.BAO_HOA_NGUONG && Math.abs(sFlow5) >= H.BAO_HOA_NGUONG;
  const baoHoaKhongXacNhan = baoHoa
    && !((sBook * Math.sign(S) >= H.BAO_HOA_XAC_NHAN) || (sOi * Math.sign(S) >= H.BAO_HOA_XAC_NHAN));

  /* ------------------------- BA CÒ ------------------------- */
  const nBPR = cfg.NG_BPR, tyLe = cfg.TY_LE_PULL_TREN_FILL, nDBI = cfg.NG_DBI;

  /* Cò SHORT: tường MUA bị RÚT (không phải bị ăn) + độ sâu sập về phía bán
     + giá VẪN CÒN SÁT ĐỈNH → đây là "bắt trước", chưa giảm. */
  const coSHORT = B.dem >= cfg.TUONG.MAU_TOI_THIEU
    && B.pr >= nBPR
    && B.pr >= tyLe * Math.max(B.fr, 1e-9)     // ← RÚT chứ không phải BỊ ĂN
    && ddbi !== null && ddbi <= -nDBI
    && satDinh >= -cfg.SAT_DINH_TOI_DA;        // ← giá CHƯA giảm

  /* Cò LONG: đối xứng — tường BÁN bị rút, độ sâu nghiêng về mua, giá còn sát đáy */
  const coLONG = K.dem >= cfg.TUONG.MAU_TOI_THIEU
    && K.pr >= nBPR
    && K.pr >= tyLe * Math.max(K.fr, 1e-9)
    && ddbi !== null && ddbi >= nDBI
    && satDay <= cfg.SAT_DINH_TOI_DA;

  /* Cò ĐẢO CHIỀU — đường chốt lời DUY NHẤT, nên đọc bằng HAI cách,
     thấy MỘT trong hai là đủ:

       (a) LỰC   — lượng bán ít hơn lượng mua, độ sâu nghiêng về mua
       (b) LỆNH ẢO — tường BÁN phía trên đang bị RÚT: kháng cự bốc hơi,
           giá sắp bật lên. Đây là tín hiệu DẪN, đối xứng đúng với logic
           vào lệnh — nó báo TRƯỚC khi giá kịp lên.

     ⚠ Chỉ được nổ khi lệnh ĐANG LÃI; kiểm ở lib/lenh.js, không kiểm ở đây. */
  const luc_short = ds.dbi > H.CHOT_DBI && dong.mua30 > dong.ban30 * H.CHOT_TY_LE_MUA_BAN && (ddbi ?? 0) > 0;
  const ao_short = K.dem >= cfg.TUONG.MAU_TOI_THIEU && K.pr >= nBPR && K.pr >= tyLe * Math.max(K.fr, 1e-9);
  const coCHOT_short = luc_short || ao_short;

  const luc_long = ds.dbi < -H.CHOT_DBI && dong.ban30 > dong.mua30 * H.CHOT_TY_LE_MUA_BAN && (ddbi ?? 0) < 0;
  const ao_long = B.dem >= cfg.TUONG.MAU_TOI_THIEU && B.pr >= nBPR && B.pr >= tyLe * Math.max(B.fr, 1e-9);
  const coCHOT_long = luc_long || ao_long;

  return {
    ts: now, mid, S, hoatDong,
    sig: p, co, sigThieu: sPull === null,
    bpr: B.pr, bfr: B.fr, apr: K.pr, afr: K.fr,
    /* mẫu tường của CẢ HAI phía — `K.dem` là vế đầu của cò LONG, trước
       2026-08-12 chỉ có `B.dem` nên vế đó không kiểm chứng được */
    mauPull: B.dem, mauPullAsk: K.dem,
    dbi: ds.dbi, ddbi, bidTin: ds.bid, askTin: ds.ask,
    nOrdBid: ds.nOrdBid, nOrdAsk: ds.nOrdAsk, bookM: ds.bookM,
    ...dong, ...tl,
    dOi25, dP25, oiUsd: E.oiUsd,
    funding8h: E.funding ? E.funding.f8 : null,
    dinhGan, dayGan, satDinh, satDay,
    dongNguoc, baoHoa, baoHoaKhongXacNhan,
    coSHORT, coLONG, coCHOT_short, coCHOT_long,
    lyDoChot: { luc_short, ao_short, luc_long, ao_long },
  };
}

/* ------------------------------------------------- bitmask chốt chặn */
/**
 * ⚠ Bit 16 (`ngoài khung gốc`) VẪN được tính và ghi vào DB, nhưng nó
 * KHÔNG còn chặn gì — chạy 24/24. Nó tồn tại thuần tuý làm NHÃN để sau
 * này so hai nhóm trong/ngoài khung. Cổng chặn ở bot.js gỡ nó ra
 * (`chan & ~16`) trước khi dùng.
 */
function tinhChan(P, cfg, trongKhung, btcXau) {
  let c = 0;
  if (Math.abs(P.S) < cfg.NGUONG_VAO) c |= 1;
  if (P.hoatDong < 2) c |= 2;
  if (P.dongNguoc) c |= 4;
  if (P.baoHoaKhongXacNhan) c |= 8;
  if (!trongKhung) c |= 16;
  if (btcXau) c |= 32;
  return c;
}
const TEN_CHAN = {
  1: `|S| < ${cfgGoc.NGUONG_VAO}`, 2: 'dưới 2 tín hiệu', 4: 'dòng tiền ngược nhịp',
  8: 'bão hoà không xác nhận', 16: 'ngoài khung gốc (NHÃN — không chặn)',
  32: 'BTC đang phá đỉnh',
};
/** Lý do THẬT SỰ chặn lệnh. Bit 16 không bao giờ có mặt ở đây: nó là
 *  nhãn dữ liệu, hiện nó ra sẽ khiến màn hình nói dối rằng giờ giấc
 *  đang chặn lệnh. */
function taiSaoChan(chan) {
  const r = [];
  for (const b of [1, 2, 4, 8, 32]) if (chan & b) r.push(TEN_CHAN[b]);
  return r;
}

module.exports = {
  TRONG_SO, verTrongSo, themKhop, thongKeDong, themThanhLy, thongKeThanhLy,
  phanTich, tinhChan, taiSaoChan, mau25,
};
