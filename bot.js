'use strict';
/* =====================================================================
   BOT — vòng lặp chính.

   Chạy:  node --experimental-websocket bot.js       (hoặc npm start)
   Xem :  http://localhost:8899

   Ba nhịp tim TÁCH RIÊNG, đừng gộp:
     · phân tích  2 giây   — aggregate → capNhatTuong → phanTich → máy trạng thái
     · quét coin 60 giây   — xếp hạng + đồng bộ danh sách theo dõi
     · REST      60 giây   — funding · nến 15m · chế độ BTC · mốc giá 07:00
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const http = require('http');

const cfg = require('./config');
const { ghi, canh, THU_MUC } = require('./lib/log');
const DB = require('./lib/db');
const R = require('./lib/okx-rest');
const { OkxWs, SoLenh } = require('./lib/okx-ws');
const T = require('./lib/tuong');
const S = require('./lib/tinhieu');
const K = require('./lib/khung');
const LC = require('./lib/loc-coin');
const { QuanLyLenh, TT, DA_MO } = require('./lib/lenh');

/* config.local.js quyết định ghi ảnh trạng thái ở đâu.
   Trên server: thư mục gốc web của tên miền → trình duyệt đọc file tĩnh,
   KHÔNG cần cổng, KHÔNG cần reverse proxy, KHÔNG cần PHP. */
let LOCAL = {};
try { LOCAL = require('./config.local.js'); } catch (e) {}
const GOC_WEB = LOCAL.GOC_WEB || THU_MUC;
const BAT_WEB = LOCAL.BAT_WEB_NOI_BO !== false;
const FILE_ANH = path.join(GOC_WEB, 'trangthai.json');
const FILE_DUNG = path.join(__dirname, 'DUNG.flag');
const FILE_GHIM = path.join(__dirname, 'ghim.txt');

const VER = S.verTrongSo(cfg);
const ws = new OkxWs();
const QL = new QuanLyLenh(cfg);

const engines = new Map();     // sym -> engine
let bangGia = [];              // ticker gần nhất
let soQuaLoc = 0;              // số coin QUA BỘ LỌC vòng quét gần nhất
let btc = { chg1h: null, chg24: null, phaDinh: false };
let ghim = new Set();
let nhipCuoi = 0;
let demNhip = 0;
const nhipDaGhi = new Map();   // sym -> ts lần ghi bảng `nhip` gần nhất

/* ------------------------------------------------------------- engine */
function taoEngine(sym) {
  const hd = R.hopDong(sym);
  if (!hd) return null;
  const E = {
    sym, instId: hd.instId, ctVal: hd.ctVal, tickSz: hd.tickSz,
    listTime: hd.listTime,
    so: new SoLenh(),
    tuong: T.taoBoTuong(),
    dongTien: [], thanhLy: [], giaHist: [], oiHist: [], dbiHist: [],
    funding: null, oiUsd: null,
    nen15: [], dinhPump: null,
    batDau: Date.now(),
  };

  ws.dangKy('books', E.instId);
  ws.khi('books', E.instId, (d, action) => {
    for (const g of d) {
      if (E.so.apDung(g, action)) continue;
      /* Chống bão: một lần đăng ký lại là đủ, đừng bắn liên tục.
         Không có chốt này thì một sổ hỏng sinh ra hàng chục lệnh
         subscribe/unsubscribe mỗi giây và bị sàn chặn tốc độ. */
      if (Date.now() - (E._napLaiLuc || 0) < cfg.QUET.NAP_LAI_CACH_MS) return;
      E._napLaiLuc = Date.now();
      canh(`[${sym}] so lenh hong (${E.so.hong ? 'bat cheo' : 'dong bo dinh ky'}) — dang ky lai`);
      ws.napLai('books', E.instId);
      return;
    }
  });

  ws.dangKy('trades', E.instId);
  ws.khi('trades', E.instId, d => {
    for (const t of d) {
      const px = parseFloat(t.px), sz = parseFloat(t.sz);
      if (!(px > 0) || !(sz > 0)) continue;
      S.themKhop(E, sz * E.ctVal * px, t.side === 'buy');
    }
  });

  ws.dangKy('open-interest', E.instId);
  ws.khi('open-interest', E.instId, d => {
    for (const o of d) {
      const usd = parseFloat(o.oiUsd);
      if (!(usd > 0)) continue;
      E.oiUsd = usd;
      const h = E.oiHist;
      /* giữ nhịp ~30 giây/mẫu để cửa sổ 25 phút không bị lấp đầy bởi
         mấy trăm mẫu của một phút */
      if (!h.length || Date.now() - h[h.length - 1].t > cfg.QUET.OI_MAU_CACH_MS) h.push({ t: Date.now(), v: usd });
      if (h.length > cfg.QUET.OI_HIST_TRAN) h.shift();
    }
  });

  engines.set(sym, E);
  ghi(`+ engine ${sym} (${E.instId}, ctVal=${E.ctVal}, tuoi=${((Date.now() - E.listTime) / 86400e3).toFixed(0)}d)`);
  return E;
}

