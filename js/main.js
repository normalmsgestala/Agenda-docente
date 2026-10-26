/* Web Docente · arranque */
(function (WD) {
  'use strict';
  async function arrancar() {
    try { await WD.load(); } catch (e) { console.error(e); }
    WD.google.onCambio(() => { if (WD.state.docente.nombre) WD.refrescar(); });
    WD.render();
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => WD.aplicarTema());
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|claudeusercontent/.test(location.host)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})(window.WD);
