'use strict';
/* =====================================================================
   BỘ THEO DÕI TƯỜNG — LỌC LỆNH ẢO.  ⭐ ĐÂY LÀ LÝ DO BOT NÀY TỒN TẠI.

   Ý tưởng cốt lõi: TREO LỆNH ẢO Ở XA GIÁ THÌ CHẲNG TỐN GÌ.
   Nên một bức tường chỉ đáng tin khi nó đã BỊ GIÁ THỬ mà vẫn còn đó.

   Ba số phận của một bức tường, và ý nghĩa hoàn toàn khác nhau:
     · SỐNG SÓT (sv) — giá áp sát rồi rời đi, tường còn nguyên  → +15
     · BỊ KHỚP  (fl) — ăn mòn dần, có người mua/bán thật vào nó → +8
     · BỊ RÚT   (pl) — biến mất nguyên khối khi giá áp sát      → −30

   Phân biệt RÚT với KHỚP chính là thứ cho phép "bắt trước" cú giảm:
     · tường mua bị KHỚP  → người ta ĐANG bán thật → cú giảm ĐÃ bắt đầu
     · tường mua bị RÚT   → market maker bước sang một bên → cú giảm CHƯA
       xảy ra, và đây mới là chỗ vào lệnh.

   KHÁC BIỆT CÓ CHỦ ĐÍCH so với dự án so-lenh: ở đây KHÔNG gom mốc theo
   bước giá. Dùng thẳng giá tick của OKX làm khoá, vì (a) khoá không bao
   giờ "đổi tên" khi bước giá đổi — bẫy đã tốn công xử lý ở dự án cũ,
   (b) `numOrders` chỉ có nghĩa ở mức tick, gom lại là mất.
   ===================================================================== */

const cfg = require('../config');
const W = cfg.TUONG;          // mọi con số của tầng này nằm ở config.js
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function taoBoTuong() {
  return {
    sach: new Map(),      // "b:giá" -> bản ghi tường
    suKien: [],           // {t, phia:'b'|'a', usd, loai:'rut'|'khop'}
    mauDoSau: [],         // {t, bidUsd, askUsd} — mẫu số cho BPR/BFR
    lanCuoi: 0,
  };
}

const khoa = (phia, p) => phia + ':' + p.toPrecision(8);

/* ------------------------------------------------------------ cập nhật */
/**
 * @param {object} T   bộ tường của coin
 * @param {object} A   {bids, asks, mid} — mỗi hàng {p, sz, nOrd, m}
 * @param {number} tickSz
 * @param {number} cuaSoGiay  cửa sổ giữ sự kiện (mặc định 300s ×4 cho an toàn)
 */
