// Parcalari birbirine baglar. document_start'ta calisir: getGamepads sarmalayicisi
// sayfanin kendi betiklerinden once kurulmus olmali.
(function (root) {
  'use strict';
  const KMX = root.__KMX;
  if (!KMX || KMX.started) return;
  KMX.started = true;

  const C = KMX.config;
  let cfg = C.load();

  const mapper = new KMX.mapper.Mapper(cfg);
  const pad = new KMX.gamepad.VirtualPad((now) => mapper.update(now));
  pad.install();

  let ui = null;
  let saveTimer = 0;

  function scheduleSave() {
    root.clearTimeout(saveTimer);
    saveTimer = root.setTimeout(() => C.save(cfg), 250);
  }

  function apply() {
    mapper.setConfig(cfg);
    syncDetect();
    if (!cfg.enabled) {
      input.stop();
      pad.disconnect();
    }
    scheduleSave();
  }

  // Oyun "kumanda baglantisi kesildi" ekraninda kalirsa yeni bir baglanma olayi bekler;
  // tus basmak yetmez. Kumandayi kisa sure cikarip yeniden takmak bunu cozer.
  let reconnectTimer = 0;
  function reconnect() {
    if (!cfg.enabled) return;
    root.clearTimeout(reconnectTimer);
    mapper.releaseAll();
    pad.disconnect();
    reconnectTimer = root.setTimeout(() => pad.connect(), 2000);
  }

  const input = new KMX.input.InputCapture({
    mapper,
    onReconnect: reconnect,
    getConfig: () => cfg,
    isUiEvent: (e) => (ui ? ui.isUiEvent(e) : false),
    isBusy: () => (ui ? ui.isBusy() : false),
    onLockChange: (locked) => {
      // Kumanda ilk yakalamada baglanir ve sayfa acik kaldikca bagli kalir;
      // kilit yokken notr durum bildirir.
      if (locked && cfg.enabled) pad.connect();
      if (ui) {
        if (locked) ui.closePanel();
        ui.refresh();
      }
    },
  });
  input.install();

  const detector = new KMX.detect.VehicleCardDetector();
  const ENTER_WATCH_MS = 8000;

  mapper.onModeChange = (mode) => {
    // Elle ya da inis ile mod degistiyse bekleyen binis dogrulamasi gecersizdir.
    detector.cancel();
    if (ui) ui.flashMode(mode);
  };

  function syncDetect() {
    mapper.confirmEnter = cfg.detectVehicle
      ? () => detector.watch(ENTER_WATCH_MS, () => mapper.setMode('vehicle'))
      : null;
    if (!cfg.detectVehicle) detector.cancel();
  }
  syncDetect();

  function mountUi() {
    ui = new KMX.ui.UI({
      getConfig: () => cfg,
      mapper,
      input,
      onChange: () => apply(),
      onReconnect: reconnect,
      onReplace: (next) => {
        cfg = next;
        apply();
      },
    });
    ui.mount();
  }

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', mountUi, { once: true });
  } else {
    mountUi();
  }

  KMX.app = { mapper, pad, input, getConfig: () => cfg };
})(typeof globalThis !== 'undefined' ? globalThis : this);
