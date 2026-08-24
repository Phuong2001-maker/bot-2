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

  /* ============ KHOÁ API OKX — Giai đoạn 10 ============
     ⛔ CHỈ CẦN khi `CHE_DO` trong config.js là 'demo' hoặc 'that'.
     Ở chế độ 'giay' (mặc định) bot chạy bình thường mà KHÔNG cần khoá —
     nó vẫn tính đủ lệnh SL sẽ gửi và ghi lại để bạn soi trước.

     ⭐ LỘ TRÌNH AN TOÀN, ĐỪNG NHẢY CÓC:
       1. 'giay'  → xem sự kiện SL_KHO trong bảng `su_kien`, kiểm giá kích
                    hoạt có đúng đường cắt không
       2. 'demo'  → tạo khoá ở mục DEMO TRADING của OKX (khoá riêng, KHÔNG
                    dùng chung với tài khoản thật). Tiền ảo, đường code
                    thật. Chạy tới khi đối soát sạch.
       3. 'that'  → chỉ sau ≥200 lệnh giấy và khi bước 2 không còn lệch.

     ⛔ QUYỀN CỦA KHOÁ: chỉ bật **Trade**. TUYỆT ĐỐI KHÔNG bật Withdraw.
        Có giới hạn IP về đúng IP server.
     ⛔ Khoá nằm trong file này — file đã ở .gitignore. Đừng commit, đừng
        dán vào chat, đừng chụp màn hình.                                */
  // OKX: {
  //   apiKey: '',
  //   apiSecret: '',
  //   passphrase: '',
  // },
};
