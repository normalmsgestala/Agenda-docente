/* Web Docente · Juntas con padres, entrevistas con familias y asistencia de tutores */
(function (WD) {
  'use strict';
  const { esc } = WD;
  let tab = 'juntas';
  const TIPOS_JUNTA = ['Inicio de ciclo', 'Entrega de resultados · 1er trimestre', 'Entrega de resultados · 2º trimestre', 'Entrega de resultados · 3er trimestre', 'Asamblea de padres', 'Otra'];
  const lista = (k) => { if (!Array.isArray(WD.state[k])) WD.state[k] = []; return WD.state[k]; };

  // Cada junta aparece también en el calendario
  function syncCalendario() {
    if (!WD.state.calendario) return; const ev = WD.state.calendario.eventos; let cambio = false;
    lista('juntas').forEach((j) => {
      let e = ev.find((x) => x.juntaId === j.id); const titulo = `Junta con padres · ${j.tipo || ''}`.trim();
      if (!e) { ev.push({ id: WD.uid(), juntaId: j.id, tipo: 'personal', inicio: j.fecha, fin: j.fecha, titulo, notas: '' }); cambio = true; }
      else if (e.inicio !== j.fecha || e.titulo !== titulo) { e.inicio = e.fin = j.fecha; e.titulo = titulo; cambio = true; }
    });
    const ids = new Set(lista('juntas').map((j) => j.id));
    const antes = ev.length; WD.state.calendario.eventos = ev.filter((x) => !x.juntaId || ids.has(x.juntaId)); if (WD.state.calendario.eventos.length !== antes) cambio = true;
    if (cambio) WD.save();
  }

  WD.act.juntasTab = (el) => { tab = el.dataset.t; WD.refrescar(); };
  WD.act.nuevaJunta = () => {
    const now = new Date(); const j = { id: WD.uid(), fecha: WD.iso(now), hora: '08:00', lugar: `Salón ${WD.state.escuela.grado || ''} ${WD.state.escuela.grupo || ''}`.trim(), tipo: TIPOS_JUNTA[0], orden: '', notas: '', acuerdos: '', acta: '', asistencia: {} };
    lista('juntas').push(j); WD.save(); abrirJunta(j.id, true);
  };
  WD.act.verJunta = (el) => abrirJunta(el.dataset.id);
  WD.act.nuevaEntrevista = (el) => {
    const now = new Date(); const e = { id: WD.uid(), alumnoId: el.dataset.al || '', fecha: WD.iso(now), hora: `${WD.pad(now.getHours())}:${WD.pad(now.getMinutes())}`, asistio: '', motivo: '', notas: '', acuerdos: '', seguimiento: '' };
    lista('entrevistas').push(e); WD.save(); abrirEntrevista(e.id, true);
  };
  WD.act.verEntrevista = (el) => abrirEntrevista(el.dataset.id);

  /* ---------- junta ---------- */
  function abrirJunta(id, nueva) {
    const i = lista('juntas').findIndex((x) => x.id === id); if (i < 0) return; const j = WD.state.juntas[i]; const p = `juntas.${i}`;
    const als = WD.alumnosActivos(); const vinieron = als.filter((a) => j.asistencia[a.id] === 'A').length;
    WD.abrirDrawer(nueva ? 'Nueva junta' : `Junta · ${j.tipo}`, `
      <div class="grid g2">
        <label class="field"><span>Tipo de junta</span><select class="in" data-bind="${p}.tipo">${TIPOS_JUNTA.map((t) => `<option ${t === j.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="field"><span>Lugar</span><input class="in" data-bind="${p}.lugar" value="${esc(j.lugar)}"></label>
        <label class="field"><span>Fecha</span><input class="in" type="date" data-bind="${p}.fecha" value="${esc(j.fecha)}"></label>
        <label class="field"><span>Hora</span><input class="in" type="time" data-bind="${p}.hora" value="${esc(j.hora)}"></label>
      </div>
      <label class="field"><span>Orden del día (un punto por renglón)</span><textarea class="in" data-bind="${p}.orden" placeholder="Bienvenida&#10;Resultados del trimestre&#10;Acuerdos de convivencia">${esc(j.orden)}</textarea></label>
      <div class="stack"><div class="row"><div class="label" style="flex:1">Asistencia de tutores</div><span class="pill ok" id="jt-cuenta">${vinieron} de ${als.length}</span><button class="btn sm" data-act="juntaTodos" data-id="${j.id}">Todos vinieron</button></div>
        ${als.length ? `<div class="att-list grid g2" style="max-height:none">${als.map((a) => { const v = j.asistencia[a.id] || ''; return `<div class="att"><span class="nl">${esc(a.num || '')}</span><span class="nm">${esc(WD.nombreLista(a))}${a.tutor ? `<span class="tiny faint"> · ${esc(a.tutor)}</span>` : ''}</span><button class="st ${v === 'A' ? 'A' : v === 'F' ? 'F' : ''}" data-act="juntaAsis" data-id="${j.id}" data-al="${a.id}" aria-label="${esc(WD.nombreCompleto(a))}: ${v === 'A' ? 'asistió' : v === 'F' ? 'faltó' : 'sin marcar'}">${v || '·'}</button></div>`; }).join('')}</div><p class="tiny muted">Toca para marcar: A asistió → F faltó → sin marcar.</p>` : '<p class="small muted">Carga a tus alumnos en Mi grupo para pasar lista de tutores.</p>'}</div>
      <label class="field"><span>¿Qué se habló? (tus notas, como te salgan)</span><textarea class="in" data-bind="${p}.notas" style="min-height:90px">${esc(j.notas)}</textarea></label>
      <label class="field"><span>Acuerdos (uno por renglón)</span><textarea class="in" data-bind="${p}.acuerdos">${esc(j.acuerdos)}</textarea></label>
      <button class="btn" data-act="juntaIA" data-id="${j.id}" style="justify-self:start">${WD.icon('chispa')} Redactar el acta con IA</button>
      ${j.acta ? `<label class="field"><span>Acta redactada</span><textarea class="in" data-bind="${p}.acta" style="min-height:160px">${esc(j.acta)}</textarea></label>` : ''}
      <div class="sep"></div>
      <div class="row"><button class="btn" data-act="juntaActa" data-id="${j.id}">${WD.icon('imprimir')} Acta de reunión</button><button class="btn" data-act="juntaFirmas" data-id="${j.id}">${WD.icon('imprimir')} Lista para firmas</button><span style="flex:1"></span><button class="btn ghost danger sm" data-act="borrarJunta" data-id="${j.id}">Eliminar</button></div>`,
      null, nueva ? 'Se guarda sola y aparece en tu calendario.' : `${esc(WD.fechaLarga(j.fecha))} · ${esc(j.hora)}`);
  }
  const juntaDe = (el) => lista('juntas').find((x) => x.id === el.dataset.id);
  WD.act.juntaAsis = (el) => {
    const j = juntaDe(el); const cur = j.asistencia[el.dataset.al] || ''; const nx = cur === '' ? 'A' : cur === 'A' ? 'F' : '';
    if (nx) j.asistencia[el.dataset.al] = nx; else delete j.asistencia[el.dataset.al]; WD.save();
    el.className = 'st ' + nx; el.textContent = nx || '·';
    const c = document.getElementById('jt-cuenta'); if (c) c.textContent = `${WD.alumnosActivos().filter((a) => j.asistencia[a.id] === 'A').length} de ${WD.alumnosActivos().length}`;
  };
  WD.act.juntaTodos = (el) => { const j = juntaDe(el); WD.alumnosActivos().forEach((a) => { j.asistencia[a.id] = 'A'; }); WD.save(); abrirJunta(j.id); };
  WD.act.borrarJunta = async (el) => {
    if (!(await WD.confirmar('Eliminar junta', 'Se borra la junta, su asistencia y su acta.', 'Eliminar', true))) return;
    WD.state.juntas = lista('juntas').filter((x) => x.id !== el.dataset.id); syncCalendario(); WD.save(); WD.cerrarDrawer(); WD.refrescar();
  };
  WD.act.juntaIA = async (el) => {
    const j = juntaDe(el); if (!(j.notas || j.orden || j.acuerdos).trim()) { WD.toast('Escribe primero el orden del día o tus notas.'); return; }
    if (!WD.requiereIA()) return;
    el.disabled = true; el.innerHTML = '<span class="spinner"></span> Redactando…';
    try {
      const e = WD.state.escuela; const als = WD.alumnosActivos(); const vinieron = als.filter((a) => j.asistencia[a.id] === 'A').length;
      const a = WD.ai.anonimizar(`Orden del día:\n${j.orden}\nNotas:\n${j.notas}\nAcuerdos:\n${j.acuerdos}`);
      const txt = await WD.ai.generar([{ text: `Redacta el cuerpo de un acta de reunión de padres de familia de una primaria en México, en tono formal y claro, en párrafos y con los acuerdos numerados al final. No inventes datos ni nombres. Conserva los alias "Alumno N" tal cual.
Datos: ${j.tipo}; fecha ${WD.fechaLarga(j.fecha)} a las ${j.hora}; lugar ${j.lugar}; grupo ${e.grado} ${e.grupo}; escuela ${e.nombre}; docente ${WD.state.docente.nombre}; asistieron ${vinieron} de ${als.length} tutores.
${a.texto}
Devuelve solo el texto del acta (sin encabezado de escuela ni firmas).` }], { temperatura: 0.3, maxTokens: 2048 });
      j.acta = a.restaurar(txt.trim()); WD.save(); abrirJunta(j.id); WD.toast('Acta lista. Revísala y ajusta lo que necesites.');
    } catch (er) { WD.toast(er.message, 4500); el.disabled = false; el.innerHTML = `${WD.icon('chispa')} Redactar el acta con IA`; }
  };
  WD.act.juntaActa = (el) => {
    const j = juntaDe(el); const e = WD.state.escuela; const als = WD.alumnosActivos(); const vinieron = als.filter((a) => j.asistencia[a.id] === 'A');
    const cuerpo = j.acta || [j.orden && `Orden del día:\n${j.orden}`, j.notas, j.acuerdos && `Acuerdos:\n${j.acuerdos}`].filter(Boolean).join('\n\n');
    WD.vistaDocumento('Acta de reunión', `${WD.membrete()}<h2>ACTA DE REUNIÓN CON MADRES, PADRES DE FAMILIA O TUTORES</h2>
      <div class="box"><b>${esc(j.tipo)}</b> · ${esc(WD.fechaLarga(j.fecha))} · ${esc(j.hora)} h · ${esc(j.lugar)} · Grupo ${esc(e.grado)} “${esc(e.grupo)}” · Asistencia: ${vinieron.length} de ${als.length}</div>
      <div style="white-space:pre-wrap;text-align:justify;margin-bottom:12px">${esc(cuerpo)}</div>
      <table><thead><tr><th>N°</th><th>Alumno(a)</th><th>Madre, padre o tutor</th><th>Asistió</th><th style="width:30%">Firma</th></tr></thead><tbody>${als.map((a) => `<tr><td>${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td><td>${esc(a.tutor || '')}</td><td>${j.asistencia[a.id] === 'A' ? 'Sí' : j.asistencia[a.id] === 'F' ? 'No' : ''}</td><td></td></tr>`).join('')}</tbody></table>
      <div class="firmas" style="grid-template-columns:1fr 1fr"><div>${esc(WD.state.docente.nombre)}<br>Docente</div><div>${esc(e.director || '')}<br>Dirección</div></div>${WD.piePagina()}`);
  };
  WD.act.juntaFirmas = (el) => {
    const j = juntaDe(el); const e = WD.state.escuela; const als = WD.alumnosActivos();
    WD.vistaDocumento('Lista para firmas', `${WD.membrete()}<h2>LISTA DE ASISTENCIA · ${esc(j.tipo.toUpperCase())}</h2><p style="text-align:center;margin:-6px 0 12px">${esc(WD.fechaLarga(j.fecha))} · ${esc(j.hora)} h · Grupo ${esc(e.grado)} “${esc(e.grupo)}”</p>
      <table><thead><tr><th>N°</th><th>Alumno(a)</th><th>Nombre de quien asiste</th><th>Parentesco</th><th style="width:28%">Firma</th></tr></thead><tbody>${als.map((a) => `<tr style="height:30px"><td>${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td><td></td><td></td><td></td></tr>`).join('')}</tbody></table>${WD.piePagina()}`);
  };

  /* ---------- entrevista ---------- */
  function abrirEntrevista(id, nueva) {
    const i = lista('entrevistas').findIndex((x) => x.id === id); if (i < 0) return; const v = WD.state.entrevistas[i]; const p = `entrevistas.${i}`;
    const als = WD.alumnosActivos(); const al = WD.alumno(v.alumnoId);
    WD.abrirDrawer(nueva ? 'Nueva entrevista' : `Entrevista · ${al ? WD.nombreCompleto(al) : ''}`, `
      <div class="grid g2">
        <label class="field" style="grid-column:1/-1"><span>Alumno(a)</span><select class="in" data-bind="${p}.alumnoId" data-rerender><option value="">Elige al alumno…</option>${als.map((a) => `<option value="${a.id}" ${a.id === v.alumnoId ? 'selected' : ''}>${esc(WD.nombreLista(a))}</option>`).join('')}</select></label>
        <label class="field"><span>Fecha</span><input class="in" type="date" data-bind="${p}.fecha" value="${esc(v.fecha)}"></label>
        <label class="field"><span>Hora</span><input class="in" type="time" data-bind="${p}.hora" value="${esc(v.hora)}"></label>
        <label class="field" style="grid-column:1/-1"><span>¿Quién asistió?</span><input class="in" data-bind="${p}.asistio" value="${esc(v.asistio || (al && al.tutor ? `${al.tutor}${al.parentesco ? ' (' + al.parentesco + ')' : ''}` : ''))}" placeholder="Nombre y parentesco"></label>
      </div>
      <label class="field"><span>Motivo</span><input class="in" data-bind="${p}.motivo" value="${esc(v.motivo)}" placeholder="Ej. bajo desempeño en lectura, conducta, seguimiento NEE"></label>
      <label class="field"><span>¿Qué se habló?</span><textarea class="in" data-bind="${p}.notas" style="min-height:100px">${esc(v.notas)}</textarea></label>
      <label class="field"><span>Acuerdos y compromisos (uno por renglón)</span><textarea class="in" data-bind="${p}.acuerdos">${esc(v.acuerdos)}</textarea></label>
      <label class="field" style="max-width:220px"><span>Fecha de seguimiento</span><input class="in" type="date" data-bind="${p}.seguimiento" value="${esc(v.seguimiento)}"></label>
      <button class="btn" data-act="entrevistaIA" data-id="${v.id}" style="justify-self:start">${WD.icon('chispa')} Redactar en formato formal con IA</button>
      <div class="sep"></div>
      <div class="row"><button class="btn" data-act="entrevistaDoc" data-id="${v.id}">${WD.icon('imprimir')} Registro de entrevista</button><span style="flex:1"></span><button class="btn ghost danger sm" data-act="borrarEntrevista" data-id="${v.id}">Eliminar</button></div>`,
      null, nueva ? 'Se guarda sola.' : esc(WD.fechaLarga(v.fecha)));
  }
  const entDe = (el) => lista('entrevistas').find((x) => x.id === el.dataset.id);
  WD.act.borrarEntrevista = async (el) => {
    if (!(await WD.confirmar('Eliminar entrevista', 'Se borra este registro.', 'Eliminar', true))) return;
    WD.state.entrevistas = lista('entrevistas').filter((x) => x.id !== el.dataset.id); WD.save(); WD.cerrarDrawer(); WD.refrescar();
  };
  WD.act.entrevistaIA = async (el) => {
    const v = entDe(el); if (!(v.notas || '').trim()) { WD.toast('Escribe primero qué se habló.'); return; }
    if (!WD.requiereIA()) return;
    el.disabled = true; el.innerHTML = '<span class="spinner"></span> Redactando…';
    try {
      const a = WD.ai.anonimizar(`Motivo: ${v.motivo}\nNotas: ${v.notas}\nAcuerdos: ${v.acuerdos}`);
      const out = await WD.ai.generar([{ text: `Redacta en tono formal, objetivo y respetuoso el registro de una entrevista entre docente de primaria y familia en México. No inventes datos. Conserva los alias "Alumno N".\n${a.texto}\nDevuelve JSON {"notas":"párrafo con lo que se habló","acuerdos":"acuerdos numerados, uno por renglón"}` }], { json: true, temperatura: 0.3 });
      if (out.notas) v.notas = a.restaurar(out.notas); if (out.acuerdos) v.acuerdos = a.restaurar(out.acuerdos);
      WD.save(); abrirEntrevista(v.id); WD.toast('Listo. Revisa y ajusta lo que necesites.');
    } catch (er) { WD.toast(er.message, 4500); el.disabled = false; el.innerHTML = `${WD.icon('chispa')} Redactar en formato formal con IA`; }
  };
  WD.act.entrevistaDoc = (el) => {
    const v = entDe(el); const al = WD.alumno(v.alumnoId); const e = WD.state.escuela;
    WD.vistaDocumento('Registro de entrevista', `${WD.membrete()}<h2>REGISTRO DE ENTREVISTA CON LA FAMILIA</h2>
      <div class="box"><b>Alumno(a):</b> ${al ? esc(WD.nombreCompleto(al)) : ''} · <b>Grado y grupo:</b> ${esc(e.grado)} “${esc(e.grupo)}” · <b>Fecha:</b> ${esc(WD.fechaLarga(v.fecha))} ${esc(v.hora)} h<br><b>Asistió:</b> ${esc(v.asistio || (al ? al.tutor || '' : ''))} · <b>Motivo:</b> ${esc(v.motivo)}</div>
      <div class="box"><div class="t">LO QUE SE HABLÓ</div><div style="white-space:pre-wrap;text-align:justify">${esc(v.notas)}</div></div>
      <div class="box"><div class="t">ACUERDOS Y COMPROMISOS</div><div style="white-space:pre-wrap">${esc(v.acuerdos)}</div>${v.seguimiento ? `<p style="margin-top:8px"><b>Seguimiento:</b> ${esc(WD.fechaLarga(v.seguimiento))}</p>` : ''}</div>
      <div class="firmas"><div>${esc(v.asistio || (al ? al.tutor || '' : ''))}<br>Madre, padre o tutor</div><div>${esc(WD.state.docente.nombre)}<br>Docente</div><div>${esc(e.director || '')}<br>Dirección</div></div>${WD.piePagina()}`);
  };

  /* ---------- vista ---------- */
  WD.views.juntas = {
    titulo: 'Juntas con padres',
    render() {
      syncCalendario();
      const js = lista('juntas').slice().sort((a, b) => b.fecha.localeCompare(a.fecha)); const ent = lista('entrevistas').slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
      const als = WD.alumnosActivos();
      const head = `<div class="row"><div style="flex:1;min-width:0"><h1>Juntas con padres</h1><p class="muted">Juntas de grupo, entrevistas con cada familia y asistencia de tutores.</p></div>
        <button class="btn ${tab === 'entrevistas' ? '' : 'pri'}" data-act="nuevaJunta">${WD.icon('mas')} Nueva junta</button><button class="btn ${tab === 'entrevistas' ? 'pri' : ''}" data-act="nuevaEntrevista">${WD.icon('mas')} Nueva entrevista</button></div>
        <div class="tabs">${[['juntas', `Juntas (${js.length})`], ['entrevistas', `Entrevistas (${ent.length})`], ['asistencia', 'Asistencia de tutores']].map(([t, n]) => `<button class="${tab === t ? 'on' : ''}" data-act="juntasTab" data-t="${t}">${n}</button>`).join('')}</div>`;
      if (tab === 'juntas') return head + (js.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Junta</th><th class="r">Asistencia</th><th>Acta</th></tr></thead><tbody>${js.map((j) => { const n = als.filter((a) => j.asistencia[a.id] === 'A').length; return `<tr><td class="num">${esc(j.fecha)} ${esc(j.hora)}</td><td><button class="link" data-act="verJunta" data-id="${j.id}">${esc(j.tipo)}</button></td><td class="r">${n} de ${als.length}${als.length ? ` · ${Math.round(100 * n / als.length)}%` : ''}</td><td>${j.acta ? '<span class="pill ok">Redactada</span>' : '<span class="pill">Pendiente</span>'}</td></tr>`; }).join('')}</tbody></table></div>`
        : `<div class="empty"><h3>Aún no hay juntas</h3><p class="small">Crea una junta, pasa lista de tutores con un toque, escribe tus notas y la IA te redacta el acta lista para imprimir con su lista de firmas.</p><button class="btn pri" data-act="nuevaJunta">${WD.icon('mas')} Nueva junta</button></div>`);
      if (tab === 'entrevistas') return head + (ent.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Alumno</th><th>Motivo</th><th>Seguimiento</th></tr></thead><tbody>${ent.map((v) => { const a = WD.alumno(v.alumnoId); return `<tr><td class="num">${esc(v.fecha)}</td><td><button class="link" data-act="verEntrevista" data-id="${v.id}">${a ? esc(WD.nombreLista(a)) : 'Sin alumno'}</button></td><td style="white-space:normal">${esc(v.motivo || '')}</td><td class="num">${v.seguimiento ? `<span class="pill ${v.seguimiento < WD.iso(new Date()) ? 'warn' : 'acc'}">${esc(v.seguimiento)}</span>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`
        : `<div class="empty"><h3>Aún no hay entrevistas</h3><p class="small">Registra cada plática con una familia: quién vino, el motivo, lo que se habló, acuerdos y fecha de seguimiento.</p><button class="btn pri" data-act="nuevaEntrevista">${WD.icon('mas')} Nueva entrevista</button></div>`);
      const orden = lista('juntas').slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
      if (!orden.length || !als.length) return head + '<div class="empty small">Aquí verás qué tutores asisten a cada junta, cuando registres la primera.</div>';
      return head + `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="r">N°</th><th>Alumno</th><th>Tutor</th>${orden.map((j, k) => `<th class="c" title="${esc(j.tipo)}">J${k + 1}<div class="tiny faint" style="text-transform:none">${esc(j.fecha.slice(5))}</div></th>`).join('')}<th class="r">%</th></tr></thead><tbody>
        ${als.map((a) => { const marcadas = orden.filter((j) => j.asistencia[a.id]); const si = orden.filter((j) => j.asistencia[a.id] === 'A').length; return `<tr><td class="r">${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td><td>${esc(a.tutor || '')}</td>${orden.map((j) => { const v = j.asistencia[a.id]; return `<td class="c">${v === 'A' ? '<span class="pill ok">A</span>' : v === 'F' ? '<span class="pill bad">F</span>' : '<span class="faint">·</span>'}</td>`; }).join('')}<td class="r">${marcadas.length ? Math.round(100 * si / orden.length) + '%' : '—'}</td></tr>`; }).join('')}
      </tbody></table></div>`;
    },
  };
})(window.WD);