function dungEngine(sym) {
  const E = engines.get(sym);
  if (!E) return;
  ws.huy('books', E.instId);
  ws.huy('trades', E.instId);
  ws.huy('open-interest', E.instId);
  engines.delete(sym);
  ghi(`- engine ${sym}`);
}

/* thanh lý: một subscription cho TOÀN SÀN */
ws.dangKy('liquidation-orders', null);
ws.khi('liquidation-orders', null, d => {
  for (const x of d) {
    const sym = String(x.instId || '').replace('-USDT-SWAP', '');
    const E = engines.get(sym);
    if (!E) continue;
    for (const dt of x.details || []) {
      const sz = parseFloat(dt.sz), px = parseFloat(dt.bkPx);
      if (!(sz > 0) || !(px > 0)) continue;
      /* posSide = vị thế BỊ thanh lý. Không có thì suy từ side:
         engine BÁN để đóng một vị thế LONG. */
      const long = dt.posSide ? dt.posSide === 'long' : dt.side === 'sell';
      S.themThanhLy(E, sz * E.ctVal * px, long);
    }
  }
});

/* --------------------------------------------------------- máy quét */
const ramMB = () => Math.round(process.memoryUsage().rss / 1048576);
let _canhRamLuc = 0;
/** Đừng kêu trần RAM mỗi vòng quét 60 giây — kêu theo chu kỳ cảnh báo. */
function canhRamGanDay(now) {
  if (now - _canhRamLuc < cfg.MAT_SO.CANH_BAO_SAU_MS * 5) return true;
  _canhRamLuc = now;
  return false;
}

/* --------------------------------------------------------- máy quét */
async function quet() {
  try {
    bangGia = await R.tickers();
    if (!bangGia.length) return;

    const now = Date.now();
    /* CỔNG 1 — lọc rác (thanh khoản, tuổi coin, hợp đồng còn sống) */
    const coBan = bangGia.filter(t => LC.quaLocCoBan(t, R.hopDong(t.sym), cfg, now));

    /* ⭐ CỔNG 2 — XU HƯỚNG. Đây là chỗ quyết định SỐ LƯỢNG coin theo dõi:
       nó là KẾT QUẢ của bộ lọc, không phải chỉ tiêu phải lấp đầy. Coin
       đang được theo dõi đi qua ngưỡng nới lỏng hơn (trễ) để không bị
       bật/tắt engine liên tục khi nằm sát mép. */
    const dat = coBan.filter(t => LC.quaLocXuHuong(t, cfg, engines.has(t.sym)));
    soQuaLoc = dat.length;

    /* Xếp hạng CHỈ dùng khi trần an toàn bị chạm. */
    dat.sort((a, b) => LC.diemQuan(b, cfg) - LC.diemQuan(a, cfg));

    /* ⛔ TRẦN ĐẾM COIN ĐÃ BỎ (2026-08-23). Ràng buộc thật là RAM: quan
       sát thêm coin không tốn xu nào, chỉ tốn RAM/CPU/băng thông.
       `SO_COIN_TRAN` để `null` = không giới hạn; giữ nhánh này để ai đặt
       lại một con số thì nó vẫn có hiệu lực. */
    const tranDem = cfg.SO_COIN_TRAN == null ? Infinity : cfg.SO_COIN_TRAN;
    const ram = ramMB();

    /* Vùng đệm theo THỨ HẠNG — lớp trễ, chỉ có nghĩa khi có trần bị chạm.
       Không còn trần đếm thì giữ toàn bộ coin qua lọc. */
    const nGiu = Number.isFinite(tranDem) ? tranDem + cfg.QUET.VUNG_DEM_COIN : dat.length;
    const giu = new Set(dat.slice(0, nGiu).map(t => t.sym));

    /* ⛔ RAM vượt mức xả thì GỠ BỚT, không chỉ ngừng thêm. Bot bị OOM
       kill là KHÔNG AI CANH LỆNH ĐANG MỞ — tệ hơn hẳn việc theo dõi ít
       coin đi. Gỡ từ cuối bảng xếp hạng lên. */
    const phaiXa = ram >= cfg.RAM_XA_BOT_MB;
    const hangCuoi = phaiXa
      ? new Set(dat.slice(-cfg.QUET.GO_TOI_DA_MOI_VONG).map(t => t.sym))
      : null;

    let daGo = 0;
    for (const sym of [...engines.keys()]) {
      if (ghim.has(sym)) continue;
      const st = QL.trangThai.get(sym);
      if (st && st.lenh) continue;                    // ⛔ có lệnh mở thì miễn nhiễm
      if (st && st.trangThai === TT.CHO_VAO) continue; // có kế hoạch đóng băng thì giữ
      const boVi = !giu.has(sym) || (phaiXa && hangCuoi.has(sym));
      if (boVi && daGo < cfg.QUET.GO_TOI_DA_MOI_VONG) { dungEngine(sym); daGo++; }
    }
    if (phaiXa) canh(`RAM ${ram}MB >= nguong xa ${cfg.RAM_XA_BOT_MB}MB — da go ${daGo} coin`);

    for (const sym of ghim) if (!engines.has(sym)) taoEngine(sym);
    let chanRam = false;
    for (const t of dat) {
      if (engines.size >= tranDem) break;
      /* Đo lại mỗi lần thêm: mỗi engine ăn ~19MB nên 10 coin là ~190MB,
         kiểm một lần ở đầu vòng là thừa chỗ để vọt qua trần. */
      if (ramMB() >= cfg.RAM_TRAN_MB) { chanRam = true; break; }
      if (!engines.has(t.sym)) taoEngine(t.sym);
    }
    if (chanRam && !canhRamGanDay(Date.now())) {
      canh(`RAM ${ramMB()}MB cham tran ${cfg.RAM_TRAN_MB}MB — NGUNG THEM COIN`
        + ` (${engines.size} dang theo doi, ${dat.length} qua loc). Coi lai RAM_TRAN_MB vs RAM that cua server.`);
    }
  } catch (e) { canh('quet loi:', e.message); }
}

