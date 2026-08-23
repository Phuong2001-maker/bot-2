'use strict';
/* =====================================================================
   OKX REST — chỉ endpoint công khai, không cần API key.

   BẪY ĐÃ BIẾT (ghi lại tại chỗ để không dẫm lại):
   - `sz` của SWAP tính theo HỢP ĐỒNG. Phải nhân ctVal rồi nhân giá mới
     ra USD. Quên là sai hàng nghìn lần.
   - Chu kỳ funding KHÔNG phải lúc nào cũng 8h. Nhiều coin meme là 4h/2h/1h.
     Phải tự tính từ prevFundingTime/fundingTime rồi quy về mức /8h TRƯỚC
     khi so sánh giữa các coin.
   - Phân trang nến: `before` + limit=300 khi khoảng cần lấy > 300 nến thì
     OKX trả 300 cây MỚI NHẤT chứ không phải 300 cây sau mốc — thủng đoạn
     giữa mà KHÔNG báo lỗi. Phải phân trang lùi bằng `after`.
   ===================================================================== */

const { ghi, canh } = require('./log');
const cfg = require('../config');
const HT = cfg.HA_TANG, Q = cfg.QUET;

const GOC = 'https://www.okx.com';
let lanGoiCuoi = 0;
const GIAN_CACH_MS = HT.REST_GIAN_CACH_MS;   // rải lệnh gọi, tránh bị chặn tốc độ

async function goi(duong, thu = HT.REST_THU_LAI) {
  const cho = Math.max(0, lanGoiCuoi + GIAN_CACH_MS - Date.now());
  if (cho > 0) await new Promise(r => setTimeout(r, cho));
  lanGoiCuoi = Date.now();

  for (let i = 0; i <= thu; i++) {
    try {
      const c = new AbortController();
      const h = setTimeout(() => c.abort(), HT.REST_TIMEOUT_MS);
      const r = await fetch(GOC + duong, { signal: c.signal });
      clearTimeout(h);
      const j = await r.json();
      if (j.code === '0') return j.data;
      /* code != 0 là lỗi nghiệp vụ, thử lại thường vô ích */
      canh('REST', duong, 'code', j.code, j.msg);
      return null;
    } catch (e) {
      if (i === thu) { canh('REST', duong, 'that bai:', e.message); return null; }
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  return null;
}

/* ---- danh sách hợp đồng: ctVal + listTime (cổng tuổi coin) ---- */
const _hopDong = new Map();   // sym -> {ctVal, listTime, tickSz, lotSz, state}

async function napHopDong() {
  const d = await goi('/api/v5/public/instruments?instType=SWAP');
  if (!d) return _hopDong;
  for (const x of d) {
    if (!x.instId.endsWith('-USDT-SWAP')) continue;
    _hopDong.set(x.instId.replace('-USDT-SWAP', ''), {
      instId: x.instId,
      ctVal: parseFloat(x.ctVal) || 1,
      ctValCcy: x.ctValCcy,
      listTime: parseInt(x.listTime, 10) || 0,
      tickSz: parseFloat(x.tickSz) || 0,
      lotSz: parseFloat(x.lotSz) || 0,
      state: x.state,
    });
  }
  ghi(`nap ${_hopDong.size} hop dong SWAP`);
  return _hopDong;
}
const hopDong = sym => _hopDong.get(sym) || null;
const ctVal = sym => (_hopDong.get(sym)?.ctVal) || 1;

/* ---- bảng giá toàn sàn ---- */
async function tickers() {
  const d = await goi('/api/v5/market/tickers?instType=SWAP');
  if (!d) return [];
  const out = [];
  for (const t of d) {
    if (!t.instId.endsWith('-USDT-SWAP')) continue;
    const last = parseFloat(t.last);
    const open24 = parseFloat(t.open24h);
    if (!(last > 0) || !(open24 > 0)) continue;
    out.push({
      sym: t.instId.replace('-USDT-SWAP', ''),
      instId: t.instId,
      last, open24,
      high24: parseFloat(t.high24h),
      low24: parseFloat(t.low24h),
      chg24: last / open24 - 1,
      /* volCcy24h của SWAP tính theo đồng cơ sở → nhân giá ra USD */
      volUsd: (parseFloat(t.volCcy24h) || 0) * last,
      ts: parseInt(t.ts, 10),
    });
  }
  return out;
}

/* ---- funding: TỰ TÍNH chu kỳ rồi quy về mức /8h ---- */
async function funding(instId) {
  const d = await goi(`/api/v5/public/funding-rate?instId=${instId}`);
  if (!d || !d[0]) return null;
  const f = d[0];
  const rate = parseFloat(f.fundingRate);
  if (!isFinite(rate)) return null;

  let ivH = 8;
  const t0 = parseFloat(f.prevFundingTime);
  const t1 = parseFloat(f.fundingTime);
  const t2 = parseFloat(f.nextFundingTime);
  if (isFinite(t1) && isFinite(t0) && t1 > t0) ivH = (t1 - t0) / 3600e3;
  else if (isFinite(t2) && isFinite(t1) && t2 > t1) ivH = (t2 - t1) / 3600e3;
  ivH = Math.round(ivH) || 8;

  return {
    rate,
    ivH,
    f8: rate * (8 / ivH),          // ← con số duy nhất được đem đi so sánh
    fundingTime: isFinite(t1) ? t1 : null,
  };
}

/* ---- nến ---- */
async function nen(instId, bar = '15m', limit = 100) {
  const d = await goi(`/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`);
  if (!d) return [];
  /* OKX trả mới nhất trước; đảo lại cho thuận thời gian.
     Bỏ nến chưa đóng (confirm === '0') — nến đang chạy làm lệch mọi thống kê. */
  return d
    .filter(c => c[8] === '1')
    .map(c => ({
      t: parseInt(c[0], 10),
      o: parseFloat(c[1]), h: parseFloat(c[2]),
      l: parseFloat(c[3]), c: parseFloat(c[4]),
      vol: parseFloat(c[5]),
    }))
    .reverse();
}

/* biên dao động trung vị của N nến gần nhất — dùng cho `cap` và ATR */
function bienTrungVi(ns) {
  if (!ns.length) return null;
  const r = ns.map(c => (c.h - c.l) / c.c).filter(x => isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!r.length) return null;
  return r[Math.floor(r.length / 2)];
}

/* ---- chế độ BTC (cổng, không phải tín hiệu) ---- */
async function cheDoBtc() {
  const n1 = await nen('BTC-USDT-SWAP', '1H', 25);
  if (n1.length < 25) return { chg1h: null, chg24: null, phaDinh: false };
  const cuoi = n1[n1.length - 1].c;
  const chg1h = cuoi / n1[n1.length - 2].c - 1;
  const chg24 = cuoi / n1[0].c - 1;
  const dinh24 = Math.max(...n1.map(c => c.h));
  return { chg1h, chg24, phaDinh: cuoi >= dinh24 * Q.BTC_PHA_DINH_SAT && chg24 > Q.BTC_PHA_DINH_CHG24 };
}

module.exports = {
  goi, napHopDong, hopDong, ctVal, tickers, funding, nen, bienTrungVi, cheDoBtc,
};
