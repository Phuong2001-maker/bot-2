'use strict';
/* =====================================================================
   TRANG ĐỌC SỐ — chạy: npm run bao-cao

   Không có công cụ này thì DB chỉ là CÁI HỐ GHI: dữ liệu vào mà không ai
   đọc, và không có vòng phản hồi nào để sửa tham số.

   ⚠ BA NGUYÊN TẮC BẮT BUỘC KHI ĐỌC MỌI CON SỐ Ở ĐÂY:

   1. TỶ LỆ THẮNG TRẦN TRỤI VÔ NGHĨA Ở HỆ NÀY. Không còn mốc chốt lời cố
      định (bot ôm tới khi xu hướng đảo), nên không tính được `baseline`.
      Thước đo đúng là **R-multiple**: R = PnL ròng ÷ mức lỗ thiết kế.
      Lệnh cắt lỗ sạch ≈ −1,00R. Cái cần nhìn là **TỔNG R** và **R/lệnh**,
      không phải % thắng — hệ ôm theo xu hướng thường thắng 35–45% mà vẫn
      lãi, vì lệnh thắng chạy xa hơn lệnh thua nhiều lần.

   2. CỠ MẪU. Phân biệt 55% với 50% cần ~780 lệnh độc lập. Dưới 100 lệnh
      chỉ được kiểm LỖI THÔ, tuyệt đối không chỉnh trọng số.

   3. Vòng lặp "chỉnh trọng số sau vài chục lệnh" chính là thứ đã đẻ ra 4
      chốt chặn ở dự án cũ — mà rồi chính chúng bị nghi là cắt mất lệnh
      thắng. Đừng lặp lại.
   ===================================================================== */

const DB = require('../lib/db');
const cfg = require('../config');

const N = (x, d = 2) => (x === null || x === undefined || !isFinite(x)) ? '—' : Number(x).toFixed(d);
const P = (x, d = 1) => (x === null || x === undefined || !isFinite(x)) ? '—' : (x * 100).toFixed(d) + '%';

/** Khoảng tin cậy Wilson 95% — dùng cái này, đừng dùng ± sai số chuẩn. */
function wilson(x, n) {
  if (!n) return [null, null];
  const p = x / n, z = 1.96, z2 = z * z;
  const tam = (p + z2 / (2 * n)) / (1 + z2 / n);
  const nua = (z / (1 + z2 / n)) * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n));
  return [Math.max(0, tam - nua), Math.min(1, tam + nua)];
}

function bang(tieuDe, cot, hang) {
  console.log('\n' + tieuDe);
  console.log('─'.repeat(Math.max(tieuDe.length, 78)));
  const r = [cot, ...hang];
  const w = cot.map((_, i) => Math.max(...r.map(x => String(x[i] ?? '').length)));
  r.forEach((row, i) => {
    console.log(row.map((c, j) => (j === 0 ? String(c ?? '').padEnd(w[j]) : String(c ?? '').padStart(w[j]))).join('  '));
    if (i === 0) console.log(w.map(x => '─'.repeat(x)).join('  '));
  });
}

const SQL_CO_BAN = `
  SELECT COUNT(*) n,
         SUM(CASE WHEN pnl_usd > 0 THEN 1 ELSE 0 END) thang,
         AVG(dinh_lai_pc) dinh_tb,
         SUM(COALESCE(r_multiple,0)) tong_r,
         AVG(COALESCE(r_multiple,0)) r_tb,
         SUM(COALESCE(pnl_usd,0)) pnl,
         SUM(COALESCE(funding_nhan_usd,0)) funding
  FROM lenh WHERE ts_dong IS NOT NULL`;

async function nhomLenh(sql, params = []) {
  const rows = await DB.truyVan(sql, params);
  return rows.map(r => {
    const n = Number(r.n) || 0;
    const t = Number(r.thang) || 0;
    const [lo, hi] = wilson(t, n);
    const p = n ? t / n : null;
    return { ...r, n, thang: t, tyLe: p, wilson: n ? `${P(lo, 0)}–${P(hi, 0)}` : '—' };
  });
}

