'use strict';
/* =====================================================================
   OKX REST — ENDPOINT RIÊNG TƯ (cần API key). Giai đoạn 10.

   ⛔ FILE NÀY KHÔNG BAO GIỜ TỰ QUYẾT ĐỊNH GÌ. Nó chỉ dịch yêu cầu của
   `lib/san.js` thành lời gọi HTTP đã ký, rồi trả kết quả thô về. Mọi
   quyết định giao dịch nằm ở `lib/lenh.js`.

   ⛔ KHÔNG BAO GIỜ GHI KHOÁ RA LOG. Không log header, không log body có
   khoá, không log thông báo lỗi có chứa khoá. Dự án cũ ĐÃ LỘ TOKEN MỘT
   LẦN theo đúng kiểu "in ra để debug rồi quên xoá".

   ⭐ BA MÔI TRƯỜNG, CÙNG MỘT ĐƯỜNG CODE:
       giay  — không gọi file này lần nào, bot tự mô phỏng
       demo  — gọi API THẬT, thêm header `x-simulated-trading: 1`
               → OKX xử lý bằng tiền ảo trên hạ tầng thật
       that  — bỏ header đó đi. KHÔNG có khác biệt nào khác.

   Nhờ vậy `demo` kiểm chứng được TOÀN BỘ đường đặt lệnh — ký, gửi, khớp,
   đối soát — mà không rủi ro một xu. Sang `that` chỉ là gỡ một header.

   BẪY CỦA API OKX (ghi tại chỗ để không dẫm lại):
   - `sz` của SWAP tính bằng HỢP ĐỒNG, không phải USD và cũng không phải
     số coin. Phải chia cho `ctVal` rồi làm tròn theo `lotSz`.
   - Chữ ký ký trên `timestamp + method + requestPath + body`. `body` phải
     là CHUỖI JSON Y HỆT chuỗi đem gửi — `JSON.stringify` hai lần ra khác
     nhau là chữ ký hỏng, mà OKX chỉ báo "Invalid Sign" chung chung.
   - `requestPath` phải kèm cả query string.
   - Lệnh điều kiện (SL) là ALGO ORDER, dùng endpoint `/trade/order-algo`,
     KHÔNG phải `/trade/order`. Huỷ cũng bằng endpoint algo riêng.
   - `slOrdPx: '-1'` nghĩa là khớp THỊ TRƯỜNG khi chạm. Đặt giá cụ thể thì
     lúc sập mạnh lệnh có thể KHÔNG khớp — mất sạch tác dụng của SL.
   ===================================================================== */

const crypto = require('crypto');
const { ghi, canh } = require('./log');
const cfg = require('../config');
const HT = cfg.HA_TANG;

const GOC = 'https://www.okx.com';

/* Khoá nạp một lần lúc khởi động, giữ trong biến module — không rải ra
   nơi khác, không đưa vào bất kỳ đối tượng nào có thể bị JSON hoá. */
let _khoa = null;
let _moPhong = false;      // gắn header demo trading hay không

/**
 * @param {{apiKey,apiSecret,passphrase}} khoa
 * @param {boolean} moPhong  true = demo trading, false = tiền thật
 */
function napKhoa(khoa, moPhong) {
  if (!khoa || !khoa.apiKey || !khoa.apiSecret || !khoa.passphrase) {
    _khoa = null;
    return false;
  }
  _khoa = khoa;
  _moPhong = !!moPhong;
  /* ⛔ chỉ in 4 ký tự đầu để đối chiếu đúng khoá, KHÔNG in toàn bộ */
  ghi(`OKX API: da nap khoa ${String(khoa.apiKey).slice(0, 4)}... · che do `
    + (moPhong ? 'DEMO TRADING (tien ao)' : '⛔ TIEN THAT'));
  return true;
}

const daNapKhoa = () => _khoa !== null;

/* ------------------------------------------------------------- ký */
function ky(ts, method, duong, body) {
  const chuoi = ts + method + duong + (body || '');
  return crypto.createHmac('sha256', _khoa.apiSecret).update(chuoi).digest('base64');
}

/**
 * Gọi endpoint riêng tư. Trả `{ok, data, code, msg}` — KHÔNG ném lỗi, vì
 * mọi lời gọi ở đây nằm trong vòng lặp giao dịch và một exception không
 * bắt được sẽ giết cả bot.
 */
