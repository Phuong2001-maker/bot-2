'use strict';
/* =====================================================================
   OKX WebSocket công khai — books · trades · open-interest · liquidation.

   HAI THỨ QUAN TRỌNG NHẤT TRONG FILE NÀY:

   1. TÁCH `lastMsg` KHỎI `lastData`.
      Socket vẫn trả `pong` đều trong khi kênh `books` đã câm từ lâu là
      chuyện có thật. Nếu chỉ nhìn `lastMsg` thì nhãn vẫn là "live" trong
      khi sổ lệnh ĐÓNG BĂNG — rồi wallTrust càng cộng điểm cho tường vì
      nó "sống lâu", và bot sinh lệnh từ sổ của hàng giờ trước.
      Đây là dạng hỏng im lặng tệ nhất, phải chặn ở tầng này.

   2. KIỂM TÍNH TOÀN VẸN SỔ LỆNH.
      Mất một gói `update` là sổ sai vĩnh viễn mà không có triệu chứng gì.

      ⚠ ĐO THỰC TẾ (2026-08-11, BTC-USDT-SWAP, 10 gói liên tiếp):
      kênh `books` (400 mức) trả **checksum = 0 ở MỌI gói**, cả snapshot
      lẫn update. Tức OKX KHÔNG cung cấp checksum cho kênh này. Chỉ
      `books-l2-tbt` / `books50-l2-tbt` mới có — mà hai kênh đó đòi API
      key VIP4/VIP5, tức vĩnh viễn ngoài tầm (xem mục 3.4 XAY-BOT.md).

      Nên phải tự canh bằng thứ khác: SỔ BẮT CHÉO (best bid >= best ask)
      là bằng chứng chắc chắn sổ đã hỏng. Cộng thêm đồng bộ lại định kỳ
      để chặn trôi chậm mà không có triệu chứng.
   ===================================================================== */

const { ghi, canh } = require('./log');
const HT = require('../config').HA_TANG;

const URL_WS = 'wss://ws.okx.com:8443/ws/v5/public';

/* ---------------------------------------------------------------- CRC32 */
const BANG_CRC = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(s) {
  let c = -1;
  for (let i = 0; i < s.length; i++) {
    c = (c >>> 8) ^ BANG_CRC[(c ^ s.charCodeAt(i)) & 0xFF];
  }
  return (c ^ -1) | 0;   // int32 có dấu, đúng như OKX gửi
}

/* Chuỗi checksum của OKX: xen kẽ 25 bid và 25 ask,
   "bidPx:bidSz:askPx:askSz:..." — dùng ĐÚNG chuỗi gốc sàn gửi,
   không được định dạng lại số (0.5 vs 0.50 ra hai checksum khác nhau). */
function chuoiChecksum(bids, asks) {
  const p = [];
  for (let i = 0; i < 25; i++) {
    if (bids[i]) p.push(bids[i].pxS, bids[i].szS);
    if (asks[i]) p.push(asks[i].pxS, asks[i].szS);
  }
  return p.join(':');
}

/* ---------------------------------------------------------------- sổ lệnh */
class SoLenh {
  constructor() {
    this.bids = new Map();   // pxS -> {p, sz, nOrd, pxS, szS}
    this.asks = new Map();
    this.ts = 0;
    this.hong = false;       // checksum sai → đánh dấu, KHÔNG dùng
    this.soLanHong = 0;
  }