/* --------------------------------------------------------- REST 60s */
function nenTuChoi(ns, huong) {
  if (!ns || ns.length < 2) return false;
  const c = ns[ns.length - 1];
  const bien = c.h - c.l;
  if (!(bien > 0)) return false;
  const than = Math.abs(c.c - c.o);
  const Q = cfg.QUET;
  const nguong = Q.NEN_RAU_NHAN * Math.max(than, bien * Q.NEN_RAU_SAN_BIEN);
  if (huong === 'short') return (c.h - Math.max(c.o, c.c)) > nguong && c.c < c.h * (1 - Q.NEN_DONG_LUI);
  return (Math.min(c.o, c.c) - c.l) > nguong && c.c > c.l * (1 + Q.NEN_DONG_LUI);
}

function khongTaoDayMoi(E, gio = 2) {
  const now = Date.now();
  const h = E.giaHist.filter(x => now - x.t <= gio * 3600e3);
  if (h.length < cfg.QUET.DAY_MOI_MAU_TOI_THIEU) return false;
  const cat = now - cfg.QUET.DAY_MOI_CUA_SO_PHUT * 60e3;
  const gan = h.filter(x => x.t >= cat).map(x => x.p);
  const truoc = h.filter(x => x.t < cat).map(x => x.p);
  if (!gan.length || !truoc.length) return false;
  return Math.min(...gan) > Math.min(...truoc) * (1 + cfg.QUET.DAY_MOI_BIEN);
}

async function nhipRest() {
  try {
    btc = await R.cheDoBtc();
    for (const E of engines.values()) {
      const f = await R.funding(E.instId);
      if (f) {
        const doiKy = E.funding && E.funding.fundingTime !== f.fundingTime;
        E.funding = f;
        if (doiKy) QL.ghiNhanFunding(E.sym, f.f8);   // short + funding dương = được trả tiền
      }
      const n15 = await R.nen(E.instId, '15m', 40);
      if (n15.length) {
        E.nen15 = n15;
        E.dinhPump = Math.max(...n15.map(c => c.h));
      }
    }
    await mocGia7h();
  } catch (e) { canh('nhipRest loi:', e.message); }
}

/* ảnh chụp giá 07:00 — SHORT-B và LONG-B không tồn tại nếu thiếu mốc này */
let ngayDaChup = null;
async function mocGia7h() {
  const G = K.gioVN();
  if (!(G.gio === 7 && G.phut < 3)) return;
  if (ngayDaChup === G.ngay) return;
  ngayDaChup = G.ngay;
  for (const t of bangGia) {
    if (!engines.has(t.sym) && Math.abs(t.chg24) < cfg.QUET.MOC_GIA_CHG24) continue;
    DB.ghiMocGia({
      ngay: G.ngay, coin: t.sym, gia7h: t.last, chg24Luc7h: t.chg24,
      daTang30HomQua: t.chg24 >= 0.30, dinh24h: t.high24, day24h: t.low24,
    });
  }
  ghi(`chup moc gia 07:00 ngay ${G.ngay}`);
}

/* ---------------------------------------------- canh lệnh khi MẤT SỔ */
/** Giá dự phòng: REST ticker — đường dữ liệu ĐỘC LẬP với WebSocket sổ
 *  lệnh, nên hai bên khó chết cùng lúc. Quá cũ thì trả `null`: thà không
 *  có giá còn hơn đóng lệnh dựa trên một con số đã lỗi thời. */