async function goiRieng(method, duong, thanBody) {
  if (!_khoa) return { ok: false, code: 'NO_KEY', msg: 'chua nap khoa API' };

  const body = thanBody ? JSON.stringify(thanBody) : '';
  const ts = new Date().toISOString();
  const headers = {
    'OK-ACCESS-KEY': _khoa.apiKey,
    'OK-ACCESS-SIGN': ky(ts, method, duong, body),
    'OK-ACCESS-TIMESTAMP': ts,
    'OK-ACCESS-PASSPHRASE': _khoa.passphrase,
    'Content-Type': 'application/json',
  };
  if (_moPhong) headers['x-simulated-trading'] = '1';

  try {
    const c = new AbortController();
    const h = setTimeout(() => c.abort(), HT.REST_TIMEOUT_MS);
    const r = await fetch(GOC + duong, {
      method, headers, signal: c.signal,
      body: body || undefined,
    });
    clearTimeout(h);
    const j = await r.json();
    if (j.code === '0') return { ok: true, data: j.data || [] };
    /* ⛔ chỉ log mã và thông báo của SÀN, tuyệt đối không log headers */
    canh('OKX', method, duong, 'code', j.code, j.msg || '');
    return { ok: false, code: j.code, msg: j.msg || '', data: j.data || [] };
  } catch (e) {
    canh('OKX', method, duong, 'that bai:', e.message);
    return { ok: false, code: 'NET', msg: e.message };
  }
}

/* =================================================================== */
/*  ĐẶT LỆNH                                                           */
/* =================================================================== */
/**
 * Lệnh thị trường vào vị thế.
 * @param {string} instId  vd 'BTC-USDT-SWAP'
 * @param {string} huong   'long' | 'short'
 * @param {string} sz      SỐ HỢP ĐỒNG (đã chia ctVal, đã làm tròn lotSz)
 */
async function moViThe(instId, huong, sz, kyQuyCheo = true) {
  return goiRieng('POST', '/api/v5/trade/order', {
    instId,
    tdMode: kyQuyCheo ? 'cross' : 'isolated',
    side: huong === 'short' ? 'sell' : 'buy',
    ordType: 'market',
    sz: String(sz),
  });
}

/** Đóng toàn bộ vị thế bằng lệnh thị trường giảm-vị-thế. */
async function dongViThe(instId, huong, sz, kyQuyCheo = true) {
  return goiRieng('POST', '/api/v5/trade/order', {
    instId,
    tdMode: kyQuyCheo ? 'cross' : 'isolated',
    side: huong === 'short' ? 'buy' : 'sell',
    ordType: 'market',
    reduceOnly: true,
    sz: String(sz),
  });
}

/* =================================================================== */
/*  CẮT LỖ PHÍA SÀN — lý do tồn tại của cả Giai đoạn 10                */
/* =================================================================== */
/**
 * Đặt SL điều kiện. `slOrdPx = '-1'` = khớp THỊ TRƯỜNG khi chạm.
 * ⛔ Đừng đổi sang giá giới hạn: lúc sập mạnh lệnh giới hạn có thể không
 * khớp, và một SL không khớp thì tệ hơn không có SL — vì ta tưởng mình
 * được bảo vệ.
 */
async function datSL(instId, huong, sz, giaKichHoat, kyQuyCheo = true) {
  return goiRieng('POST', '/api/v5/trade/order-algo', {
    instId,
    tdMode: kyQuyCheo ? 'cross' : 'isolated',
    side: huong === 'short' ? 'buy' : 'sell',
    ordType: 'conditional',
    sz: String(sz),
    reduceOnly: true,
    slTriggerPx: String(giaKichHoat),
    slTriggerPxType: 'last',
    slOrdPx: '-1',
  });
}

/** Dời SL. OKX cho sửa tại chỗ, không cần huỷ rồi đặt lại. */
async function suaSL(instId, algoId, giaKichHoatMoi) {
  return goiRieng('POST', '/api/v5/trade/amend-algos', {
    instId, algoId,
    newSlTriggerPx: String(giaKichHoatMoi),
    newSlTriggerPxType: 'last',
  });
}

async function huySL(instId, algoId) {
  return goiRieng('POST', '/api/v5/trade/cancel-algos', [{ instId, algoId }]);
}

/* =================================================================== */
/*  ĐỌC TRẠNG THÁI TỪ SÀN — nền của việc đối soát lúc khởi động        */
/* =================================================================== */
/** Vị thế đang mở. Đây là SỰ THẬT, không phải thứ trong RAM bot. */
async function viThe() {
  return goiRieng('GET', '/api/v5/account/positions?instType=SWAP');
}

/** Lệnh điều kiện đang treo — để biết SL nào còn sống, SL nào mồ côi. */
async function slDangTreo() {
  return goiRieng('GET', '/api/v5/trade/orders-algo-pending?ordType=conditional&instType=SWAP');
}

async function soDu() {
  return goiRieng('GET', '/api/v5/account/balance?ccy=USDT');
}

module.exports = {
  napKhoa, daNapKhoa, goiRieng,
  moViThe, dongViThe,
  datSL, suaSL, huySL,
  viThe, slDangTreo, soDu,
};
