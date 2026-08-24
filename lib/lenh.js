'use strict';
/* =====================================================================
   MÁY TRẠNG THÁI LỆNH + QUẢN LÝ VỐN.

   ⛔ LUẬT ĐÈ LÊN MỌI THỨ — lệnh đã mở chỉ đóng vì ĐÚNG BA lý do:
        1. TRAILING: giá chạm đường cắt. Đường này cách ĐỈNH GIÁ đã đạt
           một khoảng K = kẹp(hệ số × biên độ 24h, sàn, trần) và CHỈ ĐI
           MỘT CHIỀU — không bao giờ lùi ra xa. Nó thay cho cả mốc cắt lỗ
           cố định $20/$25 lẫn vai trò "chặn lỗ" của chốt lời.
           Van cuối `LO_TRAN_USD` chỉ để chặn giá NHẢY QUA đường cắt.
        2. CHỐT LỜI: cò đảo chiều đã gài báo động VÀ hồi lại đủ sâu
           VÀ đỉnh lãi đã vượt SÀN PHÍ (dưới sàn thì chốt chắc chắn âm).
        3. người bấm DUNG.flag
      Không đóng vì hết giờ · cấu trúc gãy · funding đảo · S đổi dấu ·
      ra khỏi khung giờ. Những thứ đó CHỈ ĐƯỢC VẼ ⚠.

   ⛔ ĐƯỜNG CẮT KHÔNG BAO GIỜ LÙI. Mọi chỗ gán `L.giaCat` phải đi qua
      `_dayGiaCat()`. Gán thẳng là mở lại đúng lỗ hổng đã làm mất $41,58
      trên 2 lệnh BEAT: lệnh từng lãi rồi quay đầu mà không có gì chặn.

   ⛔ TIỀN TÍNH BẰNG ĐÔ, KHÔNG PHẢI %. $6 vào, $4 DCA, đều ×10.
      Không co giãn theo vốn → vốn về 0 hay âm cũng không hỏng công thức.

   ⛔ DCA ĐÚNG MỘT LẦN, và phải CÓ CĂN CỨ.
      Số tiền lỗ chỉ là HÀNG RÀO (được phép hay không), KHÔNG BAO GIỜ là
      lý do. Lý do duy nhất là RÀO CHẮN dày + đà đuối + không squeeze.
      Phần lớn lệnh thua sẽ không bao giờ được DCA — đó là ĐÚNG.
   ===================================================================== */

const T = require('./tuong');
const DB = require('./db');
const { ghi, canh } = require('./log');
const { gioVN, trongKhungGoc } = require('./khung');

const TT = { SAN: 'SAN', CHO_VAO: 'CHO_VAO', THAM_DO: 'THAM_DO', DCA: 'DCA', LAI_1: 'LAI_1', LAI_2: 'LAI_2' };
const BAC = { SAN: 0, CHO_VAO: 1, THAM_DO: 2, DCA: 3, LAI_1: 4, LAI_2: 5 };
const DA_MO = tt => BAC[tt] >= BAC.THAM_DO;

let _seq = 0;
const uid = sym => `${sym}-${Date.now().toString(36)}-${(_seq++).toString(36)}`;

class QuanLyLenh {
  constructor(cfg) {
    this.cfg = cfg;
    this.trangThai = new Map();
    this.von = cfg.VON;
    this.vonBanDau = cfg.VON;
    this.dungMoMoi = false;
    this.lyDoDung = null;
    this.lichSu = [];
    /* chế độ test dài: cho vốn âm, nhưng VẪN ghi lại lúc "cháy lý thuyết" */
    this.choAmVon = cfg.CHO_AM_VON === true && cfg.CHE_DO === 'giay';
    this.soLanChayLyThuyet = 0;
    this.dangChay = false;
    this.vonThapNhat = cfg.VON;
  }

  layTT(sym) {
    if (!this.trangThai.has(sym)) {
      this.trangThai.set(sym, {
        sym, trangThai: TT.SAN, huong: null, setup: null,
        demXacNhan: 0, huongDangDem: null,
        khoaHuongDen: 0, nguoiLanhDen: { short: 0, long: 0 },
        keHoach: null, lenh: null,
      });
    }
    return this.trangThai.get(sym);
  }

  /* --------------------------------------------------- kế toán danh mục */
  tongNotional() {
    let t = 0;
    for (const st of this.trangThai.values()) if (st.lenh) t += st.lenh.notional;
    return t;
  }
  soLenhMo() {
    let n = 0;
    for (const st of this.trangThai.values()) if (st.lenh) n++;
    return n;
  }
  vonHienTai() {
    let pnlMo = 0;
    for (const st of this.trangThai.values()) if (st.lenh) pnlMo += st.lenh.pnlUsd || 0;
    return this.von + pnlMo;
  }

  /**
   * ⭐ RỦI RO CÒN LẠI của một lệnh = SỐ TIỀN SẼ MẤT nếu giá chạm đường
   * cắt, tính cả phí. Không phải số tiền rủi ro lúc mới mở.
   *
   * ⭐ Vì sao dùng số này làm ngân sách: đường cắt chỉ siết vào, nên lệnh
   * đang thắng có rủi ro còn lại giảm dần, và lệnh đã KHOÁ HOÀ VỐN thì
   * gần bằng 0 — nó **trả lại chỗ** trong ngân sách cho lệnh mới. Đó là
   * lý do bỏ được trần đếm mà tổng rủi ro vẫn không đổi: 3 lệnh đang lãi
   * không chiếm chỗ như 3 lệnh vừa mở.
   *
   * ⛔ Đo bằng PnL TẠI ĐƯỜNG CẮT, không bằng khoảng cách tới đường cắt.
   * Hai cái khác nhau hẳn: khoảng cách luôn xấp xỉ K × notional dù lệnh
   * lãi bao nhiêu, nên nó KHÔNG bao giờ trả lại chỗ. Còn PnL tại đường
   * cắt thì khi đường cắt vượt qua điểm hoà vốn sẽ thành DƯƠNG — lệnh
   * không thể lỗ nữa nên nó chiếm 0 ngân sách. Đó mới là ý nghĩa đúng
   * của "rủi ro còn lại".
   */
  ruiRoConLai(L) {
    if (!L || !(L.soCoin > 0)) return 0;
    const pnlTaiCat = (L.huong === 'short'
      ? (L.giaVaoTB - L.giaCat) : (L.giaCat - L.giaVaoTB)) * L.soCoin
      + (L.fundingNhanUsd || 0) - (L.phiUsd || 0);
    return Math.max(0, -pnlTaiCat);
  }

