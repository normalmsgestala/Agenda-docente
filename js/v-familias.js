/* Web Docente · Comunicación con familias: mensajes por correo (automático, desde el Gmail del docente)
   con plantillas, datos del alumno (asistencia, calificaciones) e historial; WhatsApp para quien no tiene correo. */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const PLANTILLAS = {
    aviso: { n: 'Aviso general', asunto: 'Aviso para las familias de {grado} {grupo}', cuerpo: 'Estimada familia de {alumno}:\n\nLes informo que ___\n\nAgradezco su atención.' },
    tarea: { n: 'Recordatorio de tarea', asunto: 'Recordatorio de tarea · {alumno}', cuerpo: 'Estimada familia de {alumno}:\n\nLes recuerdo que para el día ___ los alumnos deben traer:\n\n• ___\n\nGracias por su apoyo en casa.' },
    citatorio: { n: 'Citatorio', asunto: 'Citatorio · {alumno}', cuerpo: 'Estimado(a) {tutor}:\n\nLe solicito de la manera más atenta presentarse en la escuela el día ___ a las ___ horas, para tratar asuntos relacionados con el desempeño de {alumno}.\n\nEn caso de no poder asistir, le pido comunicarse conmigo.' },
    felicitacion: { n: 'Felicitación', asunto: '¡Felicidades, {alumno}!', cuerpo: 'Estimada familia de {alumno}:\n\nMe da mucho gusto compartirles que {alumno} ___\n\nLos felicito por su apoyo y los invito a seguir motivándolo(a) en casa.' },
    asistencia: { n: 'Asistencia del mes', asunto: 'Asistencia de {alumno} · {mes}', cuerpo: 'Estimada familia de {alumno}:\n\nLes comparto el registro de asistencia de este mes:\n\n{asistencia}\n\nLa asistencia diaria y puntual es fundamental para su aprendizaje.' },
    calificaciones: { n: 'Avance del trimestre', asunto: 'Avance de {alumno} · Trimestre {trimestre}', cuerpo: 'Estimada familia de {alumno}:\n\nLes comparto el avance de {alumno} en el trimestre {trimestre}:\n\n{calificaciones}\n\nQuedo a sus órdenes para cualquier duda.' },
    libre: { n: 'Mensaje libre', asunto: '', cuerpo: 'Estimada familia de {alumno}:\n\n' },
  };
  const general = (t) => { const e = WD.state.escuela; const d = new Date(); return String(t || '').replace(/\{alumno\}|\{nombre\}/g, 'cada alumno').replace(/\{tutor\}/g, 'tutor').replace(/\{mes\}/g, `${MES[d.getMonth()]}`).replace(/\{grado\}/g, `${String(e.grado || '').replace(/°+$/, '')}°`).replace(/\{grupo\}/g, e.grupo || '').replace(/\{trimestre\}/g, String(trimestreHoy())).replace(/\{\w+\}/g, '').replace(/\s*___/g, '…'); };
  const lista = () => { if (!Array.isArray(WD.state.comunicados)) WD.state.comunicados = []; return WD.state.comunicados; };
  const alumno = (id) => WD.state.alumnos.find((a) => a.id === id);
  const correoOk = (a) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(a.correo || '').trim());
  const telDe = (a) => { const d = String(a.telefono || a.emergencia || '').replace(/\D/g, ''); return d.length === 10 ? '52' + d : d.length >= 11 ? d : ''; };
  const trimestreHoy = () => WD.trimestreDe(WD.iso(new Date()));

  /* ---------- datos del alumno ---------- */
  function datosAsistencia(a) {
    const d = new Date(); const desde = WD.iso(new Date(d.getFullYear(), d.getMonth(), 1)); const hasta = WD.iso(d);
    const c = WD.asistAlumno(a.id, desde, hasta);
    return [['Días de clase registrados', c.dias], ['Asistencias', c.A], ['Faltas', c.F], ['Faltas justificadas', c.J], ['Retardos', c.R], ['Salió antes', c.S], ['Porcentaje de asistencia', c.porcentaje === null ? '—' : `${c.porcentaje}%`]];
  }
  function datosCalif(a) {
    const r = WD.resumenAlumno(a.id, trimestreHoy());
    return [...WD.CAMPOS.map((c) => [c, r.porCampo[c]?.nota ?? '—']), ['Promedio', r.promedio ?? '—']];
  }
  const tablaHTML = (filas) => `<table style="border-collapse:collapse;margin:6px 0;font-size:14px">${filas.map(([k, v], i) => `<tr><td style="padding:6px 14px 6px 0;border-bottom:1px solid #e5e5e5;${i === filas.length - 1 ? 'font-weight:700' : ''}">${esc(k)}</td><td style="padding:6px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:700">${esc(String(v))}</td></tr>`).join('')}</table>`;
  const tablaTXT = (filas) => filas.map(([k, v]) => `• ${k}: ${v}`).join('\n');

  function llenar(texto, a, html) {
    const e = WD.state.escuela; const d = new Date();
    const vars = { alumno: WD.nombreCompleto(a), nombre: (a.nombres || '').split(/\s+/)[0], tutor: a.tutor || 'madre, padre o tutor', grado: `${String(e.grado || '').replace(/°+$/, '')}°`, grupo: e.grupo || '',
      docente: WD.state.docente.nombre || '', escuela: e.nombre || '', fecha: WD.fechaLarga(WD.iso(d)), mes: `${MES[d.getMonth()]} ${d.getFullYear()}`, trimestre: trimestreHoy() };
    return String(texto || '').split(/(\{asistencia\}|\{calificaciones\})/).map((part) => {
      if (part === '{asistencia}') return html ? tablaHTML(datosAsistencia(a)) : tablaTXT(datosAsistencia(a));
      if (part === '{calificaciones}') return html ? tablaHTML(datosCalif(a)) : tablaTXT(datosCalif(a));
      const t = part.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
      return html ? esc(t).replace(/\n/g, '<br>') : t;
    }).join('');
  }
  const firmaTXT = () => { const e = WD.state.escuela; return `\n\nAtentamente,\n${WD.state.docente.nombre || ''}\nDocente de ${String(e.grado || '').replace(/°+$/, '')}° ${e.grupo || ''}${e.nombre ? `\n${e.nombre}` : ''}`; };
  function correoHTML(m, a) {
    const e = WD.state.escuela;
    return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1d1d1b;max-width:620px;line-height:1.5;font-size:15px">
      ${e.nombre ? `<div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b6b66;border-bottom:2px solid #c8641e;padding-bottom:8px;margin-bottom:16px">${esc(e.nombre)}${e.cct ? ` · ${esc(e.cct)}` : ''}</div>` : ''}
      <div>${llenar(m.cuerpo, a, true)}</div><p style="margin-top:22px">${esc(firmaTXT().trim()).replace(/\n/g, '<br>')}</p></div>`;
  }
  const waURL = (m, a) => `https://wa.me/${telDe(a)}?text=${encodeURIComponent(`*${llenar(m.asunto, a)}*\n\n${llenar(m.cuerpo, a)}${firmaTXT()}`)}`;

  /* ---------- redactar y enviar ---------- */
  let borrador = null;
  WD.act.famNuevo = (el) => {
    const p = PLANTILLAS[el.dataset.p || 'aviso'];
    borrador = { id: WD.uid(), tipo: el.dataset.p || 'aviso', asunto: p.asunto, cuerpo: p.cuerpo, para: el.dataset.al ? [el.dataset.al] : WD.alumnosActivos().map((a) => a.id) };
    abrirEditor();
  };
  function abrirEditor() {
    const als = WD.alumnosActivos(); const sel = new Set(borrador.para);
    WD.abrirDrawer('Mensaje a las familias', `
      <label class="field"><span>Tipo de mensaje</span><select class="in" id="fm-tipo">${Object.entries(PLANTILLAS).map(([k, p]) => `<option value="${k}" ${borrador.tipo === k ? 'selected' : ''}>${p.n}</option>`).join('')}</select></label>
      <div class="stack" style="gap:8px"><div class="row"><div class="label" style="flex:1">Para</div><span class="small muted" id="fm-n"></span><button type="button" class="btn sm ghost" id="fm-todos">Todos</button><button type="button" class="btn sm ghost" id="fm-nadie">Ninguno</button></div>
        <div class="dg-its" id="fm-als"></div><p class="tiny muted" style="margin:0">Con raya: no tiene correo registrado; se le podrá mandar por WhatsApp.</p></div>
      <label class="field"><span>Asunto</span><input class="in" id="fm-asunto" value="${esc(borrador.asunto)}"></label>
      <label class="field"><span>Mensaje</span><textarea class="in" id="fm-cuerpo" style="min-height:190px">${esc(borrador.cuerpo)}</textarea></label>
      <p class="tiny muted" style="margin:0">Se llenan solos: {alumno} {nombre} {tutor} {fecha} {mes} {grado} {grupo}${borrador.tipo === 'asistencia' ? ' · {asistencia} pone su tabla del mes' : ''}${borrador.tipo === 'calificaciones' ? ' · {calificaciones} pone sus notas del trimestre' : ''}. Tu firma se agrega al final.</p>
      <div class="row">${WD.ai.tieneClave() ? `<button class="btn sm" id="fm-ia">${WD.icon('chispa')} Mejorar redacción con IA</button>` : ''}<button class="btn sm" id="fm-ver">Vista previa</button></div>
      <div id="fm-prev"></div>
      <div class="sep"></div>
      <div class="row"><span class="small muted" style="flex:1" id="fm-estado"></span><button class="btn pri" id="fm-enviar">${WD.icon('correo')} Enviar</button></div>`, (box) => {
      const pintar = () => {
        box.querySelector('#fm-als').innerHTML = als.map((a) => `<button type="button" class="dg-it ${sel.has(a.id) ? 'on' : ''}" data-id="${a.id}" style="${correoOk(a) ? '' : 'text-decoration:line-through'}">${esc([a.nombres, a.paterno].filter(Boolean).join(' '))}</button>`).join('');
        const conCorreo = [...sel].filter((id) => correoOk(alumno(id))).length;
        box.querySelector('#fm-n').textContent = `${sel.size} familia${sel.size === 1 ? '' : 's'} · ${conCorreo} con correo`;
      };
      const leer = () => { borrador.asunto = box.querySelector('#fm-asunto').value; borrador.cuerpo = box.querySelector('#fm-cuerpo').value; borrador.para = [...sel]; };
      pintar();
      box.querySelector('#fm-als').addEventListener('click', (e) => { const t = e.target.closest('[data-id]'); if (!t) return; sel.has(t.dataset.id) ? sel.delete(t.dataset.id) : sel.add(t.dataset.id); pintar(); });
      box.querySelector('#fm-todos').onclick = () => { als.forEach((a) => sel.add(a.id)); pintar(); };
      box.querySelector('#fm-nadie').onclick = () => { sel.clear(); pintar(); };
      box.querySelector('#fm-tipo').onchange = (e) => { leer(); const p = PLANTILLAS[e.target.value]; borrador.tipo = e.target.value; borrador.asunto = p.asunto; borrador.cuerpo = p.cuerpo; abrirEditor(); };
      box.querySelector('#fm-ver').onclick = () => { leer(); const a = alumno(borrador.para[0]); if (!a) { WD.toast('Elige al menos una familia.'); return; } box.querySelector('#fm-prev').innerHTML = `<div class="card" style="background:#fff;color:#1d1d1b"><div class="small" style="margin-bottom:8px"><b>Asunto:</b> ${esc(llenar(borrador.asunto, a))}</div>${correoHTML(borrador, a)}</div><p class="tiny muted">Así le llega a la familia de ${esc(WD.nombreCompleto(a))}.</p>`; };
      box.querySelector('#fm-ia')?.addEventListener('click', async (e) => {
        leer(); const b = e.currentTarget; b.disabled = true; b.textContent = 'Redactando…';
        try {
          const out = await WD.ai.generar([{ text: `Eres docente de primaria en Nuevo León, México. Mejora la redacción de este mensaje para las familias: tono cordial, respetuoso y claro, breve, sin juicios. Conserva EXACTAMENTE los marcadores entre llaves como {alumno}, {tutor}, {asistencia}, {calificaciones}. No agregues firma ni despedida final (se agrega sola). Si hay espacios en blanco por llenar, déjalos marcados con ___.
Devuelve JSON {"asunto":"...","cuerpo":"..."}.
Asunto: ${borrador.asunto}
Mensaje:
${borrador.cuerpo}` }], { json: true, temperatura: 0.4 });
          if (out.cuerpo) { borrador.asunto = out.asunto || borrador.asunto; borrador.cuerpo = out.cuerpo; abrirEditor(); WD.toast('Listo. Revisa y completa lo que falte.'); }
        } catch (er) { WD.toast(er.message, 4000); b.disabled = false; b.innerHTML = `${WD.icon('chispa')} Mejorar redacción con IA`; }
      });
      box.querySelector('#fm-enviar').onclick = () => { leer(); enviar(box); };
    });
  }
  async function enviar(box) {
    const m = borrador; const ids = m.para.filter((id) => alumno(id));
    if (!ids.length) { WD.toast('Elige al menos una familia.'); return; }
    if (/___/.test(m.cuerpo + m.asunto)) { if (!(await WD.confirmar('¿Enviar así?', 'Parece que el mensaje tiene espacios sin llenar.', 'Enviar de todos modos'))) return; }
    const conCorreo = ids.filter((id) => correoOk(alumno(id)));
    const google = WD.google.estado.modo === 'google';
    if (conCorreo.length && !google) { WD.toast('Para enviar correos entra con tu cuenta de Google.'); return; }
    if (!(await WD.confirmar('Enviar mensaje', `Se enviará por correo a <b>${conCorreo.length}</b> familia${conCorreo.length === 1 ? '' : 's'}.${ids.length - conCorreo.length ? ` ${ids.length - conCorreo.length} sin correo quedarán listas para WhatsApp.` : ''}`, 'Enviar'))) return;
    const reg = { id: m.id, fecha: new Date().toISOString(), tipo: m.tipo, asunto: m.asunto, cuerpo: m.cuerpo, res: {} };
    lista().push(reg);
    const btn = box.querySelector('#fm-enviar'); btn.disabled = true; const est = box.querySelector('#fm-estado'); let ok = 0;
    for (const [i, id] of ids.entries()) {
      const a = alumno(id);
      if (!correoOk(a)) { reg.res[id] = telDe(a) ? 'whatsapp' : 'sin-contacto'; continue; }
      est.textContent = `Enviando ${i + 1} de ${ids.length}…`;
      try { await WD.google.enviarCorreo({ para: a.correo.trim(), asunto: llenar(m.asunto, a), html: correoHTML(m, a) }); reg.res[id] = 'enviado'; ok++; }
      catch (e) { reg.res[id] = 'error'; reg.error = e.message; }
    }
    WD.save(); borrador = null; WD.cerrarDrawer(); WD.refrescar();
    WD.toast(`${ok} correo${ok === 1 ? '' : 's'} enviado${ok === 1 ? '' : 's'}`, 3500);
    verComunicado(reg.id);
  }

  /* ---------- historial ---------- */
  const EST = { enviado: ['ok', 'Correo enviado'], whatsapp: ['warn', 'Falta por WhatsApp'], wa: ['ok', 'Abierto en WhatsApp'], error: ['bad', 'No se envió'], 'sin-contacto': ['bad', 'Sin correo ni teléfono'] };
  function verComunicado(id) {
    const r = lista().find((x) => x.id === id); if (!r) return;
    WD.abrirDrawer(general(r.asunto) || PLANTILLAS[r.tipo]?.n || 'Mensaje', `
      <p class="small muted" style="margin:0">${esc(PLANTILLAS[r.tipo]?.n || '')} · ${esc(new Date(r.fecha).toLocaleString('es-MX', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }))}</p>
      ${r.error ? `<p class="small" style="color:var(--bad);margin:0">${esc(r.error)}</p>` : ''}
      <div class="tbl-wrap"><table class="tbl"><tbody>${Object.entries(r.res).map(([al, st]) => { const a = alumno(al); if (!a) return ''; const [c, t] = EST[st] || ['', st];
        return `<tr><td>${esc(WD.nombreLista(a))}</td><td><span class="pill ${c}">${t}</span></td><td class="r">${(st === 'whatsapp' || st === 'wa' || st === 'error') && telDe(a) ? `<a class="btn sm" href="${esc(waURL(r, a))}" target="_blank" rel="noopener" data-act="famWa" data-id="${r.id}" data-al="${al}">WhatsApp</a>` : ''}${st === 'error' && correoOk(a) ? ` <button class="btn sm" data-act="famReintentar" data-id="${r.id}" data-al="${al}">Reintentar</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
      <details><summary class="small" style="cursor:pointer">Ver mensaje</summary><div class="prose small" style="margin-top:8px;white-space:pre-line">${esc(r.cuerpo)}</div></details>`);
  }
  WD.act.famVer = (el) => verComunicado(el.dataset.id);
  WD.act.famWa = (el) => { const r = lista().find((x) => x.id === el.dataset.id); r.res[el.dataset.al] = 'wa'; WD.save(); setTimeout(() => verComunicado(r.id), 300); };
  WD.act.famReintentar = async (el) => {
    const r = lista().find((x) => x.id === el.dataset.id); const a = alumno(el.dataset.al); el.disabled = true;
    try { await WD.google.enviarCorreo({ para: a.correo.trim(), asunto: llenar(r.asunto, a), html: correoHTML(r, a) }); r.res[a.id] = 'enviado'; WD.save(); WD.toast('Enviado'); } catch (e) { WD.toast(e.message, 4000); }
    verComunicado(r.id);
  };

  WD.views.familias = {
    titulo: 'Comunicación con familias',
    render() {
      const als = WD.alumnosActivos(); const sinCorreo = als.filter((a) => !correoOk(a)); const rs = lista().slice().reverse();
      return `<div class="row"><div style="flex:1;min-width:0"><h1>Comunicación con familias</h1><p class="muted">Mensajes por correo desde tu Gmail, con los datos de cada alumno, y WhatsApp para quien no tiene correo.</p></div><button class="btn pri" data-act="famNuevo">${WD.icon('correo')} Nuevo mensaje</button></div>
        ${!als.length ? '<p class="small muted">Carga a tus alumnos en Mi grupo con el correo y teléfono del tutor.</p>' : `
        <div class="k-grid">${Object.entries(PLANTILLAS).filter(([k]) => k !== 'libre').map(([k, p]) => `<button class="card k-c" data-act="famNuevo" data-p="${k}"><b>${esc(p.n)}</b><span class="small muted">${esc(general(p.cuerpo.split('\n\n')[1] || '').replace('cada alumno', 'su hijo(a)')).slice(0, 80)}</span></button>`).join('')}</div>
        ${sinCorreo.length ? `<p class="small muted">${sinCorreo.length} familia${sinCorreo.length === 1 ? '' : 's'} sin correo registrado: ${sinCorreo.slice(0, 12).map((a) => esc([a.nombres, a.paterno].filter(Boolean).join(' '))).join(', ')}${sinCorreo.length > 12 ? '…' : ''}. Agrégalo en <a href="#grupo">Mi grupo</a>; mientras, se les manda por WhatsApp.</p>` : ''}
        <div class="label">Enviados</div>
        ${rs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Mensaje</th><th class="c">Correos</th><th class="c">Pendientes WhatsApp</th></tr></thead><tbody>${rs.map((r) => { const v = Object.values(r.res); return `<tr><td class="small">${esc(new Date(r.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }))}</td><td><button class="link" data-act="famVer" data-id="${r.id}">${esc(general(r.asunto) || PLANTILLAS[r.tipo]?.n || '')}</button></td><td class="c">${v.filter((x) => x === 'enviado').length}</td><td class="c">${v.filter((x) => x === 'whatsapp').length || ''}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="small muted">Aún no has enviado mensajes.</p>'}`}`;
    },
  };
})(window.WD);
