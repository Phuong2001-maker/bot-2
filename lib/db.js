'use strict';
/* =====================================================================
   TẦNG GHI LOG — MySQL.

   ⚠ MySQL của hosting CHỈ NGHE LOCALHOST → bot PHẢI chạy TRÊN server.
     Chạy ở máy cá nhân sẽ không kết nối được, hàng đợi ghi sẽ đầy dần
     rồi tràn. Đây là ràng buộc của hosting, không sửa bằng code được.

   BA QUYẾT ĐỊNH THIẾT KẾ, và lý do:

   1. HÀNG ĐỢI GHI CÓ THỬ LẠI. MySQL đi qua socket — rớt một phút là mất
      tín hiệu vĩnh viễn nếu ghi thẳng. Nên mọi lệnh ghi vào hàng đợi
      trong RAM, một vòng lặp nền xả dần, lỗi mạng thì giữ lại thử lại,
      lỗi cú pháp thì bỏ dòng đó ra để không kẹt cả hàng. Hàng đợi có
      TRẦN, và khi tràn thì **kêu to** chứ không im lặng vứt.

   2. ID SINH Ở PHÍA BOT, không dùng AUTO_INCREMENT. Vì `ghiTinHieu()` và
      `moLenh()` phải trả id NGAY (máy trạng thái dùng liền), mà MySQL thì
      bất đồng bộ. Sinh id tại chỗ giữ nguyên hợp đồng hàm, không phải sửa
      một dòng nào ở `lenh.js` hay `bot.js`.

   3. BỘ NHỚ ĐỆM CHO LƯỢT ĐỌC. `docMocGia`/`demLenhHomNay`/`thuaLienTiep`
      được gọi trong nhịp 2 giây và dùng kết quả ngay. Làm chúng bất đồng
      bộ là phải sửa cả chuỗi gọi. Thay vào đó làm mới định kỳ vào RAM,
      hàm đọc trả từ RAM.
   ===================================================================== */

const mysql = require('mysql2/promise');
const { ghi, canh } = require('./log');
const HT = require('../config').HA_TANG;

const g = x => (x === null || x === undefined || !isFinite(x)) ? null : Number(x).toFixed(15);
const n = x => (x === null || x === undefined || !isFinite(x)) ? null : x;
const b = x => (x === null || x === undefined) ? null : (x ? 1 : 0);

/* ---------------------------------------------------------------- id */
let _dem = 0;
const nextId = () => Date.now() * 1000 + ((_dem++) % 1000);

/* ------------------------------------------------------------ hàng đợi */
const TRAN_HANG_DOI = HT.DB_TRAN_HANG_DOI;
const hangDoi = [];
let pool = null, sanSang = false, dangXa = false;
let soDaGhi = 0, soLoi = 0, soBoRoi = 0;

function day(sql, params) {
  hangDoi.push([sql, params]);
  if (hangDoi.length > TRAN_HANG_DOI) {
    const bo = hangDoi.splice(0, 2000);
    soBoRoi += bo.length;
    /* Kêu TO. Mất dữ liệu im lặng là thứ tệ nhất trong cả dự án này —
       mọi thống kê về sau sẽ lệch mà không ai biết vì sao. */
    canh(`⛔ HANG DOI GHI TRAN — DA BO ${bo.length} lenh ghi (tong bo roi: ${soBoRoi}). MySQL co van de!`);
  }
}

async function xaHangDoi() {
  if (dangXa || !sanSang || !hangDoi.length) return;
  dangXa = true;
  try {
    let lo = 0;
    while (hangDoi.length && lo < HT.DB_XA_MOI_LAN) {
      const [sql, params] = hangDoi[0];
      try {
        await pool.execute(sql, params);
        hangDoi.shift();
        soDaGhi++; lo++;
      } catch (e) {
        soLoi++;
        /* Lỗi cú pháp/ràng buộc thì thử lại bao nhiêu lần cũng vô ích —
           bỏ dòng đó ra để không kẹt cả hàng đợi. Lỗi mạng thì giữ lại. */
        const boQua = /ER_(PARSE|BAD_FIELD|DUP_ENTRY|NO_SUCH_TABLE|DATA_TOO_LONG|TRUNCATED)/.test(e.code || '');
        if (boQua) { hangDoi.shift(); canh('bo dong ghi loi:', e.code, e.message.slice(0, 120)); }
        else { canh('MySQL ghi loi (se thu lai):', e.code || e.message); break; }
      }
    }
  } finally { dangXa = false; }
}