function giaDuPhong(sym) {
  const t = bangGia.find(x => x.sym === sym);
  if (!t || !(t.last > 0)) return null;
  if (Date.now() - (t.ts || 0) > cfg.MAT_SO.TUOI_TICKER_TOI_DA_MS) return null;
  return t.last;
}

const matSoTu = new Map();     // sym -> lúc bắt đầu mất sổ
const canhMuCuoi = new Map();  // sym -> lần kêu gần nhất (đừng kêu mỗi 2 giây)

/** Sổ chết. Vẫn phải canh lệnh đang mở bằng giá REST. */
function canhMu(E, now) {
  if (!matSoTu.has(E.sym)) matSoTu.set(E.sym, now);
  const gia = giaDuPhong(E.sym);
  const kq = QL.canhLenhMu(E.sym, gia);
  if (!kq) return;                       // không có lệnh mở → không sao

  const lau = now - matSoTu.get(E.sym);
  if (kq === 'dong') {
    canh(`[${E.sym}] ⛔ MAT SO ${Math.round(lau / 1000)}s — DA DONG LENH bang gia REST ${gia}`);
    DB.ghiSuKien({ coin: E.sym, tu: 'MAT_SO', den: 'DONG', lyDo: 'dong_mu',
                   chiTiet: { matSoGiay: Math.round(lau / 1000), gia } });
    matSoTu.delete(E.sym);
    return;
  }
  if (lau < cfg.MAT_SO.CANH_BAO_SAU_MS) return;
  if (now - (canhMuCuoi.get(E.sym) || 0) < cfg.MAT_SO.CANH_BAO_SAU_MS) return;
  canhMuCuoi.set(E.sym, now);
  if (kq === 'khong_co_gia') {
    /* Mất CẢ sổ lẫn ticker = mù hoàn toàn trên một lệnh đang mở. Đây là
       trạng thái nguy hiểm nhất của cả hệ và phải nhìn thấy được. */
    canh(`[${E.sym}] ⛔⛔ MAT CA SO LAN TICKER ${Math.round(lau / 1000)}s`
      + ' — LENH DANG MO KHONG AI CANH. Kiem mang/OKX ngay.');
    DB.ghiSuKien({ coin: E.sym, tu: 'MAT_SO', den: 'MU_HOAN_TOAN', lyDo: 'khong_co_gia',
                   chiTiet: { matSoGiay: Math.round(lau / 1000) } });
  } else {
    canh(`[${E.sym}] ⚠ mat so ${Math.round(lau / 1000)}s — dang canh lenh bang gia REST ${gia}`);
  }
}