  apDung(d, action) {
    if (action === 'snapshot') { this.bids.clear(); this.asks.clear(); this.hong = false; }
    const nap = (rows, m) => {
      for (const r of rows || []) {
        const pxS = r[0], szS = r[1];
        const sz = parseFloat(szS);
        if (!(sz > 0)) { m.delete(pxS); continue; }
        m.set(pxS, {
          p: parseFloat(pxS), sz, pxS, szS,
          nOrd: parseInt(r[3], 10) || 0,     /* ⭐ số lệnh thật ở mức giá này */
        });
      }
    };
    nap(d.bids, this.bids);
    nap(d.asks, this.asks);
    this.ts = parseInt(d.ts, 10) || Date.now();

    const B = [...this.bids.values()].sort((a, b) => b.p - a.p);
    const A = [...this.asks.values()].sort((a, b) => a.p - b.p);

    /* (a) checksum — CHỈ khi sàn thật sự gửi. `books` gửi 0 nghĩa là
       "không có", coi 0 là checksum thật thì báo hỏng ở mọi gói. */
    if (d.checksum) {
      if (crc32(chuoiChecksum(B, A)) !== d.checksum) {
        this.hong = true; this.soLanHong++;
        return false;
      }
    }

    /* (b) SỔ BẮT CHÉO — bằng chứng chắc chắn sổ đã hỏng, không cần
       checksum. Đây là lưới an toàn duy nhất có được trên kênh `books`. */
    if (B.length && A.length && B[0].p >= A[0].p) {
      this.hong = true; this.soLanHong++;
      return false;
    }

    /* (c) đồng bộ lại định kỳ — chặn trôi chậm không triệu chứng */
    if (!this._dongBoLuc) this._dongBoLuc = Date.now();
    if (Date.now() - this._dongBoLuc > HT.SO_DONG_BO_LAI_PHUT * 60e3) {
      this._dongBoLuc = Date.now();
      this.hong = false;
      return false;      // bên ngoài đăng ký lại → nhận snapshot mới
    }

    this.hong = false;
    return true;
  }

  /* trả về mảng đã sắp xếp + quy đổi USD (sz là HỢP ĐỒNG, phải nhân ctVal) */
  lay(ctVal) {
    const B = [...this.bids.values()].sort((a, b) => b.p - a.p);
    const A = [...this.asks.values()].sort((a, b) => a.p - b.p);
    const doi = r => ({ p: r.p, sz: r.sz, nOrd: r.nOrd, m: r.sz * ctVal * r.p });
    return { bids: B.map(doi), asks: A.map(doi) };
  }
}

/* ---------------------------------------------------------------- kết nối */
class OkxWs {
  constructor() {
    this.ws = null;
    this.dangMo = false;
    this.dangKyRoi = new Set();       // "channel|instId"
    this.tay = new Map();             // "channel|instId" -> [fn]
    this.lastMsg = 0;                 // gói BẤT KỲ (kể cả pong)
    this.lastData = new Map();        // "channel|instId" -> ts gói DỮ LIỆU
    this.soLanNoiLai = 0;
    this.dong = false;
    this._tPing = null;
    /* hàng chờ GOM subscribe/unsubscribe — xem HA_TANG.WS_GOM_DANG_KY_MS */
    this._cho = { subscribe: [], unsubscribe: [] };
    this._tGom = null;
  }

  /* Đẩy một arg vào hàng chờ thay vì bắn ngay. Cùng một instId có thể vừa
     bị huỷ vừa được đăng ký lại trong một cửa sổ gom (máy quét gỡ coin A
     rồi thêm coin B) — hai op nằm ở hai hàng riêng nên không đè nhau, và
     thứ tự gửi luôn là unsubscribe TRƯỚC subscribe. */
  _xep(op, arg) {
    this._cho[op].push(arg);
    if (this._tGom) return;
    this._tGom = setTimeout(() => { this._tGom = null; this._xaGom(); },
                            HT.WS_GOM_DANG_KY_MS);
    if (this._tGom.unref) this._tGom.unref();
  }

  _xaGom() {
    for (const op of ['unsubscribe', 'subscribe']) {
      const ds = this._cho[op];
      if (!ds.length) continue;
      this._cho[op] = [];
      for (let i = 0; i < ds.length; i += HT.WS_ARG_MOI_FRAME) {
        this._gui({ op, args: ds.slice(i, i + HT.WS_ARG_MOI_FRAME) });
      }
    }
  }

