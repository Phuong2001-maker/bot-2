-- =====================================================================
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

CREATE TABLE IF NOT EXISTS tin_hieu (
  id BIGINT PRIMARY KEY, uid VARCHAR(64) UNIQUE,
  ts BIGINT, coin VARCHAR(32), huong VARCHAR(8), setup VARCHAR(24),
  gia VARCHAR(48), s DOUBLE, chan INT,
  trong_khung TINYINT, gio_vn INT, phut_vn INT,
  bpr DOUBLE, bfr DOUBLE, dbi DOUBLE, ddbi DOUBLE, sat_dinh DOUBLE,
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
  gia_cat VARCHAR(48), tp1 VARCHAR(48), tp2 VARCHAR(48), tp3 VARCHAR(48), tp4 VARCHAR(48),
  rr_gia DOUBLE, rr_tai_khoan DOUBLE, baseline DOUBLE,
  ver_trong_so VARCHAR(24),
  INDEX ix_th_coin (coin, ts), INDEX ix_th_khung (trong_khung, chan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lenh (
  id BIGINT PRIMARY KEY, uid VARCHAR(64) UNIQUE, tin_hieu_id BIGINT,
  ts_mo BIGINT, ts_dong BIGINT,
  coin VARCHAR(32), huong VARCHAR(8), setup VARCHAR(24), trang_thai VARCHAR(16),
  trong_khung TINYINT, gio_vn_mo INT,
  gia_vao_tb VARCHAR(48), gia_cat VARCHAR(48), gia_dong VARCHAR(48), gia_vao_1 VARCHAR(48),
  ky_quy_usd DOUBLE, gia_tri_lenh_usd DOUBLE, don_bay INT,
  so_lan_vao INT, so_lan_chot INT,
  pnl_usd DOUBLE, pnl_pc_tk DOUBLE, pnl_pc_gia DOUBLE,
  funding_nhan_usd DOUBLE, phi_usd DOUBLE, truot_usd DOUBLE, phi_va_truot_pc_tk DOUBLE,
  ly_do_dong VARCHAR(24), r_multiple DOUBLE, baseline DOUBLE,
  dinh_lai_pc DOUBLE, hoi_lai_diem DOUBLE, so_lan_dca INT, phut_om INT,
  canh_bao_da_hien VARCHAR(255),
  khoang_trailing DOUBLE, lo_thiet_ke_usd DOUBLE,
  sl_algo_id VARCHAR(48), sl_gia VARCHAR(48),
  la_giay TINYINT, ver_trong_so VARCHAR(24),
  INDEX ix_lenh_coin (coin, ts_mo), INDEX ix_lenh_dong (ts_dong)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lan_vao (
  id BIGINT PRIMARY KEY, lenh_id BIGINT, ts BIGINT, loai VARCHAR(12),
  gia VARCHAR(48), size_usd DOUBLE, ky_quy_usd DOUBLE, ly_do VARCHAR(64),
  gia_goc VARCHAR(48), phi_usd DOUBLE, truot_usd DOUBLE, truot_pc DOUBLE,
  INDEX ix_lv (lenh_id, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS moc_gia (
  ngay VARCHAR(10), coin VARCHAR(32), gia_7h VARCHAR(48), chg24_luc_7h DOUBLE,
  da_tang30_hom_qua TINYINT, dinh_24h VARCHAR(48), day_24h VARCHAR(48),
  PRIMARY KEY (ngay, coin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS su_kien (
  id BIGINT PRIMARY KEY, ts BIGINT, coin VARCHAR(32),
  tu VARCHAR(16), den VARCHAR(16), ly_do VARCHAR(64), chi_tiet TEXT,
  INDEX ix_sk (ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS nhip (
  id BIGINT PRIMARY KEY, ts BIGINT, coin VARCHAR(32), gia VARCHAR(48),
  s DOUBLE, bpr DOUBLE, bfr DOUBLE, dbi DOUBLE, ddbi DOUBLE,
  apr DOUBLE, afr DOUBLE, sat_dinh DOUBLE, sat_day DOUBLE,
  mau_pull_bid INT, mau_pull_ask INT, co_short TINYINT, co_long TINYINT,
  bid_tin DOUBLE, ask_tin DOUBLE, n_ord_bid INT, n_ord_ask INT,
  mua30 DOUBLE, ban30 DOUBLE, funding8h DOUBLE, oi_usd DOUBLE, d_oi25 DOUBLE,
  chg24 DOUBLE, so_tuong INT, tuong_tin_tb DOUBLE,
  gio_vn INT, trong_khung TINYINT, trang_thai VARCHAR(16),
  INDEX ix_nhip (coin, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
