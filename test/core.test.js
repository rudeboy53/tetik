// Cekirdek mantik testleri: node --test test/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const C = require('../src/config.js');
const { MouseAim, FULL_RATE, CURVES, stickForRate } = require('../src/mouse.js');
const { Mapper } = require('../src/mapper.js');

const { looksLikeCard } = require('../src/detect.js');

const B = C.BUTTONS;
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ~ ${b}`);

function aimOpts(over) {
  return Object.assign({ sens: 1, yRatio: 1, smoothMs: 0, deadzone: 0, gameCurve: 1, carryMs: 40, invertY: false }, over);
}

// Dogrusal egride stick degeri x sure = oyunda donulen miktar.
function simulate(aim, o, feed, steps, dt) {
  let turned = 0;
  for (let i = 0; i < steps; i++) {
    aim.add(feed(i), 0);
    aim.step(dt, o);
    turned += aim.x * dt;
  }
  return turned;
}

test('mouse: ayni mesafe, farkli hizlarda ayni donusu verir', () => {
  const o = aimOpts({ smoothMs: 10 });
  const total = 600;
  // Yavas: 150 adimda; hizli: 30 adimda (ikisi de doyma sinirinin altinda).
  const slow = simulate(new MouseAim(), o, (i) => (i < 150 ? total / 150 : 0), 400, 4);
  const fast = simulate(new MouseAim(), o, (i) => (i < 30 ? total / 30 : 0), 400, 4);
  near(slow, total / FULL_RATE, 0.5);
  near(fast, total / FULL_RATE, 0.5);
});

test('mouse: okuma araligi degisse de toplam donus korunur', () => {
  const o = aimOpts({ smoothMs: 8 });
  const a = simulate(new MouseAim(), o, (i) => (i < 100 ? 4 : 0), 600, 2);
  const b = simulate(new MouseAim(), o, (i) => (i < 25 ? 16 : 0), 150, 8);
  near(a, 400 / FULL_RATE, 0.5);
  near(b, 400 / FULL_RATE, 0.5);
});

test('mouse: doyunca stick 1i asmaz ve tasma sinirlanir', () => {
  const o = aimOpts({ carryMs: 40 });
  const aim = new MouseAim();
  aim.add(100000, 0);
  aim.step(4, o);
  near(aim.x, 1);
  assert.equal(aim.saturated, true);
  // Hareket durduktan sonra en fazla carryMs kadar tam stick surer.
  let ms = 0;
  while (aim.x > 0 && ms < 1000) {
    aim.step(4, o);
    ms += 4;
  }
  assert.ok(ms <= 48, `tasma ${ms} ms surdu`);
});

test('mouse: olu bolge telafisi ve egri tersi', () => {
  const aim = new MouseAim();
  // r = 0.25 olacak sekilde: 4 ms'de 4 sayim.
  aim.add(4, 0);
  aim.step(4, aimOpts({ deadzone: 0.2, gameCurve: 2 }));
  // m = 0.2 + 0.8 * sqrt(0.25) = 0.6
  near(aim.x, 0.6);
  near(aim.y, 0);
  // Hareket yokken olu bolge tabani uygulanmaz.
  aim.step(4, aimOpts({ deadzone: 0.2 }));
  near(aim.x, 0);
});

test('mouse: capraz hareket yonu korur, dikey ters cevrilebilir', () => {
  const aim = new MouseAim();
  aim.add(3, 4);
  aim.step(4, aimOpts({ invertY: true }));
  near(aim.x / -aim.y, 3 / 4);
  assert.ok(aim.y < 0);
});

test('mouse: uzun aradan sonra bayat hareket atilir', () => {
  const aim = new MouseAim();
  aim.add(50, 50);
  aim.step(500, aimOpts());
  near(aim.x, 0);
  near(aim.px, 0);
});

test('mouse: olculmus egri tablosu tersine cevrilir', () => {
  const t = CURVES.gta6.table;
  near(stickForRate(t, 1), 1);
  near(stickForRate(t, 0.115), 0.6);
  near(stickForRate(t, 0.0355), 0.4 + 0.1 * (0.0355 - 0.016) / (0.055 - 0.016));
  // Tablo iki eksende de artan olmali, yoksa ters cevirme anlamsizlasir.
  for (let i = 1; i < t.length; i++) {
    assert.ok(t[i][0] > t[i - 1][0] && t[i][1] > t[i - 1][1]);
  }
  const aim = new MouseAim();
  aim.add(8, 0); // 4 ms'de 8 sayim -> r = 0.5
  aim.step(4, aimOpts({ curve: t }));
  near(aim.x, stickForRate(t, 0.5));
  assert.ok(aim.x > 0.75 && aim.x < 0.9);
  // En kucuk hareket bile olu bolgenin ustune cikar.
  const slow = new MouseAim();
  slow.add(0.04, 0);
  slow.step(4, aimOpts({ curve: t }));
  assert.ok(slow.x > t[0][0]);
});

function mk() {
  const cfg = C.normalize(null);
  cfg.mouse.curveMode = 'manual';
  const m = new Mapper(cfg);
  let t = 1000;
  m.update(t);
  const tick = (dt = 16) => m.update((t += dt));
  return { cfg, m, tick };
}

test('mapper: W yayayken sol stick, aractayken RT', () => {
  const { m, tick } = mk();
  m.press('KeyW');
  let s = tick();
  near(s.axes[1], -1);
  assert.equal(s.buttons[B.RT], 0);

  // F: Y gonderir ve moda gecer; W basili kalirken eslesme aninda degisir.
  m.press('KeyF');
  assert.equal(m.mode, 'vehicle');
  s = tick();
  assert.equal(s.buttons[B.Y], 1);
  assert.equal(s.buttons[B.RT], 1);
  m.release('KeyF');
  // Sol stick arac profilindeki donus suresiyle merkeze doner.
  for (let i = 0; i < 10; i++) s = tick();
  near(s.axes[1], 0);
  assert.equal(s.buttons[B.RT], 1);
  assert.equal(s.buttons[B.Y], 0);

  m.press('KeyF');
  assert.equal(m.mode, 'foot');
  s = tick();
  assert.equal(s.buttons[B.RT], 0);
  near(s.axes[1], -1);
});

test('mapper: binis dogrulama varken F yayayken modu hemen degistirmez', () => {
  const { m, tick } = mk();
  let asked = 0;
  m.confirmEnter = () => { asked++; };
  m.press('KeyF');
  assert.equal(m.mode, 'foot');
  assert.equal(asked, 1);
  assert.equal(tick().buttons[B.Y], 1); // Y yine gonderilir (esya toplama / binme)
  m.release('KeyF');
  m.setMode('vehicle'); // kart goruldu
  m.press('KeyF');
  assert.equal(m.mode, 'foot'); // inis aninda
  assert.equal(asked, 1);
});

test('detect: arac adi karti satir profili taninir, parlak yuzey ve bos kare reddedilir', () => {
  const rows = (spec) => spec.flatMap(([n, v]) => new Array(n).fill(v));
  // Uc satir yazi: bosluk, yazi, bosluk, yazi...
  assert.equal(looksLikeCard(rows([[15, 0], [30, 0.2], [12, 0], [30, 0.25], [12, 0], [30, 0.2], [21, 0]]), 1), true);
  assert.equal(looksLikeCard(rows([[60, 0], [35, 0.3], [55, 0]]), 1), true);
  assert.equal(looksLikeCard(rows([[150, 0]]), 1), false);
  assert.equal(looksLikeCard(rows([[150, 0.9]]), 1), false);            // gokyuzu / beyaz duvar
  assert.equal(looksLikeCard(rows([[20, 0], [110, 0.2], [20, 0]]), 1), false); // tek buyuk parlak blok
  assert.equal(looksLikeCard(rows([[70, 0], [4, 0.5], [76, 0]]), 1), false);   // ince cizgi
});

test('config: v1 kaydinda F elle degistirmeden binme tusuna tasinir', () => {
  const c = C.normalize({ version: 1, global: { MODE_TOGGLE: ['KeyF', 'Backquote'] } });
  assert.deepEqual(c.global.MODE_ENTER_EXIT, ['KeyF']);
  assert.deepEqual(c.global.MODE_TOGGLE, ['Backquote']);
});

test('mapper: zorlama tuslari tekrar basilinca mod degistirmez', () => {
  const { m } = mk();
  const seen = [];
  m.onModeChange = (x) => seen.push(x);
  m.press('Digit2'); m.release('Digit2');
  m.press('Digit2'); m.release('Digit2');
  assert.equal(m.mode, 'vehicle');
  m.press('Digit1'); m.release('Digit1');
  assert.equal(m.mode, 'foot');
  m.press('Backquote'); m.release('Backquote');
  assert.equal(m.mode, 'vehicle');
  assert.deepEqual(seen, ['vehicle', 'foot', 'vehicle']);
});

test('mapper: basili tutulan tus tekrar olayi modu iki kez degistirmez', () => {
  const { m } = mk();
  m.press('KeyF');
  m.press('KeyF');
  assert.equal(m.mode, 'vehicle');
});

test('mapper: capraz yuruyus daireye normalize edilir, yavas yurume olcekler', () => {
  const { m, tick, cfg } = mk();
  m.press('KeyW');
  m.press('KeyD');
  let s = tick();
  near(Math.hypot(s.axes[0], s.axes[1]), 1);
  near(s.axes[0], Math.SQRT1_2);
  m.press('AltLeft');
  s = tick();
  near(Math.hypot(s.axes[0], s.axes[1]), cfg.walkScale);
});

test('mapper: aracta direksiyon kademeli artar', () => {
  const { m, tick, cfg } = mk();
  m.setMode('vehicle');
  m.press('KeyD');
  const s1 = tick(30);
  near(s1.axes[0], 30 / cfg.profiles.vehicle.stick.rampUpMs);
  tick(30); tick(30);
  const s2 = tick(30);
  near(s2.axes[0], 1);
});

test('mapper: nisan alirken (LT) mouse hassasiyeti carpanla duser', () => {
  const run = (ads) => {
    const { m, tick, cfg } = mk();
    cfg.mouse.smoothMs = 0;
    cfg.mouse.deadzone = 0;
    cfg.profiles.foot.mouse.sens = 1;
    if (ads) m.press('Mouse2');
    m.mouseMove(8, 0);
    return tick(4).axes[2];
  };
  const hip = run(false);
  const ads = run(true);
  near(hip, 8 / 4 / FULL_RATE);
  near(ads / hip, C.DEFAULTS.profiles.foot.mouse.adsMult);
});

test('mapper: A basili tutulunca seri basar, kapaliyken sabit kalir', () => {
  const { m, tick, cfg } = mk();
  cfg.profiles.foot.turboA = true;
  m.press('Space');
  const seen = new Set();
  for (let i = 0; i < 60; i++) seen.add(tick(7).buttons[B.A]);
  assert.deepEqual([...seen].sort(), [0, 1]);
  cfg.profiles.foot.turboA = false;
  for (let i = 0; i < 60; i++) assert.equal(tick(7).buttons[B.A], 1);
});

test('mapper: olculmus egride nisan ayri tablo ve tavan oraniyla calisir', () => {
  const run = (ads, mode) => {
    const { m, tick, cfg } = mk();
    cfg.mouse.curveMode = 'gta6';
    cfg.mouse.smoothMs = 0;
    cfg.profiles.foot.mouse.sens = 1;
    cfg.profiles.foot.mouse.adsMult = 1;
    cfg.profiles.vehicle.mouse.sens = 1;
    if (mode) m.setMode(mode);
    if (ads) m.press(mode === 'vehicle' ? 'KeyS' : 'Mouse2');
    m.mouseMove(dx, dy);
    const s = tick(4);
    return Math.hypot(s.axes[2], s.axes[3]);
  };
  let dx = 1, dy = 0; // r = 0.0625
  const look = run(false);
  near(look, stickForRate(CURVES.gta6.table, 0.0625));
  // Nisanda ayni el hizi ayni aciyi versin: r, tavanlarin oraniyla buyur.
  const k = CURVES.gta6.max / CURVES.gta6aim.max;
  near(run(true), stickForRate(CURVES.gta6aim.table, 0.0625 * k));
  // Dikeyde oyunun tavani farkli: ayni el hizi icin r, yatay/dikey tavan oraniyla olceklenir.
  dx = 0; dy = 1;
  near(run(false), stickForRate(CURVES.gta6.table, 0.0625 * CURVES.gta6.max / CURVES.gta6.vmax));
  dx = 1; dy = 0;
  // Aracta LT frendir; bakis egrisi degismez.
  near(run(true, 'vehicle'), look);
});

test('config: v3 oncesi kayitlarda tuslar yeni semaya sifirlanir', () => {
  const c = C.normalize({ version: 2, profiles: { vehicle: { mouse: { sens: 3 }, binds: { LB: ['Mouse0'] } } } });
  assert.deepEqual(c.profiles.vehicle.binds.RB, ['Mouse0']);
  assert.deepEqual(c.profiles.vehicle.binds.LB, ['Tab', 'Mouse2']);
  assert.equal(c.profiles.vehicle.mouse.sens, C.DEFAULTS.profiles.vehicle.mouse.sens);
  const d = C.normalize({ version: 4, profiles: { vehicle: { mouse: { sens: 3 } } } });
  assert.equal(d.profiles.vehicle.mouse.sens, 3);
});

test('mapper: releaseAll her seyi notrler', () => {
  const { m, tick } = mk();
  m.press('KeyW'); m.press('Mouse0'); m.mouseMove(50, 50);
  tick();
  m.releaseAll();
  const s = tick();
  assert.deepEqual(s.axes, [0, 0, 0, 0]);
  assert.ok(s.buttons.every((v) => v === 0));
});

test('config: bozuk veri varsayilanlara duser, sayilar sinirlanir', () => {
  const c = C.normalize({
    mouse: { deadzone: 9, smoothMs: 'x', gameCurve: 0 },
    version: 4,
    profiles: { foot: { mouse: { sens: -5 }, binds: { A: 'KeyZ', X: ['KeyZ', 'KeyZ', 5] } } },
    global: { MODE_TOGGLE: [] },
    junk: 1,
  });
  assert.equal(c.mouse.deadzone, 0.6);
  assert.equal(c.mouse.smoothMs, C.DEFAULTS.mouse.smoothMs);
  assert.equal(c.mouse.gameCurve, 0.3);
  assert.equal(c.profiles.foot.mouse.sens, 0.05);
  assert.deepEqual(c.profiles.foot.binds.A, C.DEFAULTS.profiles.foot.binds.A);
  assert.deepEqual(c.profiles.foot.binds.X, ['KeyZ']);
  assert.deepEqual(c.global.MODE_TOGGLE, []);
  assert.equal(c.junk, undefined);
  assert.deepEqual(C.normalize(C.DEFAULTS), C.DEFAULTS);
});