function capNhatTuong(T, A, tickSz, cuaSoGiay = 1200) {
  if (!A || !A.bids.length || !A.asks.length) return;
  const now = Date.now();
  const mid = A.mid;
  const sach = T.sach;

  /* Ngưỡng "áp sát"/"rời xa": nền là bước giá, nhưng có SÀN và TRẦN theo %.
     Chỉ dùng bước giá thì coin tick rất mịn sẽ có ngưỡng bé tới mức
     "áp sát" không bao giờ bật; chỉ dùng % thì sổ dày bị chấm oan. */
  const buoc = Math.max(tickSz || 0, mid * 1e-6);
  const nearD = clamp(W.GAN_NHAN_BUOC * buoc, W.GAN_SAN * mid, W.GAN_TRAN * mid);
  const leaveD = clamp(W.ROI_NHAN_BUOC * buoc, W.ROI_SAN * mid, W.ROI_TRAN * mid);

  let bidUsd = 0, askUsd = 0;

  const theoDoi = (rows, phia) => {
    if (!rows.length) return 0;
    const maxM = Math.max(...rows.map(r => r.m));
    const nguong = W.NGUONG_LA_TUONG * maxM;   // chỉ mốc đủ lớn mới coi là "tường"
    let tong = 0;
    for (const r of rows) {
      if (r.m < nguong) continue;
      tong += r.m;
      const k = khoa(phia, r.p);
      let w = sach.get(k);
      if (!w) {
        w = { f: now, p: r.p, phia, sv: 0, pl: 0, fl: 0, mx: 0, nOrd: 0, nOrdMx: 0, gan: false };
        sach.set(k, w);
      }
      w.l = now;
      w.cur = r.m;
      w.nOrd = r.nOrd;
      w.nOrdMx = Math.max(w.nOrdMx, r.nOrd);
      w.mx = Math.max(w.mx, r.m);

      const cach = Math.abs(mid - r.p);
      if (cach <= nearD) w.gan = true;
      else if (cach >= leaveD && w.gan) {
        w.gan = false;
        /* giá áp sát rồi rời đi mà tường còn hơn nửa khối → SỐNG SÓT */
        if (w.cur > W.CON_QUA_NUA * w.mx) w.sv++;
      }
    }
    return tong;
  };

  bidUsd = theoDoi(A.bids, 'b');
  askUsd = theoDoi(A.asks, 'a');

  /* --- tường biến mất: phân loại RÚT hay KHỚP --- */
  for (const [k, w] of sach) {
    if (w.gan && w.l && now - w.l > W.CHO_BIEN_MAT_MS) {
      w.gan = false;
      /* chỉ kết luận khi GIÁ VẪN Ở GẦN — giá đã đi xa thì tường chỉ là
         xoay vòng bình thường, phạt là phạt oan */
      if (Math.abs(mid - w.p) <= leaveD) {
        const rut = w.cur >= W.CON_NGUYEN_KHOI * w.mx;   // còn gần nguyên khối = rút
        if (rut) w.pl++; else w.fl++;
        T.suKien.push({ t: now, phia: w.phia, usd: w.mx, loai: rut ? 'rut' : 'khop' });
      }
    }
    /* dọn tường quá cũ */
    if (w.l && now - w.l > W.DON_DEP_GIO * 3600e3) sach.delete(k);
  }

  T.mauDoSau.push({ t: now, bidUsd, askUsd });
  const catTu = now - cuaSoGiay * 1000;
  while (T.suKien.length && T.suKien[0].t < catTu) T.suKien.shift();
  while (T.mauDoSau.length && T.mauDoSau[0].t < catTu) T.mauDoSau.shift();
  if (T.suKien.length > 5000) T.suKien.splice(0, T.suKien.length - 5000);
  if (T.mauDoSau.length > 2000) T.mauDoSau.splice(0, T.mauDoSau.length - 2000);
  T.lanCuoi = now;
}

/* ------------------------------------------------------------ chấm tin */
/**
 * 0–100. Chưa biết gì = 30 (trung tính), không phải 0.
 * @param {number} bookM tổng tiền cả sổ — để đo "một lệnh khổng lồ"
 */
function tinTuong(T, phia, p, bookM = 0) {
  const w = T.sach.get(khoa(phia, p));
  if (!w) return 30;

  const tuoiPhut = ((w.l || w.f) - w.f) / 60000;
  /* tường CHƯA từng bị giá thử thì "sống lâu" chỉ được NỬA điểm —
     treo lệnh ảo ở xa giá thì sống bao lâu cũng chẳng chứng minh gì */
  const daThu = w.sv > 0 || w.fl > 0;

  let s = W.TIN_NEN
    + Math.min(daThu ? W.TIN_TUOI_TRAN_DA_THU : W.TIN_TUOI_TRAN_CHUA_THU,
               tuoiPhut * W.TIN_TUOI_MOI_PHUT)
    + w.sv * W.TIN_SONG_SOT
    + w.fl * W.TIN_KHOP_THAT
    + Math.min(w.pl, W.TIN_RUT_DEM_TOI_DA) * W.TIN_BI_RUT;

  /* ⭐ numOrders — dự án cũ bỏ phí trường này.
     CHƯA KIỂM CHỨNG: để trọng số thấp cho tới khi có >=300 mẫu.
     Tiền lớn mà chỉ MỘT lệnh  → rút một cú là sạch → nghi ảo.
     Tiền lớn mà nhiều chục lệnh → không ai điều phối được → khó giả. */
  if (bookM > 0 && w.cur > W.TIN_MOT_LENH_TY_LE * bookM && w.nOrd === 1) s += W.TIN_MOT_LENH;
  if (w.nOrd >= W.N_ORD_NHIEU) s += W.TIN_NHIEU_LENH;
  else if (w.nOrd >= W.N_ORD_VUA) s += W.TIN_VUA_LENH;

  return clamp(Math.round(s), 0, 100);
}

