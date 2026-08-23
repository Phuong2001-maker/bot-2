'use strict';
const fs = require('fs');
const path = require('path');

const THU_MUC = path.join(__dirname, '..', 'du-lieu');
const FILE = path.join(THU_MUC, 'bot.log');
const TRAN_LOG = require('../config').HA_TANG.LOG_TRAN_MB * 1024 * 1024;

if (!fs.existsSync(THU_MUC)) fs.mkdirSync(THU_MUC, { recursive: true });

const gio = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

/* Xoay log khi quá to. `chay.sh` dùng >> không giới hạn kích thước nên
   nếu không tự xoay thì sau vài tuần file thành vài GB và không mở nổi. */
function xoay() {
  try {
    if (fs.existsSync(FILE) && fs.statSync(FILE).size > TRAN_LOG) {
      fs.renameSync(FILE, FILE + '.1');
    }
  } catch (e) { /* không được để việc xoay log làm chết bot */ }
}

function ghi(...a) {
  const dong = gio() + ' ' + a.map(x =>
    typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ');
  console.log(dong);
  try { fs.appendFileSync(FILE, dong + '\n'); } catch (e) {}
}

function canh(...a) { ghi('!!', ...a); xoay(); }

module.exports = { ghi, canh, gio, THU_MUC };
