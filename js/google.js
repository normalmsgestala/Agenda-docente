/* Web Docente · inicio de sesión con Google, guardado en Google Drive y envío por Gmail
   Necesita un "ID de cliente OAuth" en config.js. Sin él la app funciona en modo local (este dispositivo). */
(function (WD) {
  'use strict';
  const SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.send';
  const CARPETA = 'Web Docente';
  const ARCHIVO = 'datos-web-docente.json';
  const CLAVE = 'config-gemini.json'; // la clave de Gemini del docente, en SU carpeta (solo la app la usa)
  let token = null, tokenExp = 0, tokenClient = null, carpetaId = null, archivoId = null;
  let subiendo = false, pendiente = false, timer = null;
  const estado = { modo: 'local', usuario: null, sync: 'sin-conexion', error: '' };
  const cbs = new Set();
  const emit = () => cbs.forEach((f) => f(estado));

  const configurado = () => !!(WD.CONFIG && WD.CONFIG.googleClientId);

  function cargarGIS() {
    return new Promise((res, rej) => {
      if (window.google?.accounts?.oauth2) return res();
      const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = () => res(); s.onerror = () => rej(new Error('No se pudo cargar el inicio de sesión de Google. Revisa tu internet.'));
      document.head.appendChild(s);
    });
  }
  function pedirToken(prompt) {
    return new Promise(async (res, rej) => {
      try { await cargarGIS(); } catch (e) { return rej(e); }
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: WD.CONFIG.googleClientId, scope: SCOPES, hint: WD.state.docente.correo || undefined,
        callback: (r) => { if (r.error) return rej(new Error('Google no dio acceso: ' + r.error)); token = r.access_token; tokenExp = Date.now() + (Number(r.expires_in) - 60) * 1000; guardarToken(); res(token); },
        error_callback: (e) => rej(new Error(e && e.type === 'popup_closed' ? 'Se cerró la ventana de Google antes de terminar.' : 'No se pudo iniciar sesión con Google.')),
      });
      tokenClient.requestAccessToken({ prompt });
    });
  }
  const guardarToken = () => WD.kv.set('sesion-google', { token, exp: tokenExp, usuario: estado.usuario || null });
  // Al abrir la app: si la sesión de Google sigue vigente, entra directo
  async function restaurarSesion() {
    const s = await WD.kv.get('sesion-google');
    if (!s || !s.token || !s.usuario || !(s.exp > Date.now())) return false;
    if (WD.state.docente.correo && s.usuario.correo !== WD.state.docente.correo) return false;
    token = s.token; tokenExp = s.exp; estado.modo = 'google'; estado.usuario = s.usuario; estado.sync = 'guardando';
    sincronizar().then(() => { estado.sync = estado.sync === 'guardando' ? 'guardado' : estado.sync; emit(); }).catch((e) => { estado.sync = 'pendiente'; estado.error = e.message; emit(); });
    return true;
  }
  const capitalizar = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  async function tok() { if (token && Date.now() < tokenExp) return token; return pedirToken(''); }
  async function api(url, opts = {}) {
    const t = await tok();
    const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${t}`, ...(opts.headers || {}) } });
    if (r.status === 401) { token = null; const t2 = await tok(); return fetch(url, { ...opts, headers: { Authorization: `Bearer ${t2}`, ...(opts.headers || {}) } }); }
    return r;
  }
  const DRIVE = 'https://www.googleapis.com/drive/v3';
  const UP = 'https://www.googleapis.com/upload/drive/v3';
  async function buscar(q, spaces = 'drive') {
    const r = await api(`${DRIVE}/files?q=${encodeURIComponent(q)}&spaces=${spaces}&fields=files(id,name,modifiedTime)`);
    if (!r.ok) throw new Error('Drive no respondió (' + r.status + ').');
    return (await r.json()).files || [];
  }
  async function crearArchivo(meta, contenido, mime = 'application/json') {
    const fd = new FormData();
    fd.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    fd.append('file', contenido instanceof Blob ? contenido : new Blob([contenido], { type: mime }));
    const r = await api(`${UP}/files?uploadType=multipart&fields=id`, { method: 'POST', body: fd });
    if (!r.ok) throw new Error('No pude crear el archivo en Drive.');
    return (await r.json()).id;
  }
  async function asegurarCarpeta() {
    if (carpetaId) return carpetaId;
    const f = await buscar(`name='${CARPETA}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    if (f.length) return (carpetaId = f[0].id);
    const r = await api(`${DRIVE}/files?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: CARPETA, mimeType: 'application/vnd.google-apps.folder' }) });
    return (carpetaId = (await r.json()).id);
  }
  const sinClave = (s) => { const c = JSON.parse(JSON.stringify(s)); c.ajustes.geminiKey = ''; return c; };

  async function subir() {
    if (estado.modo !== 'google') return;
    if (!navigator.onLine) { estado.sync = 'pendiente'; emit(); return; }
    if (subiendo) { pendiente = true; return; }
    subiendo = true; estado.sync = 'guardando'; emit();
    try {
      await asegurarCarpeta();
      const datos = JSON.stringify(sinClave(WD.state));
      if (!archivoId) {
        const f = await buscar(`name='${ARCHIVO}' and '${carpetaId}' in parents and trashed=false`);
        archivoId = f[0]?.id || await crearArchivo({ name: ARCHIVO, parents: [carpetaId] }, datos);
      }
      const r = await api(`${UP}/files/${archivoId}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: datos });
      if (!r.ok) throw new Error('Drive no guardó (' + r.status + ').');
      estado.sync = 'guardado'; estado.error = '';
    } catch (e) { estado.sync = 'pendiente'; estado.error = e.message; }
    subiendo = false; emit();
    if (pendiente) { pendiente = false; subir(); }
  }
  async function guardarClave(key) {
    await asegurarCarpeta();
    const f = await buscar(`name='${CLAVE}' and '${carpetaId}' in parents and trashed=false`);
    const body = JSON.stringify({ geminiKey: key, modelo: WD.state.ajustes.geminiModel });
    if (f[0]) await api(`${UP}/files/${f[0].id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
    else await crearArchivo({ name: CLAVE, parents: [carpetaId] }, body);
  }
  async function leerClave() {
    await asegurarCarpeta();
    const f = await buscar(`name='${CLAVE}' and '${carpetaId}' in parents and trashed=false`); if (!f[0]) return null;
    const r = await api(`${DRIVE}/files/${f[0].id}?alt=media`); return r.ok ? r.json() : null;
  }

  async function iniciarSesion(otraCuenta) {
    if (!configurado()) throw new Error('Falta configurar el ID de Google en config.js.');
    await pedirToken(otraCuenta ? 'select_account' : (WD.state.docente.correo ? '' : 'consent'));
    const u = await (await api('https://www.googleapis.com/oauth2/v3/userinfo')).json();
    // Otra cuenta en este dispositivo: se limpia lo local y se cargan SUS datos de SU Drive
    if (WD.state.docente.correo && u.email && WD.state.docente.correo !== u.email) {
      const tema = WD.state.ajustes.tema; WD.state = WD.blank(); WD.state.ajustes.tema = tema;
      for (const k of await WD.kv.keys()) if (String(k).startsWith('foto:')) await WD.kv.del(k);
      carpetaId = archivoId = null;
    }
    estado.modo = 'google'; estado.usuario = { nombre: capitalizar(u.name), correo: u.email, foto: u.picture };
    guardarToken();
    WD.state.docente.correo = u.email || WD.state.docente.correo;
    await sincronizar();
    if (!WD.state.docente.nombre) { WD.state.docente.nombre = capitalizar(u.name) || u.email; WD.save(); }
    try { const c = await leerClave(); if (c && c.geminiKey && !WD.state.ajustes.geminiKey) { WD.state.ajustes.geminiKey = c.geminiKey; WD.state.ajustes.geminiModel = c.modelo || ''; WD.save({ remoto: true }); } } catch (_) {}
    emit();
    return estado.usuario;
  }
  async function sincronizar() {
    await asegurarCarpeta();
    const f = await buscar(`name='${ARCHIVO}' and '${carpetaId}' in parents and trashed=false`);
    if (f[0]) {
      archivoId = f[0].id;
      const r = await api(`${DRIVE}/files/${archivoId}?alt=media`);
      if (r.ok) {
        const remoto = await r.json();
        if ((remoto.actualizado || 0) > (WD.state.actualizado || 0)) {
          const clave = WD.state.ajustes.geminiKey, modelo = WD.state.ajustes.geminiModel;
          const correo = WD.state.docente.correo; WD.replaceState(remoto); if (!WD.state.docente.correo) WD.state.docente.correo = correo; WD.state.ajustes.geminiKey = clave || WD.state.ajustes.geminiKey; WD.state.ajustes.geminiModel = modelo || WD.state.ajustes.geminiModel;
          estado.sync = 'guardado'; emit(); WD.render && WD.render(); return;
        }
      }
    }
    await subir();
  }
  function cerrarSesion() {
    if (token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {});
    token = null; estado.modo = 'local'; estado.usuario = null; estado.sync = 'sin-conexion'; carpetaId = archivoId = null;
    WD.kv.del('sesion-google'); WD.sinConexion = false; emit(); WD.render && WD.render();
  }

  /* Gmail: envía un correo HTML desde la cuenta del docente */
  async function enviarCorreo({ para, asunto, html }) {
    if (estado.modo !== 'google') throw new Error('Inicia sesión con Google para enviar correos.');
    const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
    const mime = [`To: ${para}`, `Subject: =?UTF-8?B?${b64(asunto)}?=`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(html)].join('\r\n');
    const raw = b64(mime).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const r = await api('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) });
    if (!r.ok) throw new Error('Gmail no envió el correo (' + r.status + ').');
  }
  async function subirFoto(nombre, dataURL) {
    if (estado.modo !== 'google') return;
    try {
      await asegurarCarpeta();
      let fotos = (await buscar(`name='Fotos' and '${carpetaId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`))[0]?.id;
      if (!fotos) { const r = await api(`${DRIVE}/files?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Fotos', mimeType: 'application/vnd.google-apps.folder', parents: [carpetaId] }) }); fotos = (await r.json()).id; }
      const blob = await (await fetch(dataURL)).blob();
      await crearArchivo({ name: nombre + '.jpg', parents: [fotos] }, blob, 'image/jpeg');
    } catch (e) { console.warn('Foto no subida a Drive', e); }
  }

  WD.onSave((opts) => {
    if (estado.modo !== 'google' || opts.remoto) return;
    if (opts.clave) guardarClave(WD.state.ajustes.geminiKey).catch(() => {});
    clearTimeout(timer); timer = setTimeout(subir, 1500);
  });
  window.addEventListener('online', () => { if (estado.modo === 'google' && estado.sync === 'pendiente') subir(); });

  WD.google = { configurado, iniciarSesion, restaurarSesion, cerrarSesion, enviarCorreo, subirFoto, estado, onCambio: (f) => cbs.add(f), subir };
})(window.WD);
