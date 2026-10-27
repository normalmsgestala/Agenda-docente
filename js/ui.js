/* Web Docente · interfaz: estructura, navegación, panel lateral, avisos, mascota */
(function (WD) {
  'use strict';
  const { esc } = WD;
  WD.views = {}; WD.act = {};

  /* ---------- íconos (trazo) ---------- */
  const P = {
    inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    grupo: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7',
    asistencia: 'M9 11l2.5 2.5L16 9M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
    evaluacion: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    planeacion: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6',
    horario: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    incidencias: 'M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    escuela: 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5M10 11h4',
    ajustes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    pronto: 'M12 6v6l4 2M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0',
    juntas: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20v-1a5 5 0 0 1 9-3M13 16a5 5 0 0 1 9 3v1M12 20v-1a4 4 0 0 1 8 0',
    herramientas: 'M12 8v4l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 2h6',
    campana: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
    ojo: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    ojoNo: 'M3 3l18 18M10.6 5.1A9.9 9.9 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.8 8.3 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
    enviar: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
    recibo: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4',
    qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
    documento: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8',
    banco: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18',
    idai: 'M4 19h16M6 15l3-8 3 8M7 12.5h4M14 9h4M16 7v4M14 15h4',
    tombola: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M7 12h10',
    calendario: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4',
    menu: 'M4 6h16M4 12h16M4 18h16',
    descargar: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    subir: 'M12 20V9M7 14l5-5 5 5M5 4h14',
    camara: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    imprimir: 'M7 9V3h10v6M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v7H7z',
    mas: 'M12 5v14M5 12h14',
    chispa: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
    izq: 'M15 18l-6-6 6-6', der: 'M9 18l6-6-6-6',
    correo: 'M4 6h16v12H4zM4 7l8 6 8-6',
  };
  WD.icon = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n] || P.pronto}"/></svg>`;

  const NAV = [
    { id: 'inicio', t: 'Inicio' }, { id: 'grupo', t: 'Mi grupo' }, { id: 'asistencia', t: 'Asistencia' },
    { id: 'evaluacion', t: 'Evaluación' }, { id: 'planeacion', t: 'Planeación' }, { id: 'horario', t: 'Horario' },
    { id: 'incidencias', t: 'Incidencias' }, { id: 'calendario', t: 'Calendario y CTE' },
    { id: 'juntas', t: 'Juntas con padres' },
    { id: 'herramientas', t: 'Herramientas de aula' },
    { id: 'tombola', t: 'Tómbola' },
    { id: 'idai', t: 'IDAI / ICE' },
    { id: 'banco', t: 'Banco Estala' },
  ];
  const NAV2 = [{ id: 'escuela', t: 'Escuela' }, { id: 'ajustes', t: 'Ajustes' }];
  const PRONTO = ['Control administrativo', 'Comunicación con familias', 'Comisiones y cumpleaños'];
  WD.PRONTO = PRONTO;

  /* ---------- tema ---------- */
  WD.aplicarTema = () => { const t = WD.state.ajustes.tema; if (t === 'claro') document.documentElement.setAttribute('data-theme', 'light'); else if (t === 'oscuro') document.documentElement.setAttribute('data-theme', 'dark'); else document.documentElement.removeAttribute('data-theme'); };

  /* ---------- ruta ---------- */
  WD.ruta = () => { const h = (location.hash || '').replace('#', ''); return WD.views[h] ? h : 'inicio'; };
  WD.ir = (id) => { if (location.hash !== '#' + id) location.hash = id; else WD.render(); window.scrollTo(0, 0); };
  window.addEventListener('hashchange', () => { document.body.classList.remove('proyector'); WD.cerrarMenu(); WD.render(); window.scrollTo(0, 0); });

  WD.act.qrMaestro = () => { WD.vistaQR = true; WD.render(); };
  /* ---------- render principal ---------- */
  const root = () => document.getElementById('app');
  WD.render = function () {
    WD.aplicarTema();
    const pub = /^#s\/([\w-]{10,})/.exec(location.hash || '');
    if (pub) { WD.saldoAlumno(pub[1]); return; }
    const qr = /^#cuenta\/(EST-\d+)/i.exec(location.hash || '');
    if (qr) {
      const dentro = (!WD.google.configurado() || WD.google.estado.modo === 'google' || WD.sinConexion) && WD.state.docente.nombre;
      const id = dentro && WD.state.banco && Object.keys(WD.state.banco.cuentas || {}).find((k) => WD.state.banco.cuentas[k].num === qr[1].toUpperCase());
      if (id) { history.replaceState(null, '', '#banco'); WD.render(); WD.act.bCuenta && WD.act.bCuenta({ dataset: { al: id } }); return; }
      if (!WD.vistaQR) { root().innerHTML = `<div class="welcome"><div class="box card stack" style="text-align:center;justify-items:center">
        <div class="label">Banco Estala</div><div style="font-family:monospace;font-size:28px;letter-spacing:.1em">${esc(qr[1].toUpperCase())}</div>
        <p style="margin:0">Esta es tu tarjeta de cuenta. Para ver tu saldo, muéstrala a la cámara en la <b>Consulta de saldo</b> del salón.</p>
        <p class="small muted" style="margin:0">Tus datos se guardan solo en la cuenta de tu maestro.</p>
        <button class="btn" data-act="qrMaestro">Soy el maestro, entrar</button></div></div>`; return; }
    }
    if (WD.google.configurado() && WD.google.estado.modo !== 'google' && !WD.sinConexion) { root().innerHTML = WD.pantallaLogin(); return; }
    if (!WD.state.docente.nombre) { root().innerHTML = WD.bienvenida(); return; }
    if (WD.necesitaAsistente()) { WD.enAsistente = true; WD.repintarAsistente(); return; }
    const id = WD.ruta(); const v = WD.views[id];
    const s = WD.google.estado;
    const syncTxt = s.modo === 'google' ? ({ guardado: 'Guardado en Drive', guardando: 'Guardando en Drive…', pendiente: 'Se guardará al volver internet', 'sin-conexion': 'Conectando…' }[s.sync] || '') : 'Guardado en este dispositivo';
    root().innerHTML = `
    <div class="app">
      <aside class="side" id="side" aria-label="Menú">
        <div class="brand"><div class="t">Agenda Maestro</div><div class="n">${esc(WD.state.docente.nombre)}</div></div>
        <nav class="nav">${NAV.map((n) => `<a href="#${n.id}" class="${id === n.id ? 'on' : ''}">${WD.icon(n.id)}${n.t}</a>`).join('')}
          <div class="nav-sec">Configuración</div>
          ${NAV2.map((n) => `<a href="#${n.id}" class="${id === n.id ? 'on' : ''}">${WD.icon(n.id)}${n.t}</a>`).join('')}
          <div class="nav-sec">Próximamente</div>
          ${PRONTO.map((t) => `<a href="#pronto" data-act="pronto" data-n="${esc(t)}">${WD.icon('pronto')}${t}</a>`).join('')}
        </nav>
        <div class="side-foot">
          <span class="sync ${s.modo === 'google' ? s.sync : ''}"><i></i>${syncTxt}</span>
          ${WD.google.configurado() && s.modo !== 'google' ? '<button class="btn sm" data-act="entrarGoogle" style="justify-self:start">Conectar con Google</button>' : ''}
          <span>${esc(WD.state.escuela.grado ? `${WD.state.escuela.grado} ${WD.state.escuela.grupo}` : '')} ${esc(WD.state.escuela.ciclo ? '· Ciclo ' + WD.state.escuela.ciclo : '')}</span>
          <span class="tiny faint">Versión ${WD.VERSION}</span>
        </div>
      </aside>
      <div class="scrim" id="side-scrim" hidden data-act="cerrarMenu"></div>
      <main class="main"><div class="wrap">
        <div class="top"><button class="btn ghost menu-btn" data-act="abrirMenu" aria-label="Abrir menú">${WD.icon('menu')}</button><div class="grow"></div></div>
        <div id="view">${v.render()}</div>
      </div></main>
    </div>
    ${WD.petHTML()}`;
    if (v.after) v.after(document.getElementById('view'));
  };
  WD.refrescar = () => { const y = window.scrollY; WD.render(); window.scrollTo(0, y); };

  /* ---------- inicio de sesión con Google ---------- */
  WD.pantallaLogin = () => {
    const correo = WD.state.docente.correo; const nombre = WD.state.docente.nombre;
    const offline = !navigator.onLine;
    return `<div class="welcome"><div class="box card">
      <div class="pets">${Object.values(WD.MASCOTAS).map((m) => m.svg).join('')}</div>
      <div><div class="k">Agenda Maestro</div><h1>Web Docente</h1></div>
      <p class="muted">${correo ? `Hola de nuevo${nombre ? ', ' + esc(nombre.split(' ')[0]) : ''}. Entra con tu cuenta para abrir tu agenda.` : 'Entra con tu cuenta de Google. Tu agenda y tus datos se guardan en tu propio Google Drive.'}</p>
      ${offline ? '<p class="note warn small">No hay internet. Para entrar con Google necesitas conexión.</p>' : ''}
      <button class="btn pri" data-act="entrarGoogle" style="justify-content:center;padding:12px" ${offline ? 'disabled' : ''}>${correo ? `Continuar como ${esc(correo)}` : 'Iniciar sesión con Google'}</button>
      ${correo ? `<button class="btn ghost sm" data-act="otraCuenta" style="justify-self:center" ${offline ? 'disabled' : ''}>Usar otra cuenta</button>` : ''}
      ${offline && correo ? `<button class="btn" data-act="sinInternet" style="justify-content:center">Abrir sin internet (lo guardado en este iPad)</button>` : ''}
      <p class="tiny faint" style="text-align:center">Cada maestro entra con su propia cuenta. Nadie más ve tus datos.</p>
    </div></div>`;
  };
  WD.act.otraCuenta = async (el) => {
    el.disabled = true;
    try { await WD.google.iniciarSesion(true); WD.render(); } catch (e) { WD.toast(e.message); el.disabled = false; }
  };
  WD.act.sinInternet = () => { WD.sinConexion = true; WD.render(); };
  window.addEventListener('online', () => { if (document.querySelector('[data-act=entrarGoogle]')) WD.render(); });
  window.addEventListener('offline', () => { if (document.querySelector('[data-act=entrarGoogle]')) WD.render(); });

  /* ---------- bienvenida ---------- */
  WD.bienvenida = () => `
    <div class="welcome"><form class="box card" data-form="bienvenida">
      <div class="pets">${Object.values(WD.MASCOTAS).map((m) => m.svg).join('')}</div>
      <div><div class="k">Agenda Maestro</div><h1>Web Docente</h1></div>
      <p class="muted">Tu agenda, tu grupo, tu evaluación y tus formatos en un solo lugar. Todo se guarda en tu cuenta.</p>
      ${WD.google.configurado() ? `<button type="button" class="btn pri" data-act="entrarGoogle" style="justify-content:center">Entrar con Google</button><div class="row"><span class="sep" style="flex:1"></span><span class="tiny faint">o empieza solo en este dispositivo</span><span class="sep" style="flex:1"></span></div>` : ''}
      <label class="field"><span>¿Cómo te llamas?</span><input class="in" id="w-nombre" name="nombre" required placeholder="Ej. Carlos Ismael Estala Coronado" autocomplete="name"></label>
      <button class="btn ${WD.google.configurado() ? '' : 'pri'}" style="justify-content:center">Entrar</button>
      ${WD.google.configurado() ? '' : `<p class="tiny faint">Por ahora se guarda en este dispositivo. Cuando se active Google, todo pasa a tu Drive.</p>`}
    </form></div>`;

  /* ---------- delegación de eventos ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = WD.act[el.dataset.act]; if (!fn) return;
    if (el.tagName === 'A') e.preventDefault();
    fn(el, e);
  });
  const setPath = (obj, path, val) => { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach((k) => { o = o[k] = o[k] ?? {}; }); o[ks[ks.length - 1]] = val; };
  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  WD.getPath = getPath;
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-bind]'); if (!el) return;
    const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value;
    setPath(WD.state, el.dataset.bind, v); WD.save();
    if (el.dataset.rerender !== undefined) WD.refrescar();
    if (el.dataset.ok !== undefined) WD.toast('Guardado');
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]'); if (!f) return;
    e.preventDefault(); const fn = WD.act['form_' + f.dataset.form]; if (fn) fn(f, e);
  });
  document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (document.getElementById('modal')) return WD.cerrarModal(); if (document.getElementById('drawer')) return WD.act.cerrarDrawer(); if (document.body.classList.contains('proyector')) { document.body.classList.remove('proyector'); return WD.refrescar(); } WD.petCerrar(); });

  WD.act.form_bienvenida = (f) => { const n = f.nombre.value.trim(); if (!n) return; WD.state.docente.nombre = n; WD.save(); WD.render(); setTimeout(() => WD.petAbrir(true), 400); };
  WD.act.entrarGoogle = async (el) => {
    const txt = el.textContent; el.disabled = true; el.innerHTML = '<span class="spinner"></span> Abriendo tu agenda…';
    try { await WD.google.iniciarSesion(); WD.render(); if (WD.ruta() === 'inicio') setTimeout(() => WD.petAbrir && WD.petAbrir(true), 500); }
    catch (e) { WD.toast(e.message, 4000); el.disabled = false; el.textContent = txt; }
  };
  WD.act.abrirMenu = () => { document.getElementById('side').classList.add('open'); document.getElementById('side-scrim').hidden = false; };
  WD.cerrarMenu = () => { const s = document.getElementById('side'); if (s) { s.classList.remove('open'); document.getElementById('side-scrim').hidden = true; } };
  WD.act.cerrarMenu = WD.cerrarMenu;
  WD.act.ir = (el) => WD.ir(el.dataset.to);
  WD.act.pronto = (el) => { WD.cerrarMenu(); WD.toast(`${el.dataset.n} llega en la siguiente versión.`); };

  /* ---------- aviso ---------- */
  let tt = null;
  WD.toast = (msg, ms = 2600) => {
    let t = document.getElementById('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, ms);
  };

  /* ---------- panel lateral ---------- */
  WD.abrirDrawer = (titulo, html, after, sub = '') => {
    WD.cerrarDrawer();
    const d = document.createElement('div'); d.id = 'drawer';
    d.innerHTML = `<div class="scrim" data-act="cerrarDrawer"></div><section class="drawer" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><div class="drawer-h"><div class="grow"><h2>${esc(titulo)}</h2>${sub ? `<div class="small muted">${sub}</div>` : ''}</div><button class="x" data-act="cerrarDrawer" aria-label="Cerrar">×</button></div><div class="drawer-b">${html}</div></section>`;
    document.body.appendChild(d); if (after) after(d.querySelector('.drawer-b'));
  };
  WD.cerrarDrawer = () => { const d = document.getElementById('drawer'); if (d) d.remove(); };
  WD.act.cerrarDrawer = () => { WD.cerrarDrawer(); WD.refrescar(); };

  /* ---------- ventana ---------- */
  WD.modal = (html) => { WD.cerrarModal(); const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal'; m.innerHTML = `<div class="card" role="dialog" aria-modal="true">${html}</div>`; m.addEventListener('click', (e) => { if (e.target === m) WD.cerrarModal(); }); document.body.appendChild(m); return m; };
  WD.cerrarModal = () => { const m = document.getElementById('modal'); if (m) m.remove(); };
  WD.act.cerrarModal = WD.cerrarModal;
  WD.confirmar = (titulo, texto, si = 'Sí, continuar', peligro = false) => new Promise((res) => {
    const m = WD.modal(`<h2>${esc(titulo)}</h2><p class="muted">${texto}</p><div class="row" style="justify-content:flex-end"><button class="btn" id="cf-no">Cancelar</button><button class="btn ${peligro ? 'danger' : 'pri'}" id="cf-si">${esc(si)}</button></div>`);
    m.querySelector('#cf-no').onclick = () => { WD.cerrarModal(); res(false); };
    m.querySelector('#cf-si').onclick = () => { WD.cerrarModal(); res(true); };
  });

  /* ---------- documentos para imprimir / PDF ---------- */
  WD.vistaDocumento = (titulo, html) => {
    const m = WD.modal(`<div class="row"><h2 class="grow" style="flex:1">${esc(titulo)}</h2><button class="x" data-act="cerrarModal" aria-label="Cerrar">×</button></div>
      <div class="preview-doc"><div class="doc">${html}</div></div>
      <p class="tiny muted">En “Imprimir” elige “Guardar como PDF” para obtener el archivo.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-act="cerrarModal">Cerrar</button><button class="btn pri" id="doc-print">${WD.icon('imprimir')} Imprimir o guardar PDF</button></div>`);
    m.querySelector('.card').style.width = 'min(860px, 100%)';
    m.querySelector('#doc-print').onclick = () => WD.imprimir(html);
  };
  WD.imprimir = (html) => {
    let pa = document.getElementById('print-area'); if (!pa) { pa = document.createElement('div'); pa.id = 'print-area'; document.body.appendChild(pa); }
    pa.innerHTML = `<div class="doc">${html}</div>`;
    try { window.print(); } catch (e) { WD.toast('Este visor no permite imprimir. Abre la app desde su vínculo.'); }
  };
  WD.membrete = () => {
    const e = WD.state.escuela;
    const linea2 = [e.cct && `CCT ${e.cct}`, e.zona && `ZONA ${e.zona}`, e.sector && `SECTOR ${e.sector}`, e.region && `REGIÓN ${e.region}`].filter(Boolean).join('  ');
    return `<div class="mem"><div>${e.logoIzq ? `<img src="${e.logoIzq}" alt="">` : ''}</div><div class="c">ESCUELA PRIMARIA “${esc((e.nombre || '').toUpperCase())}”${e.turno ? ` ${e.turno === 'Matutino' ? 'T.M.' : e.turno === 'Vespertino' ? 'T.V.' : ''}` : ''}<br>${esc(linea2)}<br>CICLO ESCOLAR ${esc(e.ciclo || '')}</div><div style="text-align:right">${e.logoDer ? `<img src="${e.logoDer}" alt="">` : ''}</div></div>`;
  };
  WD.piePagina = () => { const e = WD.state.escuela; const t = [e.correo, [e.direccion, e.municipio].filter(Boolean).join(', '), e.telefono && `Tel. ${e.telefono}`].filter(Boolean).join('  |  '); return t ? `<div class="pie">${esc(t)}</div>` : ''; };

  /* ---------- mascota ---------- */
  let petAbierto = false, petHist = [], petBusy = false;
  WD.petHTML = () => {
    const m = WD.mascota();
    return `<div class="pet" id="pet">
      <div class="pet-panel" id="pet-panel" ${petAbierto ? '' : 'hidden'} role="dialog" aria-label="${esc(m.nombre)}, tu asesor">
        <div class="pet-head"><div class="big">${m.svg}</div><div class="bubble" id="pet-bubble">${esc(WD.animoAleatorio())}</div><button class="x" data-act="petCerrar" aria-label="Cerrar" style="align-self:flex-start">×</button></div>
        <div class="pet-body" id="pet-body">${petHist.map((h) => `<div class="msg ${h.de}">${esc(h.texto)}</div>${h.ir ? `<button class="hit" data-act="ir" data-to="${h.ir}">Ir a ${esc(WD.views[h.ir]?.titulo || h.ir)} <span class="k">abrir</span></button>` : ''}${(h.hits || []).map(hitHTML).join('')}`).join('')}<div class="hits" id="pet-hits"></div></div>
        <div class="pet-ask"><div class="sign">¿No sabes algo? Pregúntame o busca un alumno o sección.</div>
          <form data-form="pet"><input class="in" id="pet-q" name="q" placeholder="Pregúntale a ${esc(m.nombre)}…" autocomplete="off"><button class="btn pri" aria-label="Preguntar">${WD.icon('der')}</button></form></div>
      </div>
      <button class="pet-btn" data-act="petToggle" aria-expanded="${petAbierto}"><span class="av">${m.svg}</span><span class="lb"><b>${esc(m.nombre)}</b><span>Pregúntame</span></span></button>
    </div>`;
  };
  WD.petAbrir = (saludo) => {
    petAbierto = true; const p = document.getElementById('pet-panel'); if (!p) return;
    p.hidden = false; document.querySelector('.pet-btn')?.setAttribute('aria-expanded', 'true');
    const b = document.getElementById('pet-bubble'); if (b) b.textContent = saludo === true ? `¡Hola, ${WD.state.docente.nombre.split(' ')[0]}! Soy ${WD.mascota().nombre}. Si no sabes algo, aquí abajo me preguntas.` : WD.animoAleatorio();
    setTimeout(() => document.getElementById('pet-q')?.focus(), 50);
  };
  // La mascota avisa algo (por ejemplo, que terminó de leer la planeación)
  WD.petDecir = (texto, ir) => {
    petHist.push({ de: 'el', texto, ir: ir || null });
    const body = document.getElementById('pet-body');
    if (body) { body.insertAdjacentHTML('beforeend', `<div class="msg el">${esc(texto)}</div>${ir ? `<button class="hit" data-act="ir" data-to="${ir}">Ir a ${esc(WD.views[ir]?.titulo || ir)} <span class="k">abrir</span></button>` : ''}`); }
    WD.petAbrir(); const b = document.getElementById('pet-bubble'); if (b) b.textContent = 'Te dejo un aviso aquí abajo.';
    const pb = document.getElementById('pet-body'); if (pb) pb.scrollTop = pb.scrollHeight;
  };
  WD.petCerrar = () => { petAbierto = false; const p = document.getElementById('pet-panel'); if (p) p.hidden = true; document.querySelector('.pet-btn')?.setAttribute('aria-expanded', 'false'); };
  WD.act.petToggle = () => (petAbierto ? WD.petCerrar() : WD.petAbrir());
  WD.act.petCerrar = WD.petCerrar;

  const AYUDAS = [
    { k: 'pasar lista asistencia falta retardo', t: 'Pasar lista', to: 'asistencia' },
    { k: 'subir planeacion pdf word', t: 'Subir planeación', to: 'planeacion' },
    { k: 'plantilla excel alumnos cargar', t: 'Cargar alumnos con Excel', to: 'grupo' },
    { k: 'calificar evaluar rubrica cotejo foto', t: 'Evaluar actividades', to: 'evaluacion' },
    { k: 'valor examen tareas puntos extra porcentaje trimestre', t: 'Valores del trimestre', to: 'evaluacion' },
    { k: 'reporte incidencia acta accidente conducta', t: 'Nueva incidencia', to: 'incidencias' },
    { k: 'logo escuela cct zona director membrete', t: 'Datos de la escuela', to: 'escuela' },
    { k: 'horas horario recreo turno', t: 'Horario', to: 'horario' },
    { k: 'junta padres tutores acta reunion entrevista familia firmas', t: 'Juntas con padres', to: 'juntas' },
    { k: 'temporizador reloj tiempo ruido semaforo silencio azar alumno equipos proyector', t: 'Herramientas de aula', to: 'herramientas' },
    { k: 'banco estala dinero billetes sueldo cuentas prestamo servicios recibos economia', t: 'Banco Estala', to: 'banco' },
    { k: 'idai ice diagnostico alfabetizacion lectura escritura nivel silabico presilabico alfabetico convenciones dictado', t: 'IDAI / ICE', to: 'idai' },
    { k: 'tombola loteria juego numeros letras calculo mental', t: 'Tómbola', to: 'tombola' },
    { k: 'calendario cte consejo tecnico vacaciones sin clases fechas registro calificaciones', t: 'Calendario y CTE', to: 'calendario' },
    { k: 'gemini ia clave conectar', t: 'Conectar Gemini', to: 'ajustes' },
    { k: 'oscuro claro tema mascota cambiar', t: 'Tema y mascota', to: 'ajustes' },
    { k: 'respaldo zip borrar ciclo descargar todo', t: 'Respaldo y fin de ciclo', to: 'ajustes' },
    { k: 'reporte mensual asistencia escuela porcentaje', t: 'Reporte mensual de asistencia', to: 'asistencia' },
  ];
  const hitHTML = (h) => h.alumno ? `<button class="hit" data-act="verAlumno" data-id="${h.alumno}">${esc(h.t)}<span class="k">${h.k}</span></button>` : `<button class="hit" data-act="ir" data-to="${h.to}">${esc(h.t)}<span class="k">${h.k}</span></button>`;
  function buscarLocal(q) {
    const n = WD.norm(q); if (n.length < 2) return [];
    const res = [];
    Object.entries(WD.views).forEach(([id, v]) => { if (WD.norm(v.titulo).includes(n)) res.push({ t: v.titulo, k: 'sección', to: id }); });
    AYUDAS.forEach((a) => { if (n.split(/\s+/).some((w) => w.length > 2 && WD.norm(a.k + ' ' + a.t).includes(w))) res.push({ t: a.t, k: 'ayuda', to: a.to }); });
    WD.alumnosActivos().forEach((a) => { if (WD.norm(WD.nombreCompleto(a)).includes(n) || WD.norm(WD.nombreLista(a)).includes(n)) res.push({ t: WD.nombreCompleto(a), k: 'alumno', alumno: a.id }); });
    const vis = new Set(); return res.filter((r) => { const key = r.t + r.k; if (vis.has(key)) return false; vis.add(key); return true; }).slice(0, 6);
  }
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'pet-q') return;
    const hits = buscarLocal(e.target.value); const box = document.getElementById('pet-hits'); if (!box) return;
    box.innerHTML = hits.map(hitHTML).join('');
  });
  WD.act.form_pet = async (f) => {
    const q = f.q.value.trim(); if (!q || petBusy) return;
    const body = document.getElementById('pet-body');
    petHist.push({ de: 'yo', texto: q }); f.q.value = ''; document.getElementById('pet-hits').innerHTML = '';
    body.insertAdjacentHTML('beforeend', `<div class="msg yo">${esc(q)}</div>`);
    if (!WD.ai.tieneClave()) {
      const hits = buscarLocal(q);
      const txt = hits.length ? 'Esto encontré:' : 'Para responder preguntas necesito tu Gemini. Se conecta una sola vez, te llevo.';
      petHist.push({ de: 'el', texto: txt, hits });
      body.insertAdjacentHTML('beforeend', `<div class="msg el">${esc(txt)}</div>` + (hits.length ? hits.map(hitHTML).join('') : `<button class="hit" data-act="conectarGemini">Conectar mi Gemini <span class="k">1 minuto</span></button>`));
      body.scrollTop = body.scrollHeight; return;
    }
    petBusy = true; body.insertAdjacentHTML('beforeend', `<div class="msg el" id="pet-wait"><span class="spinner"></span></div>`); body.scrollTop = body.scrollHeight;
    try {
      let r = await WD.ai.preguntarMascota(q, petHist.slice(0, -1));
      const m = r.match(/IR:\s*(\w+)/i); const ir = m && WD.views[m[1].toLowerCase()] ? m[1].toLowerCase() : null; r = r.replace(/\n?IR:\s*\w+\s*$/i, '').trim();
      petHist.push({ de: 'el', texto: r, ir });
      document.getElementById('pet-wait').outerHTML = `<div class="msg el">${esc(r)}</div>${ir ? `<button class="hit" data-act="ir" data-to="${ir}">Ir a ${esc(WD.views[ir].titulo)} <span class="k">abrir</span></button>` : ''}`;
    } catch (e) { document.getElementById('pet-wait').outerHTML = `<div class="msg el">${esc(e.message)}</div>`; }
    petBusy = false; body.scrollTop = body.scrollHeight;
  };

  /* ---------- conectar Gemini (guiado por la mascota) ---------- */
  WD.act.conectarGemini = () => {
    const m = WD.mascota();
    const md = WD.modal(`<div class="row" style="align-items:flex-start;gap:14px"><div style="width:70px;flex:none">${m.svg}</div><div class="stack" style="flex:1;min-width:0"><h2>Conecta tu Gemini</h2><p class="muted small">Se hace una sola vez. Después funciona en todos tus dispositivos.</p></div></div>
      <ol class="stack small" style="margin:0;padding-left:20px">
        <li>Abre Google AI Studio con tu misma cuenta de Google.</li>
        <li>Toca <b>Create API key</b> (Crear clave) y cópiala.</li>
        <li>Regresa aquí y pégala. Yo la reviso solito.</li></ol>
      <a class="btn" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style="justify-content:center">Abrir Google AI Studio</a>
      <input class="in" id="gm-key" placeholder="Pega aquí tu clave de Gemini" autocomplete="off">
      <div class="small" id="gm-st" role="status"></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-act="cerrarModal">Después</button></div>`);
    const inp = md.querySelector('#gm-key'), st = md.querySelector('#gm-st');
    const probar = async () => {
      const v = inp.value.trim(); if (!WD.ai.pareceClave(v)) { if (v.length > 10) st.innerHTML = '<span style="color:var(--bad)">Eso no parece una clave completa. Cópiala otra vez desde Google AI Studio.</span>'; return; }
      st.innerHTML = '<span class="spinner"></span> Revisando tu clave…';
      try { await WD.ai.conectar(v); st.innerHTML = '<span style="color:var(--ok)">✓ ¡Listo! Tu Gemini quedó conectado.</span>'; setTimeout(() => { WD.cerrarModal(); WD.refrescar(); WD.toast('Gemini conectado'); }, 900); }
      catch (e) { st.innerHTML = `<span style="color:var(--bad)">${esc(e.message)}</span>`; }
    };
    inp.addEventListener('input', probar); inp.addEventListener('paste', () => setTimeout(probar, 30));
    window.addEventListener('focus', async function once() {
      window.removeEventListener('focus', once);
      if (!document.getElementById('gm-key') || inp.value) return;
      try { const t = await navigator.clipboard.readText(); if (WD.ai.pareceClave(t)) { inp.value = t.trim(); probar(); } } catch (_) {}
    });
  };
  WD.requiereIA = () => { if (WD.ai.tieneClave()) return true; WD.act.conectarGemini(); return false; };
})(window.WD);