function thongTinTuong(T, phia, p) {
  const w = T.sach.get(khoa(phia, p));
  if (!w) return null;
  return {
    tuoiPhut: Math.round(((w.l || w.f) - w.f) / 60000),
    sv: w.sv, fl: w.fl, pl: w.pl,
    nOrd: w.nOrd, nOrdMx: w.nOrdMx,
    usd: w.cur, usdMx: w.mx,
  };
}

/* --------------------------------------------- tỷ lệ RÚT / KHỚP (cò dẫn) */
/**
 * BPR = tiền tường bị RÚT   / tiền tường trung bình   (trong cửa sổ W)
 * BFR = tiền tường bị KHỚP  / tiền tường trung bình
 * Tính riêng cho từng phía. Phía 'b' dùng cho cò SHORT, 'a' cho cò LONG.
 */
function tyLeRutKhop(T, phia, cuaSoGiay) {
  const now = Date.now();
  const tu = now - cuaSoGiay * 1000;
  let rut = 0, khop = 0;
  for (let i = T.suKien.length - 1; i >= 0; i--) {
    const e = T.suKien[i];
    if (e.t < tu) break;
    if (e.phia !== phia) continue;
    if (e.loai === 'rut') rut += e.usd; else khop += e.usd;
  }
  let tong = 0, dem = 0;
  for (let i = T.mauDoSau.length - 1; i >= 0; i--) {
    const m = T.mauDoSau[i];
    if (m.t < tu) break;
    tong += (phia === 'b' ? m.bidUsd : m.askUsd);
    dem++;
  }
  const mau = dem ? tong / dem : 0;
  if (!(mau > 0)) return { pr: 0, fr: 0, mau: 0, dem };
  return { pr: rut / mau, fr: khop / mau, mau, dem };
}

/* ------------------------------------- độ sâu đã lọc theo tin (DBI) */
/**
 * Chỉ tính trong ±`banKinh` quanh giá. Mỗi mốc nhân với độ tin của
 * chính nó — tường tin 22 chỉ được tính 22% giá trị. Đây là chỗ bộ lọc
 * lệnh ảo thật sự ảnh hưởng tới quyết định.
 */
function doSauTin(T, A, banKinh = W.BAN_KINH_DO_SAU) {
  const mid = A.mid;
  let bid = 0, ask = 0, nOrdBid = 0, nOrdAsk = 0, bidTho = 0, askTho = 0;
  const bookM = A.bids.reduce((s, r) => s + r.m, 0) + A.asks.reduce((s, r) => s + r.m, 0);
  for (const r of A.bids) {
    if ((mid - r.p) / mid > banKinh) break;
    bidTho += r.m;
    bid += r.m * tinTuong(T, 'b', r.p, bookM) / 100;
    nOrdBid += r.nOrd;
  }
  for (const r of A.asks) {
    if ((r.p - mid) / mid > banKinh) break;
    askTho += r.m;
    ask += r.m * tinTuong(T, 'a', r.p, bookM) / 100;
    nOrdAsk += r.nOrd;
  }
  const t = bid + ask;
  return {
    bid, ask, bidTho, askTho, nOrdBid, nOrdAsk, bookM,
    dbi: t > 0 ? (bid - ask) / t : 0,
  };
}