  /** Tổng rủi ro còn lại của mọi lệnh đang mở. */
  ruiRoDangMo() {
    let t = 0;
    for (const st of this.trangThai.values()) if (st.lenh) t += this.ruiRoConLai(st.lenh);
    return t;
  }

  /** Rủi ro còn lại tách theo hướng — để nhìn thấy TẬP TRUNG TƯƠNG QUAN.
   *  ⚠ CHỈ ĐỂ CẢNH BÁO. 20 lệnh long trên 20 alt lúc BTC sập không phải
   *  20 lệnh, đó là 1 lệnh cỡ 20× — trần rủi ro tổng KHÔNG bắt được điều
   *  đó. Đo thật trên 54 lệnh đầu: 53 lệnh là LONG. */
  ruiRoTheoHuong() {
    const r = { long: 0, short: 0 };
    for (const st of this.trangThai.values()) {
      if (st.lenh) r[st.lenh.huong] = (r[st.lenh.huong] || 0) + this.ruiRoConLai(st.lenh);
    }
    return r;
  }

  /**
   * Cổng thanh lý. Ở chế độ test dài (`choAmVon`) cổng KHÔNG chặn nữa,
   * nhưng vẫn TÍNH và GHI LẠI — mất mốc "đáng lẽ đã cháy" là mất đúng
   * thông tin quan trọng nhất của cả đợt test.
   */
  congThanhLy(notionalThem) {
    const von = this.vonHienTai();
    const moi = this.tongNotional() + notionalThem;
    if (moi <= 0) return { qua: true, khoangChay: Infinity, can: 0 };
    const MMR = this.cfg.MMR_UOC_TINH;
    const khoangChay = (von * (1 - MMR)) / moi;
    /* Khoảng cách giá tương ứng mức cắt, để so cùng đơn vị.
       Trước 2026-08-23 phải quy $20 ra % giá; nay đường cắt VỐN ĐÃ tính
       bằng % giá nên lấy thẳng. Dùng TRẦN (trường hợp rộng nhất) để cổng
       này bi quan — cần nhiều khoảng chạy hơn thì mới cho mở lệnh. */
    const catTheoGia = this.cfg.TRAILING.KHOANG_TRAN;
    const can = this.cfg.DEM_THANH_LY_TOI_THIEU * Math.min(catTheoGia, this.cfg.CAN_CHAY_TRAN);
    const qua = this.choAmVon ? true : khoangChay >= can;
    return { qua, khoangChay, can, batBuocQua: this.choAmVon && khoangChay < can };
  }

  /** Ghi nhận khoảnh khắc tài khoản THẬT sẽ bị thanh lý (chế độ test). */
  _kiemChayLyThuyet() {
    const von = this.vonHienTai();
    if (von < this.vonThapNhat) this.vonThapNhat = von;
    if (von <= 0 && !this.dangChay) {
      this.dangChay = true;
      this.soLanChayLyThuyet++;
      canh(`⛔ CHAY LY THUYET lan ${this.soLanChayLyThuyet} — von = $${von.toFixed(2)}.`
        + ' Bot chay tiep de giu mau, nhung tai khoan THAT da het o day.');
      DB.ghiSuKien({ coin: '*', tu: 'VON', den: 'CHAY', lyDo: 'chay_ly_thuyet',
                     chiTiet: { lan: this.soLanChayLyThuyet, von: +von.toFixed(2) } });
    } else if (von > 0) this.dangChay = false;
  }

  /* =================================================================== */
  /*  MÔ PHỎNG KHỚP LỆNH — CỐ Ý BI QUAN                                 */
  /* =================================================================== */
  /**
   * Ba tầng bi quan chồng lên nhau:
   *   1. Đi qua sổ OKX thật, mỗi mức chỉ tính phần tiền ĐÁNG TIN
   *      (`m × wallTrust/100`) — giả định lệnh ảo BIẾN MẤT trước khi mình
   *      khớp tới. Dùng chính bộ lọc của bot để tự phạt.
   *   2. Trượt đo được nhân HE_SO_TRUOT.
   *   3. Sàn cứng TRUOT_TOI_THIEU dù sổ dày đến đâu.
   * Cộng phí PHI_MOI_LAN cho MỌI lần khớp, kể cả lệnh maker.
   */
  _khop(E, A, huong, notional, laVao, giaThamChieu) {
    const cfg = this.cfg;
    const banRa = (huong === 'short') === laVao;
    const rows = A ? (banRa ? A.bids : A.asks) : null;
    const phia = banRa ? 'b' : 'a';
    const goc = (rows && rows[0]) ? rows[0].p : giaThamChieu;

    let truotDo = 0;
    if (rows && rows.length) {
      const bookM = A.bids.reduce((s, r) => s + r.m, 0) + A.asks.reduce((s, r) => s + r.m, 0);
      let con = notional, tien = 0, coin = 0, cuoi = goc;
      for (const r of rows) {
        const tin = cfg.TRUOT_TIN_TUONG ? T.tinTuong(E.tuong, phia, r.p, bookM) / 100 : 1;
        const coSan = r.m * tin;
        if (coSan <= 0) continue;
        const dung = Math.min(con, coSan);
        tien += dung; coin += dung / r.p; cuoi = r.p; con -= dung;
        if (con <= 1e-9) break;
      }
      if (con > 1e-9 && coin > 0) {
        const p = cfg.PHAT_SO_CAN;
        const giaXau = banRa ? cuoi * (1 - p) : cuoi * (1 + p);
        tien += con; coin += con / giaXau;
      }
      if (coin > 0) truotDo = Math.abs((tien / coin) / goc - 1);
    }
    const truotPc = Math.max(truotDo * cfg.HE_SO_TRUOT, cfg.TRUOT_TOI_THIEU);
    const gia = banRa ? goc * (1 - truotPc) : goc * (1 + truotPc);
    return { gia, giaGoc: goc, truotPc, truotUsd: notional * truotPc, phiUsd: notional * cfg.PHI_MOI_LAN };
  }

  /**
   * Khớp KHI KHÔNG CÓ SỔ. Không đi qua sổ được thì không đo được trượt,
   * nên phạt cứng `TRUOT_DONG_MU`. Đóng lệnh lúc sổ chết gần như chắc
   * chắn khớp xấu — giả định 0% trượt ở đây là tự lừa mình.
   * Hướng xấu đi giống `_khop`: đóng LONG là BÁN (giá thấp hơn), đóng
   * SHORT là MUA (giá cao hơn).
   */
  _khopMu(huong, soCoin, gia) {
    const cfg = this.cfg;
    const banRa = huong !== 'short';
    const truotPc = cfg.MAT_SO.TRUOT_DONG_MU;
    const notional = soCoin * gia;
    return {
      gia: banRa ? gia * (1 - truotPc) : gia * (1 + truotPc),
      giaGoc: gia, truotPc,
      truotUsd: notional * truotPc,
      phiUsd: notional * cfg.PHI_MOI_LAN,
    };
  }