/* --------------------------------------------------------- nhịp 2 giây */
function nhipPhanTich() {
  const now = Date.now();
  nhipCuoi = now;
  demNhip++;

  if (fs.existsSync(FILE_DUNG) && !QL.dungMoMoi) {
    const gia = {};
    for (const [s, E] of engines) gia[s] = E.giaHist[E.giaHist.length - 1]?.p;
    QL.dungKhan(gia);
    canh('DUNG.flag — da dong moi lenh va ngung mo moi');
  }

  for (const E of engines.values()) {
    try {
      /* ⛔ SỔ HỎNG CHẶN MỞ LỆNH MỚI — KHÔNG ĐƯỢC CHẶN ĐÓNG LỆNH.
         Ba điều kiện dưới đây (nhịp tim là gói DỮ LIỆU chứ không phải
         pong · sổ hỏng · sổ rỗng một phía) trước 2026-08-23 là ba lệnh
         `continue` trần, bỏ qua LUÔN cả lệnh đang mở: không kiểm đường
         cắt, không kiểm van cuối. Một coin đi ngược trong lúc mất sổ
         chạy bao xa cũng không ai đóng. Nay rơi vào nhánh CANH MÙ. */
      const soCu = ws.tuoiData('books', E.instId) > cfg.QUET.SO_LENH_HET_HAN_MS;
      const A0 = (soCu || E.so.hong) ? null : E.so.lay(E.ctVal);
      if (!A0 || !A0.bids.length || !A0.asks.length) { canhMu(E, now); continue; }
      matSoTu.delete(E.sym);
      const A = { ...A0, mid: (A0.bids[0].p + A0.asks[0].p) / 2 };

      T.capNhatTuong(E.tuong, A, E.tickSz, cfg.CUA_SO_PULL_GIAY * 4);
      const P = S.phanTich(E, A, cfg);

      const tk = bangGia.find(t => t.sym === E.sym);
      const coin = { sym: E.sym, chg24: tk ? tk.chg24 : 0, volUsd: tk ? tk.volUsd : 0 };
      const G = K.gioVN();
      const boiCanh = {
        mocGia: DB.docMocGia(E.sym),
        khongTaoDayMoi2h: khongTaoDayMoi(E, 2),
        tickSz: E.tickSz, verTrongSo: VER,
        /* Biên độ 24h của CHÍNH coin này — định cỡ đường cắt trailing.
           Thiếu ticker thì `_khoangTrailing` tự lùi về SÀN, phía an toàn. */
        bienDo24: tk ? LC.bienDo24(tk) : 0,
        dinhPump: E.dinhPump,
        nenTuChoi: nenTuChoi(E.nen15, QL.trangThai.get(E.sym)?.huong || 'short'),
      };

      const sel = K.chonSetup(cfg, coin, P, boiCanh);
      const amMay = (now - E.batDau) / 1000;
      const btcXau = btc.phaDinh;
      const chan = S.tinhChan(P, cfg, sel.trongKhung, btcXau);

      /* ---- GHI TÍN HIỆU, KỂ CẢ BỊ CHẶN (nhóm đối chứng) ---- */
      if (Math.abs(P.S) >= cfg.NGUONG_GHI && amMay >= cfg.WARMUP_GIAY) {
        const st0 = QL.layTT(E.sym);
        const huongTH = P.S >= 0 ? 'long' : 'short';
        const co = (P.coSHORT && huongTH === 'short') || (P.coLONG && huongTH === 'long');
        const lanCuoi = st0._ghiCuoi || 0;
        if (co && now - lanCuoi > cfg.NGUOI_LANH_PHUT * 60e3) {
          st0._ghiCuoi = now;
          const notional0 = cfg.KY_QUY_LAN_1 * cfg.DON_BAY;
          /* Giá cắt GHI VÀO tin_hieu chỉ để tham chiếu — đây là đường
             trailing lúc mới vào, chưa bám đỉnh lần nào. */
          const kTrail = QL._khoangTrailing(boiCanh.bienDo24);
          const giaCat = huongTH === 'short'
            ? P.mid * (1 + kTrail) : P.mid * (1 - kTrail);
          const w = T.thongTinTuong(E.tuong, huongTH === 'short' ? 'b' : 'a',
            (huongTH === 'short' ? A.bids[0] : A.asks[0]).p) || {};
          st0.tinHieuId = DB.ghiTinHieu({
            uid: `${E.sym}-${now}`, ts: now, coin: E.sym, huong: huongTH,
            /* ⚠ Nhãn cũ là 'NGOAI_KHUNG' — sai nghĩa và gây đọc nhầm dữ liệu:
               nó KHÔNG có nghĩa "bị khung giờ chặn", mà là "không setup nào đủ
               điều kiện COIN". Khi đọc dump 12/08 thấy cả 7 tín hiệu mang nhãn
               này, rất dễ kết luận nhầm là khung giờ đang chặn.
               ⛔ Dữ liệu ghi TRƯỚC 2026-08-12 mang nhãn 'NGOAI_KHUNG' — đọc theo
               nghĩa mới (không setup), đừng lọc nó ra như nhóm "ngoài khung". */
            setup: sel.setup || 'KHONG_SETUP', gia: P.mid, s: P.S, chan,
            trongKhung: sel.trongKhung, gioVN: G.gio, phutVN: G.phut,
            bpr: P.bpr, bfr: P.bfr, dbi: P.dbi, ddbi: P.ddbi, satDinh: P.satDinh,
            /* ⛔ apr/afr/satDay: 3/5 vế của CÒ LONG. Trước 2026-08-12
               chúng được TÍNH rồi vứt đi → không giải thích được vì sao
               một lệnh SẴN SÀNG mãi không vào. */
            apr: P.apr, afr: P.afr, satDay: P.satDay,
            mauPull: P.mauPull, mauPullAsk: P.mauPullAsk,
            coSHORT: P.coSHORT, coLONG: P.coLONG,
            sig: P.sig, co: P.co,
            funding8h: P.funding8h, oiUsd: P.oiUsd, dOi25: P.dOi25, dP25: P.dP25,
            chg24: coin.chg24, chg1h: null, vol24Usd: coin.volUsd,
            tuoiCoinNgay: (now - E.listTime) / 86400e3,
            btcChg1h: btc.chg1h, btcChg24: btc.chg24,
            tuongTin: w.tin, tuongNOrd: w.nOrd, tuongTuoiPhut: w.tuoiPhut,
            tuoiMayGiay: Math.round(amMay), soTinHieuHoatDong: P.hoatDong,
            giaCat, tp: [], rrGia: null, rrTaiKhoan: null,
            baseline: null, verTrongSo: VER,
          });
        }
      }

      /* ---- ẢNH CHỤP ĐỊNH KỲ 60s: dữ liệu để sau này sửa tham số ---- */
      if (now - (nhipDaGhi.get(E.sym) || 0) > cfg.QUET.NHIP_GHI_MS) {
        nhipDaGhi.set(E.sym, now);
        const bt = T.bangTuong(E.tuong, A, 50);
        DB.ghiNhip({
          ts: now, coin: E.sym, gia: P.mid, s: P.S,
          bpr: P.bpr, bfr: P.bfr, dbi: P.dbi, ddbi: P.ddbi,
          apr: P.apr, afr: P.afr, satDinh: P.satDinh, satDay: P.satDay,
          mauPull: P.mauPull, mauPullAsk: P.mauPullAsk,
          coSHORT: P.coSHORT, coLONG: P.coLONG,
          bidTin: P.bidTin, askTin: P.askTin, nOrdBid: P.nOrdBid, nOrdAsk: P.nOrdAsk,
          mua30: P.mua30, ban30: P.ban30, funding8h: P.funding8h,
          oiUsd: P.oiUsd, dOi25: P.dOi25, chg24: coin.chg24,
          soTuong: bt.length,
          tuongTinTb: bt.length ? bt.reduce((s, x) => s + x.tin, 0) / bt.length : null,
          gioVN: G.gio, trongKhung: sel.trongKhung,
          trangThai: QL.layTT(E.sym).trangThai,
        });
      }

      /* ---- máy trạng thái ---- */
      /* Bit 16 (ngoài khung gốc) VẪN được ghi vào `chan` để giữ nhóm đối
         chứng, nhưng LUÔN bị gỡ khỏi cổng chặn — chạy 24/24, giờ giấc
         không còn chặn gì. Bit này nay thuần tuý là NHÃN dữ liệu. */
      const chanChan = chan & ~16;
      const cong = {
        cho: chanChan === 0 && amMay >= cfg.WARMUP_GIAY && !QL.dungMoMoi,
        setup: sel.setup, huong: sel.huong, lyDo: sel.lyDo,
      };
      QL.capNhat(E.sym, E, A, P, cong, boiCanh);

      E._P = P; E._A = A; E._sel = sel; E._chan = chan; E._amMay = amMay; E._coin = coin;
    } catch (e) { canh(`[${E.sym}] nhip loi:`, e.message); }
  }

  ghiAnh();
}

