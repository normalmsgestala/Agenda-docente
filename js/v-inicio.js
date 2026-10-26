/* Web Docente · Inicio: la semana y la asistencia del día */
(function (WD) {
  'use strict';
  const { esc, iso, addDays, lunesDe, MESES } = WD;
  let semana = null; // lunes de la semana mostrada

  function horaDe(i) { const cl = WD.state.horario.bloques.filter((b) => b.tipo === 'clase'); const b = cl[i]; return b ? `${b.inicio}–${b.fin}` : ''; }
  WD.horaDe = horaDe;

  function pasos() {
    const e = WD.state.escuela;
    return [
      { ok: !!(e.nombre && e.cct), t: 'Datos de la escuela', to: 'escuela' },
      { ok: WD.state.alumnos.length > 0, t: 'Carga a tus alumnos', to: 'grupo' },
      { ok: WD.state.planeaciones.length > 0, t: 'Sube tu planeación', to: 'planeacion' },
      { ok: WD.ai.tieneClave(), t: 'Conecta tu Gemini', act: 'conectarGemini' },
    ];
  }
  WD.asistBotones = (fecha, compacto) => {
    const reg = WD.state.asistencia[fecha] || {};
    return WD.alumnosActivos().map((a) => {
      const v = reg[a.id] || 'A';
      return `<div class="att"><span class="nl">${esc(a.num || '')}</span><span class="nm">${esc(compacto ? WD.nombreLista(a) : WD.nombreCompleto(a))}</span><button class="st ${v}" data-act="ciclarAsist" data-f="${fecha}" data-id="${a.id}" title="${WD.ASIST[v].nombre} · toca para cambiar" aria-label="${esc(WD.nombreCompleto(a))}: ${WD.ASIST[v].nombre}">${v}</button></div>`;
    }).join('');
  };
  WD.act.ciclarAsist = (el) => {
    const f = el.dataset.f, id = el.dataset.id;
    const reg = WD.state.asistencia[f] = WD.state.asistencia[f] || {};
    const cur = reg[id] || 'A'; const nx = WD.ASIST_ORDEN[(WD.ASIST_ORDEN.indexOf(cur) + 1) % WD.ASIST_ORDEN.length];
    reg[id] = nx; WD.save();
    el.className = 'st ' + nx; el.textContent = nx; el.title = WD.ASIST[nx].nombre; el.setAttribute('aria-label', WD.ASIST[nx].nombre);
    const r = document.getElementById('asist-resumen'); if (r) r.innerHTML = resumenDia(f);
  };
  function resumenDia(f) {
    const reg = WD.state.asistencia[f] || {}; const als = WD.alumnosActivos(); const c = { A: 0, F: 0, R: 0, J: 0, S: 0 };
    als.forEach((a) => { c[reg[a.id] || 'A']++; });
    const pres = c.A + c.R + c.S;
    return `<span class="pill ok">${pres} presente${pres === 1 ? '' : 's'}</span>${c.F ? `<span class="pill bad">${c.F} falta${c.F > 1 ? 's' : ''}</span>` : ''}${c.R ? `<span class="pill warn">${c.R} retardo${c.R > 1 ? 's' : ''}</span>` : ''}${c.J ? `<span class="pill acc">${c.J} justificada${c.J > 1 ? 's' : ''}</span>` : ''}${c.S ? `<span class="pill warn">${c.S} ${c.S > 1 ? 'salieron' : 'salió'} antes</span>` : ''}`;
  }
  WD.resumenDia = resumenDia;
  WD.act.guardarAsist = (el) => { const f = el.dataset.f; WD.state.asistencia[f] = WD.state.asistencia[f] || {}; WD.save(); WD.toast('Asistencia guardada'); };

  WD.views.inicio = {
    titulo: 'Inicio',
    render() {
      const hoy = new Date(); const hoyS = iso(hoy);
      if (!semana) semana = lunesDe(hoy.getDay() === 6 || hoy.getDay() === 0 ? addDays(hoy, 2) : hoy);
      const dias = [0, 1, 2, 3, 4].map((i) => addDays(semana, i));
      const viernes = dias[4];
      const rango = semana.getMonth() === viernes.getMonth() ? `${semana.getDate()} al ${viernes.getDate()} de ${MESES[viernes.getMonth()]}` : `${semana.getDate()} de ${MESES[semana.getMonth()]} al ${viernes.getDate()} de ${MESES[viernes.getMonth()]}`;
      const hayPlan = WD.state.planeaciones.length > 0;
      const e = WD.state.escuela;
      const ps = pasos(); const faltan = ps.filter((p) => !p.ok);
      const fechaAsis = hoy.getDay() === 0 || hoy.getDay() === 6 ? null : hoyS;
      const week = dias.map((d) => {
        const f = iso(d); const ses = WD.sesionesDe(f).sort((a, b) => WD.CAMPOS.indexOf(a.campo) - WD.CAMPOS.indexOf(b.campo));
        return `<div class="day ${f === hoyS ? 'hoy' : ''}"><div class="dh"><b>${d.getDate()}</b><span>${WD.DIAS[d.getDay()]}</span>${f === hoyS ? '<span class="pill acc" style="margin-left:auto">Hoy</span>' : ''}</div>
          ${ses.length ? ses.map((s, i) => { const act = WD.state.actividades.find((a) => a.sesionId === s.id); const cal = act && Object.keys(act.calif || {}).length; return `<button class="ses ${cal ? 'done' : ''}" data-act="verSesion" data-id="${s.id}"><span class="c">${esc(WD.CAMPO_CORTO[s.campo] || s.campo)}${cal ? ' · evaluada' : ''}</span><span class="t">${esc(s.titulo || s.proyecto || 'Sesión ' + s.numero)}</span>${horaDe(i) ? `<span class="h">${horaDe(i)}</span>` : ''}</button>`; }).join('') : `<span class="tiny faint">${hayPlan ? 'Sin sesiones' : ''}</span>`}
        </div>`;
      }).join('');
      return `
      <div class="hello"><div style="flex:1;min-width:0"><div class="k">Agenda Maestro</div><h1>${esc(WD.state.docente.nombre)}</h1>
        <p class="muted" style="margin-top:6px">${esc(WD.fechaLarga(hoyS))}${e.grado ? ` · ${esc(e.grado)} ${esc(e.grupo)}` : ''}${e.nombre ? ` · ${esc(e.nombre)}` : ''}</p></div></div>
      ${faltan.length ? `<div class="card"><div class="card-h"><h2 class="grow">Para empezar</h2><span class="small muted">${ps.length - faltan.length} de ${ps.length}</span></div><div class="steps g4 grid">${ps.map((p, i) => `<a class="stepi ${p.ok ? 'ok' : ''}" href="${p.to ? '#' + p.to : '#'}" ${p.act ? `data-act="${p.act}"` : ''}><span class="n">${p.ok ? '✓' : i + 1}</span><span class="small">${p.t}</span></a>`).join('')}</div></div>` : ''}
      <div class="home">
        <section class="stack" aria-label="Semana">
          <div class="row"><h2 style="flex:1">Semana del ${rango}</h2>
            <button class="btn sm ghost" data-act="semana" data-d="-7" aria-label="Semana anterior">${WD.icon('izq')}</button>
            <button class="btn sm" data-act="semana" data-d="0">Esta semana</button>
            <button class="btn sm ghost" data-act="semana" data-d="7" aria-label="Semana siguiente">${WD.icon('der')}</button></div>
          ${hayPlan ? '' : `<div class="empty"><h3>Aquí aparecerán tus clases</h3><p class="small">Sube tu planeación (PDF o Word) y cada sesión se acomoda sola en su día.</p><a class="btn pri" href="#planeacion">${WD.icon('subir')} Subir planeación</a></div>`}
          <div class="week">${week}</div>
        </section>
        <aside class="card" aria-label="Asistencia de hoy">
          <div class="card-h"><h2 class="grow">Asistencia de hoy</h2><a class="btn sm ghost" href="#asistencia">Ver todo</a></div>
          ${!WD.state.alumnos.length ? `<div class="empty"><p class="small">Carga a tus alumnos para pasar lista con un toque.</p><a class="btn sm" href="#grupo">Ir a Mi grupo</a></div>`
            : !fechaAsis ? `<p class="small muted">Hoy no hay clases. Disfruta tu descanso.</p>`
            : `<p class="tiny muted" style="margin-bottom:8px">Todos empiezan con asistencia. Toca para cambiar: A → F → R → J → S.</p><div class="row" id="asist-resumen" style="margin-bottom:10px">${resumenDia(fechaAsis)}</div><div class="att-list">${WD.asistBotones(fechaAsis, true)}</div>`}
        </aside>
      </div>`;
    },
  };
  WD.act.semana = (el) => { const d = Number(el.dataset.d); semana = d === 0 ? null : addDays(semana, d); WD.refrescar(); };

  /* ---------- detalle de una sesión ---------- */
  WD.act.verSesion = (el) => {
    const id = el.dataset.id; let ses, plan;
    WD.state.planeaciones.forEach((p) => p.sesiones.forEach((s) => { if (s.id === id) { ses = s; plan = p; } }));
    if (!ses) return;
    const bloque = (t, v) => v ? `<div class="stack"><div class="label">${t}</div><div class="prose">${esc(v)}</div></div>` : '';
    WD.abrirDrawer(ses.titulo || ses.proyecto || 'Sesión', `
      <div class="row"><span class="pill acc">${esc(WD.CAMPO_CORTO[ses.campo])}</span>${ses.faseProyecto ? `<span class="pill">${esc(ses.faseProyecto)}</span>` : ''}${ses.paginas ? `<span class="pill">Págs. ${esc(ses.paginas)}</span>` : ''}${ses.pda ? `<span class="pill">${esc(ses.pda)}</span>` : ''}</div>
      ${ses.proyecto ? `<p class="small muted">Proyecto: ${esc(ses.proyecto)} · ${esc(plan.nombre)}</p>` : ''}
      ${bloque('Inicio', ses.inicio)}${bloque('Desarrollo', ses.desarrollo)}${bloque('Cierre', ses.cierre)}
      ${bloque('Recursos', ses.recursos)}${bloque('Evidencias', ses.evidencias)}${bloque('Ajustes razonables', ses.ajustes)}
      <div class="card flat" style="background:var(--surface-2);border:0"><div class="stack"><div class="label">Qué se evalúa hoy · ${ses.instrumento === 'rubrica' ? 'Rúbrica' : 'Lista de cotejo'}</div>
        ${(ses.criterios || []).length ? `<ul class="small" style="margin:0;padding-left:18px">${ses.criterios.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '<p class="small muted">Esta sesión no trae criterios.</p>'}
        <button class="btn pri" data-act="evaluarSesion" data-id="${ses.id}" style="justify-self:start">Evaluar con mi grupo</button></div></div>`,
      null, `${esc(WD.fechaLarga(ses.fecha))}`);
  };
  WD.act.evaluarSesion = (el) => {
    let ses, plan; WD.state.planeaciones.forEach((p) => p.sesiones.forEach((s) => { if (s.id === el.dataset.id) { ses = s; plan = p; } }));
    if (!WD.state.alumnos.length) { WD.toast('Primero carga a tus alumnos en Mi grupo.'); return; }
    const act = WD.actividadDeSesion(ses, plan); WD.abrirActividad(act.id);
  };
})(window.WD);
