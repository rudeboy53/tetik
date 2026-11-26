// Ekrandan arac algilama (GTA VI).
//
// Araca binildiginde mini haritanin hemen ustunde, buyuk beyaz harflerle arac
// adini gosteren bir kart belirir (binme tusundan ~2.7 sn sonra, ~5 sn kalir).
// Ayni tus (Y) esya toplamak icin de kullanildigindan, mod degisimi bu kart
// gorulurse yapilir. Koordinatlar 2560x1440 yayin icin olculdu ve oranlanir.
(function (root) {
  'use strict';
  const KMX = (root.__KMX = root.__KMX || {});

  // Kartin baslik blogu (video pikseli, 2560x1440 referans).
  const REF_W = 2560;
  const BOX = { x: 70, y: 940, w: 375, h: 150 };
  const WHITE = 190;

  // Satir bazinda beyaz piksel oranlarindan "yazi bandi" arar: ustunde ve altinda
  // bos satirlar olan, makul yukseklikte en az bir beyaz bant.
  // rows: her satirin beyaz orani (0..1), yukaridan asagi. unit: 1440p'de 1 satirin karsiligi.
  function looksLikeCard(rows, unit) {
    const n = rows.length;
    if (n < 10) return false;
    let total = 0;
    for (const r of rows) total += r;
    const mean = total / n;
    if (mean < 0.03 || mean > 0.35) return false;

    const minH = 12 / unit;
    const maxH = 70 / unit;
    let bands = 0;
    let empty = 0;
    let run = 0;
    for (let i = 0; i <= n; i++) {
      const on = i < n && rows[i] > 0.05;
      if (i < n && rows[i] < 0.01) empty++;
      if (on) {
        run++;
      } else {
        if (run >= minH && run <= maxH) bands++;
        else if (run > maxH) return false; // yazi degil, parlak bir yuzey
        run = 0;
      }
    }
    // Kartta yazi satirlari arasinda ve kenarlarda bos satirlar bulunur.
    return bands >= 1 && empty >= n * 0.15;
  }

  class VehicleCardDetector {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.timer = 0;
      this.token = 0;
    }

    video() {
      const list = root.document.querySelectorAll('video');
      let best = null;
      for (const v of list) {
        if (v.videoWidth > 0 && (!best || v.videoWidth > best.videoWidth)) best = v;
      }
      return best;
    }

    // Su anki karede kart gorunuyor mu? Okunamazsa null.
    sample() {
      const v = this.video();
      if (!v) return null;
      const k = v.videoWidth / REF_W;
      const w = Math.max(8, Math.round(BOX.w * k));
      const h = Math.max(8, Math.round(BOX.h * k));
      try {
        if (!this.canvas) {
          this.canvas = root.document.createElement('canvas');
          this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }
        if (this.canvas.width !== w || this.canvas.height !== h) {
          this.canvas.width = w;
          this.canvas.height = h;
        }
        this.ctx.drawImage(v, BOX.x * k, BOX.y * k, w, h, 0, 0, w, h);
        const d = this.ctx.getImageData(0, 0, w, h).data;
        const rows = new Array(h);
        for (let y = 0; y < h; y++) {
          let c = 0;
          let i = y * w * 4;
          for (let x = 0; x < w; x++, i += 4) {
            if (d[i] > WHITE && d[i + 1] > WHITE && d[i + 2] > WHITE) c++;
          }
          rows[y] = c / w;
        }
        return looksLikeCard(rows, 1 / k);
      } catch (_) {
        return null;
      }
    }

    // timeoutMs icinde kart art arda iki karede gorulurse onSeen cagrilir.
    // Yeni bir watch ya da cancel oncekini gecersiz kilar.
    watch(timeoutMs, onSeen, onDone) {
      this.cancel();
      const token = ++this.token;
      const end = root.performance.now() + timeoutMs;
      let hits = 0;
      const tick = () => {
        if (token !== this.token) return;
        const r = this.sample();
        hits = r ? hits + 1 : 0;
        if (hits >= 2) {
          this.token++;
          onSeen();
          if (onDone) onDone(true);
          return;
        }
        if (r === null || root.performance.now() > end) {
          this.token++;
          if (onDone) onDone(false);
          return;
        }
        this.timer = root.setTimeout(tick, 150);
      };
      tick();
    }

    cancel() {
      this.token++;
      root.clearTimeout(this.timer);
    }
  }

  KMX.detect = { VehicleCardDetector, looksLikeCard };
  if (typeof module !== 'undefined' && module.exports) module.exports = KMX.detect;
})(typeof globalThis !== 'undefined' ? globalThis : this);