  /* ------------------------------------------------------- giá cắt lỗ */
  /** Giá mà tại đó lỗ ròng = `loUsd`, với vị thế hiện có.
   *  Nay chỉ còn phục vụ VAN CUỐI `LO_TRAN_USD`, không còn là cơ chế cắt. */
  _giaTaiMucLo(huong, giaVaoTB, notional, loUsd) {
    const d = loUsd / notional;
    return huong === 'short' ? giaVaoTB * (1 + d) : giaVaoTB * (1 - d);
  }

  /* --------------------------------------------------- đường trailing */
  /**
   * Khoảng cách đường cắt tính bằng % giá, neo vào biến động của CHÍNH
   * coin đó. Coin êm thì hẹp, coin loạn thì rộng — một con số cố định
   * không thể đúng cho cả hai.
   * `bienDo24` thiếu (chưa có ticker) → lùi về SÀN, phía an toàn.
   */
  _khoangTrailing(bienDo24) {
    const K = this.cfg.TRAILING;
    const tho = (bienDo24 > 0 ? bienDo24 : 0) * K.HE_SO_BIEN_DO;
    return Math.min(Math.max(tho, K.KHOANG_SAN), K.KHOANG_TRAN);
  }

  /** Giá mà tại đó đóng lệnh là hoà vốn — đã tính phí CẢ HAI chiều. */
  _giaHoaVon(huong, giaVaoTB) {
    const cfg = this.cfg;
    const d = cfg.TRAILING.DEM_HOA_VON * 2 * cfg.PHI_MOI_LAN;
    return huong === 'short' ? giaVaoTB * (1 - d) : giaVaoTB * (1 + d);
  }

  /**
   * ⛔ CỬA DUY NHẤT ĐƯỢC PHÉP ĐỔI `L.giaCat`. Chỉ nhận giá trị SIẾT VÀO,
   * không bao giờ nới ra. Đây là chỗ thực thi bất biến "đường cắt không
   * lùi" — gán thẳng `L.giaCat = ...` ở nơi khác là phá bất biến.
   */
  _dayGiaCat(L, giaMoi) {
    if (!(giaMoi > 0)) return;
    if (L.giaCat === null || L.giaCat === undefined) { L.giaCat = giaMoi; return; }
    L.giaCat = L.huong === 'short' ? Math.min(L.giaCat, giaMoi) : Math.max(L.giaCat, giaMoi);
  }

  /**
   * Cập nhật ĐỈNH GIÁ → kéo đường cắt → khoá hoà vốn. Trả về `true` nếu
   * giá đã chạm đường cắt.
   *
   * ⛔ DÙNG CHUNG cho nhánh CÓ SỔ (`_xuLyLenhMo`) và nhánh MÙ
   * (`canhLenhMu`). Đừng bao giờ chép logic này ra thành hai bản: hai
   * bản sẽ lệch nhau, và bất biến "đường cắt không bao giờ lùi" sẽ thủng
   * ở đúng cái nhánh ít được để mắt tới.
   *
   * Ba bước phải đúng thứ tự:
   *   (a) cập nhật đỉnh giá đã đạt
   *   (b) kéo đường cắt theo đỉnh — `_dayGiaCat` chỉ cho siết vào
   *   (c) đỉnh lãi đủ sâu → KHOÁ HOÀ VỐN, từ đó lệnh không thể lỗ
   * Làm ngược thứ tự thì đường cắt của nhịp này dùng đỉnh của nhịp
   * trước — lệch đúng một nhịp.
   */
  _capNhatDuongCat(st, gia, x) {
    const L = st.lenh, K = L.khoangTrailing;
    if (L.huong === 'short' ? gia < L.giaDinh : gia > L.giaDinh) L.giaDinh = gia;   // (a)
    this._dayGiaCat(L, L.huong === 'short'                                          // (b)
      ? L.giaDinh * (1 + K) : L.giaDinh * (1 - K));

    if (!L.daKhoaVon && x >= this.cfg.TRAILING.NGUONG_KHOA_VON * K) {               // (c)
      L.daKhoaVon = true;
      this._dayGiaCat(L, this._giaHoaVon(L.huong, L.giaVaoTB));
      DB.ghiSuKien({ coin: st.sym, tu: st.trangThai, den: st.trangThai,
                     lyDo: 'khoa_hoa_von',
                     chiTiet: { dinh: +(x * 100).toFixed(3), giaCat: L.giaCat } });
    }
    return L.huong === 'short' ? gia >= L.giaCat : gia <= L.giaCat;
  }

  /**
   * ⭐ CANH LỆNH ĐANG MỞ KHI KHÔNG CÓ SỔ LỆNH — thêm 2026-08-23.
   *
   * Sổ chết thì `bot.js` bỏ qua coin, và trước đây bỏ qua luôn cả lệnh
   * đang mở: không kiểm đường cắt, không kiểm van cuối. Một coin đi
   * ngược trong lúc mất sổ có thể chạy bao xa cũng không ai đóng.
   *
   * ⛔ Sổ hỏng được phép chặn MỞ lệnh mới. KHÔNG được chặn ĐÓNG lệnh.
   *
   * Trả về: `null` không có lệnh · `'khong_co_gia'` mù hoàn toàn ·
   *         `'canh'` đang canh bình thường · `'dong'` vừa đóng lệnh.
   */
  canhLenhMu(sym, gia) {
    const st = this.trangThai.get(sym);
    if (!st || !st.lenh) return null;
    const cfg = this.cfg, L = st.lenh;

    /* Không có cả giá dự phòng = mù hoàn toàn. Không đoán, không dùng
       giá cũ — chỉ báo lên để tầng trên kêu. Đây là trạng thái NGUY HIỂM
       nhất và phải nhìn thấy được, không được im lặng. */
    if (!(gia > 0)) return 'khong_co_gia';

    L.pnlUsd = L.pnlThucHien + (L.huong === 'short'
      ? L.soCoin * (L.giaVaoTB - gia) : L.soCoin * (gia - L.giaVaoTB))
      + L.fundingNhanUsd - L.phiUsd;
    const x = L.huong === 'short'
      ? (L.giaVaoTB - gia) / L.giaVaoTB : (gia - L.giaVaoTB) / L.giaVaoTB;
    L.pnlPcGia = x;
    L.pnlPcTk = L.pnlUsd / this.vonBanDau;
    this._kiemChayLyThuyet();

    /* ⛔ KHÔNG chạy chốt lời ở đây: cò đảo chiều cần sổ lệnh mới tính
       được, mà không có sổ thì `P` không tồn tại. Chỉ hai đường ra bảo
       vệ vốn mới được chạy mù. */
    if (this._capNhatDuongCat(st, gia, x)) {
      this._dong(st, gia, 'trailing_mu', null, null);
      return 'dong';
    }
    if (-L.pnlUsd >= cfg.LO_TRAN_USD) {
      this._dong(st, gia, 'lo_tran_mu', null, null);
      return 'dong';
    }
    return 'canh';
  }

