// Oyun ici gosterge (mod + kilit durumu) ve ayar paneli.
// Sayfanin CSP / Trusted Types kurallarina takilmamak icin innerHTML ve inline
// style kullanilmaz: DOM createElement ile, stil constructable stylesheet ile kurulur.
(function (root) {
  'use strict';
  const KMX = (root.__KMX = root.__KMX || {});
  const C = KMX.config;

  const CSS = `
:host { all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;
  font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #f2f2f2; }
* { box-sizing: border-box; }
.chip { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; align-items: center;
  gap: 8px; padding: 6px 10px; border-radius: 999px; background: rgba(16,18,22,.88); border: 1px solid rgba(255,255,255,.14);
  pointer-events: auto; user-select: none; white-space: nowrap; }
.chip.locked { pointer-events: none; opacity: .6; padding: 3px 9px; gap: 6px; }
.chip.locked .btn, .chip.locked .hint { display: none; }
.chip.hidden { display: none; }
.mode { font-weight: 700; letter-spacing: .06em; font-size: 12px; }
.mode.foot { color: #5fdd8a; }
.mode.vehicle { color: #ffb347; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #666; }
.dot.on { background: #5fdd8a; }
.dot.sat { background: #ff5a5a; }
.hint { color: #a9adb5; font-size: 12px; }
.btn { font: inherit; color: #f2f2f2; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18);
  border-radius: 999px; padding: 3px 10px; cursor: pointer; }
.btn:hover { background: rgba(255,255,255,.2); }
.btn.primary { background: #107c10; border-color: #1a9a1a; }
.btn.primary:hover { background: #159415; }
.btn.danger { background: rgba(255,90,90,.16); border-color: rgba(255,90,90,.5); }
.mode { display: inline-block; transition: transform .15s; }
.chip.pulse { opacity: 1; }
.chip.pulse .mode { transform: scale(1.35); }
.panel { position: absolute; top: 0; right: 0; bottom: 0; width: min(460px, 100vw); background: #14161b;
  border-left: 1px solid rgba(255,255,255,.14); display: none; flex-direction: column; pointer-events: auto; }
.panel.open { display: flex; }
.head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.1); }
.head h1 { margin: 0; font-size: 15px; font-weight: 700; }
.tabs { display: flex; gap: 4px; padding: 8px 12px 0; border-bottom: 1px solid rgba(255,255,255,.1); }
.tab { font: inherit; color: #a9adb5; background: none; border: 0; border-bottom: 2px solid transparent; padding: 6px 10px 8px; cursor: pointer; }
.tab.active { color: #fff; border-bottom-color: #107c10; }
.body { flex: 1; overflow-y: auto; padding: 12px 16px 24px; }
h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #a9adb5; margin: 18px 0 8px; font-weight: 600; }
h2:first-child { margin-top: 4px; }
.field { margin-bottom: 12px; }
.field .top { display: flex; justify-content: space-between; gap: 8px; }
.field .val { color: #5fdd8a; font-variant-numeric: tabular-nums; }
.field .help { color: #8b9099; font-size: 12px; margin-top: 2px; }
input[type=range] { width: 100%; margin: 4px 0 0; accent-color: #107c10; }
label.check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
.row .name { flex: 0 0 150px; color: #d6d8dc; }
.row .keys { flex: 1; display: flex; flex-wrap: wrap; gap: 4px; }
.key { font: inherit; font-size: 12px; color: #fff; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2);
  border-radius: 5px; padding: 1px 7px; cursor: pointer; }
.key:hover { background: rgba(255,90,90,.3); border-color: rgba(255,90,90,.6); text-decoration: line-through; }
.add { font: inherit; font-size: 12px; color: #a9adb5; background: none; border: 1px dashed rgba(255,255,255,.3); border-radius: 5px; padding: 1px 8px; cursor: pointer; }
.add.wait { color: #ffb347; border-color: #ffb347; }
textarea { width: 100%; height: 110px; background: #0d0f12; color: #d6d8dc; border: 1px solid rgba(255,255,255,.18);
  border-radius: 6px; font: 11px/1.4 ui-monospace, Menlo, monospace; padding: 6px; resize: vertical; }
.actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.note { color: #8b9099; font-size: 12px; margin: 6px 0; }
.msg { color: #ffb347; font-size: 12px; min-height: 16px; margin-top: 6px; }
`;

  function el(tag, cls, text) {
    const n = root.document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  const MODE_LABEL = { foot: 'YAYA', vehicle: 'ARAÇ' };

  class UI {
    // opts: { getConfig, onChange(cfg), onReset(), mapper, input }
    constructor(opts) {
      this.opts = opts;
      this.tab = 'foot';
      this.capturing = null; // { profile, action, button }
      this.toastTimer = 0;
      this.swallowUntil = 0;
    }

    get cfg() {
      return this.opts.getConfig();
    }

    mount() {
      const d = root.document;
      this.host = d.createElement('kmx-overlay');
      const shadow = this.host.attachShadow({ mode: 'closed' });
      const sheet = new root.CSSStyleSheet();
      sheet.replaceSync(CSS);
      shadow.adoptedStyleSheets = [sheet];

      // Gosterge
      this.chip = el('div', 'chip');
      this.dot = el('span', 'dot');
      this.modeEl = el('span', 'mode foot', MODE_LABEL.foot);
      this.hint = el('span', 'hint', 'F3');
      this.startBtn = el('button', 'btn primary', 'Başlat');
      this.startBtn.addEventListener('click', () => this.opts.input.start());
      this.gearBtn = el('button', 'btn', 'Ayarlar');
      this.gearBtn.addEventListener('click', () => this.togglePanel());
      this.chip.append(this.dot, this.modeEl, this.hint, this.startBtn, this.gearBtn);

      this.panel = el('div', 'panel');
      this.buildPanel();
      shadow.append(this.chip, this.panel);

      this.attach();
      d.addEventListener('fullscreenchange', () => this.attach());

      // Tus atama yakalayicisi (sayfanin dinleyicilerinden once calisir).
      const opt = { capture: true, passive: false };
      root.addEventListener('keydown', (e) => this.onCaptureKey(e), opt);
      root.addEventListener('mousedown', (e) => this.onCaptureMouse(e), opt);
      root.addEventListener('wheel', (e) => this.onCaptureWheel(e), opt);
      // Atama icin basilan mouse dugmesinin tiklamasi paneldeki bir dugmeye gitmesin.
      for (const t of ['click', 'auxclick', 'contextmenu']) {
        root.addEventListener(t, (e) => {
          if (root.performance.now() > this.swallowUntil) return;
          e.preventDefault();
          e.stopImmediatePropagation();
        }, opt);
      }

      root.setInterval(() => this.refresh(), 120);
      this.refresh();
    }

    // Tam ekranda yalnizca tam ekran ogesinin alt agaci gorunur.
    attach() {
      const d = root.document;
      const fs = d.fullscreenElement;
      // Tam ekran ogesi dogrudan <video> ise icine eleman cizilemez.
      const parent = fs && fs.tagName !== 'VIDEO' ? fs : d.documentElement;
      if (this.host.parentNode !== parent) parent.appendChild(this.host);
    }

    isUiEvent(e) {
      return !!this.host && e.composedPath && e.composedPath().includes(this.host);
    }

    isBusy() {
      return !!this.capturing;
    }

    onPlayPage() {
      const l = root.location;
      return l.hostname !== 'www.xbox.com' || /\/(play|remoteplay)/i.test(l.pathname);
    }

    refresh() {
      const cfg = this.cfg;
      const input = this.opts.input;
      const mapper = this.opts.mapper;
      const show = cfg.enabled && cfg.showHud && this.onPlayPage();
      this.chip.classList.toggle('hidden', !show && !this.panel.classList.contains('open'));
      this.chip.classList.toggle('locked', input.locked);
      this.modeEl.className = 'mode ' + mapper.mode;
      this.modeEl.textContent = MODE_LABEL[mapper.mode];
      this.dot.className = 'dot' + (input.locked ? (mapper.aim.saturated ? ' sat' : ' on') : '');
      this.hint.textContent = input.locked ? '' : 'F3';
    }

    flashMode(mode) {
      // Ekranin ortasini kapatmadan haber ver: ustteki gosterge kisa sure belirginlesir.
      this.refresh();
      this.chip.classList.add('pulse');
      root.clearTimeout(this.toastTimer);
      this.toastTimer = root.setTimeout(() => this.chip.classList.remove('pulse'), 700);
    }

    closePanel() {
      if (this.panel.classList.contains('open')) {
        this.panel.classList.remove('open');
        this.cancelCapture();
      }
    }

    togglePanel(open) {
      const want = open == null ? !this.panel.classList.contains('open') : open;
      if (want) this.opts.input.stop();
      this.panel.classList.toggle('open', want);
      if (want) this.renderBody();
      else this.cancelCapture();
      this.refresh();
    }

    changed() {
      this.opts.onChange(this.cfg);
    }

    // ---- panel ----

    buildPanel() {
      const head = el('div', 'head');
      head.append(el('h1', null, 'Tetik'));
      const close = el('button', 'btn', 'Kapat');
      close.addEventListener('click', () => this.togglePanel(false));
      head.append(close);

      this.tabsEl = el('div', 'tabs');
      const tabs = [['foot', 'Yaya'], ['vehicle', 'Araç'], ['mouse', 'Mouse'], ['general', 'Genel']];
      this.tabBtns = {};
      for (const [id, label] of tabs) {
        const b = el('button', 'tab', label);
        b.addEventListener('click', () => {
          this.tab = id;
          this.renderBody();
        });
        this.tabBtns[id] = b;
        this.tabsEl.append(b);
      }
      this.body = el('div', 'body');
      this.panel.append(head, this.tabsEl, this.body);
    }

    renderBody() {
      this.cancelCapture();
      for (const id of Object.keys(this.tabBtns)) this.tabBtns[id].classList.toggle('active', id === this.tab);
      this.body.replaceChildren();
      if (this.tab === 'foot' || this.tab === 'vehicle') this.renderProfile(this.tab);
      else if (this.tab === 'mouse') this.renderMouse();
      else this.renderGeneral();
    }

    slider(parent, o) {
      const f = el('div', 'field');
      const top = el('div', 'top');
      const val = el('span', 'val');
      const fmt = (v) => (o.fmt ? o.fmt(v) : String(v));
      top.append(el('span', null, o.label), val);
      const r = el('input');
      r.type = 'range';
      r.min = String(o.min);
      r.max = String(o.max);
      r.step = String(o.step);
      r.value = String(o.get());
      val.textContent = fmt(o.get());
      r.addEventListener('input', () => {
        const v = Number(r.value);
        o.set(v);
        val.textContent = fmt(v);
        this.changed();
      });
      f.append(top, r);
      if (o.help) f.append(el('div', 'help', o.help));
      parent.append(f);
    }

    check(parent, o) {
      const f = el('div', 'field');
      const l = el('label', 'check');
      const c = el('input');
      c.type = 'checkbox';
      c.checked = !!o.get();
      c.addEventListener('change', () => {
        o.set(c.checked);
        this.changed();
        this.refresh();
      });
      l.append(c, el('span', null, o.label));
      f.append(l);
      if (o.help) f.append(el('div', 'help', o.help));
      parent.append(f);
    }

    bindRows(parent, binds, actions, scope) {
      for (const action of actions) {
        const row = el('div', 'row');
        row.append(el('span', 'name', C.ACTION_LABELS[action] || action));
        const keys = el('div', 'keys');
        const draw = () => {
          keys.replaceChildren();
          for (const code of binds[action]) {
            const k = el('button', 'key', C.inputLabel(code));
            k.title = 'Kaldır';
            k.addEventListener('click', () => {
              binds[action] = binds[action].filter((c) => c !== code);
              this.changed();
              draw();
            });
            keys.append(k);
          }
          const add = el('button', 'add', '+ ekle');
          add.addEventListener('click', () => this.beginCapture(binds, action, add, draw, scope));
          keys.append(add);
        };
        draw();
        row.append(keys);
        parent.append(row);
      }
    }

    renderProfile(name) {
      const p = this.cfg.profiles[name];
      const b = this.body;
      const x2 = (v) => v.toFixed(2);
      b.append(el('h2', null, 'Mouse'));
      this.slider(b, { label: 'Hassasiyet', min: 0.25, max: 20, step: 0.25, fmt: x2,
        get: () => p.mouse.sens, set: (v) => { p.mouse.sens = v; },
        help: 'Gösterge noktası kırmızıyken oyunun dönüş tavanındasın (bakışta 170°/sn); daha hızlısı için oyunun kendi hassasiyeti yükselmeli.' });
      this.slider(b, { label: 'Nişan (LT basılıyken) çarpanı', min: 0.05, max: 3, step: 0.05, fmt: x2,
        get: () => p.mouse.adsMult, set: (v) => { p.mouse.adsMult = v; } });
      this.slider(b, { label: 'Dikey / yatay oranı', min: 0.2, max: 3, step: 0.05, fmt: x2,
        get: () => p.mouse.yRatio, set: (v) => { p.mouse.yRatio = v; } });
      b.append(el('h2', null, 'Sol stick'));
      const ms = (v) => v + ' ms';
      this.slider(b, { label: 'Tam sapmaya ulaşma süresi', min: 0, max: 400, step: 10, fmt: ms,
        get: () => p.stick.rampUpMs, set: (v) => { p.stick.rampUpMs = v; },
        help: 'Araçta A/D ile direksiyonu yumuşatır. 0 = anında.' });
      this.slider(b, { label: 'Merkeze dönme süresi', min: 0, max: 400, step: 10, fmt: ms,
        get: () => p.stick.rampDownMs, set: (v) => { p.stick.rampDownMs = v; } });
      b.append(el('h2', null, 'Seri basış'));
      this.check(b, { label: 'A basılı tutulunca seri bas',
        get: () => p.turboA, set: (v) => { p.turboA = v; },
        help: 'Açıkken A\'ya bağlı tuşu basılı tutmak, düğmeye saniyede 10 kez basar.' });
      b.append(el('h2', null, 'Tuşlar'));
      b.append(el('div', 'note', 'Bir tuşu kaldırmak için üstüne tıkla. Aynı tuş birden çok eyleme bağlanabilir.'));
      this.bindRows(b, p.binds, C.PROFILE_ACTIONS, name);
    }

    renderMouse() {
      const m = this.cfg.mouse;
      const b = this.body;
      b.append(el('h2', null, 'Nişan çevirisi'));
      this.check(b, { label: 'GTA VI için ölçülmüş eğriyi kullan',
        get: () => m.curveMode === 'gta6', set: (v) => { m.curveMode = v ? 'gta6' : 'manual'; },
        help: 'Açıkken oyunun dik stick eğrisi otomatik düzeltilir; alttaki ölü bölge ve üs ayarları yok sayılır. Eğri, oyunun Settings > Controller sayfasındaki kumanda ayarlarınla ölçüldü (Look 7/3, Aim 3/7, Deadzone 4); o ayarları değiştirirsen yeniden ölçmek gerekir.' });
      this.slider(b, { label: 'Ölü bölge telafisi', min: 0, max: 0.5, step: 0.01, fmt: (v) => v.toFixed(2),
        get: () => m.deadzone, set: (v) => { m.deadzone = v; },
        help: 'Mouse çok yavaşken görüntü hiç kıpırdamıyorsa artır; kendi kendine kayıyor ya da titriyorsa azalt.' });
      this.slider(b, { label: 'Oyun eğrisi üssü', min: 0.5, max: 3, step: 0.05, fmt: (v) => v.toFixed(2),
        get: () => m.gameCurve, set: (v) => { m.gameCurve = v; },
        help: 'Yavaş harekette dönüş az, hızlıda orantısız fazlaysa artır. 1 = doğrusal.' });
      this.slider(b, { label: 'Yumuşatma', min: 0, max: 40, step: 1, fmt: (v) => v + ' ms',
        get: () => m.smoothMs, set: (v) => { m.smoothMs = v; },
        help: 'Düşük = daha hızlı tepki ama titrek, yüksek = pürüzsüz ama gecikmeli.' });
      this.slider(b, { label: 'Taşma süresi', min: 0, max: 200, step: 5, fmt: (v) => v + ' ms',
        get: () => m.carryMs, set: (v) => { m.carryMs = v; },
        help: 'Stick doyunca kaybolmayıp sonraya aktarılan hareket. Yüksekse mouse durunca görüntü biraz daha döner.' });
      this.check(b, { label: 'Dikey ekseni ters çevir', get: () => m.invertY, set: (v) => { m.invertY = v; } });
      this.check(b, { label: 'Yüksek frekanslı mouse olayları', get: () => this.cfg.rawEvents, set: (v) => { this.cfg.rawEvents = v; },
        help: 'Mouse takılıyor ya da hiç dönmüyorsa kapat.' });
      const raw = this.opts.input.raw;
      b.append(el('div', 'note', 'Ham girdi (işletim sistemi ivmesi kapalı): ' +
        (raw ? 'etkin.' : 'son oturumda etkin değildi ya da henüz başlatılmadı.')));
    }

    renderGeneral() {
      const cfg = this.cfg;
      const b = this.body;
      b.append(el('h2', null, 'Genel'));
      this.check(b, { label: 'Eklenti etkin', get: () => cfg.enabled, set: (v) => { cfg.enabled = v; } });
      this.check(b, { label: 'Göstergeyi göster', get: () => cfg.showHud, set: (v) => { cfg.showHud = v; } });
      this.slider(b, { label: 'Yavaş yürüme stick oranı', min: 0.1, max: 1, step: 0.05, fmt: (v) => v.toFixed(2),
        get: () => cfg.walkScale, set: (v) => { cfg.walkScale = v; } });
      const rc = el('button', 'btn', 'Kumandayı yeniden bağla (Alt+R)');
      rc.addEventListener('click', () => this.opts.onReconnect());
      b.append(rc);
      b.append(el('div', 'note', 'Oyun "Controller Disconnected" ekranında kalırsa kullan; kumanda 2 saniye çıkarılıp yeniden takılır.'));
      b.append(el('h2', null, 'Mod tuşları'));
      this.check(b, { label: 'Araca binmeyi ekrandan doğrula (GTA VI)',
        get: () => cfg.detectVehicle, set: (v) => { cfg.detectVehicle = v; },
        help: 'Binme tuşu eşya toplamak için de kullanılıyor. Açıkken araç moduna yalnızca ekranda araç adı kartı görülünce geçilir (yaklaşık 3 sn sonra). Kapalıyken tuşa her basışta mod değişir.' });
      b.append(el('div', 'note', 'Araçtayken binme tuşu anında yaya moduna döndürür. Mod ters kalırsa zorlama tuşlarıyla düzelt.'));
      this.bindRows(b, cfg.global, C.GLOBAL_ACTIONS, 'global');

      b.append(el('h2', null, 'Yedek'));
      const ta = el('textarea');
      ta.spellcheck = false;
      const msg = el('div', 'msg');
      const acts = el('div', 'actions');
      const exp = el('button', 'btn', 'Dışa aktar');
      exp.addEventListener('click', () => {
        ta.value = JSON.stringify(cfg);
        ta.select();
        msg.textContent = 'Ayarlar kutuya yazıldı; kopyalayıp saklayabilirsin.';
      });
      const imp = el('button', 'btn', 'İçe aktar');
      imp.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(ta.value);
          this.opts.onReplace(C.normalize(parsed));
          this.renderBody();
        } catch (_) {
          msg.textContent = 'Geçersiz JSON, ayarlar değiştirilmedi.';
        }
      });
      const reset = el('button', 'btn danger', 'Varsayılana dön');
      let armed = false;
      reset.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          reset.textContent = 'Emin misin? Tekrar tıkla';
          return;
        }
        this.opts.onReplace(C.clone(C.DEFAULTS));
        this.renderBody();
      });
      acts.append(exp, imp, reset);
      b.append(ta, acts, msg);
    }

    // ---- tus atama ----

    beginCapture(binds, action, button, redraw) {
      this.cancelCapture();
      button.classList.add('wait');
      button.textContent = 'Tuşa bas… (Esc iptal)';
      this.capturing = { binds, action, button, redraw };
    }

    cancelCapture() {
      const cap = this.capturing;
      if (!cap) return;
      this.capturing = null;
      cap.redraw();
    }

    finishCapture(code) {
      const cap = this.capturing;
      if (!cap) return;
      this.capturing = null;
      if (!cap.binds[cap.action].includes(code)) cap.binds[cap.action].push(code);
      this.changed();
      cap.redraw();
    }

    onCaptureKey(e) {
      if (!this.capturing) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === 'Escape') this.cancelCapture();
      else if (e.code) this.finishCapture(e.code);
    }

    onCaptureMouse(e) {
      if (!this.capturing) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      this.swallowUntil = root.performance.now() + 400;
      this.finishCapture('Mouse' + e.button);
    }

    onCaptureWheel(e) {
      if (!this.capturing || !e.deltaY) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      this.finishCapture(e.deltaY < 0 ? 'WheelUp' : 'WheelDown');
    }
  }

  KMX.ui = { UI };
})(typeof globalThis !== 'undefined' ? globalThis : this);
