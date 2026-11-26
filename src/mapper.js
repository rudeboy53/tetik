// Basili tuslar + aktif profil -> gamepad durumu.
//
// Durum her okumada basili tus kumesinden yeniden turetilir. Boylece profil
// degisirken W basili kalsa bile dogru dugme (sol stick ya da RT) aninda
// devreye girer ve takili kalan dugme olmaz.
(function (root) {
  'use strict';
  const KMX = (root.__KMX = root.__KMX || {});
  const C = KMX.config || (typeof require !== 'undefined' ? require('./config.js') : null);
  const M = KMX.mouse || (typeof require !== 'undefined' ? require('./mouse.js') : null);

  const BUTTON_COUNT = 17;

  function buildLookup(binds) {
    const map = new Map();
    for (const action of Object.keys(binds)) {
      for (const code of binds[action]) {
        if (!map.has(code)) map.set(code, []);
        map.get(code).push(action);
      }
    }
    return map;
  }

  function approach(cur, target, dt, upMs, downMs) {
    if (cur === target) return cur;
    // Hedef sifirdan uzaklasiyorsa "yukselme", yaklasiyorsa "donus" suresi.
    const rising = Math.abs(target) > Math.abs(cur) || Math.sign(target) !== Math.sign(cur);
    const ms = rising ? upMs : downMs;
    if (!(ms > 0)) return target;
    const step = dt / ms;
    const diff = target - cur;
    return Math.abs(diff) <= step ? target : cur + Math.sign(diff) * step;
  }

  class Mapper {
    constructor(cfg) {
      this.held = new Set();
      this.mode = 'foot';
      this.aim = new M.MouseAim();
      this.lsx = 0;
      this.lsy = 0;
      this.lastT = 0;
      this.onModeChange = null;
      // Varsa, yayayken binme tusuna basildiginda cagrilir; mod degisimini o yapar.
      this.confirmEnter = null;
      this.state = { axes: [0, 0, 0, 0], buttons: new Array(BUTTON_COUNT).fill(0) };
      this.setConfig(cfg);
    }

    setConfig(cfg) {
      this.cfg = cfg;
      this.lookups = {};
      for (const name of Object.keys(cfg.profiles)) {
        this.lookups[name] = buildLookup(cfg.profiles[name].binds);
      }
      this.globalLookup = buildLookup(cfg.global);
    }

    setMode(mode) {
      if (mode !== 'foot' && mode !== 'vehicle') return;
      if (mode === this.mode) return;
      this.mode = mode;
      if (this.onModeChange) this.onModeChange(mode);
    }

    // Yakalanan her tus/dugme basisi. Tanimli bir eyleme bagliysa true doner.
    press(code) {
      if (this.held.has(code)) return true;
      this.held.add(code);
      const g = this.globalLookup.get(code);
      if (g) {
        for (const a of g) {
          if (a === 'MODE_ENTER_EXIT') {
            // Aractan inis aninda; binis ise (ayni tus esya da topladigi icin) dogrulanirsa.
            if (this.mode === 'vehicle') this.setMode('foot');
            else if (this.confirmEnter) this.confirmEnter();
            else this.setMode('vehicle');
          } else if (a === 'MODE_TOGGLE') this.setMode(this.mode === 'foot' ? 'vehicle' : 'foot');
          else if (a === 'MODE_FOOT') this.setMode('foot');
          else if (a === 'MODE_VEHICLE') this.setMode('vehicle');
        }
      }
      return !!g || this.lookups[this.mode].has(code);
    }

    release(code) {
      this.held.delete(code);
    }

    releaseAll() {
      this.held.clear();
      this.aim.reset();
      this.lsx = 0;
      this.lsy = 0;
    }

    mouseMove(dx, dy) {
      this.aim.add(dx, dy);
    }

    // now: ms. Ayni milisaniyedeki tekrar okumalar onbellekten doner.
    update(now) {
      const dt = now - this.lastT;
      if (this.lastT && dt < 1) return this.state;
      this.lastT = now;

      const cfg = this.cfg;
      const prof = cfg.profiles[this.mode];
      const lookup = this.lookups[this.mode];
      const buttons = new Array(BUTTON_COUNT).fill(0);
      const dir = { LS_UP: 0, LS_DOWN: 0, LS_LEFT: 0, LS_RIGHT: 0, RS_UP: 0, RS_DOWN: 0, RS_LEFT: 0, RS_RIGHT: 0 };
      let walk = false;

      for (const code of this.held) {
        const acts = lookup.get(code);
        if (acts) {
          for (const a of acts) {
            if (a in dir) dir[a] = 1;
            else if (a in C.BUTTONS) buttons[C.BUTTONS[a]] = 1;
          }
        }
        const g = this.globalLookup.get(code);
        if (g && g.includes('WALK')) walk = true;
      }

      // Seri basis: A basili tutuldukca ac/kapa yapar.
      if (prof.turboA && buttons[C.BUTTONS.A]) {
        const half = 500 / cfg.turboHz;
        if (Math.floor(now / half) % 2 === 1) buttons[C.BUTTONS.A] = 0;
      }

      // Sol stick: capraz yonlerde daireye normalize et.
      let tx = dir.LS_RIGHT - dir.LS_LEFT;
      let ty = dir.LS_DOWN - dir.LS_UP;
      const tl = Math.hypot(tx, ty);
      if (tl > 1) {
        tx /= tl;
        ty /= tl;
      }
      if (walk) {
        tx *= cfg.walkScale;
        ty *= cfg.walkScale;
      }
      const stepDt = dt > 0 && dt < 100 ? dt : 16;
      this.lsx = approach(this.lsx, tx, stepDt, prof.stick.rampUpMs, prof.stick.rampDownMs);
      this.lsy = approach(this.lsy, ty, stepDt, prof.stick.rampUpMs, prof.stick.rampDownMs);

      // Sag stick: mouse + (varsa) tus yonleri.
      // Nisan yalnizca yayayken LT'dir; aracta LT frendir.
      const ads = this.mode === 'foot' && buttons[C.BUTTONS.LT] === 1;
      const look = M.CURVES[cfg.mouse.curveMode] || null;
      const aimCurve = (look && ads && M.CURVES[cfg.mouse.curveMode + 'aim']) || null;
      const curve = aimCurve || look;
      // Nisanda oyunun tavan hizi daha dusuk; ayni el hareketi ayni aciyi versin
      // diye hassasiyet tavanlarin oraniyla olceklenir, sonra nisan carpani uygulanir.
      const adsScale = ads ? prof.mouse.adsMult * (aimCurve ? look.max / aimCurve.max : 1) : 1;
      this.aim.step(dt, {
        sens: prof.mouse.sens * adsScale,
        // Oyunun dikey tavani yataydan farkli; ayni el hareketi iki eksende
        // ayni aciyi versin diye dikey eksen tavanlarin oraniyla olceklenir.
        yRatio: prof.mouse.yRatio * (curve && curve.vmax ? curve.max / curve.vmax : 1),
        smoothMs: cfg.mouse.smoothMs,
        deadzone: cfg.mouse.deadzone,
        gameCurve: cfg.mouse.gameCurve,
        carryMs: cfg.mouse.carryMs,
        invertY: cfg.mouse.invertY,
        curve: curve ? curve.table : null,
      });
      let rx = this.aim.x + (dir.RS_RIGHT - dir.RS_LEFT);
      let ry = this.aim.y + (dir.RS_DOWN - dir.RS_UP);
      const rl = Math.hypot(rx, ry);
      if (rl > 1) {
        rx /= rl;
        ry /= rl;
      }

      this.state = { axes: [this.lsx, this.lsy, rx, ry], buttons };
      return this.state;
    }
  }

  KMX.mapper = { Mapper, buildLookup, BUTTON_COUNT };
  if (typeof module !== 'undefined' && module.exports) module.exports = KMX.mapper;
})(typeof globalThis !== 'undefined' ? globalThis : this);
