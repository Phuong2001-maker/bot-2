'use strict';
/* =====================================================================
   BẢN MẪU — chép file này thành `config.local.js` rồi điền thông tin.

     cp config.local.mau.js config.local.js

   ⛔ `config.local.js` ĐÃ nằm trong .gitignore. Đừng bao giờ commit nó,
      đừng dán nội dung nó vào chat hay ảnh chụp màn hình.
      File MẪU này là file DUY NHẤT được commit — sửa cấu trúc thì phải
      sửa ở CẢ HAI.
   ===================================================================== */

module.exports = {
  MYSQL: {
    host: 'localhost',        // MySQL của hosting CHỈ nghe localhost
    port: 3306,
    database: 'buwsofujhosting_coin_db_v1',
    user: 'buwsofujhosting_coin_user_v1',
    password: '',             // ← điền mật khẩu DB vào đây
  },

  /* Nơi bot ghi đè `trangthai.json` mỗi 2 giây. Phải là THƯ MỤC GỐC WEB
     của tên miền, để trình duyệt đọc được file tĩnh — không cần cổng,
     không cần reverse proxy, không cần PHP.

     Trên server, đường dẫn thường có dạng:
       /home/<tài khoản>/domains/k7m2coin.hiteckqualityconstruction.com.au

     Để trống thì bot ghi vào ./du-lieu/ và tự bật máy chủ web nội bộ. */
  GOC_WEB: '',

  /* Bật máy chủ web nội bộ ở cổng CONG_WEB (mặc định 8899).
     Trên server thì để `false` — Apache/nginx đã phục vụ thư mục gốc web
     rồi, bật thêm chỉ chiếm cổng vô ích. */
  BAT_WEB_NOI_BO: true,
};