  _dungKeHoach(sym, huong, setup, gia, E, A, tickSz, bienDo24) {
    const cfg = this.cfg;
    const notional = cfg.KY_QUY_LAN_1 * cfg.DON_BAY;
    const K = this._khoangTrailing(bienDo24);
    return {
      luc: Date.now(), giaThamChieu: gia,
      giaVao: gia,                    // ⛔ GIÁ HIỆN TẠI, không phải tường
      khoangTrailing: K,
      giaCat: huong === 'short' ? gia * (1 + K) : gia * (1 - K),
      /* Ngưỡng phá băng kế hoạch: giá đã đi ngược quá cả VAN CUỐI thì
         kế hoạch này vô nghĩa, quay về SẴN. */
      giaCatTran: this._giaTaiMucLo(huong, gia, notional, cfg.LO_TRAN_USD),
      kyQuy: cfg.KY_QUY_LAN_1, notional,
      loThietKeUsd: K * notional,
      dongBang: true, lanCapNhat: 0, capNhatLuc: null,
    };
  }

  /* ================================================================== */
  /*  NHỊP CHÍNH — mỗi 2 giây cho mỗi coin                              */
  /* ================================================================== */
  capNhat(sym, E, A, P, cong, boiCanh) {
    const st = this.layTT(sym);
    const cfg = this.cfg;
    st._E = E; st._A = A;

    if (DA_MO(st.trangThai) && st.lenh) return this._xuLyLenhMo(st, P, A, E, boiCanh);

    const coSHORT = P.coSHORT, coLONG = P.coLONG;
    const huongCo = coSHORT ? 'short' : (coLONG ? 'long' : null);
    if (huongCo && huongCo === st.huongDangDem) st.demXacNhan++;
    else if (huongCo) { st.huongDangDem = huongCo; st.demXacNhan = 1; }
    else { st.demXacNhan = 0; st.huongDangDem = null; }

    /* ---- kế hoạch ĐÓNG BĂNG: chỉ 3 đường phá băng ---- */
    if (st.trangThai === TT.CHO_VAO && st.keHoach) {
      const kh = st.keHoach, gia = P.mid;
      const vuot = st.huong === 'short' ? gia >= kh.giaCatTran : gia <= kh.giaCatTran;
      if (vuot) {
        DB.ghiSuKien({ coin: sym, tu: TT.CHO_VAO, den: TT.SAN, lyDo: 'gia_vuot_diem_cat' });
        st.nguoiLanhDen[st.huong] = Date.now() + cfg.NGUOI_LANH_PHUT * 60e3;
        st.trangThai = TT.SAN; st.keHoach = null; st.huong = null;
        return;
      }
      if (Math.abs(gia / kh.giaThamChieu - 1) > cfg.TROI_TOI_DA) {
        const moi = this._dungKeHoach(sym, st.huong, st.setup, gia, E, A, boiCanh.tickSz, boiCanh.bienDo24);
        moi.lanCapNhat = kh.lanCapNhat + 1; moi.capNhatLuc = Date.now(); moi.giaCu = kh.giaVao;
        st.keHoach = moi;
        DB.ghiSuKien({ coin: sym, tu: TT.CHO_VAO, den: TT.CHO_VAO, lyDo: 'troi_gia_tinh_lai',
                       chiTiet: { cu: kh.giaVao, moi: gia } });
      }
      if (huongCo === st.huong && st.demXacNhan >= cfg.XAC_NHAN_TICK && cong.cho) {
        this._moLenh(st, P, A, E, boiCanh);
      }
      return;   /* ⛔ không có đường (d): không hết hạn theo giờ, không huỷ vì |S| tụt */
    }

    /* ---- SAN → CHO_VAO: việc của CỔNG, không phải của cò ---- */
    if (st.trangThai !== TT.SAN) return;
    if (!cong.cho || !cong.huong) return;
    const huong = cong.huong;
    if (Date.now() < (st.nguoiLanhDen[huong] || 0)) return;
    if (Date.now() < st.khoaHuongDen && st.huongCuoi && st.huongCuoi !== huong) {
      if (Math.abs(P.S) < cfg.NGUONG_DAO) return;
    }
    if ((P.S >= 0 ? 'long' : 'short') !== huong) return;
    if (Math.abs(P.S) < cfg.NGUONG_VAO) return;

    st.huong = huong; st.setup = cong.setup; st.trangThai = TT.CHO_VAO;
    st.keHoach = this._dungKeHoach(sym, huong, cong.setup, P.mid, E, A, boiCanh.tickSz, boiCanh.bienDo24);
    st.huongCuoi = huong;
    st.khoaHuongDen = Date.now() + cfg.KHOA_HUONG_PHUT * 60e3;
    DB.ghiSuKien({ coin: sym, tu: TT.SAN, den: TT.CHO_VAO, lyDo: cong.setup,
                   chiTiet: { S: Math.round(P.S) } });
    ghi(`[${sym}] CHO_VAO ${huong.toUpperCase()} ${cong.setup} · S=${P.S.toFixed(0)}`);
  }

