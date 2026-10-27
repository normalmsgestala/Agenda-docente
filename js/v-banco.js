/* Web Docente · Banco Estala: economía del aula con cuentas, sueldos, servicios, recibos, préstamos y billetes */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const PUESTOS = ['Banquero Oficial', 'Jefe(a) de Grupo', 'Encargado(a) de Biblioteca', 'Comité de Limpieza y Orden', 'Secretario(a) de Asistencia', 'Repartidor(a) de Materiales', 'Tesorero(a) Auxiliar', 'Mediador(a) de Convivencia', 'Comité de Ecología y Plantas', 'Guardián del Orden y Fila', 'Encargado(a) de Tecnología / Audio'];
  const SERVICIOS = [
    ['Renta de pupitre', 'Uso de tu banca y casillero.', 15, 'renta', 5, true], ['Luz del salón', 'Electricidad y ventilación.', 10, 'servicio', 5, true],
    ['Aseo del aula', 'Limpieza y botes de basura.', 5, 'servicio', 5, true], ['SAT / Impuesto escolar', 'Fondo para premios del grupo.', 20, 'impuesto', 10, true],
    ['Internet y tablets', 'Uso de internet del aula.', 12, 'servicio', 5, false], ['Material y colores', 'Hojas y plumones para clases.', 8, 'material', 5, false],
  ];
  const PREMIOS = [['Examen de 10', 25], ['Participación', 10], ['Apoyo en limpieza', 15], ['Tarea completa', 10]];
  const MULTAS = [['Sin tarea', 15], ['Retardo', 10], ['Basura en la banca', 12], ['Reposición de material', 8]];
  const DIA = 864e5;

  function B() {
    const s = WD.state; if (!s.banco) s.banco = {};
    const b = s.banco;
    b.ajustes = Object.assign({ nombre: 'Banco Estala', moneda: 'Estala Billetes', simbolo: 'EB$', saldoInicial: 50, prestamoMax: 20 }, b.ajustes || {});
    b.cuentas = b.cuentas || {}; b.movs = b.movs || []; b.recibos = b.recibos || []; b.prestamos = b.prestamos || [];
    if (!b.servicios) b.servicios = SERVICIOS.map(([nombre, desc, costo, cat, interes, auto]) => ({ id: WD.uid(), nombre, desc, costo, cat, interes, auto }));
    return b;
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  const din = (n) => `${B().ajustes.simbolo} ${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;
  // abre cuenta a cada alumno activo que aún no tenga
  function abrirCuentas() {
    const b = B(); let cambio = false;
    WD.alumnosActivos().forEach((a) => {
      if (b.cuentas[a.id]) return;
      const nums = Object.values(b.cuentas).map((c) => Number(String(c.num).replace(/\D/g, '')) || 1000);
      b.cuentas[a.id] = { num: `EST-${Math.max(1000, ...nums) + 1}`, saldo: 0, puesto: '', sueldo: 0, abierta: new Date().toISOString() };
      if (b.ajustes.saldoInicial > 0) mover(a.id, b.ajustes.saldoInicial, 'apertura', 'Apertura de cuenta y saldo inicial', { sinPrestamo: true });
      cambio = true;
    });
    if (cambio) WD.save();
  }
  const cta = (id) => B().cuentas[id];
  const prestamoActivo = (id) => B().prestamos.find((p) => p.al === id && p.estado === 'activo' && p.resta > 0);
  // mueve dinero; los ingresos pagan primero el préstamo activo
  function mover(alId, monto, tipo, motivo, op = {}) {
    const b = B(); const c = cta(alId); if (!c || !monto) return 0;
    const fecha = new Date().toISOString(); let neto = r2(monto);
    if (neto > 0 && !op.sinPrestamo) {
      const p = prestamoActivo(alId);
      if (p) { const abono = r2(Math.min(p.resta, neto)); p.resta = r2(p.resta - abono); neto = r2(neto - abono); if (p.resta <= 0) { p.estado = 'pagado'; p.pagado = fecha; }
        b.movs.push({ id: WD.uid(), al: alId, fecha, tipo: 'abono_prestamo', monto: 0, motivo: `Descuento automático al préstamo: ${din(abono)}${p.estado === 'pagado' ? ' · préstamo liquidado' : ` · resta ${din(p.resta)}`}`, saldo: c.saldo }); }
    }
    if (neto < 0 && !op.permitirNegativo) neto = -Math.min(c.saldo, -neto);
    c.saldo = r2(c.saldo + neto);
    b.movs.push({ id: WD.uid(), al: alId, fecha, tipo, monto: neto, motivo, saldo: c.saldo, con: op.con || '' });
    return neto;
  }
  function recargo(r) {
    const s = B().servicios.find((x) => x.id === r.servicio); const tasa = s ? s.interes : 5;
    const sem = r.estado === 'pendiente' ? Math.max(0, Math.ceil((Date.now() - new Date(r.vence)) / (7 * DIA))) : 0;
    return r2(r.monto * (tasa / 100) * sem);
  }
  const recibosDe = (id) => B().recibos.filter((r) => r.al === id && r.estado === 'pendiente');
  const debe = (id) => r2(recibosDe(id).reduce((t, r) => t + r.monto + recargo(r), 0) + (prestamoActivo(id)?.resta || 0));
  const lunes = () => WD.iso(WD.lunesDe(new Date()));

  let tab = 'cuentas';
  WD.act.bTab = (el) => { tab = el.dataset.t; WD.refrescar(); };

  /* ---------- abonar / cobrar ---------- */
  WD.act.bOperar = (el) => {
    const signo = el.dataset.s === '-' ? -1 : 1; const pre = el.dataset.al ? [el.dataset.al] : [];
    const sel = new Set(pre); const als = WD.alumnosActivos();
    const pintar = (box) => {
      box.querySelector('#bo-als').innerHTML = als.map((a) => `<button type="button" class="dg-it ${sel.has(a.id) ? 'on' : ''}" data-id="${a.id}">${esc(a.num ? a.num + '. ' : '')}${esc(a.nombres || WD.nombreCompleto(a))}</button>`).join('');
      box.querySelector('#bo-n').textContent = sel.size ? `${sel.size} alumno${sel.size > 1 ? 's' : ''}` : 'Elige a quién';
    };
    WD.abrirDrawer(signo > 0 ? 'Abonar dinero' : 'Cobrar dinero', `<form class="stack" data-form="bOperar" data-s="${signo}">
      <div class="row"><div class="label" style="flex:1">¿A quién?</div><span class="small muted" id="bo-n"></span><button type="button" class="btn sm ghost" id="bo-todos">Todos</button><button type="button" class="btn sm ghost" id="bo-nadie">Ninguno</button></div>
      <div class="dg-its" id="bo-als"></div>
      <div class="label">Motivos rápidos</div>
      <div class="dg-its">${(signo > 0 ? PREMIOS : MULTAS).map(([m, v]) => `<button type="button" class="dg-it" data-m="${esc(m)}" data-v="${v}">${esc(m)} · ${v}</button>`).join('')}</div>
      <div class="grid g2"><label class="field"><span>Cantidad (${esc(B().ajustes.simbolo)})</span><input class="in" type="number" min="0.5" step="0.5" name="monto" required></label>
      <label class="field"><span>Motivo</span><input class="in" name="motivo" required placeholder="${signo > 0 ? 'Ej. Ganó la tómbola' : 'Ej. Tirar basura'}"></label></div>
      <button class="btn pri" style="justify-self:start">${signo > 0 ? 'Abonar' : 'Cobrar'}</button>
      ${signo < 0 ? '<p class="tiny muted" style="margin:0">Si no le alcanza, se le cobra hasta dejarlo en cero.</p>' : '<p class="tiny muted" style="margin:0">Si el alumno tiene un préstamo, el abono paga primero su deuda.</p>'}</form>`, (box) => {
      pintar(box);
      box.querySelector('#bo-als').addEventListener('click', (e) => { const t = e.target.closest('[data-id]'); if (!t) return; sel.has(t.dataset.id) ? sel.delete(t.dataset.id) : sel.add(t.dataset.id); pintar(box); });
      box.querySelector('#bo-todos').onclick = () => { als.forEach((a) => sel.add(a.id)); pintar(box); };
      box.querySelector('#bo-nadie').onclick = () => { sel.clear(); pintar(box); };
      box.querySelectorAll('[data-m]').forEach((t) => (t.onclick = () => { box.querySelector('[name=monto]').value = t.dataset.v; box.querySelector('[name=motivo]').value = t.dataset.m; }));
      box.querySelector('form')._sel = sel;
    });
  };
  WD.act.form_bOperar = (f) => {
    const sel = [...(f._sel || [])]; if (!sel.length) { WD.toast('Elige al menos un alumno.'); return; }
    const s = Number(f.dataset.s); const m = Number(f.monto.value); const motivo = f.motivo.value.trim();
    sel.forEach((id) => mover(id, s * m, s > 0 ? 'abono' : 'cargo', motivo)); WD.save(); WD.cerrarDrawer(); WD.refrescar();
    WD.toast(`${s > 0 ? 'Abonado' : 'Cobrado'} ${din(m)} a ${sel.length} alumno${sel.length > 1 ? 's' : ''}`);
  };

  /* ---------- transferencia ---------- */
  WD.act.bTransferir = (el) => {
    const als = WD.alumnosActivos(); const op = (s) => als.map((a) => `<option value="${a.id}" ${a.id === s ? 'selected' : ''}>${esc(WD.nombreLista(a))} · ${din(cta(a.id)?.saldo)}</option>`).join('');
    WD.abrirDrawer('Transferencia entre alumnos', `<form class="stack" data-form="bTransferir">
      <label class="field"><span>Envía</span><select class="in" name="de">${op(el.dataset.al)}</select></label>
      <label class="field"><span>Recibe</span><select class="in" name="a">${op(als.find((a) => a.id !== el.dataset.al)?.id)}</select></label>
      <div class="grid g2"><label class="field"><span>Cantidad</span><input class="in" type="number" min="0.5" step="0.5" name="monto" required></label><label class="field"><span>Motivo</span><input class="in" name="motivo" required placeholder="Ej. Pago por préstamo de colores"></label></div>
      <button class="btn pri" style="justify-self:start">Transferir</button></form>`);
  };
  WD.act.form_bTransferir = (f) => {
    const de = f.de.value, a = f.a.value, m = Number(f.monto.value); if (de === a) { WD.toast('Elige dos alumnos distintos.'); return; }
    if (cta(de).saldo < m) { WD.toast(`No le alcanza: tiene ${din(cta(de).saldo)}.`); return; }
    const nd = WD.nombreCompleto(WD.state.alumnos.find((x) => x.id === de)), na = WD.nombreCompleto(WD.state.alumnos.find((x) => x.id === a));
    mover(de, -m, 'transferencia', `Transferencia a ${na}: ${f.motivo.value}`, { con: a }); mover(a, m, 'transferencia', `Transferencia de ${nd}: ${f.motivo.value}`, { con: de });
    WD.save(); WD.cerrarDrawer(); WD.refrescar(); WD.toast('Transferencia hecha');
  };

  /* ---------- sueldos y cobro semanal ---------- */
  WD.act.bSueldos = async () => {
    const b = B(); const als = WD.alumnosActivos().filter((a) => cta(a.id)?.sueldo > 0);
    if (!als.length) { WD.toast('Primero asigna puesto y sueldo en la cuenta de cada alumno.'); return; }
    const total = als.reduce((t, a) => t + cta(a.id).sueldo, 0);
    const ya = b.ultimoSueldo && b.ultimoSueldo >= lunes() ? '<br><b>Ya pagaste sueldos esta semana.</b>' : '';
    if (!(await WD.confirmar('Pagar sueldos de la semana', `Se pagará a ${als.length} alumnos con puesto, ${din(total)} en total.${ya}`, 'Pagar sueldos'))) return;
    als.forEach((a) => mover(a.id, cta(a.id).sueldo, 'sueldo', `Sueldo semanal · ${cta(a.id).puesto || 'Comisión'}`)); b.ultimoSueldo = WD.iso(new Date()); WD.save(); WD.refrescar(); WD.toast('Sueldos pagados');
  };
  WD.act.bCobro = () => {
    const b = B(); const ya = b.ultimoCobro && b.ultimoCobro >= lunes();
    WD.abrirDrawer('Cobro semanal de servicios', `<form class="stack" data-form="bCobro">
      ${ya ? '<p class="small" style="margin:0;color:var(--warn)">Ya hiciste un cobro esta semana.</p>' : ''}
      <div class="label">Servicios a cobrar</div>
      ${b.servicios.map((s) => `<label class="row" style="gap:10px"><input type="checkbox" name="sv" value="${s.id}" ${s.auto ? 'checked' : ''}><span style="flex:1">${esc(s.nombre)} <span class="tiny muted">${esc(s.desc)}</span></span><b>${din(s.costo)}</b></label>`).join('')}
      <div class="label">¿Cómo se cobra?</div>
      <label class="row" style="gap:10px"><input type="radio" name="modo" value="directo" checked><span>Descontar ya del saldo</span></label>
      <label class="row" style="gap:10px"><input type="radio" name="modo" value="recibos"><span>Generar recibos para pagar en 7 días (con recargo semanal si se atrasan)</span></label>
      <button class="btn pri" style="justify-self:start">Cobrar a todo el grupo</button></form>`);
  };
  WD.act.form_bCobro = (f) => {
    const b = B(); const ids = [...f.querySelectorAll('[name=sv]:checked')].map((x) => x.value); const svs = b.servicios.filter((s) => ids.includes(s.id));
    if (!svs.length) { WD.toast('Elige al menos un servicio.'); return; }
    const als = WD.alumnosActivos(); const modo = f.modo.value; const vence = new Date(Date.now() + 7 * DIA).toISOString();
    als.forEach((a) => {
      if (modo === 'directo') mover(a.id, -svs.reduce((t, s) => t + s.costo, 0), 'servicio', `Cobro semanal: ${svs.map((s) => s.nombre).join(', ')}`);
      else svs.forEach((s) => b.recibos.push({ id: WD.uid(), al: a.id, servicio: s.id, nombre: s.nombre, monto: s.costo, vence, estado: 'pendiente', creado: new Date().toISOString() }));
    });
    b.ultimoCobro = WD.iso(new Date()); WD.save(); WD.cerrarDrawer(); WD.refrescar(); WD.toast(modo === 'directo' ? 'Cobro aplicado' : 'Recibos generados');
  };
  WD.act.bPagarRecibo = (el) => {
    const r = B().recibos.find((x) => x.id === el.dataset.id); const tot = r2(r.monto + recargo(r)); const c = cta(r.al);
    if (c.saldo < tot) { WD.toast(`No le alcanza: tiene ${din(c.saldo)} y debe ${din(tot)}.`); return; }
    mover(r.al, -tot, 'servicio', `Pago de recibo: ${r.nombre}${tot > r.monto ? ` (con recargo de ${din(tot - r.monto)})` : ''}`); r.estado = 'pagado'; r.pagado = new Date().toISOString(); r.total = tot;
    WD.save(); abrirCuenta(r.al); WD.refrescar();
  };
  WD.act.bCancelarRecibo = async (el) => { if (!(await WD.confirmar('Cancelar recibo', 'El alumno ya no deberá este recibo.', 'Cancelar recibo'))) return; const r = B().recibos.find((x) => x.id === el.dataset.id); r.estado = 'cancelado'; WD.save(); abrirCuenta(r.al); WD.refrescar(); };

  /* ---------- préstamos ---------- */
  WD.act.form_bPrestamo = (f) => {
    const id = f.dataset.al; const m = Number(f.monto.value); const max = B().ajustes.prestamoMax;
    if (prestamoActivo(id)) { WD.toast('Ya tiene un préstamo activo. Debe liquidarlo primero.'); return; }
    if (!(m > 0) || m > max) { WD.toast(`El préstamo debe ser mayor a 0 y máximo de ${din(max)}.`); return; }
    mover(id, m, 'prestamo', `Préstamo: ${f.motivo.value || 'autorizado por el banco'}`, { sinPrestamo: true });
    B().prestamos.push({ id: WD.uid(), al: id, monto: m, resta: m, fecha: new Date().toISOString(), estado: 'activo', motivo: f.motivo.value }); WD.save(); abrirCuenta(id); WD.refrescar(); WD.toast('Préstamo otorgado');
  };
  WD.act.bAbonarPrestamo = (el) => {
    const p = prestamoActivo(el.dataset.al); const c = cta(el.dataset.al); const ab = r2(Math.min(p.resta, c.saldo)); if (!ab) { WD.toast('No tiene saldo para abonar.'); return; }
    mover(el.dataset.al, -ab, 'abono_prestamo', 'Abono a préstamo en ventanilla'); p.resta = r2(p.resta - ab); if (p.resta <= 0) { p.estado = 'pagado'; p.pagado = new Date().toISOString(); }
    WD.save(); abrirCuenta(el.dataset.al); WD.refrescar(); WD.toast(p.estado === 'pagado' ? 'Préstamo liquidado' : `Abonó ${din(ab)}`);
  };

  /* ---------- ficha de cuenta ---------- */
  function abrirCuenta(id) {
    const a = WD.state.alumnos.find((x) => x.id === id); const c = cta(id); const p = prestamoActivo(id); const rs = recibosDe(id);
    const movs = B().movs.filter((m) => m.al === id).slice(-12).reverse();
    WD.abrirDrawer(WD.nombreCompleto(a), `
      <div class="row"><div style="flex:1"><div class="label">Saldo</div><div style="font-size:34px;font-weight:700;letter-spacing:-.02em">${din(c.saldo)}</div></div>${debe(id) ? `<span class="pill bad">Debe ${din(debe(id))}</span>` : '<span class="pill ok">Sin deudas</span>'}</div>
      <div class="row"><button class="btn pri" data-act="bOperar" data-al="${id}">Abonar</button><button class="btn" data-act="bOperar" data-s="-" data-al="${id}">Cobrar</button><button class="btn" data-act="bTransferir" data-al="${id}">Transferir</button><button class="btn" data-act="bEstado" data-al="${id}">${WD.icon('imprimir')} Estado de cuenta</button></div>
      <div class="grid g2"><label class="field"><span>Puesto o comisión</span><input class="in" list="b-puestos" data-bind="banco.cuentas.${id}.puesto" value="${esc(c.puesto || '')}" placeholder="Sin puesto"><datalist id="b-puestos">${PUESTOS.map((x) => `<option>${esc(x)}</option>`).join('')}</datalist></label>
        <label class="field"><span>Sueldo semanal</span><input class="in" type="number" min="0" data-bind="banco.cuentas.${id}.sueldo" value="${c.sueldo || 0}"></label></div>
      <div class="sep"></div>
      <div class="label">Préstamo</div>
      ${p ? `<div class="row"><span style="flex:1">Debe <b>${din(p.resta)}</b> de ${din(p.monto)} · ${esc(WD.fechaLarga(p.fecha.slice(0, 10)))}</span><button class="btn sm" data-act="bAbonarPrestamo" data-al="${id}">Abonar con su saldo</button></div><p class="tiny muted" style="margin:0">Todo lo que gane paga primero este préstamo.</p>`
        : `<form class="row" data-form="bPrestamo" data-al="${id}"><input class="in" type="number" name="monto" min="1" max="${B().ajustes.prestamoMax}" step="0.5" placeholder="Hasta ${B().ajustes.prestamoMax}" style="max-width:130px" required><input class="in" name="motivo" placeholder="Motivo" style="flex:1;min-width:120px"><button class="btn sm">Prestar</button></form>`}
      <div class="label">Recibos pendientes</div>
      ${rs.length ? rs.map((r) => { const rc = recargo(r); return `<div class="row"><span style="flex:1">${esc(r.nombre)} <span class="tiny muted">vence ${esc(WD.fechaLarga(r.vence.slice(0, 10)))}</span></span><b>${din(r.monto + rc)}</b>${rc ? `<span class="pill bad">+${din(rc)} recargo</span>` : ''}<button class="btn sm" data-act="bPagarRecibo" data-id="${r.id}">Pagar</button><button class="btn sm ghost" data-act="bCancelarRecibo" data-id="${r.id}" aria-label="Cancelar recibo">×</button></div>`; }).join('') : '<p class="small muted" style="margin:0">No tiene recibos por pagar.</p>'}
      <div class="sep"></div>
      <div class="label">Últimos movimientos</div>
      ${movs.length ? `<div class="tbl-wrap"><table class="tbl"><tbody>${movs.map(filaMov).join('')}</tbody></table></div>` : '<p class="small muted">Sin movimientos.</p>'}`, null, `Cuenta ${esc(c.num)}${c.puesto ? ` · ${esc(c.puesto)}` : ''}`);
  }
  const filaMov = (m) => `<tr><td class="small muted">${esc(new Date(m.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }))}</td><td class="small" style="white-space:normal">${esc(m.motivo)}</td><td class="r" style="color:${m.monto > 0 ? 'var(--ok)' : m.monto < 0 ? 'var(--bad)' : 'var(--muted)'}">${m.monto > 0 ? '+' : ''}${m.monto ? din(m.monto) : ''}</td><td class="r small muted">${din(m.saldo)}</td></tr>`;
  WD.act.bCuenta = (el) => abrirCuenta(el.dataset.al);

  /* ---------- impresos ---------- */
  const enc = () => { const b = B(); return `${WD.membrete()}<h2>${esc(b.ajustes.nombre.toUpperCase())}</h2>`; };
  WD.act.bEstado = (el) => {
    const ids = el.dataset.al ? [el.dataset.al] : WD.alumnosActivos().map((a) => a.id);
    const html = ids.map((id, i) => { const a = WD.state.alumnos.find((x) => x.id === id); const c = cta(id); const ms = B().movs.filter((m) => m.al === id).slice(-25);
      return `<div style="${i ? 'page-break-before:always' : ''}">${enc()}<p style="text-align:center;margin-top:-8px">ESTADO DE CUENTA · ${esc(WD.fechaLarga(WD.iso(new Date())))}</p>
        <p><b>Titular:</b> ${esc(WD.nombreCompleto(a))} &nbsp; <b>Cuenta:</b> ${esc(c.num)} &nbsp; <b>Puesto:</b> ${esc(c.puesto || '—')}</p>
        <table><thead><tr><th>Fecha</th><th>Concepto</th><th>Importe</th><th>Saldo</th></tr></thead><tbody>${ms.map((m) => `<tr><td>${esc(new Date(m.fecha).toLocaleDateString('es-MX'))}</td><td>${esc(m.motivo)}</td><td style="text-align:right">${m.monto ? din(m.monto) : ''}</td><td style="text-align:right">${din(m.saldo)}</td></tr>`).join('')}</tbody></table>
        <p style="text-align:right;font-size:13pt"><b>Saldo actual: ${din(c.saldo)}</b>${debe(id) ? ` · Adeudo: ${din(debe(id))}` : ''}</p></div>`; }).join('');
    WD.vistaDocumento('Estado de cuenta', html);
  };
  WD.act.bTarjetas = () => {
    const b = B(); const e = WD.state.escuela;
    WD.vistaDocumento('Tarjetas de cuenta', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${WD.alumnosActivos().map((a) => { const c = cta(a.id); return `<div style="border:1.5px solid #333;border-radius:10px;padding:12px 14px;height:150px;display:flex;flex-direction:column;justify-content:space-between;page-break-inside:avoid">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13pt">${esc(b.ajustes.nombre)}</b><span style="font-size:9pt">${esc(e.grado || '')}° ${esc(e.grupo || '')}</span></div>
      <div style="font-family:monospace;font-size:16pt;letter-spacing:.12em">${esc(c.num)}</div>
      <div><div style="font-size:11pt;font-weight:700">${esc(WD.nombreCompleto(a).toUpperCase())}</div><div style="font-size:8.5pt">${esc(c.puesto || 'Cuentahabiente')} · Ciclo ${esc(e.ciclo || '')}</div></div></div>`; }).join('')}</div>`);
  };
  WD.act.bContratos = () => {
    const b = B().ajustes; const d = WD.state.docente;
    WD.vistaDocumento('Contratos de cuenta', WD.alumnosActivos().map((a, i) => { const c = cta(a.id); return `<div style="${i ? 'page-break-before:always' : ''}">${enc()}<p style="text-align:center;margin-top:-8px">CONTRATO DE APERTURA DE CUENTA · FOLIO CON-${esc(String(c.num).replace(/\D/g, ''))}</p>
      <p><b>Titular:</b> ${esc(WD.nombreCompleto(a))} &nbsp; <b>Cuenta:</b> ${esc(c.num)}</p>
      <p><b>PRIMERA (Moneda).</b> El alumno operará con ${esc(b.moneda)} (${esc(b.simbolo)}) como dinero didáctico del aula.</p>
      <p><b>SEGUNDA (Sueldos).</b> Ganará ingresos por cumplir sus comisiones, responsabilidades y méritos académicos.</p>
      <p><b>TERCERA (Servicios).</b> Cubrirá a tiempo la renta de pupitre y los servicios del aula para evitar recargos.</p>
      <p><b>CUARTA (SAT escolar).</b> Cumplirá con la contribución escolar que financia premios y actividades del grupo.</p>
      <p><b>QUINTA (Transferencias).</b> Transferirá a sus compañeros solo con un motivo claro y justificado.</p>
      <p><b>SEXTA (Préstamos).</b> Podrá pedir un préstamo de hasta ${esc(din(b.prestamoMax))}; todo lo que gane pagará primero su deuda hasta liquidarla.</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:70px;text-align:center;font-size:10pt"><div style="border-top:1px solid #000;padding-top:6px">${esc(WD.nombreCompleto(a))}<br>Alumno</div><div style="border-top:1px solid #000;padding-top:6px">Padre, madre o tutor<br>Enterado</div><div style="border-top:1px solid #000;padding-top:6px">${esc(d.nombre || '')}<br>Docente</div></div></div>`; }).join(''));
  };
  WD.act.bBilletes = (el) => {
    const b = B().ajustes; const den = el.dataset.d; const ds = den === 'mix' ? [20, 50, 100, 200, 20, 50, 100, 200] : Array(8).fill(Number(den));
    const tono = { 20: '#3b6e8f', 50: '#8a4f7d', 100: '#a5482f', 200: '#3f7a4a' }; const e = WD.state.escuela;
    WD.vistaDocumento('Billetes', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${ds.map((v, i) => `<div style="border:2px solid ${tono[v]};border-radius:8px;height:118px;padding:8px 12px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;color:${tono[v]};page-break-inside:avoid;position:relative">
      <div style="font-size:34pt;font-weight:800;line-height:1">${v}</div>
      <div style="text-align:center"><div style="font-weight:800;font-size:12pt;letter-spacing:.04em">${esc(b.nombre.toUpperCase())}</div><div style="font-size:8.5pt">${esc(b.moneda)} · ${esc(e.nombre || '')}</div><div style="font-size:7.5pt;margin-top:6px;font-family:monospace">Serie ${String(i + 1).padStart(3, '0')}-${v}</div></div>
      <div style="font-size:16pt;font-weight:800;writing-mode:vertical-rl">${esc(b.simbolo)}</div></div>`).join('')}</div><p class="tiny" style="text-align:center;margin-top:8px">Dinero didáctico sin valor comercial · uso exclusivo del aula</p>`);
  };
  WD.act.bExcel = async () => {
    const als = WD.alumnosActivos(); const b = B();
    const h1 = [['Nº', 'Alumno', 'Cuenta', 'Puesto', 'Sueldo', 'Saldo', 'Adeudo']].concat(als.map((a) => { const c = cta(a.id); return [a.num || '', WD.nombreLista(a), c.num, c.puesto || '', c.sueldo || 0, c.saldo, debe(a.id)]; }));
    const nom = (id) => { const a = WD.state.alumnos.find((x) => x.id === id); return a ? WD.nombreLista(a) : ''; };
    const h2 = [['Fecha', 'Alumno', 'Tipo', 'Concepto', 'Importe', 'Saldo']].concat(b.movs.map((m) => [new Date(m.fecha).toLocaleString('es-MX'), nom(m.al), m.tipo, m.motivo, m.monto, m.saldo]));
    WD.download(await WD.xlsxBlob([{ name: 'Saldos', rows: h1, widths: [5, 32, 11, 26, 9, 10, 10] }, { name: 'Movimientos', rows: h2, widths: [18, 30, 14, 50, 10, 10] }]), `${b.ajustes.nombre.replace(/\s+/g, '_')}.xlsx`);
  };
  WD.act.bProyector = () => { tab = 'proyector'; document.body.classList.add('proyector'); WD.refrescar(); };
  WD.act.bSalirProyector = () => { tab = 'cuentas'; document.body.classList.remove('proyector'); WD.refrescar(); };
  WD.act.bServicioNuevo = () => { B().servicios.push({ id: WD.uid(), nombre: 'Nuevo servicio', desc: '', costo: 5, cat: 'servicio', interes: 5, auto: false }); WD.save(); WD.refrescar(); };
  WD.act.bServicioBorrar = (el) => { const b = B(); b.servicios = b.servicios.filter((s) => s.id !== el.dataset.id); WD.save(); WD.refrescar(); };
  WD.act.bReiniciar = async () => {
    if (!(await WD.confirmar('Reiniciar el banco', 'Se borran todos los saldos, movimientos, recibos y préstamos. Las cuentas se vuelven a abrir con el saldo inicial. Descarga antes el Excel si lo quieres guardar.', 'Reiniciar', true))) return;
    const b = B(); b.cuentas = {}; b.movs = []; b.recibos = []; b.prestamos = []; b.ultimoCobro = b.ultimoSueldo = null; abrirCuentas(); WD.save(); WD.refrescar(); WD.toast('Banco reiniciado');
  };

  /* ---------- vista ---------- */
  WD.views.banco = {
    titulo: 'Banco Estala',
    render() {
      abrirCuentas(); const b = B(); const als = WD.alumnosActivos();
      if (tab === 'proyector' && !document.body.classList.contains('proyector')) tab = 'cuentas';
      if (tab === 'proyector') {
        const orden = als.slice().sort((x, y) => cta(y.id).saldo - cta(x.id).saldo);
        return `<div class="row"><h1 style="flex:1">${esc(b.ajustes.nombre)} · Saldos</h1><button class="btn" data-act="bSalirProyector">Salir del proyector</button></div>
          <div class="b-proy">${orden.map((a) => `<div class="card row"><span style="flex:1;font-size:20px;font-weight:600">${esc(a.nombres || WD.nombreCompleto(a))} ${esc(a.paterno || '')}</span><b style="font-size:24px">${din(cta(a.id).saldo)}</b></div>`).join('')}</div>`;
      }
      const total = als.reduce((t, a) => t + (cta(a.id)?.saldo || 0), 0); const deuda = als.reduce((t, a) => t + debe(a.id), 0);
      const tabs = [['cuentas', 'Cuentas'], ['movimientos', 'Movimientos'], ['servicios', 'Servicios y recibos'], ['imprimir', 'Imprimir'], ['ajustes', 'Ajustes']];
      let cuerpo = '';
      if (!als.length) cuerpo = '<p class="small muted">Carga a tus alumnos en Mi grupo y aquí se abren sus cuentas solas.</p>';
      else if (tab === 'cuentas') cuerpo = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">Nº</th><th>Alumno</th><th>Cuenta</th><th>Puesto</th><th class="r">Sueldo</th><th class="r">Saldo</th><th class="r">Debe</th><th></th></tr></thead><tbody>${als.map((a) => { const c = cta(a.id); const d = debe(a.id); return `<tr><td class="c">${esc(a.num || '')}</td><td><button class="link" data-act="bCuenta" data-al="${a.id}">${esc(WD.nombreLista(a))}</button></td><td class="small muted">${esc(c.num)}</td><td class="small">${esc(c.puesto || '')}</td><td class="r small">${c.sueldo ? din(c.sueldo) : ''}</td><td class="r"><b>${din(c.saldo)}</b></td><td class="r small" style="color:var(--bad)">${d ? din(d) : ''}</td><td class="r"><button class="btn sm" data-act="bOperar" data-al="${a.id}" aria-label="Abonar">+</button> <button class="btn sm" data-act="bOperar" data-s="-" data-al="${a.id}" aria-label="Cobrar">−</button></td></tr>`; }).join('')}</tbody></table></div>`;
      else if (tab === 'movimientos') { const ms = b.movs.slice(-80).reverse(); const nom = (id) => { const a = WD.state.alumnos.find((x) => x.id === id); return a ? WD.nombreLista(a) : ''; };
        cuerpo = ms.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Alumno</th><th>Concepto</th><th class="r">Importe</th><th class="r">Saldo</th></tr></thead><tbody>${ms.map((m) => filaMov(m).replace('<td class="small" style', `<td class="small">${esc(nom(m.al))}</td><td class="small" style`)).join('')}</tbody></table></div><p class="tiny muted">Se muestran los últimos 80. El Excel trae todos.</p>` : '<p class="small muted">Aún no hay movimientos.</p>'; }
      else if (tab === 'servicios') {
        const pend = b.recibos.filter((r) => r.estado === 'pendiente');
        cuerpo = `<div class="stack"><div class="row"><div class="label" style="flex:1">Servicios del aula</div><button class="btn sm" data-act="bServicioNuevo">${WD.icon('mas')} Agregar</button></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Servicio</th><th>Descripción</th><th class="r">Costo</th><th class="r">Recargo semanal %</th><th class="c">En el cobro semanal</th><th></th></tr></thead><tbody>${b.servicios.map((s, i) => `<tr><td><input class="in" data-bind="banco.servicios.${i}.nombre" value="${esc(s.nombre)}"></td><td><input class="in" data-bind="banco.servicios.${i}.desc" value="${esc(s.desc)}"></td><td class="r"><input class="in" type="number" min="0" data-bind="banco.servicios.${i}.costo" value="${s.costo}" style="width:80px"></td><td class="r"><input class="in" type="number" min="0" data-bind="banco.servicios.${i}.interes" value="${s.interes}" style="width:70px"></td><td class="c"><input type="checkbox" data-bind="banco.servicios.${i}.auto" ${s.auto ? 'checked' : ''}></td><td><button class="btn sm ghost" data-act="bServicioBorrar" data-id="${s.id}" aria-label="Quitar">×</button></td></tr>`).join('')}</tbody></table></div>
          <div class="label">Recibos pendientes del grupo (${pend.length})</div>
          ${pend.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Alumno</th><th>Recibo</th><th>Vence</th><th class="r">Total</th><th></th></tr></thead><tbody>${pend.map((r) => { const a = WD.state.alumnos.find((x) => x.id === r.al); const rc = recargo(r); return `<tr><td>${esc(a ? WD.nombreLista(a) : '')}</td><td>${esc(r.nombre)}</td><td class="small ${rc ? '' : 'muted'}" style="${rc ? 'color:var(--bad)' : ''}">${esc(WD.fechaLarga(r.vence.slice(0, 10)))}</td><td class="r">${din(r.monto + rc)}</td><td class="r"><button class="btn sm" data-act="bPagarRecibo" data-id="${r.id}">Pagar</button></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="small muted">No hay recibos pendientes.</p>'}</div>`;
      } else if (tab === 'imprimir') cuerpo = `<div class="grid g2">
          <div class="card stack"><b>Billetes</b><p class="small muted" style="margin:0">8 por hoja, de ${esc(b.ajustes.nombre)}.</p><div class="row">${['20', '50', '100', '200'].map((d) => `<button class="btn sm" data-act="bBilletes" data-d="${d}">${d}</button>`).join('')}<button class="btn sm" data-act="bBilletes" data-d="mix">Combinados</button></div></div>
          <div class="card stack"><b>Tarjetas de cuenta</b><p class="small muted" style="margin:0">Nombre, número de cuenta y puesto de cada alumno.</p><button class="btn sm" data-act="bTarjetas" style="justify-self:start">${WD.icon('imprimir')} Imprimir tarjetas</button></div>
          <div class="card stack"><b>Contratos de apertura</b><p class="small muted" style="margin:0">Las reglas del banco con firmas del alumno, tutor y docente.</p><button class="btn sm" data-act="bContratos" style="justify-self:start">${WD.icon('imprimir')} Imprimir contratos</button></div>
          <div class="card stack"><b>Estados de cuenta</b><p class="small muted" style="margin:0">Una hoja por alumno con sus últimos movimientos.</p><button class="btn sm" data-act="bEstado" style="justify-self:start">${WD.icon('imprimir')} Imprimir todos</button></div></div>`;
      else cuerpo = `<div class="card grid g3">
          <label class="field"><span>Nombre del banco</span><input class="in" data-bind="banco.ajustes.nombre" data-rerender value="${esc(b.ajustes.nombre)}"></label>
          <label class="field"><span>Moneda</span><input class="in" data-bind="banco.ajustes.moneda" value="${esc(b.ajustes.moneda)}"></label>
          <label class="field"><span>Símbolo</span><input class="in" data-bind="banco.ajustes.simbolo" data-rerender value="${esc(b.ajustes.simbolo)}"></label>
          <label class="field"><span>Saldo al abrir cuenta</span><input class="in" type="number" min="0" data-bind="banco.ajustes.saldoInicial" value="${b.ajustes.saldoInicial}"></label>
          <label class="field"><span>Préstamo máximo</span><input class="in" type="number" min="1" data-bind="banco.ajustes.prestamoMax" value="${b.ajustes.prestamoMax}"></label></div>
          <div class="row"><span style="flex:1"></span><button class="btn ghost danger sm" data-act="bReiniciar">Reiniciar el banco</button></div>`;
      return `<div class="row"><div style="flex:1;min-width:0"><h1>${esc(b.ajustes.nombre)}</h1><p class="muted">La economía de tu salón: sueldos por comisión, servicios, recibos, préstamos y billetes.</p></div><button class="btn" data-act="bProyector">Saldos en el proyector</button><button class="btn" data-act="bExcel">${WD.icon('descargar')} Excel</button></div>
        <div class="grid g3"><div class="card"><div class="label">Dinero del grupo</div><div style="font-size:26px;font-weight:700">${din(total)}</div></div><div class="card"><div class="label">Deudas</div><div style="font-size:26px;font-weight:700;${deuda ? 'color:var(--bad)' : ''}">${din(deuda)}</div></div><div class="card"><div class="label">Esta semana</div><div class="small">${b.ultimoSueldo >= lunes() ? '✓ Sueldos pagados' : 'Sueldos pendientes'}<br>${b.ultimoCobro >= lunes() ? '✓ Cobro hecho' : 'Cobro pendiente'}</div></div></div>
        <div class="row"><button class="btn pri" data-act="bOperar">Abonar</button><button class="btn" data-act="bOperar" data-s="-">Cobrar</button><button class="btn" data-act="bTransferir">Transferir</button><button class="btn" data-act="bSueldos">Pagar sueldos</button><button class="btn" data-act="bCobro">Cobro semanal</button></div>
        <div class="tabs">${tabs.map(([t, n]) => `<button class="${tab === t ? 'on' : ''}" data-act="bTab" data-t="${t}">${n}</button>`).join('')}</div>
        ${cuerpo}`;
    },
  };
})(window.WD);
