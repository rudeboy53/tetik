// Girdi yakalama: pointer lock, klavye, mouse dugmeleri, teker ve ham mouse hareketi.
// Yakalama yalnizca mouse kilitliyken etkindir; kilit yokken sayfa normal calisir.
(function (root) {
  'use strict';
  const KMX = (root.__KMX = root.__KMX || {});

  const WHEEL_PULSE_MS = 80;
  const RAW_FALLBACK_MS = 250;

  class InputCapture {
    // opts: { mapper, getConfig, onLockChange(locked), isUiEvent(e), isBusy(), onReconnect() }
    constructor(opts) {
      this.mapper = opts.mapper;
      this.getConfig = opts.getConfig;
      this.onLockChange = opts.onLockChange || (() => {});
      this.isUiEvent = opts.isUiEvent || (() => false);
      this.isBusy = opts.isBusy || (() => false);
      this.onReconnect = opts.onReconnect || (() => {});
      this.wanted = false;   // kilidi biz istedik
      this.locked = false;
      this.raw = false;      // isletim sistemi ivmesi kapali mi
      this.escLocked = false;
      this.rawSupported = 'onpointerrawupdate' in root;
      this.lastRawT = -1e9;
    }

    install() {
      const w = root;
      const d = root.document;
      const opt = { capture: true, passive: false };
      w.addEventListener('keydown', (e) => this.onKey(e, true), opt);
      w.addEventListener('keyup', (e) => this.onKey(e, false), opt);
      w.addEventListener('mousedown', (e) => this.onButton(e, true), opt);
      w.addEventListener('mouseup', (e) => this.onButton(e, false), opt);
      w.addEventListener('wheel', (e) => this.onWheel(e), opt);
      w.addEventListener('mousemove', (e) => this.onMove(e, false), opt);
      w.addEventListener('pointerrawupdate', (e) => this.onMove(e, true), opt);
      for (const t of ['pointerdown', 'pointerup', 'pointermove', 'click', 'dblclick', 'auxclick', 'contextmenu']) {
        w.addEventListener(t, (e) => this.swallow(e), opt);
      }
      d.addEventListener('pointerlockchange', () => this.onLockEvent());
      d.addEventListener('pointerlockerror', () => {
        this.wanted = false;
      });
      d.addEventListener('fullscreenchange', () => this.syncKeyboardLock());
      w.addEventListener('blur', () => this.mapper.releaseAll());
      d.addEventListener('visibilitychange', () => {
        if (d.hidden) this.mapper.releaseAll();
      });
    }

    swallow(e) {
      if (!this.locked) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    lockTarget() {
      const d = root.document;
      return d.fullscreenElement || d.body || d.documentElement;
    }

    start() {
      if (this.locked) return;
      const el = this.lockTarget();
      if (!el || !el.requestPointerLock) return;
      this.wanted = true;
      this.raw = false;
      const plain = () => {
        try {
          const p = el.requestPointerLock();
          if (p && p.catch) p.catch(() => { this.wanted = false; });
        } catch (_) {
          this.wanted = false;
        }
      };
      try {
        // Ham girdi: macOS/Windows mouse ivmesini devre disi birakir.
        const p = el.requestPointerLock({ unadjustedMovement: true });
        if (p && p.then) {
          p.then(() => {
            this.raw = true;
            this.onLockChange(this.locked);
          }).catch((err) => {
            if (err && err.name === 'NotSupportedError') plain();
            else this.wanted = false;
          });
        }
      } catch (_) {
        plain();
      }
    }

    stop() {
      this.wanted = false;
      if (root.document.pointerLockElement) root.document.exitPointerLock();
    }

    toggle() {
      if (this.locked) this.stop();
      else this.start();
    }

    onLockEvent() {
      const now = !!root.document.pointerLockElement && this.wanted;
      if (now === this.locked) return;
      this.locked = now;
      if (!now) {
        this.wanted = false;
        this.mapper.releaseAll();
      }
      this.syncKeyboardLock();
      this.onLockChange(now);
    }

    // Tam ekranda Esc tusunu sayfaya birakmak icin Keyboard Lock API.
    // Tam ekran degilken Esc her zaman tarayicinindir ve mouse kilidini acar.
    syncKeyboardLock() {
      const kb = root.navigator && root.navigator.keyboard;
      if (!kb || !kb.lock) return;
      if (this.locked && root.document.fullscreenElement) {
        kb.lock(['Escape']).then(() => { this.escLocked = true; }).catch(() => { this.escLocked = false; });
      } else {
        this.escLocked = false;
        if (kb.unlock) kb.unlock();
      }
    }

    onKey(e, down) {
      // Tus atama bekleniyorsa olayi panele birak.
      if (this.isBusy()) return;
      if (this.isUiEvent(e)) {
        // Panel icindeki yazim sayfanin kisayollarini tetiklemesin.
        e.stopImmediatePropagation();
        return;
      }
      // F3: yakalamayi ac/kapat. Kapatmak yalnizca mouse'u serbest birakir;
      // sanal kumanda bagli kalir.
      if (e.code === 'F3') {
        if (!this.getConfig().enabled) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (down && !e.repeat) this.toggle();
        return;
      }
      // Alt+R: sanal kumandayi cikarip yeniden tak ("Controller Disconnected" ekrani icin).
      if (down && e.altKey && e.code === 'KeyR' && !e.repeat && this.getConfig().enabled) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.onReconnect();
        return;
      }
      if (!this.locked) return;
      if (e.code === 'Escape' && !this.escLocked) return;
      // Cmd kisayollari (Cmd+Tab, Cmd+Q...) isletim sistemine kalsin.
      if (e.metaKey && e.code !== 'MetaLeft' && e.code !== 'MetaRight') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.code) return;
      if (down) {
        if (!e.repeat) this.mapper.press(e.code);
      } else {
        this.mapper.release(e.code);
      }
    }

    onButton(e, down) {
      if (!this.locked) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const code = 'Mouse' + e.button;
      if (down) this.mapper.press(code);
      else this.mapper.release(code);
    }

    onWheel(e) {
      if (!this.locked) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.deltaY) return;
      const code = e.deltaY < 0 ? 'WheelUp' : 'WheelDown';
      this.mapper.press(code);
      root.setTimeout(() => this.mapper.release(code), WHEEL_PULSE_MS);
    }

    onMove(e, isRaw) {
      if (!this.locked) return;
      if (!isRaw) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      const now = root.performance.now();
      const wantRaw = this.rawSupported && this.getConfig().rawEvents;
      if (isRaw) {
        if (!wantRaw) return;
        this.lastRawT = now;
      } else if (wantRaw && now - this.lastRawT < RAW_FALLBACK_MS) {
        // Ham olaylar akiyor; ayni hareketi iki kez sayma.
        return;
      }
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      if (dx || dy) this.mapper.mouseMove(dx, dy);
    }
  }

  KMX.input = { InputCapture };
  if (typeof module !== 'undefined' && module.exports) module.exports = KMX.input;
})(typeof globalThis !== 'undefined' ? globalThis : this);