  /* ------------------------------------------------------------ mở lệnh */
  _moLenh(st, P, A, E, boiCanh) {
    const cfg = this.cfg;
    const kyQuy = cfg.KY_QUY_LAN_1;
    const notional = kyQuy * cfg.DON_BAY;
    const K = this._khoangTrailing(boiCanh.bienDo24);

    /* ⛔ MỌI lối chặn ở đây PHẢI ghi sự kiện. Trước 2026-08-23 hai lối
       đầu là `return` trần — không log, không sự kiện, không dấu vết.
       Hậu quả đo được: 37/71 lần vào SẴN_SÀNG không bao giờ mở được
       lệnh mà DB không giải thích nổi vì sao. Chặn im lặng là mù. */
    const chan = (lyDo, chiTiet) => {
      DB.ghiSuKien({ coin: st.sym, tu: TT.CHO_VAO, den: TT.CHO_VAO, lyDo, chiTiet });
      return undefined;
    };

    if (this.dungMoMoi) return chan('chan_ngat_mach', { lyDoDung: this.lyDoDung });

    /* Trần ĐẾM đã bỏ; giữ lại nhánh này để ai đặt lại số vẫn có hiệu lực. */
    if (cfg.SO_LENH_MO_TOI_DA != null && this.soLenhMo() >= cfg.SO_LENH_MO_TOI_DA)
      return chan('chan_tran_dem_lenh', { dangMo: this.soLenhMo() });

    /* ⭐ TRẦN RỦI RO — cổng thay cho trần đếm.
       Cộng rủi ro CÒN LẠI của các lệnh đang mở, không phải rủi ro lúc
       mở chúng: lệnh đã khoá hoà vốn gần như không còn chiếm chỗ. */
    const ruiRoMoi = K * notional;
    const dangCo = this.ruiRoDangMo();
    const tran = cfg.TRAN_RUI_RO.TONG_PC * this.vonBanDau;
    if (dangCo + ruiRoMoi > tran)
      return chan('chan_tran_rui_ro', {
        dangCo: +dangCo.toFixed(2), them: +ruiRoMoi.toFixed(2), tran: +tran.toFixed(2),
        soLenhMo: this.soLenhMo(),
      });

    const ctl = this.congThanhLy(notional);
    if (!ctl.qua) return chan('chan_cong_thanh_ly', { khoangChay: +ctl.khoangChay.toFixed(3) });
    if (ctl.batBuocQua) {
      DB.ghiSuKien({ coin: st.sym, tu: TT.CHO_VAO, den: TT.THAM_DO, lyDo: 'vuot_cong_do_test',
                     chiTiet: { khoangChay: +ctl.khoangChay.toFixed(3), can: +ctl.can.toFixed(3) } });
    }

    /* ⛔ giá vào = GIÁ THỊ TRƯỜNG. Lệnh chờ ở tường sinh thiên lệch sống
       sót — chỉ khớp khi giá đã đi ngược lại phía mình. */
    const kq = this._khop(E, A, st.huong, notional, true, P.mid);
    const gia = kq.gia, now = Date.now(), G = gioVN(now);

    /* ⭐ NHÃN `trong_khung` — tính TẠI LÚC MỞ LỆNH, từ khung gốc của
       chính setup này. Bản cũ ghi cứng `true` cho mọi lệnh, làm hỏng
       đúng phép thử mà cột này sinh ra để phục vụ: nhóm "ngoài khung"
       luôn rỗng nên `npm run bao-cao` không bao giờ so được hai nhóm.
       Nhãn này KHÔNG chặn gì — bot chạy 24/24. */
    const trongKhung = trongKhungGoc(cfg, st.setup, G.tongPhut);

    /* `K` (khoảng trailing) tính ở đầu hàm để cổng TRẦN RỦI RO dùng được.
       ⛔ CHỐT TẠI LÚC VÀO LỆNH và giữ nguyên suốt đời lệnh: biên độ 24h
       nhích liên tục, để nó co giãn thì đường cắt sẽ NỚI RA khi thị
       trường loạn lên — đúng lúc không được phép nới. */
    const L = {
      uid: uid(st.sym), sym: st.sym, huong: st.huong, setup: st.setup,
      tsMo: now, gioVN: G.gio, trongKhung,
      lanVao: [{ ts: now, gia, kyQuy, notional, loai: 'vao' }],
      soCoin: notional / gia, notional, kyQuy, soLanDCA: 0,
      giaVao1: gia, giaVaoTB: gia,
      /* trailing: đỉnh giá đã đạt + đường cắt bám theo nó */
      khoangTrailing: K,
      loThietKeUsd: K * notional,     // mẫu số của R — rủi ro tại lúc vào
      giaDinh: gia,
      giaCat: st.huong === 'short' ? gia * (1 + K) : gia * (1 - K),
      daKhoaVon: false,
      dinhLai: 0, baoDong: false, hoiLai: 0, nguongHoi: 0,
      pnlUsd: 0, pnlThucHien: 0, pnlPcGia: 0, fundingNhanUsd: 0,
      phiUsd: kq.phiUsd, truotUsd: kq.truotUsd,
      soLanChot: 0, canhBao: [], raoChan: null,
    };
    L.id = DB.moLenh({
      uid: L.uid, tinHieuId: st.tinHieuId || null, tsMo: now, coin: st.sym,
      huong: L.huong, setup: L.setup, trangThai: TT.THAM_DO, trongKhung, gioVN: G.gio,
      giaVaoTB: gia, giaCat: L.giaCat, giaVao1: gia,
      kyQuyUsd: kyQuy, giaTriLenhUsd: notional, donBay: cfg.DON_BAY,
      soLanVao: 1, baseline: null, laGiay: cfg.CHE_DO === 'giay', verTrongSo: boiCanh.verTrongSo,
      khoangTrailing: K, loThietKeUsd: L.loThietKeUsd,
    });
    DB.ghiLanVao({ lenhId: L.id, ts: now, loai: 'vao', gia, sizeUsd: notional, kyQuyUsd: kyQuy,
                   lyDo: st.setup, giaGoc: kq.giaGoc, phiUsd: kq.phiUsd,
                   truotUsd: kq.truotUsd, truotPc: kq.truotPc });
    st.lenh = L; st.trangThai = TT.THAM_DO;
    ghi(`[${st.sym}] ✅ VÀO ${L.huong.toUpperCase()} @ ${gia} · $${kyQuy}×${cfg.DON_BAY}=$${notional}`
      + ` · trượt ${(kq.truotPc * 100).toFixed(3)}% · cắt @ ${L.giaCat}`);
  }