  batDau() {
    if (this.dong) return;
    try { this.ws = new WebSocket(URL_WS); }
    catch (e) { canh('WS tao that bai:', e.message); return this._hen(); }

    this.ws.onopen = () => {
      this.dangMo = true;
      this.soLanNoiLai = 0;
      this.lastMsg = Date.now();
      ghi('WS mo');
      /* Đăng ký lại toàn bộ sau khi nối lại. Hàng chờ gom của phiên trước
         đã vô nghĩa (socket đó chết rồi) — `dangKyRoi` mới là nguồn thật,
         nên xoá hàng chờ trước khi dựng lại, tránh gửi trùng.            */
      this._cho.subscribe = []; this._cho.unsubscribe = [];
      const args = [...this.dangKyRoi].map(k => {
        const [channel, instId] = k.split('|');
        return instId === '*' ? { channel, instType: 'SWAP' } : { channel, instId };
      });
      /* chẻ theo cùng trần frame — 12 coin × 3 kênh + thanh lý = 37 arg */
      for (let i = 0; i < args.length; i += HT.WS_ARG_MOI_FRAME) {
        this._gui({ op: 'subscribe', args: args.slice(i, i + HT.WS_ARG_MOI_FRAME) });
      }
      this._tPing = setInterval(() => {
        if (this.ws && this.dangMo) {
          try { this.ws.send('ping'); } catch (e) {}
        }
      }, HT.WS_PING_MS);
    };

    this.ws.onmessage = ev => {
      this.lastMsg = Date.now();
      const raw = typeof ev.data === 'string' ? ev.data : String(ev.data);
      if (raw === 'pong') return;                 // ← KHÔNG chạm lastData
      let j; try { j = JSON.parse(raw); } catch (e) { return; }

      if (j.event === 'error') { canh('WS error', j.code, j.msg); return; }
      if (j.event) return;                        // subscribe/unsubscribe ack
      if (!j.arg || !j.data) return;

      const ch = j.arg.channel;
      const inst = j.arg.instId || '*';
      const k = ch + '|' + inst;
      this.lastData.set(k, Date.now());           // ← chỉ gói DỮ LIỆU mới tính
      const fns = this.tay.get(k);
      if (fns) for (const f of fns) { try { f(j.data, j.action, j.arg); } catch (e) { canh('tay', k, e.message); } }
    };

    this.ws.onclose = () => { this.dangMo = false; clearInterval(this._tPing); this._hen(); };
    this.ws.onerror = () => { /* onclose sẽ chạy ngay sau */ };
  }

  _hen() {
    if (this.dong) return;
    const cho = Math.min(HT.WS_NOI_LAI_TRAN_MS, 1000 * Math.pow(2, Math.min(5, this.soLanNoiLai++)));
    setTimeout(() => this.batDau(), cho);
  }

  _gui(o) {
    if (!this.ws || !this.dangMo) return false;
    try { this.ws.send(JSON.stringify(o)); return true; } catch (e) { return false; }
  }

  dangKy(channel, instId) {
    const k = channel + '|' + (instId || '*');
    if (this.dangKyRoi.has(k)) return;
    this.dangKyRoi.add(k);
    const a = instId ? { channel, instId } : { channel, instType: 'SWAP' };
    this._xep('subscribe', a);
  }

  huy(channel, instId) {
    const k = channel + '|' + (instId || '*');
    if (!this.dangKyRoi.has(k)) return;
    this.dangKyRoi.delete(k);
    this.lastData.delete(k);
    this.tay.delete(k);
    const a = instId ? { channel, instId } : { channel, instType: 'SWAP' };
    this._xep('unsubscribe', a);
  }

  /* đăng ký lại một kênh — dùng khi checksum sổ lệnh sai */
  napLai(channel, instId) {
    const a = { channel, instId };
    this._gui({ op: 'unsubscribe', args: [a] });
    setTimeout(() => this._gui({ op: 'subscribe', args: [a] }), 300);
  }

  khi(channel, instId, fn) {
    const k = channel + '|' + (instId || '*');
    if (!this.tay.has(k)) this.tay.set(k, []);
    this.tay.get(k).push(fn);
  }

  /* tuổi của gói DỮ LIỆU cuối cho một kênh — đây mới là nhịp tim thật */
  tuoiData(channel, instId) {
    const t = this.lastData.get(channel + '|' + (instId || '*'));
    return t ? Date.now() - t : Infinity;
  }

  dungHan() { this.dong = true; clearInterval(this._tPing); try { this.ws?.close(); } catch (e) {} }
}

module.exports = { OkxWs, SoLenh, crc32 };
