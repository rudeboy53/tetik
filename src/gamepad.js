// Sanal gamepad: navigator.getGamepads() cagrisini sarar ve 0. yuvaya
// klavye-mouse durumundan uretilen bir Xbox kumandasi koyar.
(function (root) {
  'use strict';
  const KMX = (root.__KMX = root.__KMX || {});

  const PAD_ID = 'Xbox 360 Controller (XInput STANDARD GAMEPAD)';

  const actuator = {
    type: 'dual-rumble',
    effects: ['dual-rumble'],
    playEffect: () => Promise.resolve('complete'),
    reset: () => Promise.resolve('complete'),
  };

  class VirtualPad {
    // getState(now) -> { axes: number[4], buttons: number[17] }
    constructor(getState) {
      this.getState = getState;
      this.connected = false;
      this.installed = false;
      this.original = null;
    }

    install() {
      if (this.installed || !root.navigator || !root.navigator.getGamepads) return;
      const nav = root.navigator;
      const original = nav.getGamepads.bind(nav);
      this.original = original;
      const self = this;
      nav.getGamepads = function getGamepads() {
        if (!self.connected) return original();
        let real = [];
        try {
          real = original() || [];
        } catch (_) {
          real = [];
        }
        // Gercek kumandalar 1-3 yuvalarinda kalir; 0. yuva sanal kumandanin.
        const out = [self.snapshot(), null, null, null];
        for (let i = 1; i < 4; i++) out[i] = real[i] || null;
        return out;
      };
      this.installed = true;
    }

    snapshot() {
      const now = root.performance.now();
      const s = this.getState(now);
      return {
        id: PAD_ID,
        index: 0,
        connected: true,
        mapping: 'standard',
        timestamp: now,
        axes: s.axes.slice(),
        buttons: s.buttons.map((v) => ({ pressed: v > 0, touched: v > 0, value: v })),
        vibrationActuator: actuator,
        hapticActuators: [],
      };
    }

    // GamepadEvent sahte nesne kabul etmedigi icin duz Event'e gamepad alani eklenir.
    fire(type) {
      try {
        const e = new Event(type);
        e.gamepad = this.snapshot();
        root.dispatchEvent(e);
      } catch (_) {
        /* olay gonderilemese de yoklama (polling) calisir */
      }
    }

    connect() {
      if (this.connected || !this.installed) return;
      this.connected = true;
      this.fire('gamepadconnected');
    }

    disconnect() {
      if (!this.connected) return;
      this.fire('gamepaddisconnected');
      this.connected = false;
    }
  }

  KMX.gamepad = { VirtualPad, PAD_ID };
  if (typeof module !== 'undefined' && module.exports) module.exports = KMX.gamepad;
})(typeof globalThis !== 'undefined' ? globalThis : this);
