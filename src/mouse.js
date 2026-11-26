// Mouse -> sag stick cevirisi.
//
// Stick hiz kontroludur: oyun, stick sapmasina gore donus HIZI uretir. Mouse ise
// mesafe verir. Bu yuzden mouse sayimlari biriktirilir ve her adimda "bu surede
// bu kadar sayim akti" seklinde hiza cevrilir. Kullanilmayan sayim atilmaz, bir
// sonraki adima tasinir; boylece ayni el mesafesi her zaman ayni donus acisini
// verir (stick doymadigi surece).
(function (root) {
  'use strict';
  const KMX = (root.__KMX = root.__KMX || {});

  // sens = 1 iken tam stick sapmasina karsilik gelen mouse hizi (sayim/ms).
  const FULL_RATE = 4.0;
  const EPS = 1e-4;
  const MAX_DT = 100;

  // Olculmus oyun egrileri (GTA VI, Xbox Series X).
  // table: [stick sapmasi, donus hizi / tam stickteki hiz]
  // max:  tam stickte yatay donus hizi (derece/sn)
  // vmax: tam stickte dikey donus hizi (derece/sn)
  //
  // Kullanicinin kumanda icin kullandigi oyun ayarlariyla olculdu
  // (Settings > Controller): Look Sensitivity yatay 7 / dikey 3,
  // Aim Sensitivity yatay 3 / dikey 7, Look Acceleration 7, Aim Acceleration 1,
  // Aim Response Curve Standard, Deadzone (Right Stick) 4.
  // Oyundaki bu ayarlar degisirse egriler de degisir.
  // (Hepsi 14, Linear, deadzone 0 iken: bakis tavani 282, nisan tavani 152 idi.)
  //
  // Dikey tavanlar dogrudan olculemedi; ayni hassasiyet degerinde yatay hiz
  // olculerek alindi (bakis 3 -> 105, nisan 7 -> 94).
  const CURVES = {
    // Serbest bakis (yaya ve arac).
    gta6: {
      max: 170,
      vmax: 105,
      table: [
        [0.30, 0], [0.40, 0.016], [0.50, 0.055], [0.60, 0.115], [0.70, 0.20],
        [0.80, 0.32], [0.90, 0.53], [0.95, 0.75], [1.0, 1.0],
      ],
    },
    // Silahla nisan (LT basili, tabanca). Hiz tam degerine ~1 sn'de cikar
    // (Aim Acceleration 1); tablo oturmus hizlari verir.
    gta6aim: {
      max: 57,
      vmax: 94,
      table: [
        [0.45, 0], [0.50, 0.018], [0.60, 0.07], [0.75, 0.21], [0.80, 0.33],
        [0.90, 0.51], [0.95, 0.84], [1.0, 1.0],
      ],
    },
  };

  // Istenen donus hizi (0..1) icin gereken stick sapmasi: tablonun tersi.
  function stickForRate(table, r) {
    if (r >= 1) return 1;
    for (let i = 1; i < table.length; i++) {
      const hi = table[i];
      if (r <= hi[1]) {
        const lo = table[i - 1];
        const span = hi[1] - lo[1];
        return span > 0 ? lo[0] + ((r - lo[1]) / span) * (hi[0] - lo[0]) : hi[0];
      }
    }
    return 1;
  }

  class MouseAim {
    constructor() {
      this.reset();
    }

    reset() {
      this.px = 0;
      this.py = 0;
      this.x = 0;
      this.y = 0;
      this.saturated = false;
    }

    // Ham mouse hareketi (sayim).
    add(dx, dy) {
      this.px += dx;
      this.py += dy;
    }

    // dt: son adimdan beri gecen sure (ms).
    // o: { sens, yRatio, smoothMs, deadzone, gameCurve, carryMs, invertY, curve? }
    step(dt, o) {
      if (!(dt > 0)) return this;
      if (dt > MAX_DT) {
        // Uzun sure okunmadiysa birikmis hareket bayattir.
        this.reset();
        return this;
      }
      const sx = o.sens / FULL_RATE;
      const sy = (o.sens * o.yRatio) / FULL_RATE;

      // Bekleyen sayimin bu adimda bosaltilacak kismi (ustel yumusatma).
      const k = o.smoothMs > 0 ? 1 - Math.exp(-dt / o.smoothMs) : 1;
      const dx = this.px * k;
      const dy = this.py * k;

      // Normalize donus hizi: 1 = oyunun tam stickte verdigi hiz.
      let rx = (dx / dt) * sx;
      let ry = (dy / dt) * sy;
      let r = Math.hypot(rx, ry);

      let used = 1;
      this.saturated = r > 1;
      if (r > 1) {
        used = 1 / r;
        rx *= used;
        ry *= used;
        r = 1;
      }
      this.px -= dx * used;
      this.py -= dy * used;

      // Tasinan hareketi sinirla: aksi halde hizli savurmadan sonra goruntu
      // kendi kendine donmeye devam eder.
      const capMs = o.smoothMs + o.carryMs;
      const pr = Math.hypot(this.px * sx, this.py * sy);
      if (pr > capMs && pr > 0) {
        const f = capMs / pr;
        this.px *= f;
        this.py *= f;
      }

      if (r < EPS) {
        this.x = 0;
        this.y = 0;
        return this;
      }
      let m;
      if (o.curve) {
        // Olculmus egri: olu bolge ve dogrusal olmayan kisim tabloda.
        m = stickForRate(o.curve, r);
      } else {
        // Elle ayar: egriyi us ile tersine cevir, sonra olu bolgenin ustune tasi.
        m = Math.pow(r, 1 / o.gameCurve);
        m = o.deadzone + (1 - o.deadzone) * m;
      }
      this.x = (rx / r) * m;
      this.y = (ry / r) * m * (o.invertY ? -1 : 1);
      return this;
    }
  }

  KMX.mouse = { MouseAim, FULL_RATE, CURVES, stickForRate };
  if (typeof module !== 'undefined' && module.exports) module.exports = KMX.mouse;
})(typeof globalThis !== 'undefined' ? globalThis : this);