/* --------------------------------------------------------- ảnh trạng thái */
function ghiAnh() {
  const now = Date.now();
  const G = K.gioVN();
  const lenhMo = [], theoDoi = [];

  for (const E of engines.values()) {
    const st = QL.layTT(E.sym);
    const P = E._P, A = E._A;
    const giaHT = P ? P.mid : null;
    /* bảng điểm của CHÍNH coin này — đọc từ DB nên sống qua khởi động lại,
       cộng thêm lệnh đóng trong phiên hiện tại (DB làm mới mỗi 30 giây) */
    const tkDb = DB.thongKeCoin(E.sym);
    const phien = QL.lichSu.filter(h => h.sym === E.sym
      && (!tkDb || !tkDb.lan_cuoi || h.tsDong > tkDb.lan_cuoi));
    const diem = {
      thang: (tkDb ? Number(tkDb.thang) || 0 : 0) + phien.filter(h => h.pnl > 0).length,
      thua: (tkDb ? Number(tkDb.thua) || 0 : 0) + phien.filter(h => h.pnl <= 0).length,
      pnl: (tkDb ? Number(tkDb.pnl) || 0 : 0) + phien.reduce((a, h) => a + h.pnl, 0),
      lanCuoi: Math.max(tkDb && tkDb.lan_cuoi ? Number(tkDb.lan_cuoi) : 0,
                        phien.length ? Math.max(...phien.map(h => h.tsDong)) : 0) || null,
    };

    if (st.lenh) {
      const L = st.lenh;
      lenhMo.push({
        sym: E.sym, huong: L.huong, setup: L.setup, trangThai: st.trangThai,
        giaHT, giaVaoTB: L.giaVaoTB, giaVao1: L.giaVao1, giaCat: L.giaCat,
        kyQuy: L.kyQuy, notional: L.notional, soLanDCA: L.soLanDCA,
        pnlUsd: L.pnlUsd, pnlPcGia: L.pnlPcGia, pnlPcTk: L.pnlPcTk,
        funding: L.fundingNhanUsd, phi: L.phiUsd, truot: L.truotUsd,
        dinhLai: L.dinhLai, hoiLai: L.hoiLai, nguongHoi: L.nguongHoi, baoDong: L.baoDong,
        raoChan: L.raoChan, canhBao: L.canhBao,
        tuoiPhut: Math.round((now - L.tsMo) / 60000),
        khoangTrailing: L.khoangTrailing, loThietKeUsd: L.loThietKeUsd,
        giaDinh: L.giaDinh, daKhoaVon: L.daKhoaVon, loTranUsd: cfg.LO_TRAN_USD,
        dongBang: true, diem,
      });
    } else {
      theoDoi.push({
        sym: E.sym, giaHT, chg24: E._coin ? E._coin.chg24 : null,
        funding8h: P ? P.funding8h : null, dOi25: P ? P.dOi25 : null,
        bpr: P ? P.bpr : null, bfr: P ? P.bfr : null,
        dbi: P ? P.dbi : null, ddbi: P ? P.ddbi : null,
        s: P ? P.S : null, co: P ? (P.coSHORT ? 'SHORT' : (P.coLONG ? 'LONG' : null)) : null,
        trangThai: st.trangThai, huong: st.huong, setup: st.setup,
        keHoach: st.keHoach ? {
          giaVao: st.keHoach.giaVao, giaCat: st.keHoach.giaCat,
          giaCatTran: st.keHoach.giaCatTran, kyQuy: st.keHoach.kyQuy,
          notional: st.keHoach.notional, loThietKeUsd: st.keHoach.loThietKeUsd,
          khoangTrailing: st.keHoach.khoangTrailing,
          lanCapNhat: st.keHoach.lanCapNhat, capNhatLuc: st.keHoach.capNhatLuc,
        } : null,
        khoaDen: st.khoaHuongDen > now ? Math.ceil((st.khoaHuongDen - now) / 60000) : 0,
        demXacNhan: st.demXacNhan,
        chan: E._chan, taiSao: E._chan ? S.taiSaoChan(E._chan) : [],
        lyDoKhung: E._sel ? E._sel.lyDo : [],
        amMay: E._amMay !== undefined ? Math.round(E._amMay) : null,
        warmup: cfg.WARMUP_GIAY,
        tuong: A ? T.bangTuong(E.tuong, A, 6) : [],
        soLive: ws.tuoiData('books', E.instId) < cfg.QUET.SO_LENH_HET_HAN_MS,
        diem,
      });
    }
  }

  const ctl = QL.congThanhLy(0);
  const anh = {
    luc: now, ver: VER, cheDo: cfg.CHE_DO,
    gioVN: G.nhan, ngay: G.ngay, khung: K.khungDangMo(cfg),
    von: QL.vonHienTai(), vonBanDau: QL.vonBanDau,
    vonThapNhat: QL.vonThapNhat, choAmVon: QL.choAmVon,
    soLanChayLyThuyet: QL.soLanChayLyThuyet,
    kyQuyDung: [...QL.trangThai.values()].reduce((s, x) => s + (x.lenh ? x.lenh.kyQuy : 0), 0),
    notional: QL.tongNotional(),
    khoangChay: isFinite(ctl.khoangChay) ? ctl.khoangChay : null,
    canChay: ctl.can,
    dungMoMoi: QL.dungMoMoi, lyDoDung: QL.lyDoDung,
    soCoin: engines.size, soLenhMo: QL.soLenhMo(),
    wsLive: Date.now() - ws.lastMsg < cfg.HA_TANG.WS_NOI_LAI_TRAN_MS,
    db: DB.sucKhoe(),
    btc,
    lenhMo, theoDoi, lichSu: QL.lichSu.slice(0, cfg.QUET.LICH_SU_GUI),
  };
  try { fs.writeFileSync(FILE_ANH, JSON.stringify(anh)); } catch (e) {}
}