  /* =================================================================== */
  /*  LỆNH ĐÃ MỞ — ĐÚNG BA ĐƯỜNG RA                                     */
  /* =================================================================== */
  _xuLyLenhMo(st, P, A, E, boiCanh) {
    const cfg = this.cfg;
    const L = st.lenh, gia = P.mid;

    L.pnlUsd = L.pnlThucHien + (L.huong === 'short'
      ? L.soCoin * (L.giaVaoTB - gia) : L.soCoin * (gia - L.giaVaoTB))
      + L.fundingNhanUsd - L.phiUsd;
    const x = L.huong === 'short'
      ? (L.giaVaoTB - gia) / L.giaVaoTB : (gia - L.giaVaoTB) / L.giaVaoTB;
    L.pnlPcGia = x;
    L.pnlPcTk = L.pnlUsd / this.vonBanDau;
    this._kiemChayLyThuyet();

    /* Rào chắn — nay CHỈ còn phục vụ DCA và cảnh báo ⚠ (đường cắt không
       hỏi tới nó nữa).
       ⛔ Mốc đo vẫn là VAN CUỐI, KHÔNG phải đường trailing. Cố ý:
       `RAO_CHAN_TOI_THIEU = 45` phút được hiệu chỉnh cho một mốc cách giá
       ~40%. Đường trailing chỉ cách 3–8% nên đo tới đó thì số phút tụt
       hơn chục lần và ngưỡng 45 thành bất khả thi — DCA sẽ chết âm thầm
       y như cửa sổ đô. Van cuối ($12 trên $60 ≈ 20% giá) là mốc gần
       nghĩa cũ nhất còn lại.
       ⚠ Dù vậy khoảng cách vẫn co lại một nửa so với $25 cũ, nên DCA sẽ
       nổ THƯA HƠN. Đây là thay đổi hành vi đã biết, chưa hiệu chỉnh lại
       bằng dữ liệu — cần đo `dca_co_can_cu` sau vài trăm lệnh.          */
    const tocDo = (L.huong === 'short' ? P.mua30 : P.ban30) / cfg.CUA_SO_DONG_TIEN_PHUT;
    L.raoChan = T.raoChan(E.tuong, A, L.huong,
      this._giaTaiMucLo(L.huong, L.giaVaoTB, L.notional, cfg.LO_TRAN_USD), tocDo);

    /* ================= ĐƯỜNG RA 1: TRAILING BÁM ĐỈNH ================= */
    if (this._capNhatDuongCat(st, gia, x))
      return this._dong(st, gia, L.daKhoaVon ? 'trailing_lai' : 'trailing', E, A);

    /* VAN CUỐI — chỉ để chặn giá NHẢY QUA đường cắt (gap). Trong vận hành
       bình thường nó không bao giờ nổ: trailing tối đa 8% × $60 = $4,80. */
    if (-L.pnlUsd >= cfg.LO_TRAN_USD) return this._dong(st, gia, 'lo_tran', E, A);

    /* ---------- ĐƯỜNG RA 2: chốt lời ---------- */
    if (this._xuLyChotLoi(st, gia, P, A, E) === 'dong') return;

    /* ---------- KHÔNG PHẢI ĐƯỜNG RA: DCA ---------- */
    this._xuLyDCA(st, P, A, E, boiCanh);

    /* ---------- CẢNH BÁO — CHỈ VẼ ---------- */
    L.canhBao = this._canhBao(st, P);

    DB.capNhatLenh(L.id, {
      trangThai: st.trangThai, giaVaoTB: L.giaVaoTB, giaCat: L.giaCat,
      kyQuyUsd: L.kyQuy, giaTriLenhUsd: L.notional,
      soLanVao: L.lanVao.length, soLanChot: L.soLanChot,
      pnlUsd: L.pnlUsd, pnlPcTk: L.pnlPcTk, pnlPcGia: L.pnlPcGia,
      fundingNhanUsd: L.fundingNhanUsd, canhBao: L.canhBao,
      phiUsd: L.phiUsd, truotUsd: L.truotUsd,
    });
  }

  /* ------------------------------------------------------- CHỐT LỜI
     KHÔNG có mốc cố định. Ba cơ chế:
       1. lãi vượt đỉnh cũ  → đỉnh mới, GỠ báo động, hồi lại về 0
       2. cò đảo chiều nổ khi ĐANG LÃI → GÀI báo động (nhớ, kể cả sau đó
          cò tắt — nếu không thì "cò nổ ở +10% rồi tắt, giá bò về +3%"
          sẽ không ai đóng lệnh)
       3. đã gài báo động VÀ hồi lại ≥ ngưỡng VÀ đỉnh đã vượt SÀN PHÍ
          → CHỐT

     ⭐ SÀN PHÍ (`SAN_CHOT_LOI_PC`) — thêm 2026-08-23.
     `x` đo giá GỘP, chưa trừ phí, còn PnL thực thì đã trừ. Chốt lời giữ
     lại chưa tới nửa đỉnh, nên đỉnh nhỏ hơn 2× phí khứ hồi thì đóng ở
     đây CHẮC CHẮN ra số âm — toán học, không phải xui. Đo trên 54 lệnh
     đầu: 17 lệnh đóng bằng `chot_loi` mà PnL âm, 7 lệnh có đỉnh dưới
     0,24%. Dưới sàn thì cứ để lệnh chạy — đường trailing vẫn đang canh,
     nên không có chuyện "bỏ mặc lệnh không ai trông".                   */
  _xuLyChotLoi(st, gia, P, A, E) {
    const cfg = this.cfg;
    const L = st.lenh;
    const x = L.pnlPcGia;

    if (x > L.dinhLai) { L.dinhLai = x; L.baoDong = false; }        // (1)

    const coDao = L.huong === 'short' ? P.coCHOT_short : P.coCHOT_long;
    if (coDao && x > 0) L.baoDong = true;                            // (2)

    if (L.dinhLai <= 0) { L.hoiLai = 0; L.nguongHoi = 0; return null; }

    const dinhDiem = L.dinhLai * 100;
    L.hoiLai = (L.dinhLai - x) * 100;
    /* max(...) chặn bị đá ra bởi nhiễu vặt.
       min(..., TRAN) chặn lệnh thắng nhỏ trôi về gần 0. */
    L.nguongHoi = Math.min(
      Math.max(cfg.HOI_LAI_TOI_THIEU, cfg.HOI_LAI_TY_LE * dinhDiem),
      cfg.HOI_LAI_TRAN * dinhDiem);

    const quaSanPhi = L.dinhLai >= cfg.SAN_CHOT_LOI_PC;
    if (L.baoDong && x > 0 && quaSanPhi && L.hoiLai >= L.nguongHoi) { // (3)
      return this._dong(st, gia, 'chot_loi', E, A);
    }
    if (x >= cfg.NGUONG_LAI_2) st.trangThai = TT.LAI_2;
    else if (x > 0 && BAC[st.trangThai] < BAC.LAI_1) st.trangThai = TT.LAI_1;
    return null;
  }