/* ------------------------------------------------------------ lược đồ */
const GIA = 'VARCHAR(48)';   /* giá lưu CHUỖI toFixed(15) — số thực làm tròn
                                mất chữ số có nghĩa với coin giá 0,0000000123 */
const DDL = [
`CREATE TABLE IF NOT EXISTS tin_hieu (
  id BIGINT PRIMARY KEY, uid VARCHAR(64) UNIQUE,
  ts BIGINT, coin VARCHAR(32), huong VARCHAR(8), setup VARCHAR(24),
  gia ${GIA}, s DOUBLE, chan INT,
  trong_khung TINYINT, gio_vn INT, phut_vn INT,
  bpr DOUBLE, bfr DOUBLE, dbi DOUBLE, ddbi DOUBLE, sat_dinh DOUBLE,
  /* phía BÁN + sát đáy — cò LONG phụ thuộc HOÀN TOÀN vào mấy cột này.
     Thiếu chúng thì DB không bao giờ trả lời được "vì sao không vào lệnh". */
  apr DOUBLE, afr DOUBLE, sat_day DOUBLE,
  mau_pull_bid INT, mau_pull_ask INT, co_short TINYINT, co_long TINYINT,
  s_pull DOUBLE, s_flow30 DOUBLE, s_book DOUBLE, s_liq DOUBLE, s_oi DOUBLE, s_fund DOUBLE,
  co_pull TINYINT, co_flow30 TINYINT, co_book TINYINT,
  co_liq TINYINT, co_oi TINYINT, co_fund TINYINT,
  funding8h DOUBLE, oi_usd DOUBLE, d_oi25 DOUBLE, d_p25 DOUBLE,
  chg24 DOUBLE, chg1h DOUBLE, vol24_usd DOUBLE, tuoi_coin_ngay DOUBLE,
  btc_chg1h DOUBLE, btc_chg24 DOUBLE,
  tuong_tin INT, tuong_n_ord INT, tuong_tuoi_phut DOUBLE,
  tuoi_may_giay INT, so_tin_hieu_hoat_dong INT,
  gia_cat ${GIA}, tp1 ${GIA}, tp2 ${GIA}, tp3 ${GIA}, tp4 ${GIA},
  rr_gia DOUBLE, rr_tai_khoan DOUBLE, baseline DOUBLE,
  ver_trong_so VARCHAR(24),
  INDEX ix_th_coin (coin, ts), INDEX ix_th_khung (trong_khung, chan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

`CREATE TABLE IF NOT EXISTS lenh (
  id BIGINT PRIMARY KEY, uid VARCHAR(64) UNIQUE, tin_hieu_id BIGINT,
  ts_mo BIGINT, ts_dong BIGINT,
  coin VARCHAR(32), huong VARCHAR(8), setup VARCHAR(24), trang_thai VARCHAR(16),
  trong_khung TINYINT, gio_vn_mo INT,
  gia_vao_tb ${GIA}, gia_cat ${GIA}, gia_dong ${GIA}, gia_vao_1 ${GIA},
  ky_quy_usd DOUBLE, gia_tri_lenh_usd DOUBLE, don_bay INT,
  so_lan_vao INT, so_lan_chot INT,
  pnl_usd DOUBLE, pnl_pc_tk DOUBLE, pnl_pc_gia DOUBLE,
  funding_nhan_usd DOUBLE, phi_usd DOUBLE, truot_usd DOUBLE, phi_va_truot_pc_tk DOUBLE,
  ly_do_dong VARCHAR(24), r_multiple DOUBLE, baseline DOUBLE,
  dinh_lai_pc DOUBLE, hoi_lai_diem DOUBLE, so_lan_dca INT, phut_om INT,
  canh_bao_da_hien VARCHAR(255),
  khoang_trailing DOUBLE, lo_thiet_ke_usd DOUBLE,
  sl_algo_id VARCHAR(48), sl_gia ${GIA},
  la_giay TINYINT, ver_trong_so VARCHAR(24),
  INDEX ix_lenh_coin (coin, ts_mo), INDEX ix_lenh_dong (ts_dong)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

`CREATE TABLE IF NOT EXISTS lan_vao (
  id BIGINT PRIMARY KEY, lenh_id BIGINT, ts BIGINT, loai VARCHAR(12),
  gia ${GIA}, size_usd DOUBLE, ky_quy_usd DOUBLE, ly_do VARCHAR(64),
  gia_goc ${GIA}, phi_usd DOUBLE, truot_usd DOUBLE, truot_pc DOUBLE,
  INDEX ix_lv (lenh_id, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

`CREATE TABLE IF NOT EXISTS moc_gia (
  ngay VARCHAR(10), coin VARCHAR(32), gia_7h ${GIA}, chg24_luc_7h DOUBLE,
  da_tang30_hom_qua TINYINT, dinh_24h ${GIA}, day_24h ${GIA},
  PRIMARY KEY (ngay, coin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

`CREATE TABLE IF NOT EXISTS su_kien (
  id BIGINT PRIMARY KEY, ts BIGINT, coin VARCHAR(32),
  tu VARCHAR(16), den VARCHAR(16), ly_do VARCHAR(64), chi_tiet TEXT,
  INDEX ix_sk (ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

`CREATE TABLE IF NOT EXISTS nhip (
  id BIGINT PRIMARY KEY, ts BIGINT, coin VARCHAR(32), gia ${GIA},
  s DOUBLE, bpr DOUBLE, bfr DOUBLE, dbi DOUBLE, ddbi DOUBLE,
  /* xem chú thích cùng nhóm cột ở bảng tin_hieu */
  apr DOUBLE, afr DOUBLE, sat_dinh DOUBLE, sat_day DOUBLE,
  mau_pull_bid INT, mau_pull_ask INT, co_short TINYINT, co_long TINYINT,
  bid_tin DOUBLE, ask_tin DOUBLE, n_ord_bid INT, n_ord_ask INT,
  mua30 DOUBLE, ban30 DOUBLE, funding8h DOUBLE, oi_usd DOUBLE, d_oi25 DOUBLE,
  chg24 DOUBLE, so_tuong INT, tuong_tin_tb DOUBLE,
  gio_vn INT, trong_khung TINYINT, trang_thai VARCHAR(16),
  INDEX ix_nhip (coin, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/* ------------------------------------------------------- bộ nhớ đệm đọc */
const dem = { mocGia: new Map(), homNay: {}, thuaLienTiep: 0, theoCoin: new Map(), lucLamMoi: 0 };

async function lamMoiDem() {
  if (!sanSang) return;
  try {
    /* ⭐ Mốc GẦN NHẤT mỗi coin, KHÔNG phải mốc của riêng hôm nay.
       Bản cũ lọc `WHERE ngay = hôm nay`, mà mốc chỉ được chụp lúc 07:00
       → từ 00:00 đến 07:00 bảng rỗng → SHORT-B chết 7 tiếng mỗi đêm và
       LONG-B mất chốt chặn "hôm trước vừa pump". Đó là một RÀNG BUỘC GIỜ
       trá hình, nằm ở tầng dữ liệu chứ không phải tầng cổng.
       Lấy mốc gần nhất thì hai setup đó chạy được 24/24 mà KHÔNG phải
       đổi một chữ nào trong định nghĩa của chúng. */
    const [mg] = await pool.query(
      `SELECT m.* FROM moc_gia m
       JOIN (SELECT coin, MAX(ngay) ngay FROM moc_gia GROUP BY coin) x
         ON m.coin = x.coin AND m.ngay = x.ngay`);
    dem.mocGia.clear();
    for (const r of mg) dem.mocGia.set(r.coin, r);

    const [hn] = await pool.query(
      `SELECT COUNT(*) c, SUM(CASE WHEN pnl_usd > 0 THEN 1 ELSE 0 END) thang,
              SUM(COALESCE(pnl_usd,0)) pnl
       FROM lenh WHERE ts_dong IS NOT NULL AND ts_dong >= ?`, [Date.now() - 86400e3]);
    dem.homNay = hn[0] || {};

    /* Bảng điểm theo TỪNG COIN — đọc từ DB nên sống sót qua khởi động lại,
       khác với `lichSu` chỉ nằm trong RAM. */
    const [tc] = await pool.query(
      `SELECT coin, COUNT(*) n,
              SUM(CASE WHEN pnl_usd > 0 THEN 1 ELSE 0 END) thang,
              SUM(CASE WHEN pnl_usd <= 0 THEN 1 ELSE 0 END) thua,
              SUM(COALESCE(pnl_usd,0)) pnl, MAX(ts_dong) lan_cuoi
       FROM lenh WHERE ts_dong IS NOT NULL GROUP BY coin`);
    dem.theoCoin = new Map(tc.map(r => [r.coin, r]));

    const [lt] = await pool.query(
      'SELECT pnl_usd FROM lenh WHERE ts_dong IS NOT NULL ORDER BY ts_dong DESC LIMIT 5');
    let d = 0;
    for (const x of lt) { if ((x.pnl_usd || 0) < 0) d++; else break; }
    dem.thuaLienTiep = d;
    dem.lucLamMoi = Date.now();
  } catch (e) { canh('lam moi dem loi:', e.code || e.message); }
}

/* ------------------------------------------------------------- khởi tạo */
async function khoiTao(cauHinh) {
  try {
    pool = mysql.createPool({
      host: cauHinh.host || 'localhost',
      port: cauHinh.port || 3306,
      user: cauHinh.user,
      password: cauHinh.password,
      database: cauHinh.database,
      waitForConnections: true,
      connectionLimit: 4,
      charset: 'utf8mb4',
      /* BIGINT về dạng số, không phải chuỗi — id dùng để so sánh */
      supportBigNumbers: true, bigNumberStrings: false,
    });
    /* MỌI cột đều nằm trong DDL ở trên — không còn ALTER TABLE tự động.
       ⛔ Đánh đổi phải nhớ: `CREATE TABLE IF NOT EXISTS` bỏ qua bảng đã
       tồn tại TRONG IM LẶNG. Nên với một DB CŨ (khôi phục từ bản sao lưu
       trước 2026-08-12) cột mới sẽ KHÔNG tự có, và bot ghi lỗi
       "Unknown column '...'". Cách xử lý: chạy tay đoạn ALTER ở mục 🛠
       trong CLAUDE.md. Lưới an toàn duy nhất còn lại là phép kiểm so
       `server/schema.sql` với DDL này — thêm cột mà quên
       `npm run xuat-schema` là test ĐỎ. */
    for (const sql of DDL) await pool.query(sql);
    sanSang = true;
    ghi(`MySQL san sang: ${cauHinh.user}@${cauHinh.host}/${cauHinh.database}`);
    await lamMoiDem();
  } catch (e) {
    canh('⛔ MySQL KHOI TAO THAT BAI:', e.code || e.message);
    canh('   Bot van chay, moi lenh ghi doi trong hang doi. Kiem config.local.js.');
    setTimeout(() => khoiTao(cauHinh), 15000);
  }
}

/* Trong test thì KHÔNG bật vòng lặp nền và KHÔNG tự kết nối — nếu không,
   tiến trình test không bao giờ thoát được vì bộ hẹn giờ giữ event loop. */
const LA_TEST = process.env.BOT_TEST === '1';
if (!LA_TEST) {
  setInterval(xaHangDoi, HT.DB_NHIP_XA_MS);
  setInterval(lamMoiDem, HT.DB_NHIP_DEM_MS);
}

/* --------------------------------------------------------------- ghi */
const cot = o => Object.keys(o).join(',');
const hoi = o => Object.keys(o).map(() => '?').join(',');
const val = o => Object.values(o);

function ghiTinHieu(t) {
  const id = nextId();
  const o = {
    id, uid: t.uid, ts: t.ts, coin: t.coin, huong: t.huong, setup: t.setup,
    gia: g(t.gia), s: n(t.s), chan: t.chan | 0,
    trong_khung: b(t.trongKhung), gio_vn: t.gioVN, phut_vn: t.phutVN,
    bpr: n(t.bpr), bfr: n(t.bfr), dbi: n(t.dbi), ddbi: n(t.ddbi), sat_dinh: n(t.satDinh),
    /* ⛔ apr/afr/sat_day là 3/5 vế của CÒ LONG — thiếu chúng thì không
       bao giờ trả lời được "vì sao lệnh không vào". Xem chú thích ở
       phần ALTER TABLE phía trên. */
    apr: n(t.apr), afr: n(t.afr), sat_day: n(t.satDay),
    mau_pull_bid: n(t.mauPull), mau_pull_ask: n(t.mauPullAsk),
    co_short: b(t.coSHORT), co_long: b(t.coLONG),
    s_pull: n(t.sig?.pull), s_flow30: n(t.sig?.flow30), s_book: n(t.sig?.book),
    s_liq: n(t.sig?.liq), s_oi: n(t.sig?.oi), s_fund: n(t.sig?.fund),
    co_pull: b(t.co?.pull), co_flow30: b(t.co?.flow30), co_book: b(t.co?.book),
    co_liq: b(t.co?.liq), co_oi: b(t.co?.oi), co_fund: b(t.co?.fund),
    funding8h: n(t.funding8h), oi_usd: n(t.oiUsd), d_oi25: n(t.dOi25), d_p25: n(t.dP25),
    chg24: n(t.chg24), chg1h: n(t.chg1h), vol24_usd: n(t.vol24Usd),
    tuoi_coin_ngay: n(t.tuoiCoinNgay), btc_chg1h: n(t.btcChg1h), btc_chg24: n(t.btcChg24),
    tuong_tin: n(t.tuongTin), tuong_n_ord: n(t.tuongNOrd), tuong_tuoi_phut: n(t.tuongTuoiPhut),
    tuoi_may_giay: n(t.tuoiMayGiay), so_tin_hieu_hoat_dong: n(t.soTinHieuHoatDong),
    gia_cat: g(t.giaCat), tp1: g(t.tp?.[0]), tp2: g(t.tp?.[1]), tp3: g(t.tp?.[2]), tp4: g(t.tp?.[3]),
    rr_gia: n(t.rrGia), rr_tai_khoan: n(t.rrTaiKhoan), baseline: n(t.baseline),
    ver_trong_so: t.verTrongSo,
  };
  day(`INSERT IGNORE INTO tin_hieu (${cot(o)}) VALUES (${hoi(o)})`, val(o));
  return id;
}

function moLenh(L) {
  const id = nextId();
  const o = {
    id, uid: L.uid, tin_hieu_id: L.tinHieuId || null, ts_mo: L.tsMo,
    coin: L.coin, huong: L.huong, setup: L.setup, trang_thai: L.trangThai,
    trong_khung: b(L.trongKhung), gio_vn_mo: L.gioVN,
    gia_vao_tb: g(L.giaVaoTB), gia_cat: g(L.giaCat), gia_vao_1: g(L.giaVao1),
    ky_quy_usd: n(L.kyQuyUsd), gia_tri_lenh_usd: n(L.giaTriLenhUsd), don_bay: L.donBay,
    so_lan_vao: L.soLanVao || 1, so_lan_chot: 0,
    pnl_usd: 0, funding_nhan_usd: 0, phi_usd: 0, truot_usd: 0,
    baseline: n(L.baseline), la_giay: b(L.laGiay), ver_trong_so: L.verTrongSo,
    khoang_trailing: n(L.khoangTrailing), lo_thiet_ke_usd: n(L.loThietKeUsd),
    sl_algo_id: L.slAlgoId || null, sl_gia: g(L.slGia),
  };
  day(`INSERT IGNORE INTO lenh (${cot(o)}) VALUES (${hoi(o)})`, val(o));
  return id;
}

function capNhatLenh(id, L) {
  day(`UPDATE lenh SET trang_thai=?, gia_vao_tb=?, gia_cat=?, ky_quy_usd=?,
       gia_tri_lenh_usd=?, so_lan_vao=?, so_lan_chot=?, pnl_usd=?, pnl_pc_tk=?,
       pnl_pc_gia=?, funding_nhan_usd=?, canh_bao_da_hien=?, phi_usd=?, truot_usd=?
       WHERE id=?`,
    [L.trangThai, g(L.giaVaoTB), g(L.giaCat), n(L.kyQuyUsd), n(L.giaTriLenhUsd),
     L.soLanVao, L.soLanChot, n(L.pnlUsd), n(L.pnlPcTk), n(L.pnlPcGia),
     n(L.fundingNhanUsd), (L.canhBao || []).join(','), n(L.phiUsd), n(L.truotUsd), id]);
}

function dongLenh(id, L) {
  day(`UPDATE lenh SET ts_dong=?, trang_thai='DONG', gia_dong=?, ly_do_dong=?,
       pnl_usd=?, pnl_pc_tk=?, pnl_pc_gia=?, r_multiple=?, funding_nhan_usd=?,
       so_lan_chot=?, phi_usd=?, truot_usd=?, phi_va_truot_pc_tk=?,
       dinh_lai_pc=?, hoi_lai_diem=?, so_lan_dca=?, phut_om=? WHERE id=?`,
    [L.tsDong, g(L.giaDong), L.lyDoDong, n(L.pnlUsd), n(L.pnlPcTk), n(L.pnlPcGia),
     n(L.rMultiple), n(L.fundingNhanUsd), L.soLanChot,
     n(L.phiUsd), n(L.truotUsd), n(L.phiVaTruotPcTk),
     n(L.dinhLaiPc), n(L.hoiLaiDiem), n(L.soLanDCA), n(L.phutOm), id]);
  lamMoiDem();   // ngắt mạch phải thấy ngay, không đợi 30 giây
}

/** Ghi lại id + mốc SL đang treo trên sàn. Cần cho việc ĐỐI SOÁT lúc
 *  khởi động lại: không có nó thì bot không biết SL nào của mình. */
function capNhatSL(id, slAlgoId, slGia) {
  day('UPDATE lenh SET sl_algo_id=?, sl_gia=? WHERE id=?', [slAlgoId || null, g(slGia), id]);
}

function ghiLanVao(v) {
  const o = {
    id: nextId(), lenh_id: v.lenhId, ts: v.ts, loai: v.loai, gia: g(v.gia),
    size_usd: n(v.sizeUsd), ky_quy_usd: n(v.kyQuyUsd), ly_do: v.lyDo,
    gia_goc: g(v.giaGoc), phi_usd: n(v.phiUsd), truot_usd: n(v.truotUsd), truot_pc: n(v.truotPc),
  };
  day(`INSERT INTO lan_vao (${cot(o)}) VALUES (${hoi(o)})`, val(o));
}

function ghiSuKien(s) {
  const o = {
    id: nextId(), ts: s.ts || Date.now(), coin: s.coin, tu: s.tu, den: s.den,
    ly_do: s.lyDo,
    chi_tiet: typeof s.chiTiet === 'object' ? JSON.stringify(s.chiTiet) : (s.chiTiet || null),
  };
  day(`INSERT INTO su_kien (${cot(o)}) VALUES (${hoi(o)})`, val(o));
}

function ghiNhip(x) {
  const o = {
    id: nextId(), ts: x.ts, coin: x.coin, gia: g(x.gia), s: n(x.s),
    bpr: n(x.bpr), bfr: n(x.bfr), dbi: n(x.dbi), ddbi: n(x.ddbi),
    apr: n(x.apr), afr: n(x.afr), sat_dinh: n(x.satDinh), sat_day: n(x.satDay),
    mau_pull_bid: n(x.mauPull), mau_pull_ask: n(x.mauPullAsk),
    co_short: b(x.coSHORT), co_long: b(x.coLONG),
    bid_tin: n(x.bidTin), ask_tin: n(x.askTin), n_ord_bid: n(x.nOrdBid), n_ord_ask: n(x.nOrdAsk),
    mua30: n(x.mua30), ban30: n(x.ban30), funding8h: n(x.funding8h),
    oi_usd: n(x.oiUsd), d_oi25: n(x.dOi25), chg24: n(x.chg24),
    so_tuong: n(x.soTuong), tuong_tin_tb: n(x.tuongTinTb),
    gio_vn: x.gioVN, trong_khung: b(x.trongKhung), trang_thai: x.trangThai,
  };
  day(`INSERT INTO nhip (${cot(o)}) VALUES (${hoi(o)})`, val(o));
}

function ghiMocGia(m) {
  day(`REPLACE INTO moc_gia (ngay, coin, gia_7h, chg24_luc_7h, da_tang30_hom_qua, dinh_24h, day_24h)
       VALUES (?,?,?,?,?,?,?)`,
    [m.ngay, m.coin, g(m.gia7h), n(m.chg24Luc7h), b(m.daTang30HomQua), g(m.dinh24h), g(m.day24h)]);
  /* ghi vào đệm luôn để nhịp 2 giây thấy ngay, không đợi vòng làm mới.
     Khoá theo COIN — đệm giữ mốc gần nhất, xem `lamMoiDem`. */
  dem.mocGia.set(m.coin, {
    ngay: m.ngay, coin: m.coin, gia_7h: g(m.gia7h),
    chg24_luc_7h: m.chg24Luc7h, da_tang30_hom_qua: m.daTang30HomQua ? 1 : 0,
  });
}

/* -------------------------------------------------- đọc (từ bộ nhớ đệm) */
/** Mốc 07:00 GẦN NHẤT của coin (bất kể ngày). null = chưa từng chụp. */
const docMocGia = coin => dem.mocGia.get(coin) || null;
const demLenhHomNay = () => dem.homNay || {};
const thongKeCoin = sym => dem.theoCoin.get(sym) || null;
const thuaLienTiep = () => dem.thuaLienTiep || 0;

async function dong() {
  ghi(`MySQL: dang xa ${hangDoi.length} lenh ghi con lai...`);
  for (let i = 0; i < 40 && hangDoi.length; i++) { await xaHangDoi(); await new Promise(r => setTimeout(r, 200)); }
  if (hangDoi.length) canh(`⛔ CON ${hangDoi.length} lenh ghi CHUA XA DUOC — du lieu se thieu`);
  try { await pool?.end(); } catch (e) {}
}

const sucKhoe = () => ({ sanSang, hangDoi: hangDoi.length, daGhi: soDaGhi, loi: soLoi, boRoi: soBoRoi });

/* =================================================================== */
/*  ĐỐI SOÁT LÚC KHỞI ĐỘNG                                             */
/* =================================================================== */
/** Lệnh còn mở theo DB. Đây là nguồn sự thật khi bot khởi động lại —
 *  trước 2026-08-24 bot không đọc nó, nên mỗi lần restart là lệnh đang mở
 *  BIẾN MẤT khỏi bộ nhớ và kẹt vĩnh viễn trong DB với `ts_dong = NULL`. */
async function docLenhMo() {
  return truyVan("SELECT * FROM lenh WHERE ts_dong IS NULL AND trang_thai <> 'DONG'"
    + ' ORDER BY ts_mo ASC');
}

/** Tổng PnL của lệnh ĐÃ ĐÓNG — để dựng lại vốn thay vì đặt về VON.
 *  ⭐ Chỉ tính từ `MOC_VON_MS` trở đi: lệnh của cơ chế cũ VẪN NẰM TRONG DB
 *  để đối chiếu, nhưng không kéo vốn của bản mới xuống theo. */
async function tongPnlDaDong() {
  const moc = Number(require('../config').MOC_VON_MS) || 0;
  const r = await truyVan(
    'SELECT COALESCE(SUM(pnl_usd),0) t FROM lenh WHERE ts_dong IS NOT NULL AND ts_dong >= ?',
    [moc]);
  return (r && r[0] && Number(r[0].t)) || 0;
}

/** Truy vấn đọc — dùng cho cong-cu/bao-cao.js. Chờ kết nối sẵn sàng. */
async function truyVan(sql, params = []) {
  for (let i = 0; i < 60 && !sanSang; i++) await new Promise(r => setTimeout(r, 500));
  if (!sanSang) throw new Error('MySQL chua san sang — kiem config.local.js');
  const [rows] = await pool.query(sql, params);
  return rows;
}
const motDong = async (sql, params) => (await truyVan(sql, params))[0] || null;

/* --------------------------------------------------- tự khởi tạo khi nạp
   Đọc config.local.js — file này KHÔNG BAO GIỜ được commit (.gitignore).
   Không có nó thì bot vẫn chạy, chỉ là mọi lệnh ghi nằm chờ trong hàng đợi
   và log kêu rõ ràng — tốt hơn là chết ngay lúc khởi động. */
let _cauHinh = null;
if (!LA_TEST) {
  try {
    _cauHinh = require('../config.local.js').MYSQL;
  } catch (e) {
    canh('⛔ KHONG DOC DUOC config.local.js — chep tu config.local.mau.js roi dien thong tin DB');
  }
  if (_cauHinh) khoiTao(_cauHinh);
}

module.exports = {
  khoiTao, g, n, b, sucKhoe, truyVan, motDong,
  ghiTinHieu, moLenh, capNhatLenh, capNhatSL, dongLenh, ghiLanVao, ghiSuKien,
  ghiNhip, ghiMocGia, docMocGia, demLenhHomNay, thongKeCoin, thuaLienTiep, dong,
  docLenhMo, tongPnlDaDong,
  get db() { return pool; },
  FILE_DB: 'mysql',
};
