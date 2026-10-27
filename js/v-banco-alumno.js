/* Web Docente · Banco Estala en el celular del alumno (sin iniciar sesión).
   Lee su archivo público de solo lectura. Las operaciones (transferir, pagar) generan un código firmado con su NIP
   que el alumno muestra en la Consulta de saldo del salón; ahí se aplican. */
(function (WD) {
  'use strict';
  const { esc } = WD;

  // firma corta: SHA-256 de "NIP|solicitud"
  WD.firmaBanco = async (pin, carga) => {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${pin}|${carga}`));
    return [...new Uint8Array(h)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
  };
  const limpia = (s) => String(s || '').replace(/[|\n\r]/g, ' ').trim().slice(0, 60);

  let D = null, fileId = '', filtro = 'todos';
  const oculto = () => { try { return localStorage.getItem('wdb-oculto') === '1'; } catch (_) { return false; } };
  const din = (n) => `${D.simbolo} ${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const fecha = (s) => new Date(String(s).slice(0, 10) + 'T12:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  const root = () => document.getElementById('app');

  WD.saldoAlumno = async (id) => {
    fileId = id;
    root().innerHTML = '<div class="welcome"><div class="box card stack" style="text-align:center;justify-items:center"><span class="spinner"></span><p class="muted" style="margin:0">Buscando tu cuenta…</p></div></div>';
    const key = WD.CONFIG.googleApiKey;
    const error = (t) => { root().innerHTML = `<div class="welcome"><div class="box card stack" style="text-align:center;justify-items:center"><div class="label">Banco Estala</div><p style="margin:0">${esc(t)}</p><button class="btn sm" onclick="location.reload()">Intentar de nuevo</button></div></div>`; };
    if (!key) return error('La consulta desde el celular aún no está lista. Pídele a tu maestro que la active.');
    try {
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(key)}&t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status === 404 ? 'Esta tarjeta ya no está activa. Pídele una nueva a tu maestro.' : 'No pude leer tu cuenta. Revisa tu internet e intenta de nuevo.');
      D = await r.json(); pintar();
    } catch (e) { error(e.message); }
  };

  function pintar() {
    const ms = (D.movs || []).filter((m) => filtro === 'todos' || (filtro === 'entradas' ? m.c > 0 : m.c < 0));
    const avisos = D.aviso ? 1 : 0;
    root().innerHTML = `<div class="ba">
      <header class="ba-top"><div style="flex:1;min-width:0"><div class="small" style="opacity:.8">Hola,</div><div class="ba-nom">${esc(D.nombre)}</div><div class="small" style="opacity:.8;font-family:ui-monospace,monospace">${esc(D.grupo)} · ${esc(D.cuenta)}${D.puesto ? ` · ${esc(D.puesto)}` : ''}</div></div>
        <button class="ba-ico" data-act="baAvisos" aria-label="Avisos">${WD.icon('campana')}${avisos ? '<i></i>' : ''}</button></header>
      <section class="ba-card"><div class="row"><div class="label" style="flex:1;color:inherit;opacity:.8">${esc(D.banco)}</div><span class="small" style="opacity:.8">Mi tarjeta</span></div>
        <div class="row" style="gap:10px;margin-top:12px"><span class="small" style="opacity:.85">Mi dinero disponible</span><button class="ba-ojo" data-act="baOjo" aria-label="${oculto() ? 'Mostrar saldo' : 'Ocultar saldo'}">${WD.icon(oculto() ? 'ojo' : 'ojoNo')}</button></div>
        <div class="ba-saldo">${oculto() ? `${esc(D.simbolo)} ••••` : din(D.saldo)}</div>
        <div class="row small" style="opacity:.85;margin-top:10px"><span style="flex:1;font-family:ui-monospace,monospace">Cuenta •••• ${esc(String(D.cuenta).slice(-4))}</span>${D.prestamo ? `<span class="ba-tag">Préstamo: debes ${din(D.prestamo)}</span>` : ''}${(D.recibos || []).length ? `<span class="ba-tag">${D.recibos.length} recibo${D.recibos.length > 1 ? 's' : ''} por pagar</span>` : ''}</div></section>
      <nav class="ba-acc">
        <button data-act="baTransferir">${WD.icon('enviar')}<span>Transferir</span></button>
        <button data-act="baPagar">${WD.icon('recibo')}<span>Pagar</span></button>
        <button data-act="baTarjeta">${WD.icon('qr')}<span>Mi tarjeta</span></button>
        <button data-act="baEstado">${WD.icon('documento')}<span>Estado</span></button></nav>
      <section class="stack" style="gap:10px"><div class="row"><h2 style="flex:1;margin:0;font-size:19px">Mis movimientos</h2>
        <div class="tabs">${[['todos', 'Todos'], ['entradas', '+ Entradas'], ['salidas', '− Salidas']].map(([k, t]) => `<button class="${filtro === k ? 'on' : ''}" data-act="baFiltro" data-f="${k}">${t}</button>`).join('')}</div></div>
        <div class="card" style="padding:4px 14px">${ms.length ? ms.slice(0, 12).map(filaMov).join('') : '<p class="muted small" style="text-align:center;margin:18px 0">No hay movimientos en esta sección.</p>'}</div></section>
      <p class="tiny muted" style="text-align:center;margin:0">${esc(D.banco)} · ${esc(D.grupo)} · Actualizado ${esc(new Date(D.act).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }))}</p>
      <button class="btn sm" style="justify-self:center" onclick="location.reload()">Actualizar</button></div>`;
  }
  const filaMov = (m) => `<div class="ba-mov"><span class="small muted" style="width:52px">${fecha(m.f)}</span><span style="flex:1;min-width:0">${esc(m.m)}</span><b style="color:${m.c > 0 ? 'var(--ok)' : 'var(--bad)'}">${m.c > 0 ? '+' : '−'}${din(Math.abs(m.c))}</b></div>`;
  const hoja = (titulo, html) => { const m = WD.modal(`<div class="row"><h2 style="flex:1">${esc(titulo)}</h2><button class="x" data-act="cerrarModal" aria-label="Cerrar">×</button></div>${html}`); return m; };
  const qrGrande = (txt) => {
    if (typeof window.qrcode !== 'function') return '';
    const q = window.qrcode(0, 'M'); q.addData(txt); q.make(); const n = q.getModuleCount(); let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 3} ${r + 3}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n + 6} ${n + 6}" style="width:min(300px,78vw);height:auto;border-radius:12px;justify-self:center" shape-rendering="crispEdges" role="img" aria-label="Código para la ventanilla"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  };
  async function codigoSolicitud(tipo, a, monto, motivo, pin) {
    const carga = ['WDB1', tipo, D.cuenta, a, String(monto), limpia(motivo), String(Date.now()), Math.random().toString(36).slice(2, 10)].join('|');
    return `${carga}|${await WD.firmaBanco(pin, carga)}`;
  }
  const mostrarCodigo = (titulo, resumen, codigo) => hoja(titulo, `<p style="margin:0">${resumen}</p>${qrGrande(codigo)}
    <p class="small" style="margin:0"><b>Para terminar:</b> muestra este código a la cámara en la <b>Consulta de saldo</b> del salón. Vale por 2 horas y solo se puede usar una vez.</p>
    <p class="tiny muted" style="margin:0">Si escribiste mal tu NIP, el banco lo rechazará y no se moverá tu dinero.</p>`);

  WD.act.baFiltro = (el) => { filtro = el.dataset.f; pintar(); };
  WD.act.baOjo = () => { try { localStorage.setItem('wdb-oculto', oculto() ? '0' : '1'); } catch (_) {} pintar(); };
  WD.act.baAvisos = () => hoja('Avisos', D.aviso ? `<p style="margin:0;white-space:pre-line">${esc(D.aviso)}</p>${D.avisoFecha ? `<p class="tiny muted" style="margin:0">${esc(fecha(D.avisoFecha))}</p>` : ''}` : '<p class="muted" style="margin:0">No hay avisos por ahora.</p>');
  WD.act.baTarjeta = () => hoja('Mi tarjeta', `${qrGrande(location.href.split('#')[0] + '#s/' + fileId)}<div style="text-align:center;font-family:ui-monospace,monospace;font-size:24px;letter-spacing:.1em">${esc(D.cuenta)}</div>
    <p class="small muted" style="margin:0;text-align:center">Muéstralo en la Consulta de saldo del salón. Para recibir una transferencia, da este número de cuenta.</p>`);
  WD.act.baEstado = () => hoja('Estado de cuenta', `<div class="row"><span style="flex:1">Saldo actual</span><b style="font-size:20px">${din(D.saldo)}</b></div>
    ${D.prestamo ? `<div class="row"><span style="flex:1">Préstamo pendiente</span><b style="color:var(--bad)">${din(D.prestamo)}</b></div>` : ''}
    ${(D.recibos || []).map((r) => `<div class="row"><span style="flex:1">${esc(r.n)} <span class="tiny muted">vence ${fecha(r.v)}</span></span><b style="color:var(--bad)">${din(r.t)}</b></div>`).join('')}
    <div class="sep"></div><div class="label">Movimientos</div>${(D.movs || []).map((m) => `${filaMov(m)}`).join('') || '<p class="muted small">Sin movimientos.</p>'}`);
  WD.act.baTransferir = () => {
    const m = hoja('Transferir', `<form class="stack" id="ba-tx">
      <label class="field"><span>Cuenta de tu compañero</span><div class="row" style="gap:6px;flex-wrap:nowrap"><span style="font-family:ui-monospace,monospace">EST-</span><input class="in" name="a" inputmode="numeric" pattern="\\d{3,6}" required placeholder="1003"></div></label>
      <div class="grid g2"><label class="field"><span>Cantidad</span><input class="in" name="monto" type="number" min="1" step="0.5" max="${D.saldo}" required></label><label class="field"><span>Tu NIP</span><input class="in" name="pin" type="password" inputmode="numeric" maxlength="6" required autocomplete="off"></label></div>
      <label class="field"><span>Motivo</span><input class="in" name="motivo" required maxlength="60" placeholder="Ej. Me prestó sus colores"></label>
      <p class="tiny muted" style="margin:0">Tienes ${din(D.saldo)}.</p><button class="btn pri">Generar código</button></form>`);
    m.querySelector('#ba-tx').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target; const a = `EST-${f.a.value.trim()}`; const monto = Number(f.monto.value);
      if (a === D.cuenta) { WD.toast('No puedes transferirte a ti mismo.'); return; }
      if (monto > D.saldo) { WD.toast(`No te alcanza: tienes ${din(D.saldo)}.`); return; }
      mostrarCodigo('Transferencia lista', `Enviar <b>${din(monto)}</b> a la cuenta <b>${esc(a)}</b> · ${esc(f.motivo.value)}`, await codigoSolicitud('tx', a, monto, f.motivo.value, f.pin.value.trim()));
    };
  };
  WD.act.baPagar = () => {
    const rs = D.recibos || [];
    if (!rs.length && !D.prestamo) { hoja('Pagar', '<p class="muted" style="margin:0">No tienes recibos ni préstamos por pagar.</p>'); return; }
    const m = hoja('Pagar', `<form class="stack" id="ba-pg">${rs.map((r) => `<label class="row" style="gap:10px"><input type="checkbox" name="r" value="${esc(r.id || '')}" data-t="${r.t}" checked><span style="flex:1">${esc(r.n)} <span class="tiny muted">vence ${fecha(r.v)}</span></span><b>${din(r.t)}</b></label>`).join('')}
      ${D.prestamo ? `<label class="row" style="gap:10px"><input type="checkbox" name="r" value="prestamo" data-t="${D.prestamo}" ${rs.length ? '' : 'checked'}><span style="flex:1">Abonar a mi préstamo</span><b>${din(D.prestamo)}</b></label>` : ''}
      <div class="row"><span style="flex:1">Total</span><b id="ba-tot"></b></div>
      <label class="field"><span>Tu NIP</span><input class="in" name="pin" type="password" inputmode="numeric" maxlength="6" required autocomplete="off"></label>
      <button class="btn pri">Generar código</button></form>`);
    const f = m.querySelector('#ba-pg'); const tot = () => [...f.querySelectorAll('[name=r]:checked')].reduce((t, x) => t + Number(x.dataset.t), 0);
    const upd = () => { m.querySelector('#ba-tot').textContent = din(tot()); }; f.addEventListener('change', upd); upd();
    f.onsubmit = async (e) => {
      e.preventDefault(); const ids = [...f.querySelectorAll('[name=r]:checked')].map((x) => x.value).filter(Boolean); const t = tot();
      if (!ids.length) { WD.toast('Elige qué vas a pagar.'); return; }
      if (t > D.saldo && !(ids.length === 1 && ids[0] === 'prestamo')) { WD.toast(`No te alcanza: tienes ${din(D.saldo)} y son ${din(t)}.`); return; }
      mostrarCodigo('Pago listo', `Pagar <b>${din(Math.min(t, D.saldo))}</b>`, await codigoSolicitud('pago', ids.join(','), t, 'Pago desde el celular', f.pin.value.trim()));
    };
  };
})(window.WD);