  /* ----------------------------------------------------------- DCA
     Hàng rào (được phép) KHÁC căn cứ (lý do). Số tiền lỗ KHÔNG BAO GIỜ
     tự kích hoạt DCA — nó chỉ nói "trong khoảng này thì được xét".      */
  _xuLyDCA(st, P, A, E, boiCanh) {
    const cfg = this.cfg;
    const L = st.lenh;

    /* --- hàng rào --- */
    if (L.soLanDCA >= cfg.SO_LAN_DCA_TOI_DA) return;
    if (this.dungMoMoi) return;
    /* Cửa sổ tính theo TỶ LỆ trên rủi ro thiết kế của chính lệnh này —
       xem chú thích `CUA_SO_DCA_TY_LE` trong config.js. Đo bằng đô cứng
       thì DCA chết âm thầm khi đường cắt hẹp lại. */
    const lo = -L.pnlUsd;
    const cuaSo = cfg.CUA_SO_DCA_TY_LE.map(t => t * L.loThietKeUsd);
    if (!(lo >= cuaSo[0] && lo <= cuaSo[1])) return;

    /* --- căn cứ 1: RÀO CHẮN — khả năng chạm điểm cắt phải THẤP --- */
    if (!(L.raoChan >= cfg.RAO_CHAN_TOI_THIEU)) return;

    /* --- căn cứ 2: đà đi ngược phải ĐUỐI --- */
    const tocDo5 = (L.huong === 'short' ? P.mua5 : P.ban5) / cfg.CUA_SO_DONG_TIEN_NGAN_PHUT;
    const tocDo30 = (L.huong === 'short' ? P.mua30 : P.ban30) / cfg.CUA_SO_DONG_TIEN_PHUT;
    const chamLai = tocDo30 > 0 && tocDo5 < tocDo30 * cfg.DCA.CHAM_LAI_TY_LE;
    const oiDung = P.dOi25 !== null && P.dOi25 < cfg.DCA.OI_DUNG_NGUONG;
    if (!(boiCanh.nenTuChoi || chamLai || oiDung)) return;

    /* --- căn cứ 3: KHÔNG phải squeeze đang chạy ---
       giá đi ngược KHỎE + OI tăng đều + không có nến từ chối = tiền mới
       đang đổ vào thật. DCA vào đó là nhân đôi lệnh sai. */
    if (P.dOi25 !== null && P.dOi25 > cfg.DCA.SQUEEZE_OI_NGUONG && !boiCanh.nenTuChoi) return;

    const ctl = this.congThanhLy(cfg.KY_QUY_DCA * cfg.DON_BAY);
    if (!ctl.qua) return;

    const notionalThem = cfg.KY_QUY_DCA * cfg.DON_BAY;
    const kq = this._khop(E, A, L.huong, notionalThem, true, P.mid);
    const coinThem = notionalThem / kq.gia;
    L.notional += notionalThem;
    L.soCoin += coinThem;
    L.giaVaoTB = L.notional / L.soCoin;
    L.kyQuy += cfg.KY_QUY_DCA;
    L.phiUsd += kq.phiUsd;
    L.truotUsd += kq.truotUsd;
    L.soLanDCA++;
    L.lanVao.push({ ts: Date.now(), gia: kq.gia, kyQuy: cfg.KY_QUY_DCA, notional: notionalThem, loai: 'dca' });
    /* ⛔ Đường cắt tính lại từ giá vào TRUNG BÌNH mới, nhưng vẫn phải đi
       qua `_dayGiaCat` — DCA KHÔNG được phép nới đường cắt ra xa. Vì giá
       vào TB đã dịch về phía có lợi, mốc mới thường tự siết vào; nếu
       không thì giữ nguyên mốc cũ. Rủi ro thiết kế tăng theo notional,
       nên `loThietKeUsd` (mẫu số của R) phải tính lại cùng lúc.        */
    this._dayGiaCat(L, L.huong === 'short'
      ? L.giaVaoTB * (1 + L.khoangTrailing) : L.giaVaoTB * (1 - L.khoangTrailing));
    L.loThietKeUsd = L.khoangTrailing * L.notional;
    if (L.daKhoaVon) this._dayGiaCat(L, this._giaHoaVon(L.huong, L.giaVaoTB));
    st.trangThai = TT.DCA;

    DB.ghiLanVao({ lenhId: L.id, ts: Date.now(), loai: 'dca', gia: kq.gia, sizeUsd: notionalThem,
                   kyQuyUsd: cfg.KY_QUY_DCA, lyDo: `raoChan=${Math.round(L.raoChan)}ph`,
                   giaGoc: kq.giaGoc, phiUsd: kq.phiUsd, truotUsd: kq.truotUsd, truotPc: kq.truotPc });
    DB.ghiSuKien({ coin: st.sym, tu: TT.THAM_DO, den: TT.DCA, lyDo: 'dca_co_can_cu',
                   chiTiet: { lo: +lo.toFixed(2), raoChan: Math.round(L.raoChan),
                              nenTuChoi: !!boiCanh.nenTuChoi, chamLai, oiDung } });
    ghi(`[${st.sym}] ➕ DCA @ ${kq.gia} · lỗ $${lo.toFixed(2)} · rào chắn ${Math.round(L.raoChan)} phút`
      + ` · TB ${L.giaVaoTB} · cắt @ ${L.giaCat}`);
  }

  /** ⚠ CHỈ VẼ. Không hàm nào ở đây được đóng lệnh.
   *  ⛔ ĐÃ XOÁ cảnh báo 'HẾT KHUNG'. Bot chạy 24/24 nên không có "hết
   *  khung" để mà cảnh báo — giữ lại thì nó kêu cho mọi lệnh short đang
   *  lỗ sau 15:00 mỗi ngày, thuần nhiễu. */
  _canhBao(st, P) {
    const L = st.lenh, c = [];
    if (P.funding8h !== null) {
      if (L.huong === 'short' && P.funding8h < 0) c.push('FUNDING ĐẢO');
      if (L.huong === 'long' && P.funding8h > this.cfg.CANH_BAO.FUNDING_LONG_CAO) c.push('FUNDING ĐẢO');
    }
    if (L.raoChan !== null && L.raoChan < this.cfg.CANH_BAO.RAO_CHAN_MONG && L.pnlUsd < 0)
      c.push('RÀO CHẮN MỎNG');
    if (L.baoDong) c.push(`BÁO ĐỘNG · hồi ${L.hoiLai.toFixed(1)}/${L.nguongHoi.toFixed(1)}`);
    const ctl = this.congThanhLy(0);
    if (ctl.khoangChay < this.cfg.CANH_BAO.GAN_CHAY) c.push('GẦN ĐIỂM CHÁY');
    return c;
  }

