/* Web Docente · arranque */
(function (WD) {
  'use strict';
  async function arrancar() {
    try { await WD.load(); } catch (e) { console.error(e); }
    // Cambios de guardado: solo el letrero. Se redibuja la página únicamente al entrar o salir de la cuenta.
    let modoAnt = WD.google.estado.modo, usrAnt = WD.google.estado.usuario?.correo;
    WD.google.onCambio(() => { const e = WD.google.estado;
      if (e.modo !== modoAnt || e.usuario?.correo !== usrAnt) { modoAnt = e.modo; usrAnt = e.usuario?.correo; if (WD.state.docente.nombre) WD.refrescar(); return; }
      WD.pintarSync(); });
    // Aviso de versión nueva: la app revisa de vez en cuando si se publicó una actualización
    const revisarVersion = async () => {
      if (document.hidden || !navigator.onLine || document.getElementById('aviso-version')) return;
      try { const t = await (await fetch(`config.js?ts=${Date.now()}`, { cache: 'no-store' })).text(); const v = (t.match(/VERSION\s*=\s*'([^']+)'/) || [])[1];
        if (v && v !== WD.VERSION) { const d = document.createElement('div'); d.id = 'aviso-version'; d.className = 'aviso-version'; d.innerHTML = '<span>Hay una versión nueva de Web Docente.</span><button class="btn sm pri">Actualizar</button>'; d.querySelector('button').onclick = () => location.reload(); document.body.appendChild(d); }
      } catch (_) {}
    };
    setInterval(revisarVersion, 10 * 60 * 1000); document.addEventListener('visibilitychange', revisarVersion); setTimeout(revisarVersion, 15000);
    if (WD.google.configurado()) { try { await WD.google.restaurarSesion(); } catch (e) { console.warn(e); } }
    WD.render();
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => WD.aplicarTema());
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|claudeusercontent/.test(location.host)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})(window.WD);