/* ---------------------------------------- tường đáng tin gần một mốc giá */
/** Dùng để TINH CHỈNH giá chốt lời — KHÔNG BAO GIỜ dùng cho giá vào. */
function tuongGan(T, rows, phia, mocGia, lech, tinMin, bookM) {
  let tot = null, diem = 0;
  for (const r of rows) {
    if (Math.abs(r.p - mocGia) / mocGia > lech) continue;
    const tin = tinTuong(T, phia, r.p, bookM);
    if (tin < tinMin) continue;
    const d = r.m * (tin / 100);
    if (d > diem) { diem = d; tot = { p: r.p, m: r.m, tin, nOrd: r.nOrd }; }
  }
  return tot;
}

/* --------------------------------------------------------- RÀO CHẮN */
/**
 * ⭐ Số PHÚT giao dịch liên tục cần để xuyên từ giá hiện tại tới một mốc
 * giá (thường là điểm cắt lỗ). Đây là phiên bản ĐO ĐƯỢC của câu
 * "khả năng chạm cắt lỗ thấp".
 *
 * Tiền chắn đã CHIẾT KHẤU theo độ tin tường — tường ảo gần như không được
 * tính. Nên nó trả lời đúng câu hỏi cần hỏi: "có bao nhiêu tiền THẬT nằm
 * chắn đường, và với tốc độ hiện tại thì bao lâu mới ăn hết?"
 *
 * @param huong  'short' → giá phải TĂNG tới mốc, phải ăn hết tường ASK
 *               'long'  → giá phải GIẢM tới mốc, phải ăn hết tường BID
 * @param tocDoUsdPhut  tốc độ dòng tiền chủ động cùng chiều với nguy hiểm
 * @returns số phút. Infinity nghĩa là không có dòng tiền đe doạ.
 */
function raoChan(T, A, huong, mocGia, tocDoUsdPhut) {
  if (!A || !A.bids.length || !A.asks.length) return 0;
  const mid = A.mid;
  const rows = huong === 'short' ? A.asks : A.bids;
  const phia = huong === 'short' ? 'a' : 'b';
  const bookM = A.bids.reduce((s, r) => s + r.m, 0) + A.asks.reduce((s, r) => s + r.m, 0);
  let tien = 0;
  for (const r of rows) {
    const trongDuong = huong === 'short'
      ? (r.p > mid && r.p <= mocGia)
      : (r.p < mid && r.p >= mocGia);
    if (!trongDuong) continue;
    tien += r.m * tinTuong(T, phia, r.p, bookM) / 100;
  }
  if (!(tocDoUsdPhut > 0)) return Infinity;
  return tien / tocDoUsdPhut;
}

/* bảng tường để hiển thị/chẩn đoán */
function bangTuong(T, A, soDong = 8) {
  const bookM = A ? A.bids.reduce((s, r) => s + r.m, 0) + A.asks.reduce((s, r) => s + r.m, 0) : 0;
  const out = [];
  for (const [, w] of T.sach) {
    if (!w.cur || !w.l || Date.now() - w.l > 30000) continue;
    out.push({
      gia: w.p, phia: w.phia === 'b' ? 'BID' : 'ASK', usd: Math.round(w.cur),
      nOrd: w.nOrd, tin: tinTuong(T, w.phia, w.p, bookM),
      tuoiPhut: Math.round(((w.l || w.f) - w.f) / 60000),
      sv: w.sv, fl: w.fl, pl: w.pl,
    });
  }
  out.sort((a, b) => b.usd - a.usd);
  return out.slice(0, soDong);
}

module.exports = {
  taoBoTuong, capNhatTuong, tinTuong, thongTinTuong,
  tyLeRutKhop, doSauTin, tuongGan, bangTuong, khoa, raoChan,
};