  _dong(st, gia, lyDo, E, A) {
    const cfg = this.cfg;
    const L = st.lenh;
    /* Không có sổ → khớp MÙ, phạt trượt hẳn một khoản. Bản cũ ở nhánh
       này để `truotPc: 0` — đóng mù mà giả định khớp hoàn hảo là tự lừa
       mình đúng vào lúc thị trường tệ nhất. */
    const kq = (E && L.soCoin > 0)
      ? this._khop(E, A, L.huong, L.soCoin * gia, false, gia)
      : this._khopMu(L.huong, L.soCoin, gia);
    const giaDong = kq.gia;
    L.pnlThucHien += L.huong === 'short'
      ? L.soCoin * (L.giaVaoTB - giaDong) : L.soCoin * (giaDong - L.giaVaoTB);
    L.phiUsd += kq.phiUsd; L.truotUsd += kq.truotUsd;

    /* PnL RÒNG: đã trừ phí; trượt đã nằm sẵn trong giá khớp */
    const pnl = L.pnlThucHien + L.fundingNhanUsd - L.phiUsd;
    /* R = PnL ÷ RỦI RO THIẾT KẾ CỦA CHÍNH LỆNH NÀY (`khoangTrailing` ×
       notional lúc vào). Trước 2026-08-23 mẫu số là hằng số $20 cho mọi
       lệnh; nay đường cắt rộng hẹp theo từng coin nên mẫu số phải đi
       theo, nếu không R của coin êm và coin loạn không so được với nhau.
       Bất biến GIỮ NGUYÊN: lệnh chạm đường cắt sạch vẫn ra ≈ −1,00R.
       Thấy −1,5R là giá đã nhảy qua đường cắt (gap) hoặc trượt quá lớn. */
    const R = pnl / (L.loThietKeUsd || cfg.LO_TRAN_USD);

    this.von += pnl;
    DB.dongLenh(L.id, {
      tsDong: Date.now(), giaDong, lyDoDong: lyDo,
      pnlUsd: pnl, pnlPcTk: pnl / this.vonBanDau, pnlPcGia: L.pnlPcGia,
      rMultiple: R, fundingNhanUsd: L.fundingNhanUsd, soLanChot: L.soLanChot,
      phiUsd: L.phiUsd, truotUsd: L.truotUsd,
      phiVaTruotPcTk: (L.phiUsd + L.truotUsd) / this.vonBanDau,
      dinhLaiPc: L.dinhLai, hoiLaiDiem: L.hoiLai, soLanDCA: L.soLanDCA,
      phutOm: Math.round((Date.now() - L.tsMo) / 60000),
    });
    DB.ghiLanVao({ lenhId: L.id, ts: Date.now(), loai: 'dong', gia: giaDong,
                   sizeUsd: L.soCoin * giaDong, kyQuyUsd: null, lyDo,
                   giaGoc: kq.giaGoc, phiUsd: kq.phiUsd, truotUsd: kq.truotUsd, truotPc: kq.truotPc });
    DB.ghiSuKien({ coin: st.sym, tu: st.trangThai, den: 'DONG', lyDo,
                   chiTiet: { gia: giaDong, pnl: +pnl.toFixed(3), dinhLai: +(L.dinhLai * 100).toFixed(1),
                              hoi: +L.hoiLai.toFixed(1), dca: L.soLanDCA } });
    ghi(`[${st.sym}] 🏁 ĐÓNG ${lyDo} @ ${giaDong} · PnL RÒNG $${pnl.toFixed(2)} (${R.toFixed(2)}R)`
      + ` · đỉnh lãi ${(L.dinhLai * 100).toFixed(1)}% · hồi ${L.hoiLai.toFixed(1)}`
      + ` · phí $${L.phiUsd.toFixed(2)} · vốn $${this.von.toFixed(2)}`);

    this.lichSu.unshift({
      sym: st.sym, huong: L.huong, setup: L.setup, lyDo,
      giaVao: L.giaVao1, giaDong, pnl, R, tsMo: L.tsMo, tsDong: Date.now(),
      phi: L.phiUsd, truot: L.truotUsd, funding: L.fundingNhanUsd,
      dinhLai: L.dinhLai, hoiLai: L.hoiLai, soLanDCA: L.soLanDCA,
      phutOm: Math.round((Date.now() - L.tsMo) / 60000),
    });
    if (this.lichSu.length > cfg.HA_TANG.LICH_SU_RAM) this.lichSu.pop();

    st.lenh = null; st.trangThai = TT.SAN; st.keHoach = null;
    st.nguoiLanhDen[L.huong] = Date.now() + cfg.NGUOI_LANH_PHUT * 60e3;
    st.huong = null;
    this._kiemNgatMach();
    this._kiemChayLyThuyet();
    return 'dong';
  }

  /** DỪNG KHẨN — đường ra thứ ba, chỉ người mới bấm được. */
  dungKhan(giaTheoSym) {
    for (const st of this.trangThai.values()) {
      if (st.lenh) this._dong(st, giaTheoSym[st.sym] || st.lenh.giaVaoTB, 'dung_khan', st._E, st._A);
    }
    this.dungMoMoi = true;
    this.lyDoDung = 'DUNG.flag';
  }

  /** Ngắt mạch chỉ NGỪNG MỞ LỆNH MỚI. Ở chế độ test dài thì chỉ GHI, không dừng. */
  _kiemNgatMach() {
    const nm = this.cfg.NGAT_MACH;
    const lyDo = DB.thuaLienTiep() >= nm.thuaLienTiep
      ? `thua ${nm.thuaLienTiep} lệnh liên tiếp`
      : ((this.vonBanDau - this.vonHienTai()) / this.vonBanDau > nm.loNgayToiDa
        ? `lỗ quá ${nm.loNgayToiDa * 100}% tài khoản` : null);
    if (!lyDo) return;
    if (this.choAmVon) {
      DB.ghiSuKien({ coin: '*', tu: 'NGAT_MACH', den: 'BO_QUA', lyDo, chiTiet: 'CHO_AM_VON dang bat' });
      return;
    }
    this.dungMoMoi = true;
    this.lyDoDung = lyDo;
  }

  /** Funding — BI QUAN hai chiều: nhận ×0,7 · trả ×1,3 */
  ghiNhanFunding(sym, f8) {
    const st = this.trangThai.get(sym);
    if (!st || !st.lenh || f8 === null || !isFinite(f8)) return;
    const L = st.lenh;
    const tho = (L.huong === 'short' ? 1 : -1) * f8 * L.notional;
    L.fundingNhanUsd += tho >= 0
      ? tho * this.cfg.HE_SO_FUNDING_NHAN : tho * this.cfg.HE_SO_FUNDING_TRA;
  }
}

module.exports = { QuanLyLenh, TT, BAC, DA_MO };