/* --------------------------------------------------------- web đọc */
const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const _xuLyWeb = (req, res) => {
  const u = (req.url || '/').split('?')[0];
  let f;
  if (u === '/' || u === '/index.html') f = path.join(__dirname, 'web', 'index.html');
  else if (u === '/trangthai.json') f = FILE_ANH;
  else { res.writeHead(404); return res.end('404'); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(503); return res.end('chua co du lieu'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'text/plain', 'Cache-Control': 'no-store' });
    res.end(d);
  });
};
if (BAT_WEB) http.createServer(_xuLyWeb).on('error', e => {
  if (e.code === 'EADDRINUSE') {
    canh(`Cong ${cfg.CONG_WEB} DANG BI CHIEM — gan nhu chac chan mot bot khac dang chay.`);
    canh('Dung bot cu truoc (Ctrl+C o terminal do), roi chay lai.');
    canh('Chay hai bot cung luc la HAI tien trinh cung ghi mot DB — du lieu se hong.');
    process.exit(1);
  }
  canh('web loi:', e.message);
}).listen(cfg.CONG_WEB, () => ghi(`web noi bo: http://localhost:${cfg.CONG_WEB}`));
else ghi(`web noi bo TAT — trang do may chu cua hosting phuc vu tu ${GOC_WEB}`);

