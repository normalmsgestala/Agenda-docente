/* Web Docente · Incidencias: folios, redacción con IA, formatos oficiales y envío al tutor */
(function (WD) {
  'use strict';
  const { esc } = WD;
  let filtro = 'todas';

  WD.act.incFiltro = (el) => { filtro = el.dataset.f; WD.refrescar(); };
  WD.act.nuevaInc = (el) => {
    const tipo = el.dataset.tipo || 'C'; const now = new Date();
    const inc = { id: WD.uid(), tipo, folio: WD.siguienteFolio(tipo), fecha: WD.iso(now), hora: `${WD.pad(now.getHours())}:${WD.pad(now.getMinutes())}`, alumnoId: el.dataset.al || '', gravedad: 'leve', notas: '', medidasNotas: '', hechos: '', medidas: [], presentes: '', acuerdos: '', estado: 'abierto', enviado: '' };
    WD.state.incidencias.push(inc); WD.save(); WD.abrirInc(inc.id, true);
  };
  WD.act.verInc = (el) => WD.abrirInc(el.dataset.id);

  WD.abrirInc = (id, nueva) => {
    const i = WD.state.incidencias.findIndex((x) => x.id === id); const inc = WD.state.incidencias[i]; const p = `incidencias.${i}`;
    const als = WD.alumnosActivos(); const al = WD.alumno(inc.alumnoId);
    WD.abrirDrawer(`${inc.folio} · ${WD.TIPOS_INC[inc.tipo].nombre}`, `
      <div class="grid g2">
        <label class="field" style="grid-column:1/-1"><span>Alumno(a) involucrado</span><select class="in" data-bind="${p}.alumnoId"><option value="">Elige al alumno…</option>${als.map((a) => `<option value="${a.id}" ${a.id === inc.alumnoId ? 'selected' : ''}>${esc(WD.nombreLista(a))}</option>`).join('')}</select></label>
        <label class="field"><span>Fecha</span><input class="in" type="date" data-bind="${p}.fecha" value="${esc(inc.fecha)}"></label>
        <label class="field"><span>Hora</span><input class="in" type="time" data-bind="${p}.hora" value="${esc(inc.hora)}"></label>
        <label class="field"><span>Trimestre</span><select class="in" data-bind="${p}.trimestre"><option value="">Según la fecha (${WD.trimestreDe(inc.fecha)})</option>${[1, 2, 3].map((n) => `<option value="${n}" ${String(inc.trimestre) === String(n) ? 'selected' : ''}>Trimestre ${n}</option>`).join('')}</select></label>
        <label class="field"><span>Gravedad</span><select class="in" data-bind="${p}.gravedad">${['leve', 'moderada', 'grave'].map((g) => `<option ${g === inc.gravedad ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
        <label class="field"><span>Estado</span><select class="in" data-bind="${p}.estado">${[['abierto', 'Abierto'], ['cerrado', 'Cerrado']].map(([v, n]) => `<option value="${v}" ${v === inc.estado ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
      <label class="field"><span>¿Qué pasó? (tus notas, como te salga)</span><textarea class="in" data-bind="${p}.notas" placeholder="Ej. En el recreo le dijo apodos a una compañera, hablé con los dos…">${esc(inc.notas)}</textarea></label>
      <label class="field"><span>¿Qué hiciste? (opcional)</span><textarea class="in" data-bind="${p}.medidasNotas" style="min-height:60px" placeholder="Ej. Diálogo, disculpa, aviso a la mamá">${esc(inc.medidasNotas)}</textarea></label>
      <button class="btn" data-act="redactarInc" data-id="${inc.id}" style="justify-self:start">${WD.icon('chispa')} Redactar en formato oficial con IA</button>
      <div class="sep"></div>
      <label class="field"><span>I. Descripción formal de los hechos</span><textarea class="in" id="inc-hechos" data-bind="${p}.hechos" style="min-height:120px">${esc(inc.hechos)}</textarea></label>
      <label class="field"><span>II. Medidas tomadas / protocolo aplicado (una por renglón)</span><textarea class="in" id="inc-medidas" style="min-height:100px">${esc((inc.medidas || []).join('\n'))}</textarea></label>
      <details><summary class="small" style="cursor:pointer">Datos para acta de hechos (opcional)</summary><div class="stack" style="margin-top:10px">
        <label class="field"><span>Personas presentes</span><textarea class="in" data-bind="${p}.presentes" style="min-height:60px">${esc(inc.presentes)}</textarea></label>
        <label class="field"><span>Acuerdos</span><textarea class="in" data-bind="${p}.acuerdos" style="min-height:60px">${esc(inc.acuerdos)}</textarea></label></div></details>
      <div class="sep"></div>
      <div class="row"><button class="btn" data-act="docInc" data-id="${inc.id}">${WD.icon('imprimir')} Reporte interno</button><button class="btn" data-act="actaInc" data-id="${inc.id}">${WD.icon('imprimir')} Acta de hechos</button><button class="btn pri" data-act="enviarInc" data-id="${inc.id}">${WD.icon('correo')} Enviar al tutor</button></div>
      ${inc.enviado ? `<p class="tiny muted">Enviado a ${esc(inc.enviado)}</p>` : al && !al.correo ? '<p class="tiny muted">Este alumno no tiene correo del tutor. Agrégalo en su ficha.</p>' : ''}
      <div class="row"><span style="flex:1"></span><button class="btn ghost danger sm" data-act="borrarInc" data-id="${inc.id}">Eliminar reporte</button></div>`,
      (b) => { b.querySelector('#inc-medidas').addEventListener('change', (e) => { inc.medidas = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean); WD.save(); }); },
      nueva ? 'Nuevo reporte. Se guarda solo.' : `${esc(WD.fechaLarga(inc.fecha))} · ${al ? esc(WD.nombreCompleto(al)) : 'sin alumno'}`);
  };
  const incDe = (el) => WD.state.incidencias.find((x) => x.id === el.dataset.id);
  WD.act.redactarInc = async (el) => {
    const inc = incDe(el); if (!inc.notas.trim()) { WD.toast('Primero escribe qué pasó.'); return; }
    if (!WD.requiereIA()) return;
    el.disabled = true; el.innerHTML = '<span class="spinner"></span> Redactando…';
    try {
      const e = WD.state.escuela; // los nombres de alumnos se quitan antes de mandar a Gemini
      const r = await WD.ai.redactarIncidencia({ tipo: inc.tipo, notas: inc.notas, medidas: inc.medidasNotas, fecha: WD.fechaLarga(inc.fecha), grado: `${e.grado} ${e.grupo}` });
      inc.hechos = r.hechos; inc.medidas = r.medidas; inc.gravedad = r.gravedad; WD.save(); WD.abrirInc(inc.id); WD.toast('Listo. Revisa y ajusta lo que necesites.');
    } catch (e) { WD.toast(e.message, 4500); el.disabled = false; el.innerHTML = `${WD.icon('chispa')} Redactar en formato oficial con IA`; }
  };
  WD.act.borrarInc = async (el) => {
    if (!(await WD.confirmar('Eliminar reporte', 'Este reporte se borra por completo. Si solo ya se atendió, mejor márcalo como cerrado.', 'Eliminar', true))) return;
    WD.state.incidencias = WD.state.incidencias.filter((x) => x.id !== el.dataset.id); WD.save(); WD.cerrarDrawer(); WD.refrescar();
  };

  function reporteHTML(inc) {
    const e = WD.state.escuela; const al = WD.alumno(inc.alumnoId); const d = WD.parseISO(inc.fecha);
    return `${WD.membrete()}<h2>REPORTE INTERNO DE ${inc.tipo === 'A' ? 'ACCIDENTE' : 'INCIDENCIA'}</h2>
      <div class="box"><table style="border:0"><tbody>
        <tr><td style="border:0"><b>Escuela:</b> ${esc(e.nombre)}</td><td style="border:0"><b>Fecha y hora:</b> ${d.getDate()} de ${WD.MESES[d.getMonth()]} de ${d.getFullYear()} a las ${esc(inc.hora)}</td></tr>
        <tr><td style="border:0"><b>Alumno involucrado:</b> ${al ? esc(WD.nombreCompleto(al)) : ''}</td><td style="border:0"><b>Grado/Grupo:</b> ${esc(e.grado)} “${esc(e.grupo)}”</td></tr>
        <tr><td style="border:0"><b>Folio:</b> ${esc(inc.folio)} · ${esc(WD.TIPOS_INC[inc.tipo].nombre)}</td><td style="border:0"><b>Gravedad:</b> ${esc(inc.gravedad)}</td></tr></tbody></table></div>
      <div class="box"><div class="t">I. DESCRIPCIÓN FORMAL DE LOS HECHOS:</div><div style="white-space:pre-wrap;text-align:justify">${esc(inc.hechos || inc.notas)}</div></div>
      <div class="box"><div class="t">II. MEDIDAS TOMADAS / PROTOCOLO APLICADO:</div>${(inc.medidas || []).length ? `<ol style="margin:0;padding-left:18px">${inc.medidas.map((m) => `<li>${esc(m)}</li>`).join('')}</ol>` : `<div style="white-space:pre-wrap">${esc(inc.medidasNotas)}</div>`}</div>
      <div class="firmas"><div>${al ? esc(al.tutor || '') : ''}<br>Firma del tutor</div><div>${esc(WD.state.docente.nombre)}<br>Firma del docente</div><div>${esc(e.director || '')}<br>Firma de dirección</div></div>${WD.piePagina()}`;
  }
  function actaHTML(inc) {
    const e = WD.state.escuela; const al = WD.alumno(inc.alumnoId); const d = WD.parseISO(inc.fecha);
    const u = (s, w = 120) => s ? `<u>&nbsp;${esc(s)}&nbsp;</u>` : `<span style="display:inline-block;width:${w}px;border-bottom:1px solid #333"></span>`;
    return `${WD.membrete()}<h2>ACTA DE HECHOS</h2>
      <p style="text-align:justify">En el Municipio de ${u(e.municipio)}${e.entidad ? `, ${esc(e.entidad)}` : ''}, siendo las ${u(inc.hora, 60)} horas del día ${u(String(d.getDate()), 40)} del mes de ${u(WD.MESES[d.getMonth()], 90)} del año ${u(String(d.getFullYear()), 50)}, estando reunidos en el domicilio ${u(e.direccion, 200)}, lugar donde se encuentra ubicada la Escuela Primaria “${esc(e.nombre)}”, perteneciente a la Zona Escolar No. ${u(e.zona, 40)}${e.region ? ` adscrita a la Unidad Regional No. ${esc(e.region)}` : ''}, estando presentes las siguientes personas: C.C. ${u(inc.presentes, 300)}.</p>
      <p style="text-align:justify;margin-top:10px">Reunidos con la finalidad de brindar atención y seguimiento al planteamiento relacionado con el alumno(a) ${u(al ? WD.nombreCompleto(al) : '', 220)} del grupo ${esc(e.grado)} “${esc(e.grupo)}”, se hace constar lo siguiente:</p>
      <div class="box" style="margin-top:10px"><div class="t">HECHOS</div><div style="white-space:pre-wrap;text-align:justify">${esc(inc.hechos || inc.notas)}</div></div>
      <div class="box"><div class="t">ACUERDOS</div><div style="white-space:pre-wrap">${esc(inc.acuerdos) || (inc.medidas || []).map((m, k) => `${k + 1}. ${esc(m)}`).join('<br>')}</div></div>
      <p style="text-align:justify">No habiendo otro asunto que tratar, se da por concluida la presente acta, firmando al calce y al margen quienes en ella intervinieron.</p>
      <div class="firmas"><div>${al ? esc(al.tutor || '') : ''}<br>Madre, padre o tutor</div><div>${esc(WD.state.docente.nombre)}<br>Docente</div><div>${esc(e.director || '')}<br>Dirección</div></div>${WD.piePagina()}`;
  }
  WD.act.docInc = (el) => WD.vistaDocumento('Reporte interno', reporteHTML(incDe(el)));
  WD.act.actaInc = (el) => WD.vistaDocumento('Acta de hechos', actaHTML(incDe(el)));
  WD.act.enviarInc = async (el) => {
    const inc = incDe(el); const al = WD.alumno(inc.alumnoId); const e = WD.state.escuela;
    if (!al) { WD.toast('Elige primero al alumno.'); return; }
    if (!al.correo) { WD.toast('Falta el correo del tutor en la ficha del alumno.'); return; }
    const asunto = `Reporte ${inc.folio} · ${WD.nombreCompleto(al)} · ${e.nombre || 'Escuela'}`;
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:640px"><p>Estimado(a) ${esc(al.tutor || 'madre, padre o tutor')}:</p><p>Por este medio le comparto el reporte interno ${esc(inc.folio)} relacionado con su hijo(a) <b>${esc(WD.nombreCompleto(al))}</b>, del grupo ${esc(e.grado)} “${esc(e.grupo)}”, con fecha ${esc(WD.fechaLarga(inc.fecha))}.</p><p><b>Descripción de los hechos</b><br>${esc(inc.hechos || inc.notas).replace(/\n/g, '<br>')}</p>${(inc.medidas || []).length ? `<p><b>Medidas tomadas</b></p><ol>${inc.medidas.map((m) => `<li>${esc(m)}</li>`).join('')}</ol>` : ''}<p>Quedo a sus órdenes para cualquier duda.</p><p>Atentamente,<br>${esc(WD.state.docente.nombre)}<br>${esc(e.nombre)}${e.cct ? ' · CCT ' + esc(e.cct) : ''}</p></div>`;
    if (WD.google.estado.modo === 'google') {
      if (!(await WD.confirmar('Enviar al tutor', `Se enviará el reporte a <b>${esc(al.correo)}</b> desde tu Gmail.`, 'Enviar'))) return;
      try { await WD.google.enviarCorreo({ para: al.correo, asunto, html }); inc.enviado = `${al.correo} el ${WD.fechaLarga(WD.iso(new Date()))}`; WD.save(); WD.abrirInc(inc.id); WD.toast('Correo enviado'); }
      catch (er) { WD.toast(er.message, 4500); }
    } else {
      const txt = `${asunto}\n\nEstimado(a) ${al.tutor || 'madre, padre o tutor'}:\n\n${inc.hechos || inc.notas}\n\n${(inc.medidas || []).map((m, k) => `${k + 1}. ${m}`).join('\n')}\n\nAtentamente,\n${WD.state.docente.nombre}`;
      WD.modal(`<h2>Enviar al tutor</h2><p class="small muted">El envío automático desde tu Gmail se activa al entrar con Google. Mientras, copia el texto y mándalo a <b>${esc(al.correo)}</b>.</p><textarea class="in" readonly style="min-height:200px" id="mail-txt">${esc(txt)}</textarea><div class="row" style="justify-content:flex-end"><a class="btn" href="mailto:${encodeURIComponent(al.correo)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(txt)}">Abrir mi correo</a><button class="btn pri" id="mail-copy">Copiar texto</button></div>`)
        .querySelector('#mail-copy').onclick = () => { const t = document.getElementById('mail-txt'); navigator.clipboard.writeText(t.value).then(() => WD.toast('Copiado')).catch(() => { t.select(); WD.toast('Selecciona y copia el texto'); }); };
    }
  };

  WD.triDeInc = (x) => Number(x.trimestre) || WD.trimestreDe(x.fecha);
  WD.incReporteHTML = reporteHTML; WD.incActaHTML = actaHTML;
  let vistaInc = 'lista';
  WD.act.incVista = (el) => { vistaInc = el.dataset.v; WD.refrescar(); };
  WD.views.incidencias = {
    titulo: 'Incidencias',
    render() {
      const vt = WD.triVista(); const lista = WD.state.incidencias.filter((x) => !vt || WD.triDeInc(x) === vt).filter((x) => filtro === 'todas' || (filtro === 'abiertas' ? x.estado !== 'cerrado' : x.tipo === filtro)).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
      return `<div class="row"><div style="flex:1;min-width:0"><h1>Incidencias</h1><p class="muted">Bitácora con folios. Escribe lo que pasó y la IA lo redacta en el formato oficial.</p></div>
        ${Object.entries(WD.TIPOS_INC).map(([k, t]) => `<button class="btn ${k === 'C' ? 'pri' : ''}" data-act="nuevaInc" data-tipo="${k}">${WD.icon('mas')} ${t.nombre}</button>`).join('')}</div>
      ${WD.selectorTri()}
      <div class="row"><div class="tabs">${[['lista', 'Bitácora'], ['alumnos', 'Archivo por alumno']].map(([v, n]) => `<button class="${vistaInc === v ? 'on' : ''}" data-act="incVista" data-v="${v}">${n}</button>`).join('')}</div><span style="flex:1"></span><button class="btn sm" data-act="paqueteTri">${WD.icon('descargar')} Paquete ${vt ? `del trimestre ${vt}` : 'del ciclo'}</button></div>
      ${vistaInc === 'alumnos' ? WD.archivoIncHTML(vt) : `<div class="tabs">${[['todas', 'Todas'], ['abiertas', 'Abiertas'], ['C', 'Conducta'], ['A', 'Accidentes'], ['B', 'Violencia']].map(([f, n]) => `<button class="${filtro === f ? 'on' : ''}" data-act="incFiltro" data-f="${f}">${n}</button>`).join('')}</div>
      ${lista.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Folio</th><th>Fecha</th><th>Alumno</th><th>Tipo</th><th>Gravedad</th><th>Estado</th><th>Tutor</th></tr></thead><tbody>
        ${lista.map((x) => { const a = WD.alumno(x.alumnoId); return `<tr><td><button class="link num" data-act="verInc" data-id="${x.id}">${esc(x.folio)}</button></td><td class="num">${esc(x.fecha)} ${esc(x.hora)}</td><td>${a ? esc(WD.nombreLista(a)) : '<span class="faint">—</span>'}</td><td>${WD.TIPOS_INC[x.tipo].nombre}</td><td><span class="pill ${x.gravedad === 'grave' ? 'bad' : x.gravedad === 'moderada' ? 'warn' : ''}">${esc(x.gravedad)}</span></td><td><span class="pill ${x.estado === 'cerrado' ? 'ok' : 'acc'}">${x.estado === 'cerrado' ? 'Cerrado' : 'Abierto'}</span></td><td>${x.enviado ? '<span class="pill ok">Enviado</span>' : ''}</td></tr>`; }).join('')}
      </tbody></table></div>` : `<div class="empty"><h3>Sin reportes${filtro !== 'todas' ? ' en este filtro' : ''}</h3><p class="small">Cuando pase algo, toca el tipo de reporte arriba. El folio, la fecha y los datos de la escuela se llenan solos.</p></div>`}`}`;
    },
  };
})(window.WD);
