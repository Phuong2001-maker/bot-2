'use strict';
/* =====================================================================
   MÁY TRẠNG THÁI LỆNH + QUẢN LÝ VỐN.

   ⛔ LUẬT ĐÈ LÊN MỌI THỨ — lệnh đã mở chỉ đóng vì ĐÚNG BA lý do:
        1. lỗ ròng chạm −$20 (tới −$25 nếu rào chắn còn dày)
        2. CHỐT LỜI: cò đảo chiều đã gài báo động VÀ hồi lại đủ sâu
        3. người bấm DUNG.flag
      Không đóng vì hết giờ · cấu trúc gãy · funding đảo · S đổi dấu ·
      ra khỏi khung giờ. Những thứ đó CHỈ ĐƯỢC VẼ ⚠.

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
    /* khoảng cách giá tương ứng mức cắt lỗ, để so cùng đơn vị */
    const catTheoGia = this.cfg.CAT_LO_USD / Math.max(moi / Math.max(this.soLenhMo() + 1, 1), 1e-9);
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

  /* ------------------------------------------------------- giá cắt lỗ */
  /** Giá mà tại đó lỗ ròng = `loUsd`, với vị thế hiện có. */
  _giaTaiMucLo(huong, giaVaoTB, notional, loUsd) {
    const d = loUsd / notional;
    return huong === 'short' ? giaVaoTB * (1 + d) : giaVaoTB * (1 - d);
  }

  _dungKeHoach(sym, huong, setup, gia, E, A, tickSz) {
    const cfg = this.cfg;
    const notional = cfg.KY_QUY_LAN_1 * cfg.DON_BAY;
    return {
      luc: Date.now(), giaThamChieu: gia,
      giaVao: gia,                    // ⛔ GIÁ HIỆN TẠI, không phải tường
      giaCat: this._giaTaiMucLo(huong, gia, notional, cfg.CAT_LO_USD),
      giaCatTran: this._giaTaiMucLo(huong, gia, notional, cfg.CAT_LO_USD_TRAN),
      kyQuy: cfg.KY_QUY_LAN_1, notional,
      catLoUsd: cfg.CAT_LO_USD,
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
        const moi = this._dungKeHoach(sym, st.huong, st.setup, gia, E, A, boiCanh.tickSz);
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
    st.keHoach = this._dungKeHoach(sym, huong, cong.setup, P.mid, E, A, boiCanh.tickSz);
    st.huongCuoi = huong;
    st.khoaHuongDen = Date.now() + cfg.KHOA_HUONG_PHUT * 60e3;
    DB.ghiSuKien({ coin: sym, tu: TT.SAN, den: TT.CHO_VAO, lyDo: cong.setup,
                   chiTiet: { S: Math.round(P.S) } });
    ghi(`[${sym}] CHO_VAO ${huong.toUpperCase()} ${cong.setup} · S=${P.S.toFixed(0)}`);
  }

  /* ------------------------------------------------------------ mở lệnh */
  _moLenh(st, P, A, E, boiCanh) {
    const cfg = this.cfg;
    if (this.dungMoMoi) return;
    if (this.soLenhMo() >= cfg.SO_LENH_MO_TOI_DA) return;

    const kyQuy = cfg.KY_QUY_LAN_1;
    const notional = kyQuy * cfg.DON_BAY;
    const ctl = this.congThanhLy(notional);
    if (!ctl.qua) {
      DB.ghiSuKien({ coin: st.sym, tu: TT.CHO_VAO, den: TT.CHO_VAO, lyDo: 'chan_cong_thanh_ly',
                     chiTiet: { khoangChay: +ctl.khoangChay.toFixed(3) } });
      return;
    }
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

    const L = {
      uid: uid(st.sym), sym: st.sym, huong: st.huong, setup: st.setup,
      tsMo: now, gioVN: G.gio, trongKhung,
      lanVao: [{ ts: now, gia, kyQuy, notional, loai: 'vao' }],
      soCoin: notional / gia, notional, kyQuy, soLanDCA: 0,
      giaVao1: gia, giaVaoTB: gia,
      giaCat: this._giaTaiMucLo(st.huong, gia, notional, cfg.CAT_LO_USD),
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

    /* rào chắn — dùng cho CẢ cắt lỗ lẫn DCA, cùng một thước đo */
    const tocDo = (L.huong === 'short' ? P.mua30 : P.ban30) / cfg.CUA_SO_DONG_TIEN_PHUT;
    L.raoChan = T.raoChan(E.tuong, A, L.huong,
      this._giaTaiMucLo(L.huong, L.giaVaoTB, L.notional, cfg.CAT_LO_USD_TRAN), tocDo);

    /* ---------- ĐƯỜNG RA 1: cắt lỗ theo SỐ TIỀN ---------- */
    const lo = -L.pnlUsd;
    if (lo >= cfg.CAT_LO_USD_TRAN) return this._dong(st, gia, 'cat_lo_tran', E, A);
    if (lo >= cfg.CAT_LO_USD && L.raoChan < cfg.RAO_CHAN_TOI_THIEU) {
      /* Cho phép ôm tới −$25 CHỈ KHI còn tường thật chắn đường. Rào chắn
         mỏng nghĩa là giá xuyên tiếp dễ dàng → cắt ngay ở −$20. */
      return this._dong(st, gia, 'cat_lo', E, A);
    }

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
       3. đã gài báo động VÀ hồi lại ≥ ngưỡng → CHỐT                     */
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

    if (L.baoDong && x > 0 && L.hoiLai >= L.nguongHoi) {             // (3)
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
    const lo = -L.pnlUsd;
    if (!(lo >= cfg.CUA_SO_DCA_USD[0] && lo <= cfg.CUA_SO_DCA_USD[1])) return;

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
    /* giá cắt tính lại từ vị thế MỚI — ngưỡng tiền giữ nguyên nên khoảng
       cách giá tự siết lại. Đây là điểm hay của cắt lỗ theo tiền. */
    L.giaCat = this._giaTaiMucLo(L.huong, L.giaVaoTB, L.notional, cfg.CAT_LO_USD);
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
    const kq = (E && L.soCoin > 0)
      ? this._khop(E, A, L.huong, L.soCoin * gia, false, gia)
      : { gia, giaGoc: gia, truotPc: 0, truotUsd: 0, phiUsd: L.soCoin * gia * cfg.PHI_MOI_LAN };
    const giaDong = kq.gia;
    L.pnlThucHien += L.huong === 'short'
      ? L.soCoin * (L.giaVaoTB - giaDong) : L.soCoin * (giaDong - L.giaVaoTB);
    L.phiUsd += kq.phiUsd; L.truotUsd += kq.truotUsd;

    /* PnL RÒNG: đã trừ phí; trượt đã nằm sẵn trong giá khớp */
    const pnl = L.pnlThucHien + L.fundingNhanUsd - L.phiUsd;
    /* R có mẫu số CỐ ĐỊNH = mức lỗ tối đa theo thiết kế. Lệnh cắt lỗ
       sạch luôn ra ≈ −1,00R. Thấy −1,5R là có gì sai. */
    const R = pnl / cfg.CAT_LO_USD;

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