/* --------------------------------------------------------- sức khỏe */
function inSucKhoe() {
  const canhB = [];
  let live = 0;
  for (const E of engines.values()) if (ws.tuoiData('books', E.instId) < cfg.QUET.SO_LENH_HET_HAN_MS) live++;
  if (live < engines.size) canhB.push(`${engines.size - live} coin MAT SO`);
  if (Date.now() - ws.lastMsg > cfg.HA_TANG.WS_NOI_LAI_TRAN_MS) canhB.push('WS IM');
  if (QL.dungMoMoi) canhB.push(`NGUNG MO MOI: ${QL.lyDoDung}`);
  const sk = DB.sucKhoe();
  if (!sk.sanSang) canhB.push('MySQL CHUA KET NOI');
  if (sk.hangDoi > 500) canhB.push(`hang doi ghi ${sk.hangDoi}`);
  if (sk.boRoi) canhB.push(`DA BO ROI ${sk.boRoi} lenh ghi`);
  /* `loc=A/B`: A = số coin QUA BỘ LỌC, B = trần an toàn. A < B là bình
     thường (bộ lọc đang quyết định số lượng). A >= B kéo dài = trần đang
     cắt bớt cơ hội → hoặc nâng trần, hoặc siết LOC_COIN. Đây là con số
     để CHỈNH NGƯỠNG BẰNG DỮ LIỆU, đừng đoán. */
  const rr = QL.ruiRoTheoHuong();
  const ruiRo = rr.long + rr.short;
  const tranRR = cfg.TRAN_RUI_RO.TONG_PC * QL.vonBanDau;
  /* ⚠ Tập trung cùng hướng: N lệnh long trên N alt lúc BTC sập không
     phải N lệnh, đó là 1 lệnh cỡ N×. Trần rủi ro tổng KHÔNG bắt được. */
  const lech = Math.max(rr.long, rr.short);
  if (lech > cfg.TRAN_RUI_RO.CANH_BAO_CUNG_HUONG_PC * QL.vonBanDau)
    canhB.push(`TAP TRUNG ${rr.long >= rr.short ? 'LONG' : 'SHORT'} $${lech.toFixed(1)}`);

  ghi(`${engines.size} coin · loc=${soQuaLoc}/${cfg.SO_COIN_TRAN == null ? 'kh.gioi.han' : cfg.SO_COIN_TRAN}`
    + ` · ${live} so live · ${QL.soLenhMo()} lenh mo · von $${QL.vonHienTai().toFixed(2)}`
    + ` · rui ro $${ruiRo.toFixed(1)}/$${tranRR.toFixed(0)}`
    + ` · khung ${K.khungDangMo(cfg)} · db ${sk.sanSang ? 'ok' : 'CHUA'}/${sk.daGhi}ghi/${sk.hangDoi}cho`
    + ` · RAM ${Math.round(process.memoryUsage().rss / 1048576)}MB`);
  if (canhB.length) canh(canhB.join(' | '));
}

function napGhim() {
  try {
    if (!fs.existsSync(FILE_GHIM)) return;
    ghim = new Set(fs.readFileSync(FILE_GHIM, 'utf8').split(/\r?\n/)
      .map(s => s.trim().toUpperCase()).filter(s => s && !s.startsWith('#')));
  } catch (e) {}
}

/* --------------------------------------------------------- khởi động */
(async () => {
  ghi('='.repeat(60));
  ghi(`BOT OKX · che do ${cfg.CHE_DO.toUpperCase()} · von $${cfg.VON} · x${cfg.DON_BAY} · ver ${VER}`);
  if (cfg.CHE_DO !== 'giay' && !fs.existsSync(path.join(__dirname, 'TOI-HIEU-RUI-RO.flag'))) {
    canh('CHE DO khac "giay" nhung KHONG co TOI-HIEU-RUI-RO.flag — quay ve che do giay');
    cfg.CHE_DO = 'giay';
  }
  ghi(`DB: ${DB.FILE_DB}`);
  ghi('='.repeat(60));

  await R.napHopDong();
  napGhim();
  ws.batDau();
  await new Promise(r => setTimeout(r, 1500));
  await quet();
  await nhipRest();

  setInterval(nhipPhanTich, cfg.NHIP_PHAN_TICH);
  setInterval(quet, cfg.NHIP_QUET);
  setInterval(nhipRest, cfg.NHIP_REST);
  setInterval(inSucKhoe, cfg.NHIP_LOG);
  setInterval(napGhim, 30000);
  setInterval(() => R.napHopDong(), 6 * 3600e3);
  ghi(`dang chay. Warmup ${cfg.WARMUP_GIAY}s/coin truoc khi phat tin hieu dau tien.`);
})();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    ghi('nhan', sig, '- dung bot (LENH DANG MO KHONG BI DONG).');
    ws.dungHan();
    await DB.dong();        // xả nốt hàng đợi, nếu không là mất dữ liệu
    process.exit(0);
  });
}
process.on('uncaughtException', e => canh('uncaught:', e.stack || e.message));
process.on('unhandledRejection', e => canh('unhandled:', e && (e.stack || e.message)));
