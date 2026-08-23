/* Trích nguyên văn mảng DDL từ lib/db.js — không chép tay, tránh sai lệch. */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '..', 'lib', 'db.js');
const s = fs.readFileSync(F, 'utf8');

const GIA = (s.match(/const GIA = '([^']+)'/) || [])[1];
const i = s.indexOf('const DDL = [');
const j = s.indexOf('\n];', i);
const than = s.slice(i + 'const DDL = ['.length, j);

/* tách theo từng chuỗi template `...` ở cấp cao nhất */
const bang = [];
let k = 0;
while (k < than.length) {
  if (than[k] !== '`') { k++; continue; }
  let e = k + 1;
  while (e < than.length && than[e] !== '`') e++;
  bang.push(than.slice(k + 1, e));
  k = e + 1;
}

const ra = bang
  .map(t => t.replace(/\$\{GIA\}/g, GIA))
  /* bỏ chú thích kiểu JS lọt trong SQL */
  .map(t => t.replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*\r?\n/gm, ''))
  .map(t => t.trim())
  .filter(t => /^CREATE TABLE/i.test(t));

const DAU = `-- =====================================================================
-- SƠ ĐỒ BẢNG — dự án Coin 2
--
-- ⛔ SINH RA TỪ lib/db.js, ĐỪNG SỬA TAY FILE NÀY.
--    Sửa DDL ở lib/db.js rồi chạy lại: npm run xuat-schema
--    test/bat-bien.js có phép kiểm so hai bên, lệch là ĐỎ.
--
-- Dùng khi tạo DB mới thủ công. Bot cũng tự chạy đúng những câu này
-- lúc khởi động, nên chạy tay chỉ là để chủ động — không bắt buộc.
--
-- ⚠ KHÔNG có ALTER TABLE tự động cho nhóm cột đo cò (apr/afr/sat_day/
--    mau_pull_*/co_short/co_long). DB tạo MỚI thì có sẵn ở đây; DB CŨ
--    phải chạy tay đoạn ALTER trong CLAUDE.md mục 🛠.
-- =====================================================================

`;

/** Thân SQL (không kể phần đầu) — dùng chung cho cả ghi file lẫn test. */
function sinhSql() { return ra.join(';\n\n') + ';\n'; }

module.exports = { sinhSql, DAU, soBang: ra.length };

/* chạy trực tiếp thì ghi ra file; require vào thì chỉ xuất hàm */
if (require.main === module) {
  const ra_ = path.join(__dirname, '..', 'server', 'schema.sql');
  fs.writeFileSync(process.argv[2] || ra_, DAU + sinhSql(), 'utf8');
  console.log(`-- ${ra.length} bảng · GIA = ${GIA} → ${process.argv[2] || ra_}`);
}
