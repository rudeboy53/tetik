// Ayarlar: varsayilanlar, yukleme/kaydetme, dogrulama.
// Tum dosyalar tek bir ad alanini (__KMX) paylasir; node testleri icin module.exports da verilir.
(function (root) {
  'use strict';
  const KMX = (root.__KMX = root.__KMX || {});

  const STORAGE_KEY = 'kmx.config.v1';

  // Standart gamepad dugme indeksleri (W3C "standard" mapping).
  const BUTTONS = {
    A: 0, B: 1, X: 2, Y: 3,
    LB: 4, RB: 5, LT: 6, RT: 7,
    BACK: 8, START: 9, LS: 10, RS: 11,
    DUP: 12, DDOWN: 13, DLEFT: 14, DRIGHT: 15,
    HOME: 16,
  };

  const STICK_ACTIONS = [
    'LS_UP', 'LS_DOWN', 'LS_LEFT', 'LS_RIGHT',
    'RS_UP', 'RS_DOWN', 'RS_LEFT', 'RS_RIGHT',
  ];

  // Profilden bagimsiz ozel eylemler.
  const GLOBAL_ACTIONS = ['MODE_ENTER_EXIT', 'MODE_TOGGLE', 'MODE_FOOT', 'MODE_VEHICLE', 'WALK'];

  const PROFILE_ACTIONS = STICK_ACTIONS.concat(Object.keys(BUTTONS));

  const ACTION_LABELS = {
    LS_UP: 'Sol stick yukarı', LS_DOWN: 'Sol stick aşağı',
    LS_LEFT: 'Sol stick sol', LS_RIGHT: 'Sol stick sağ',
    RS_UP: 'Sağ stick yukarı', RS_DOWN: 'Sağ stick aşağı',
    RS_LEFT: 'Sağ stick sol', RS_RIGHT: 'Sağ stick sağ',
    A: 'A', B: 'B', X: 'X', Y: 'Y',
    LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT',
    BACK: 'View (Geri)', START: 'Menü (Start)',
    LS: 'Sol stick tık (L3)', RS: 'Sağ stick tık (R3)',
    DUP: 'D-pad yukarı', DDOWN: 'D-pad aşağı',
    DLEFT: 'D-pad sol', DRIGHT: 'D-pad sağ',
    HOME: 'Xbox düğmesi',
    MODE_ENTER_EXIT: 'Araca bin / in tuşu',
    MODE_TOGGLE: 'Yaya / Araç değiştir (elle)',
    MODE_FOOT: 'Yaya moduna zorla',
    MODE_VEHICLE: 'Araç moduna zorla',
    WALK: 'Yavaş (stick yarım)',
  };

  // Varsayilan tuslar GTA V konsol duzenine gore; oyuna gore panelden degistirilir.
  const DEFAULTS = {
    version: 4,
    enabled: true,
    detectVehicle: true, // araca binmeyi ekrandaki arac adi kartindan dogrula (GTA VI)
    showHud: true,
    rawEvents: true, // pointerrawupdate (yuksek frekans) kullan
    mouse: {
      curveMode: 'gta6', // 'gta6' = olculmus egri, 'manual' = olu bolge + us
      smoothMs: 10,     // hiz kestirimi zaman sabiti
      deadzone: 0.12,   // oyunun olu bolgesini atlamak icin taban deger
      gameCurve: 1.0,   // oyunun stick egrisi ussu (1 = dogrusal)
      carryMs: 40,      // stick doyunca tasinan hareket (ms cinsinden ust sinir)
      invertY: false,
    },
    walkScale: 0.5,
    turboHz: 10,
    global: {
      MODE_ENTER_EXIT: ['KeyF'],
      MODE_TOGGLE: ['Backquote'],
      MODE_FOOT: ['Digit1'],
      MODE_VEHICLE: ['Digit2'],
      WALK: ['AltLeft'],
    },
    profiles: {
      foot: {
        mouse: { sens: 14.0, adsMult: 0.6, yRatio: 1.0 },
        stick: { rampUpMs: 0, rampDownMs: 0 },
        turboA: false, // A basili tutulunca seri basis
        binds: {
          LS_UP: ['KeyW'], LS_DOWN: ['KeyS'], LS_LEFT: ['KeyA'], LS_RIGHT: ['KeyD'],
          // GTA VI varsayilan semasi (Settings > Control Scheme > On Foot):
          // A zipla/tirman, B comel, X yumruk, Y etkilesim, L3 kos, R3 arkaya bak,
          // LB silahi kaldir, RB siper, LT nisan, RT ates, View harita, D-pad yukari telefon.
          A: ['Space'], X: ['KeyX'], B: ['ControlLeft', 'KeyR'], Y: ['KeyF'],
          LT: ['Mouse2'], RT: ['Mouse0'],
          LB: ['Tab'], RB: ['KeyQ'],
          LS: ['ShiftLeft'], RS: ['KeyC', 'Mouse1'],
          DUP: ['ArrowUp'], DDOWN: ['ArrowDown'], DLEFT: ['ArrowLeft'], DRIGHT: ['ArrowRight', 'KeyE'],
          BACK: ['KeyV'], START: ['KeyP', 'Escape'],
          HOME: [],
          RS_UP: [], RS_DOWN: [], RS_LEFT: [], RS_RIGHT: [],
        },
      },
      vehicle: {
        mouse: { sens: 14.0, adsMult: 1.0, yRatio: 1.0 },
        stick: { rampUpMs: 90, rampDownMs: 60 },
        turboA: false,
        binds: {
          // GTA VI varsayilan semasi (Land / Water Vehicles): RT gaz, LT fren/geri,
          // A el freni, B egil, X yumruk, Y in, RB ates, LB silah secimi,
          // L3 korna/nitro, R3 arkaya bak.
          RT: ['KeyW'], LT: ['KeyS'], LS_LEFT: ['KeyA'], LS_RIGHT: ['KeyD'],
          LS_UP: [], LS_DOWN: [],
          A: ['Space'], Y: ['KeyF'],
          RB: ['Mouse0'], LB: ['Tab', 'Mouse2'], X: ['KeyX'], B: ['ControlLeft'],
          LS: ['KeyE', 'ShiftLeft'], RS: ['KeyC', 'Mouse1'],
          DUP: ['ArrowUp'], DDOWN: ['ArrowDown'], DLEFT: ['ArrowLeft'], DRIGHT: ['ArrowRight'],
          BACK: ['KeyV'], START: ['KeyP', 'Escape'],
          HOME: [],
          RS_UP: [], RS_DOWN: [], RS_LEFT: [], RS_RIGHT: [],
        },
      },
    },
  };

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function num(v, def, min, max) {
    const n = typeof v === 'number' && isFinite(v) ? v : def;
    return Math.min(max, Math.max(min, n));
  }

  function bindList(v, def) {
    if (!Array.isArray(v)) return def.slice();
    const out = [];
    for (const c of v) {
      if (typeof c === 'string' && c && c.length < 40 && !out.includes(c)) out.push(c);
    }
    return out;
  }

  // Disaridan gelen (kayitli ya da ice aktarilan) veriyi varsayilanlarla birlestirir.
  // Bilinmeyen alanlar atilir, sayilar sinirlanir; bozuk veri eklentiyi kilitleyemez.
  function normalize(raw) {
    const d = clone(DEFAULTS);
    if (!raw || typeof raw !== 'object') return d;
    const out = d;
    if (typeof raw.enabled === 'boolean') out.enabled = raw.enabled;
    if (typeof raw.showHud === 'boolean') out.showHud = raw.showHud;
    if (typeof raw.rawEvents === 'boolean') out.rawEvents = raw.rawEvents;
    if (typeof raw.detectVehicle === 'boolean') out.detectVehicle = raw.detectVehicle;
    out.walkScale = num(raw.walkScale, d.walkScale, 0.1, 1);
    out.turboHz = num(raw.turboHz, d.turboHz, 2, 20);

    const m = raw.mouse || {};
    out.mouse.smoothMs = num(m.smoothMs, d.mouse.smoothMs, 0, 80);
    out.mouse.deadzone = num(m.deadzone, d.mouse.deadzone, 0, 0.6);
    out.mouse.gameCurve = num(m.gameCurve, d.mouse.gameCurve, 0.3, 4);
    out.mouse.carryMs = num(m.carryMs, d.mouse.carryMs, 0, 300);
    if (typeof m.invertY === 'boolean') out.mouse.invertY = m.invertY;
    if (m.curveMode === 'gta6' || m.curveMode === 'manual') out.mouse.curveMode = m.curveMode;

    const g = raw.global || {};
    for (const a of GLOBAL_ACTIONS) out.global[a] = bindList(g[a], d.global[a]);
    // v1 -> v2: binme tusu artik ayri bir eylem; elle degistirme listesinden cikar.
    if (!(raw.version >= 2) && !Array.isArray(g.MODE_ENTER_EXIT)) {
      const yKeys = [];
      for (const name of Object.keys(d.profiles)) {
        const b = raw.profiles && raw.profiles[name] && raw.profiles[name].binds;
        for (const c of bindList(b && b.Y, d.profiles[name].binds.Y)) if (!yKeys.includes(c)) yKeys.push(c);
      }
      const moved = out.global.MODE_TOGGLE.filter((c) => yKeys.includes(c));
      if (moved.length) {
        out.global.MODE_ENTER_EXIT = moved;
        out.global.MODE_TOGGLE = out.global.MODE_TOGGLE.filter((c) => !yKeys.includes(c));
      }
    }

    for (const name of Object.keys(d.profiles)) {
      const rp = (raw.profiles && raw.profiles[name]) || {};
      const dp = d.profiles[name];
      const op = out.profiles[name];
      const pm = rp.mouse || {};
      // v4: oyun ayarlari kumanda degerlerine dondu (tavan dustu); eski kayitli
      // hassasiyet artik yavas kalir, yeni varsayilana cekilir.
      op.mouse.sens = num(raw.version >= 4 ? pm.sens : undefined, dp.mouse.sens, 0.05, 20);
      op.mouse.adsMult = num(pm.adsMult, dp.mouse.adsMult, 0.05, 5);
      op.mouse.yRatio = num(pm.yRatio, dp.mouse.yRatio, 0.1, 5);
      const ps = rp.stick || {};
      op.stick.rampUpMs = num(ps.rampUpMs, dp.stick.rampUpMs, 0, 1000);
      op.stick.rampDownMs = num(ps.rampDownMs, dp.stick.rampDownMs, 0, 1000);
      op.turboA = typeof rp.turboA === 'boolean' ? rp.turboA : dp.turboA;
      // v3'ten onceki kayitlardaki tuslar GTA V varsayimina goreydi; yeni semaya sifirla.
      const pb = (raw.version >= 3 && rp.binds) || {};
      for (const a of PROFILE_ACTIONS) op.binds[a] = bindList(pb[a], dp.binds[a] || []);
    }
    return out;
  }

  function load() {
    try {
      const s = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      return normalize(s ? JSON.parse(s) : null);
    } catch (_) {
      return clone(DEFAULTS);
    }
  }

  function save(cfg) {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      return true;
    } catch (_) {
      return false;
    }
  }

  // Tus kodu icin okunur etiket.
  function inputLabel(code) {
    const fixed = {
      Mouse0: 'Sol tık', Mouse1: 'Orta tık', Mouse2: 'Sağ tık',
      Mouse3: 'Mouse geri', Mouse4: 'Mouse ileri',
      WheelUp: 'Teker yukarı', WheelDown: 'Teker aşağı',
      Space: 'Boşluk', Backquote: '` (1\'in solu)', Escape: 'Esc',
      ShiftLeft: 'Sol Shift', ShiftRight: 'Sağ Shift',
      ControlLeft: 'Sol Ctrl', ControlRight: 'Sağ Ctrl',
      AltLeft: 'Sol Alt', AltRight: 'Sağ Alt',
      MetaLeft: 'Sol Cmd', MetaRight: 'Sağ Cmd',
      ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    };
    if (fixed[code]) return fixed[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
    return code;
  }

  KMX.config = {
    STORAGE_KEY, BUTTONS, STICK_ACTIONS, GLOBAL_ACTIONS, PROFILE_ACTIONS,
    ACTION_LABELS, DEFAULTS, clone, normalize, load, save, inputLabel,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = KMX.config;
})(typeof globalThis !== 'undefined' ? globalThis : this);