const COT = ['nhóm', 'n', 'thắng', 'Wilson 95%', 'TỔNG R', 'R/lệnh', 'PnL', 'đỉnh lãi TB'];
const dong = (r, ten) => [ten, r.n, P(r.tyLe, 1), r.wilson,
  N(r.tong_r, 2), N(r.r_tb, 3), '$' + N(r.pnl, 2), P(r.dinh_tb, 1)];

/* ==================================================================== */
(async () => {
console.log('\n' + '═'.repeat(78));
console.log('  BÁO CÁO BOT OKX');
console.log('═'.repeat(78));

const tong = (await nhomLenh(SQL_CO_BAN))[0];
const soTH = (await DB.motDong('SELECT COUNT(*) c FROM tin_hieu'))?.c || 0;
const soNhip = (await DB.motDong('SELECT COUNT(*) c FROM nhip'))?.c || 0;
const soMo = (await DB.motDong('SELECT COUNT(*) c FROM lenh WHERE ts_dong IS NULL'))?.c || 0;

console.log(`\n  tín hiệu ghi: ${soTH}   ·   lệnh đã đóng: ${tong.n}   ·   đang mở: ${soMo}   ·   ảnh nhịp: ${soNhip}`);

if (!tong.n) {
  console.log('\n  Chưa có lệnh nào đóng. Chạy bot rồi quay lại.\n');
  await DB.dong(); process.exit(0);
}

bang('TỔNG', COT, [dong(tong, 'tất cả')]);

/* ---- ma sát: phí + trượt giá ---- */
const ms = await DB.motDong(`SELECT SUM(COALESCE(phi_usd,0)) phi, SUM(COALESCE(truot_usd,0)) truot,
                                    SUM(COALESCE(funding_nhan_usd,0)) fund
                             FROM lenh WHERE ts_dong IS NOT NULL`) || {};
const von0 = cfg.VON || 200;
const maSat = (ms.phi || 0) + (ms.truot || 0);
console.log('\n  MA SÁT (đã trừ khỏi mọi con số ở trên)');
console.log(`    phí sàn        : -$${N(ms.phi, 3)}`);
console.log(`    trượt giá      : -$${N(ms.truot, 3)}   (đã nằm sẵn trong giá khớp)`);
console.log(`    funding        : ${(ms.fund || 0) >= 0 ? '+' : '-'}$${N(Math.abs(ms.fund || 0), 3)}` +
  ((ms.fund || 0) > 0 ? '   ← short + funding dương = SÀN TRẢ TIỀN cho bạn ôm lệnh' : ''));
console.log('    ─────────────────────────────');
console.log(`    ròng           : ${(ms.fund - maSat) >= 0 ? '+' : '-'}$${N(Math.abs(ms.fund - maSat), 3)}` +
  `   = ${P((ms.fund - maSat) / von0, 2)} vốn ban đầu`);
console.log(`    ma sát / lệnh  : $${N(maSat / tong.n, 4)}  (${P(maSat / tong.n / von0, 3)} tài khoản)`);
console.log(`    ngoại suy 200 lệnh/năm: -$${N(maSat / tong.n * 200, 2)} = ${P(maSat / tong.n * 200 / von0, 1)} vốn/năm`);
console.log('\n  ⚠ Bộ số phí/trượt/funding CỐ Ý BI QUAN (config.js):');
console.log(`    phí ${P(cfg.PHI_MOI_LAN, 3)} mọi lần khớp (sàn thật: taker 0,050% · maker 0,020%)`);
console.log(`    trượt đo từ sổ đã chiết khấu theo độ tin tường, rồi ×${cfg.HE_SO_TRUOT}, sàn cứng ${P(cfg.TRUOT_TOI_THIEU, 2)}`);
console.log(`    funding: nhận ×${cfg.HE_SO_FUNDING_NHAN} · trả ×${cfg.HE_SO_FUNDING_TRA}`);
console.log('    → Nếu bảng trên vẫn có lãi thì thực tế chỉ có thể TỐT HƠN.');

/* ---- cảnh báo cỡ mẫu, in TO và SỚM ---- */
if (tong.n < 100) {
  console.log(`\n  ⚠⚠ n = ${tong.n}. CHƯA ĐƯỢC KẾT LUẬN GÌ, CHƯA ĐƯỢC CHỈNH TRỌNG SỐ.`);
  console.log('     Dưới 100 lệnh chỉ kiểm được LỖI THÔ. Phân biệt 55% với 50% cần ~780 lệnh.');
} else if (tong.n < 780) {
  console.log(`\n  ⚠ n = ${tong.n}. Đủ để thấy lỗi thô, CHƯA đủ để chốt tỷ lệ thắng.`);
}

/* ==================== PHÉP THỬ LỚN NHẤT: KHUNG GIỜ ==================== */
console.log('\n\n' + '═'.repeat(78));
console.log('  ⭐ PHÉP THỬ KHUNG GIỜ — câu hỏi đắt giá nhất của cả dự án');
console.log('═'.repeat(78));
console.log('  Bot GHI cả tín hiệu bị cổng khung giờ chặn (bit 16), nên đây là thí');
console.log('  nghiệm đối chứng thật, không phải quan sát suông.');

const khung = await nhomLenh(SQL_CO_BAN + ' GROUP BY trong_khung ORDER BY trong_khung DESC');
bang('LỆNH: trong khung vs ngoài khung', COT,
  khung.map(r => dong(r, r.trong_khung ? 'TRONG khung' : 'NGOÀI khung')));

const thKhung = await DB.truyVan(`
  SELECT trong_khung, COUNT(*) n, AVG(s) s_tb, AVG(bpr) bpr_tb
  FROM tin_hieu GROUP BY trong_khung ORDER BY trong_khung DESC`);
bang('TÍN HIỆU (kể cả bị chặn)', ['nhóm', 'n', 'S TB', 'BPR TB'],
  thKhung.map(r => [r.trong_khung ? 'TRONG khung' : 'NGOÀI khung', r.n,
    N(r.s_tb, 1), N(r.bpr_tb, 3)]));

const nTrong = khung.find(r => r.trong_khung)?.n || 0;
const nNgoai = khung.find(r => !r.trong_khung)?.n || 0;
console.log('\n  CÁCH ĐỌC:');
if (Math.min(nTrong, nNgoai) < 300) {
  console.log(`  ⚠ n = ${nTrong} trong / ${nNgoai} ngoài. CẦN ≥300 MỖI NHÓM.`);
  console.log('    Ở n=50 bảng này sẽ cho một con số, con số đó SẼ SAI, và bạn sẽ tin nó.');
} else {
  console.log('  · trong khung HƠN hẳn ngoài khung  → khung giờ có thật, GIỮ cổng');
  console.log('  · hai nhóm NGANG nhau              → khung chỉ giảm số lệnh, BỎ cổng');
  console.log('  · trong khung KÉM hơn              → cổng đang cắt mất lệnh tốt, BỎ');
}

/* ==================== CÁC LÁT CẮT KHÁC ==================== */
bang('THEO SETUP', COT, (await nhomLenh(SQL_CO_BAN + ' GROUP BY setup ORDER BY n DESC'))
  .map(r => dong(r, r.setup || '(trống)')));

bang('THEO HƯỚNG', COT, (await nhomLenh(SQL_CO_BAN + ' GROUP BY huong'))
  .map(r => dong(r, r.huong || '(trống)')));

bang('THEO LÝ DO ĐÓNG', ['lý do', 'n', 'PnL', 'R TB'],
  (await DB.truyVan(`SELECT ly_do_dong, COUNT(*) n, SUM(pnl_usd) pnl, AVG(r_multiple) r
                     FROM lenh WHERE ts_dong IS NOT NULL GROUP BY ly_do_dong ORDER BY n DESC`))
    .map(r => [r.ly_do_dong, r.n, '$' + N(r.pnl, 2), N(r.r, 3)]));

bang('DCA — có căn cứ mới làm, nên phải HIẾM', ['nhóm', 'n', 'tổng R', 'R/lệnh'],
  (await DB.truyVan(`SELECT COALESCE(so_lan_dca,0) d, COUNT(*) n, SUM(r_multiple) r, AVG(r_multiple) rtb
                     FROM lenh WHERE ts_dong IS NOT NULL GROUP BY so_lan_dca`))
    .map(r => [r.d ? 'CÓ DCA' : 'không DCA', r.n, N(r.r, 2), N(r.rtb, 3)]));

bang('THỜI GIAN ÔM LỆNH', ['nhóm', 'n', 'tổng R', 'đỉnh lãi TB'],
  (await DB.truyVan(`SELECT CASE WHEN phut_om < 60 THEN '< 1 giờ'
                                 WHEN phut_om < 360 THEN '1–6 giờ'
                                 WHEN phut_om < 1440 THEN '6–24 giờ'
                                 ELSE '> 1 ngày' END nhom,
                            COUNT(*) n, SUM(r_multiple) r, AVG(dinh_lai_pc) d
                     FROM lenh WHERE ts_dong IS NOT NULL GROUP BY nhom`))
    .map(r => [r.nhom, r.n, N(r.r, 2), P(r.d, 1)]));

bang('THEO GIỜ VN MỞ LỆNH', ['giờ', 'n', 'thắng', 'tổng R'],
  (await DB.truyVan(`SELECT gio_vn_mo g, COUNT(*) n,
                            SUM(CASE WHEN pnl_usd>0 THEN 1 ELSE 0 END) t, SUM(r_multiple) r
                     FROM lenh WHERE ts_dong IS NOT NULL GROUP BY gio_vn_mo ORDER BY gio_vn_mo`))
    .map(r => [String(r.g).padStart(2, '0') + ':00', r.n, P(r.n ? r.t / r.n : null, 0), N(r.r, 2)]));

/* ---- giả thuyết "máy nguội tệ hơn máy ấm" (từ dự án cũ) ---- */
bang('GIẢ THUYẾT: máy nguội tệ hơn máy ấm', ['tuổi máy', 'n', 'S TB', 'BPR TB'],
  (await DB.truyVan(`SELECT CASE WHEN tuoi_may_giay < 300 THEN 'nguội <5ph'
                                 WHEN tuoi_may_giay < 900 THEN '5–15ph'
                                 ELSE 'ấm >15ph' END nhom,
                            COUNT(*) n, AVG(s) s, AVG(bpr) b
                     FROM tin_hieu GROUP BY nhom`))
    .map(r => [r.nhom, r.n, N(r.s, 1), N(r.b, 3)]));

/* ---- chốt chặn: đang cứu hay đang cắt mất lệnh thắng? ---- */
bang('CHỐT CHẶN — nhóm bị chặn là ĐỐI CHỨNG, không phải rác',
  ['chan', 'n', 'S TB', 'BPR TB'],
  (await DB.truyVan(`SELECT chan, COUNT(*) n, AVG(s) s, AVG(bpr) b
                     FROM tin_hieu GROUP BY chan ORDER BY n DESC LIMIT 12`))
    .map(r => [r.chan === 0 ? '0 (tín hiệu THẬT)' : String(r.chan), r.n, N(r.s, 1), N(r.b, 3)]));

/* ---- bộ lọc lệnh ảo có tác dụng không? ---- */
bang('BỘ LỌC LỆNH ẢO — độ tin của tường lúc phát tín hiệu',
  ['tin tường', 'n', 'S TB', 'numOrders TB'],
  (await DB.truyVan(`SELECT CASE WHEN tuong_tin >= 70 THEN 'cao ≥70'
                                 WHEN tuong_tin >= 55 THEN '55–69'
                                 WHEN tuong_tin >= 35 THEN '35–54'
                                 ELSE 'thấp <35' END nhom,
                            COUNT(*) n, AVG(s) s, AVG(tuong_n_ord) no
                     FROM tin_hieu WHERE tuong_tin IS NOT NULL GROUP BY nhom`))
    .map(r => [r.nhom, r.n, N(r.s, 1), N(r.no, 1)]));

/* ---- lỗi thô: đây mới là thứ được phép đọc ở n nhỏ ---- */
console.log('\n\n' + '═'.repeat(78));
console.log('  LỖI THÔ — đọc được ngay cả khi n nhỏ');
console.log('═'.repeat(78));
const tho = await DB.motDong(`
  SELECT COUNT(*) n,
    SUM(CASE WHEN tuoi_may_giay < ${cfg.WARMUP_GIAY} THEN 1 ELSE 0 END) may_nguoi,
    SUM(CASE WHEN co_oi = 0 OR co_oi IS NULL THEN 1 ELSE 0 END) thieu_oi,
    SUM(CASE WHEN co_fund = 0 OR co_fund IS NULL THEN 1 ELSE 0 END) thieu_fund,
    SUM(CASE WHEN co_pull = 0 OR co_pull IS NULL THEN 1 ELSE 0 END) thieu_pull
  FROM tin_hieu`);
if (tho && tho.n) {
  const pct = x => `${x} / ${tho.n} (${P(x / tho.n, 0)})`;
  console.log(`  sinh khi máy nguội  :  ${pct(tho.may_nguoi)}   ← lẽ ra phải bằng 0 (warmup ${cfg.WARMUP_GIAY}s)`);
  console.log(`  thiếu dữ liệu OI    :  ${pct(tho.thieu_oi)}`);
  console.log(`  thiếu dữ liệu funding: ${pct(tho.thieu_fund)}`);
  console.log(`  thiếu tín hiệu PULL :  ${pct(tho.thieu_pull)}   ← cao = wallBook chưa đủ mẫu`);
}

/* ⭐ CHÁY LÝ THUYẾT — ở chế độ test bot chạy tiếp khi vốn âm, nhưng mốc
   này là thứ quyết định chiến lược có dùng được bằng tiền thật hay không */
const chay = await DB.truyVan(`SELECT COUNT(*) n, MIN(ts) lan_dau FROM su_kien WHERE ly_do = 'chay_ly_thuyet'`);
if (chay[0] && chay[0].n > 0) {
  console.log('\n' + '═'.repeat(78));
  console.log(`  ⛔ ĐÃ CHÁY TRÊN LÝ THUYẾT ${chay[0].n} LẦN`);
  console.log('═'.repeat(78));
  console.log('  Bot chạy tiếp để giữ mẫu, nhưng tài khoản THẬT đã hết ở những mốc đó.');
  console.log('  Mọi con số lãi phía trên phải đọc kèm dòng này.');
}

const sk = await DB.truyVan('SELECT ly_do, COUNT(*) n FROM su_kien GROUP BY ly_do ORDER BY n DESC LIMIT 12');
if (sk.length) bang('SỰ KIỆN (gồm cả lượt BỊ TỪ CHỐI)', ['lý do', 'số lần'], sk.map(r => [r.ly_do, r.n]));

console.log('\n' + '═'.repeat(78));
console.log('  Nhắc lại: tỷ lệ thắng trần trụi vô nghĩa. Chỉ đọc cột "hơn ngẫu nhiên".');
console.log('═'.repeat(78) + '\n');
await DB.dong();
process.exit(0);
})().catch(async e => {
  console.error('\n⛔ LOI:', e.message);
  if (/chua san sang|ECONNREFUSED|ER_ACCESS/.test(e.message || '')) {
    console.error('   Kiem config.local.js. Nho: MySQL cua hosting CHI NGHE LOCALHOST,');
    console.error('   nen lenh nay phai chay TREN SERVER, khong chay o may ca nhan.\n');
  }
  process.exit(1);
});
