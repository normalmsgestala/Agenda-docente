/* Web Docente · Evaluación por trimestre: valores, actividades, vista del grupo y por alumno */
(function (WD) {
  'use strict';
  const { esc } = WD;
  let tri = null, tab = 'grupo', alumnoSel = null, campoAct = 'todos';
  const triIdx = () => WD.state.trimestres.findIndex((t) => t.n === tri);
  const INST = { nota: 'Calificación directa', cotejo: 'Lista de cotejo', rubrica: 'Rúbrica' };
  const NIVEL = ['', 'Requiere apoyo', 'En proceso', 'Logrado', 'Destacado'];

  WD.act.evTri = (el) => { tri = Number(el.dataset.n); WD.refrescar(); };
  WD.act.evTab = (el) => { tab = el.dataset.t; WD.refrescar(); };
  WD.act.copiarPesos = () => {
    const t = WD.state.trimestres[triIdx()]; const base = { ...t.pesos[WD.CAMPOS[0]] };
    WD.CAMPOS.forEach((c) => { t.pesos[c] = { ...base }; }); WD.save(); WD.refrescar(); WD.toast('Valores copiados a los 4 campos');
  };
  WD.act.nuevaActividad = (el) => {
    const campo = el.dataset.campo && el.dataset.campo !== 'todos' ? el.dataset.campo : WD.CAMPOS[0];
    const a = { id: WD.uid(), trimestre: tri, campo, rubro: el.dataset.rubro || 'actividades', nombre: '', fecha: WD.iso(new Date()), valor: null, instrumento: el.dataset.rubro === 'examen' ? 'nota' : 'nota', criterios: [], calif: {} };
    WD.state.actividades.push(a); WD.save(); WD.abrirActividad(a.id, true);
  };
  WD.act.verActividad = (el) => WD.abrirActividad(el.dataset.id);
  WD.act.campoAct = (el) => { campoAct = el.dataset.c; WD.refrescar(); };
  WD.act.evAlumno = (el) => { alumnoSel = el.dataset.id; tab = 'alumno'; WD.refrescar(); };

  /* ---------- actividad: calificar a todo el grupo ---------- */
  function valorAuto(act) { const lista = WD.state.actividades.filter((a) => a.trimestre === act.trimestre && a.campo === act.campo && a.rubro === act.rubro); return WD.round1(WD.valoresRubro(lista)[act.id] || 0); }
  function filaAlumno(act, a, fotos) {
    const r = (act.calif || {})[a.id]; const n = WD.califActividad(act, a.id); const crit = act.criterios || [];
    let ctl = '';
    if (act.instrumento === 'nota' || !crit.length) {
      ctl = `<div class="score">${[5, 6, 7, 8, 9, 10].map((v) => `<button class="${n === v ? 'on' : ''}" data-act="calNota" data-a="${act.id}" data-al="${a.id}" data-v="${v}">${v}</button>`).join('')}<button class="${n === 0 ? 'on' : ''}" title="No entregó (cuenta como 0)" data-act="calNota" data-a="${act.id}" data-al="${a.id}" data-v="0">NE</button></div>`;
    } else if (act.instrumento === 'cotejo') {
      ctl = `<div class="row" style="gap:4px">${crit.map((c, i) => `<button class="chk ${r && r.checks && r.checks[i] ? 'on' : ''}" title="${esc(c)}" data-act="calCheck" data-a="${act.id}" data-al="${a.id}" data-i="${i}">${i + 1}</button>`).join('')}<button class="btn sm ghost" title="No entregó (cuenta como 0)" data-act="calNota" data-a="${act.id}" data-al="${a.id}" data-v="0">${n === 0 && typeof r === 'number' ? '<b>NE</b>' : 'NE'}</button></div>`;
    } else {
      ctl = `<div class="stack" style="gap:4px">${crit.map((c, i) => `<div class="row" style="gap:6px;flex-wrap:nowrap"><span class="tiny faint num" style="width:14px">${i + 1}</span><div class="lvl">${[1, 2, 3, 4].map((l) => `<button class="${r && r.niveles && r.niveles[i] === l ? 'on' : ''}" title="${NIVEL[l]}" data-act="calNivel" data-a="${act.id}" data-al="${a.id}" data-i="${i}" data-l="${l}">${l}</button>`).join('')}</div></div>`).join('')}</div>`;
    }
    const foto = fotos[a.id];
    return `<tr><td class="r faint">${esc(a.num || '')}</td><td style="white-space:normal;min-width:150px">${esc(WD.nombreLista(a))}${r && r.ia ? `<div><button class="pill warn" style="cursor:pointer" data-act="confirmarIA" data-a="${act.id}" data-al="${a.id}" title="${esc(r.comentario || '')}">Propuesta IA · confirmar</button></div>` : ''}</td>
      <td>${ctl}</td>
      <td class="c"><div class="row" style="gap:4px;flex-wrap:nowrap">${foto ? `<img class="photo" src="${foto}" alt="Foto del trabajo" data-act="verFoto" data-a="${act.id}" data-al="${a.id}">` : ''}<label class="btn sm cam" title="Tomar foto del trabajo">${WD.icon('camara')}<input type="file" accept="image/*" capture="environment" data-foto="${a.id}"></label>${foto && act.instrumento !== 'nota' && crit.length ? `<button class="btn sm" data-act="iaFoto" data-a="${act.id}" data-al="${a.id}" title="Que la IA proponga">${WD.icon('chispa')}</button>` : ''}</div></td>
      <td class="r nota">${n === null ? '<span class="faint">—</span>' : WD.round1(Math.max(n, 0))}</td></tr>`;
  }
  WD.abrirActividad = async (id, nueva) => {
    const i = WD.state.actividades.findIndex((x) => x.id === id); if (i < 0) return; const act = WD.state.actividades[i];
    const als = WD.alumnosActivos(); const fotos = {};
    for (const a of als) { const f = await WD.kv.get(`foto:${act.id}:${a.id}`); if (f) fotos[a.id] = f; }
    const auto = valorAuto(act);
    WD.abrirDrawer(nueva ? 'Nueva actividad' : (act.nombre || 'Actividad'), `
      <div class="grid g2">
        <label class="field" style="grid-column:1/-1"><span>Nombre de la actividad</span><input class="in" data-bind="actividades.${i}.nombre" value="${esc(act.nombre)}" placeholder="Ej. Cartel de seguridad vial"></label>
        <label class="field"><span>Campo formativo</span><select class="in" data-bind="actividades.${i}.campo" data-rerender>${WD.CAMPOS.map((c) => `<option ${c === act.campo ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label class="field"><span>Cuenta como</span><select class="in" data-bind="actividades.${i}.rubro" data-rerender>${WD.RUBROS.map((r) => `<option value="${r.id}" ${r.id === act.rubro ? 'selected' : ''}>${r.nombre}</option>`).join('')}</select></label>
        <label class="field"><span>Fecha</span><input class="in" type="date" data-bind="actividades.${i}.fecha" value="${esc(act.fecha)}"></label>
        <label class="field"><span>Cuánto vale (% del rubro)</span><input class="in" type="number" min="0" max="100" step="1" data-bind="actividades.${i}.valor" value="${act.valor ?? ''}" placeholder="Automático: ${auto}"></label>
        <label class="field"><span>Cómo se evalúa</span><select class="in" id="act-inst">${Object.entries(INST).map(([k, v]) => `<option value="${k}" ${k === act.instrumento ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="field"><span>Trimestre</span><select class="in" id="act-tri">${[1, 2, 3].map((n) => `<option value="${n}" ${n === act.trimestre ? 'selected' : ''}>Trimestre ${n}</option>`).join('')}</select></label>
      </div>
      <p class="tiny muted">Si dejas “Cuánto vale” vacío, el valor se reparte solo para que con todo bien hecho el alumno saque 10. Lo que aún no calificas no baja el promedio; usa NE si no lo entregó.</p>
      ${act.instrumento !== 'nota' ? `<label class="field"><span>Criterios (uno por renglón)</span><textarea class="in" id="act-crit" style="min-height:80px">${esc((act.criterios || []).join('\n'))}</textarea></label>
        ${act.instrumento === 'rubrica' ? `<p class="tiny muted">Niveles: 1 Requiere apoyo · 2 En proceso · 3 Logrado · 4 Destacado.</p>` : ''}` : ''}
      ${als.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="r">N°</th><th>Alumno</th><th>${INST[act.instrumento] || ''}</th><th class="c">Foto</th><th class="r">Nota</th></tr></thead><tbody>${als.map((a) => filaAlumno(act, a, fotos)).join('')}</tbody></table></div>` : '<div class="empty small">Carga a tus alumnos en Mi grupo para evaluar.</div>'}
      <div class="row"><span style="flex:1"></span><button class="btn danger" data-act="borrarActividad" data-id="${act.id}">Eliminar actividad</button></div>`,
      (b) => {
        b.querySelector('#act-inst')?.addEventListener('change', (e) => { act.instrumento = e.target.value; if (e.target.value !== 'nota' && !(act.criterios || []).length) act.criterios = ['Cumple con lo solicitado']; WD.save(); WD.abrirActividad(act.id); });
        b.querySelector('#act-tri')?.addEventListener('change', (e) => { act.trimestre = Number(e.target.value); WD.save(); });
        b.querySelector('#act-crit')?.addEventListener('change', (e) => { act.criterios = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean); WD.save(); WD.abrirActividad(act.id); });
        b.querySelectorAll('input[data-foto]').forEach((inp) => inp.addEventListener('change', async (e) => {
          const f = e.target.files[0]; if (!f) return; const alId = inp.dataset.foto;
          try { const d = await WD.shrinkImage(f); await WD.kv.set(`foto:${act.id}:${alId}`, d); WD.google.subirFoto(`${(act.nombre || 'actividad').replace(/[^\w]+/g, '_')}_${WD.nombreLista(WD.alumno(alId)).replace(/[^\w]+/g, '_')}`, d); WD.toast('Foto guardada'); WD.abrirActividad(act.id); }
          catch (er) { WD.toast('No pude guardar la foto.'); }
        }));
      }, `${esc(WD.CAMPO_CORTO[act.campo])} · ${esc(WD.RUBROS.find((r) => r.id === act.rubro).nombre)} · Trimestre ${act.trimestre}`);
  };
  const actDe = (el) => WD.state.actividades.find((a) => a.id === el.dataset.a);
  const repintar = (act) => { const y = document.querySelector('.drawer-b')?.scrollTop; WD.abrirActividad(act.id).then(() => { const b = document.querySelector('.drawer-b'); if (b) b.scrollTop = y; }); };
  WD.act.calNota = (el) => { const act = actDe(el); act.calif = act.calif || {}; const v = Number(el.dataset.v); act.calif[el.dataset.al] = act.calif[el.dataset.al] === v ? null : v; WD.save(); repintar(act); };
  WD.act.calCheck = (el) => { const act = actDe(el); act.calif = act.calif || {}; const r = act.calif[el.dataset.al] = (typeof act.calif[el.dataset.al] === 'object' && act.calif[el.dataset.al]) || { checks: [] }; r.checks = r.checks || []; r.checks[el.dataset.i] = !r.checks[el.dataset.i]; delete r.ia; WD.save(); repintar(act); };
  WD.act.calNivel = (el) => { const act = actDe(el); act.calif = act.calif || {}; const r = act.calif[el.dataset.al] = (typeof act.calif[el.dataset.al] === 'object' && act.calif[el.dataset.al]) || { niveles: [] }; r.niveles = r.niveles || []; const l = Number(el.dataset.l); r.niveles[el.dataset.i] = r.niveles[el.dataset.i] === l ? null : l; delete r.ia; WD.save(); repintar(act); };
  WD.act.confirmarIA = (el) => { const act = actDe(el); const r = act.calif[el.dataset.al]; if (r) delete r.ia; WD.save(); repintar(act); WD.toast('Evaluación confirmada'); };
  WD.act.verFoto = async (el) => { const d = await WD.kv.get(`foto:${el.dataset.a}:${el.dataset.al}`); WD.modal(`<div class="row"><h2 style="flex:1">${esc(WD.nombreCompleto(WD.alumno(el.dataset.al)))}</h2><button class="x" data-act="cerrarModal" aria-label="Cerrar">×</button></div><img src="${d}" alt="Foto del trabajo" style="width:100%;border-radius:8px">`); };
  WD.act.iaFoto = async (el) => {
    if (!WD.requiereIA()) return; const act = actDe(el); const alId = el.dataset.al;
    const d = await WD.kv.get(`foto:${act.id}:${alId}`); el.innerHTML = '<span class="spinner"></span>'; el.disabled = true;
    try {
      const r = await WD.ai.evaluarFoto(d, act); act.calif = act.calif || {};
      act.calif[alId] = act.instrumento === 'rubrica' ? { niveles: (r.niveles || []).map((x) => Math.max(1, Math.min(4, Number(x) || 1))), ia: true, comentario: r.comentario || '' } : { checks: (r.checks || []).map(Boolean), ia: true, comentario: r.comentario || '' };
      WD.save(); repintar(act); WD.toast(r.comentario ? `Propuesta lista: ${r.comentario}` : 'Propuesta lista. Revísala y confirma.', 5000);
    } catch (e) { WD.toast(e.message, 4500); el.disabled = false; el.innerHTML = WD.icon('chispa'); }
  };
  WD.act.borrarActividad = async (el) => {
    if (!(await WD.confirmar('Eliminar actividad', 'Se borran sus calificaciones. Esto no se puede deshacer.', 'Eliminar', true))) return;
    WD.state.actividades = WD.state.actividades.filter((a) => a.id !== el.dataset.id); WD.save(); WD.cerrarDrawer(); WD.refrescar();
  };

  /* ---------- exportar e imprimir ---------- */
  WD.excelEvaluacionAsistencia = async (n) => {
    const T = n || tri || WD.trimestreDe(WD.iso(new Date())); const als = WD.alumnosActivos();
    const filas = als.map((a) => ({ a, r: WD.resumenAlumno(a.id, T), as: WD.asistTri(a.id, T) }));
    const proms = filas.map((f) => f.r.promedio ?? -1); const lugar = (p) => p < 0 ? '' : 1 + proms.filter((x) => x > p).length;
    const hojas = [{ name: 'Calificación', widths: [6, 32, 11, 11, 11, 11, 10, 11, 8, 8, 11], rows: [['N° lista', 'Nombre', 'Lenguajes', 'Saberes', 'Ética', 'Humano', 'Promedio', 'Porcentaje', 'Lugar', 'Faltas', 'Semáforo'],
      ...filas.map(({ a, r, as }) => [Number(a.num) || '', WD.nombreLista(a), ...WD.CAMPOS.map((c) => r.porCampo[c].nota ?? ''), r.promedio ?? '', r.promedio !== null ? r.promedio * 10 : '', lugar(r.promedio ?? -1), as.F, WD.semaforo(r.promedio)])] }];
    WD.CAMPOS.forEach((c) => {
      const p = WD.state.trimestres[T - 1].pesos[c];
      hojas.push({ name: WD.CAMPO_CORTO[c], widths: [6, 32, 13, 13, 13, 13, 10], rows: [['N° lista', 'Nombre', `Actividades (${p.actividades}%)`, `Tareas (${p.tareas}%)`, `Examen (${p.examen}%)`, `Puntos extra (${p.extra}%)`, 'PROM'],
        ...filas.map(({ a }) => { const r = WD.califCampo(a.id, T, c); return [Number(a.num) || '', WD.nombreLista(a), r.det.actividades ?? '', r.det.tareas ?? '', r.det.examen ?? '', r.det.extra ?? '', r.nota ?? '']; })] });
    });
    hojas.push({ name: 'Faltas', widths: [6, 32, 10, 10, 15, 10, 12, 13], rows: [['N° lista', 'Alumno', 'Presente', 'Tarde', 'Se fue temprano', 'Ausente', 'Justificada', '% asistencia'], ...filas.map(({ a, as }) => [Number(a.num) || '', WD.nombreLista(a), as.A, as.R, as.S, as.F, as.J, as.porcentaje ?? ''])] });
    const acts = WD.state.actividades.filter((x) => x.trimestre === T).sort((x, y) => (x.fecha || '').localeCompare(y.fecha || ''));
    if (acts.length) hojas.push({ name: 'Actividades', widths: [6, 32, ...acts.map(() => 14)], rows: [['N°', 'Alumno', ...acts.map((x) => `${WD.CAMPO_CORTO[x.campo]}: ${x.nombre || 'Actividad'}`)], ...als.map((a) => [Number(a.num) || '', WD.nombreLista(a), ...acts.map((x) => { const v = WD.califActividad(x, a.id); return v === null ? '' : WD.round1(v); })])] });
    return WD.xlsxBlob(hojas);
  };
  WD.act.excelEval = async () => { const b = await WD.excelEvaluacionAsistencia(tri); WD.download(b, `Evaluacion_T${tri}_${(WD.state.escuela.grado || '').replace(/\W/g, '')}${WD.state.escuela.grupo || ''}.xlsx`); };
  WD.act.imprimirGrupo = () => {
    const als = WD.alumnosActivos(); const filas = als.map((a) => ({ a, r: WD.resumenAlumno(a.id, tri), as: WD.asistTri(a.id, tri) }));
    const e = WD.state.escuela;
    WD.vistaDocumento('Reporte general del grupo', `${WD.membrete()}<h2>REPORTE DE EVALUACIÓN · TRIMESTRE ${tri}</h2><p style="font-size:10pt;margin-bottom:10px">Grado y grupo: <b>${esc(e.grado)} ${esc(e.grupo)}</b> · Docente: <b>${esc(WD.state.docente.nombre)}</b></p>
      <table><thead><tr><th>N°</th><th>Alumno</th><th>Lenguajes</th><th>Saberes</th><th>Ética</th><th>Humano</th><th>Promedio</th><th>% asist.</th></tr></thead><tbody>${filas.map(({ a, r, as }) => `<tr><td>${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td>${WD.CAMPOS.map((c) => `<td>${r.porCampo[c].nota ?? '—'}</td>`).join('')}<td><b>${r.promedio ?? '—'}</b></td><td>${as.porcentaje ?? '—'}</td></tr>`).join('')}</tbody></table>
      <div class="firmas" style="grid-template-columns:1fr 1fr"><div>${esc(WD.state.docente.nombre)}<br>Docente</div><div>${esc(e.director || '')}<br>Dirección</div></div>${WD.piePagina()}`);
  };
  WD.reporteIndividualHTML = (id, T) => {
    const a = WD.alumno(id); const r = WD.resumenAlumno(id, T); const as = WD.asistTri(id, T); const e = WD.state.escuela;
    const acts = WD.state.actividades.filter((x) => x.trimestre === T).sort((x, y) => (x.fecha || '').localeCompare(y.fecha || ''));
    return `${WD.membrete()}<h2>REPORTE INDIVIDUAL DE EVALUACIÓN · TRIMESTRE ${T}</h2>
      <div class="box"><b>Alumno(a):</b> ${esc(WD.nombreCompleto(a))} &nbsp; · &nbsp; <b>Grado y grupo:</b> ${esc(e.grado)} ${esc(e.grupo)} &nbsp; · &nbsp; <b>N° de lista:</b> ${esc(a.num || '')}</div>
      <table><thead><tr><th>Campo formativo</th><th>Actividades</th><th>Tareas</th><th>Examen</th><th>Puntos extra</th><th>Calificación</th></tr></thead><tbody>${WD.CAMPOS.map((c) => { const x = r.porCampo[c]; return `<tr><td>${c}</td><td>${x.det.actividades ?? '—'}</td><td>${x.det.tareas ?? '—'}</td><td>${x.det.examen ?? '—'}</td><td>${x.det.extra ?? '—'}</td><td><b>${x.nota ?? '—'}</b></td></tr>`; }).join('')}
      <tr><td colspan="5" style="text-align:right"><b>Promedio general</b></td><td><b>${r.promedio ?? '—'}</b></td></tr></tbody></table>
      <div class="box" style="margin-top:12px"><div class="t">Asistencia</div>Días registrados: ${as.dias} · Asistencias: ${as.A + as.R + as.S} · Faltas: ${as.F} · Retardos: ${as.R} · Justificadas: ${as.J} · Porcentaje: <b>${as.porcentaje ?? '—'}${as.porcentaje !== null ? '%' : ''}</b></div>
      ${acts.length ? `<p style="margin:10px 0 6px;font-weight:700;font-size:10pt">Actividades del trimestre</p><table><thead><tr><th>Fecha</th><th>Campo</th><th>Actividad</th><th>Nota</th></tr></thead><tbody>${acts.map((x) => { const v = WD.califActividad(x, id); return `<tr><td>${esc(x.fecha || '')}</td><td>${WD.CAMPO_CORTO[x.campo]}</td><td>${esc(x.nombre || '')}</td><td>${v === null ? '—' : WD.round1(v)}</td></tr>`; }).join('')}</tbody></table>` : ''}
      <div class="firmas"><div>${esc(WD.state.docente.nombre)}<br>Docente</div><div>${esc(a.tutor || '')}<br>Madre, padre o tutor</div><div>${esc(e.director || '')}<br>Dirección</div></div>${WD.piePagina()}`;
  };
  WD.act.reporteAlumno = (el) => { const T = tri || WD.trimestreDe(WD.iso(new Date())); WD.vistaDocumento('Reporte individual', WD.reporteIndividualHTML(el.dataset.id, T)); };
  WD.act.reportesTodos = () => { WD.vistaDocumento('Reportes individuales', WD.alumnosActivos().map((a, i, arr) => `<div class="${i < arr.length - 1 ? 'pb' : ''}">${WD.reporteIndividualHTML(a.id, tri)}</div>`).join('')); };

  /* ---------- vista ---------- */
  WD.views.evaluacion = {
    titulo: 'Evaluación',
    render() {
      tri = tri || WD.trimestreDe(WD.iso(new Date()));
      const T = WD.state.trimestres[triIdx()]; const als = WD.alumnosActivos();
      const head = `<div class="row"><div style="flex:1;min-width:0"><h1>Evaluación</h1><p class="muted">Escala de 5 a 10 · Trimestre ${tri}</p></div>
        <div class="tabs">${[1, 2, 3].map((n) => `<button class="${tri === n ? 'on' : ''}" data-act="evTri" data-n="${n}">Trimestre ${n}</button>`).join('')}</div></div>
        <div class="row"><div class="tabs">${[['grupo', 'Todo el grupo'], ['alumno', 'Por alumno'], ['actividades', 'Actividades'], ['valores', 'Valores del trimestre']].map(([t, n]) => `<button class="${tab === t ? 'on' : ''}" data-act="evTab" data-t="${t}">${n}</button>`).join('')}</div><span style="flex:1"></span>
        <button class="btn" data-act="excelEval">${WD.icon('descargar')} Excel</button><button class="btn" data-act="imprimirGrupo">${WD.icon('imprimir')} Reporte general</button><button class="btn" data-act="reportesTodos">${WD.icon('imprimir')} Individuales</button></div>`;
      if (tab === 'valores') {
        const suma = (c) => WD.RUBROS.reduce((s, r) => s + (Number(T.pesos[c][r.id]) || 0), 0);
        return head + `<div class="card"><div class="card-h"><div class="grow"><h2>Cuánto vale cada cosa</h2><p class="small muted">Pon el porcentaje de cada rubro por campo. Si un rubro no tiene actividades en el trimestre, su valor se reparte entre los demás para que el máximo siempre sea 10.</p></div><button class="btn sm" data-act="copiarPesos">Copiar Lenguajes a todos</button></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Campo formativo</th>${WD.RUBROS.map((r) => `<th class="r">${r.nombre}</th>`).join('')}<th class="r">Total</th></tr></thead><tbody>
          ${WD.CAMPOS.map((c) => `<tr><td>${c}</td>${WD.RUBROS.map((r) => `<td class="r"><input class="in num" type="number" min="0" max="100" data-bind="trimestres.${triIdx()}.pesos.${c}.${r.id}" data-rerender value="${T.pesos[c][r.id] ?? 0}" aria-label="${r.nombre} de ${c}">%</td>`).join('')}<td class="r"><span class="pill ${suma(c) === 100 ? 'ok' : 'warn'}">${suma(c)}%</span></td></tr>`).join('')}
          </tbody></table></div>
          <div class="grid g2" style="margin-top:14px"><label class="field"><span>Inicio del trimestre ${tri}</span><input class="in" type="date" data-bind="trimestres.${triIdx()}.inicio" value="${T.inicio}"></label><label class="field"><span>Fin del trimestre ${tri}</span><input class="in" type="date" data-bind="trimestres.${triIdx()}.fin" value="${T.fin}"></label></div>
          <p class="tiny muted" style="margin-top:6px">Las fechas sirven para que cada actividad caiga en su trimestre. Si las dejas vacías se usa el calendario SEP aproximado.</p></div>`;
      }
      if (!als.length) return head + `<div class="empty"><h3>Aún no hay alumnos</h3><a class="btn pri" href="#grupo">Ir a Mi grupo</a></div>`;
      if (tab === 'actividades') {
        const acts = WD.state.actividades.filter((a) => a.trimestre === tri && (campoAct === 'todos' || a.campo === campoAct)).sort((x, y) => (y.fecha || '').localeCompare(x.fecha || ''));
        return head + `<div class="row"><div class="tabs">${[['todos', 'Todos'], ...WD.CAMPOS.map((c) => [c, WD.CAMPO_CORTO[c]])].map(([c, n]) => `<button class="${campoAct === c ? 'on' : ''}" data-act="campoAct" data-c="${esc(c)}">${n}</button>`).join('')}</div><span style="flex:1"></span>
            ${WD.RUBROS.map((r) => `<button class="btn sm" data-act="nuevaActividad" data-rubro="${r.id}" data-campo="${esc(campoAct)}">${WD.icon('mas')} ${r.nombre}</button>`).join('')}</div>
          ${acts.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Actividad</th><th>Campo</th><th>Rubro</th><th>Evalúa con</th><th class="r">Vale</th><th class="r">Calificados</th><th class="r">Promedio</th></tr></thead><tbody>
            ${acts.map((a) => { const cal = als.map((x) => WD.califActividad(a, x.id)).filter((v) => v !== null); return `<tr><td class="num">${esc(a.fecha || '')}</td><td><button class="link" data-act="verActividad" data-id="${a.id}">${esc(a.nombre || 'Sin nombre')}</button>${a.sesionId ? ' <span class="pill">planeación</span>' : ''}</td><td>${WD.CAMPO_CORTO[a.campo]}</td><td>${WD.RUBROS.find((r) => r.id === a.rubro).nombre}</td><td>${INST[a.instrumento]}</td><td class="r">${a.valor ?? `<span class="faint">${valorAuto(a)}</span>`}%</td><td class="r">${cal.length}/${als.length}</td><td class="r">${cal.length ? WD.round1(cal.reduce((s, v) => s + v, 0) / cal.length) : '—'}</td></tr>`; }).join('')}
          </tbody></table></div><p class="tiny muted">El valor gris es automático (se reparte solo). Toca una actividad para calificar o cambiar su valor.</p>`
          : `<div class="empty"><h3>Sin actividades en el trimestre ${tri}</h3><p class="small">Se crean solas cuando evalúas una sesión de tu planeación, o agrégalas con los botones de arriba.</p></div>`}`;
      }
      if (tab === 'alumno') {
        alumnoSel = alumnoSel && WD.alumno(alumnoSel) ? alumnoSel : als[0].id;
        const a = WD.alumno(alumnoSel); const r = WD.resumenAlumno(a.id, tri);
        return head + `<div class="row"><label class="field" style="min-width:260px"><span>Alumno</span><select class="in" id="ev-al">${als.map((x) => `<option value="${x.id}" ${x.id === a.id ? 'selected' : ''}>${esc(x.num ? x.num + '. ' : '')}${esc(WD.nombreLista(x))}</option>`).join('')}</select></label><span style="flex:1"></span><button class="btn" data-act="reporteAlumno" data-id="${a.id}">${WD.icon('imprimir')} Reporte individual</button></div>
          <div class="grid g4">${WD.CAMPOS.map((c) => { const x = r.porCampo[c]; return `<div class="card"><div class="label">${WD.CAMPO_CORTO[c]}</div><div style="font-size:28px;font-weight:600" class="num">${x.nota ?? '—'}</div><div class="stack tiny muted" style="gap:2px;margin-top:6px">${WD.RUBROS.map((rb) => `<div class="row" style="justify-content:space-between"><span>${rb.nombre}</span><span class="num">${x.det[rb.id] ?? '—'}</span></div>`).join('')}</div></div>`; }).join('')}</div>
          <div class="card"><div class="row"><div class="label" style="flex:1">Promedio del trimestre</div><span class="dot ${WD.semaforo(r.promedio)}"></span><b class="num" style="font-size:22px">${r.promedio ?? '—'}</b></div></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Actividad</th><th>Campo</th><th>Rubro</th><th class="r">Nota</th></tr></thead><tbody>${WD.state.actividades.filter((x) => x.trimestre === tri).sort((x, y) => (y.fecha || '').localeCompare(x.fecha || '')).map((x) => { const v = WD.califActividad(x, a.id); return `<tr><td class="num">${esc(x.fecha || '')}</td><td><button class="link" data-act="verActividad" data-id="${x.id}">${esc(x.nombre || 'Sin nombre')}</button></td><td>${WD.CAMPO_CORTO[x.campo]}</td><td>${WD.RUBROS.find((q) => q.id === x.rubro).nombre}</td><td class="r nota">${v === null ? '—' : WD.round1(v)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">Sin actividades.</td></tr>'}</tbody></table></div>`;
      }
      // grupo
      const filas = als.map((a) => ({ a, r: WD.resumenAlumno(a.id, tri), as: WD.asistTri(a.id, tri) }));
      const proms = filas.map((f) => f.r.promedio).filter((x) => x !== null);
      const sem = { verde: 0, amarillo: 0, rojo: 0 }; filas.forEach((f) => { const s = WD.semaforo(f.r.promedio); if (s) sem[s]++; });
      const lugar = (p) => p === null ? '' : 1 + proms.filter((x) => x > p).length;
      return head + `<div class="grid g4">
          <div class="card"><div class="label">Promedio del grupo</div><div style="font-size:28px;font-weight:600" class="num">${proms.length ? WD.round1(proms.reduce((s, x) => s + x, 0) / proms.length) : '—'}</div></div>
          <div class="card"><div class="label">Verde (8 a 10)</div><div style="font-size:28px;font-weight:600;color:var(--ok)" class="num">${sem.verde}</div></div>
          <div class="card"><div class="label">Amarillo (6 a 7.9)</div><div style="font-size:28px;font-weight:600;color:var(--warn)" class="num">${sem.amarillo}</div></div>
          <div class="card"><div class="label">Rojo (5 a 5.9)</div><div style="font-size:28px;font-weight:600;color:var(--bad)" class="num">${sem.rojo}</div></div></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="r">N°</th><th>Alumno</th>${WD.CAMPOS.map((c) => `<th class="r">${WD.CAMPO_CORTO[c]}</th>`).join('')}<th class="r">Promedio</th><th class="r">%</th><th class="r">Lugar</th><th class="r">Faltas</th><th>Semáforo</th></tr></thead><tbody>
          ${filas.map(({ a, r, as }) => `<tr><td class="r">${esc(a.num || '')}</td><td><button class="link" data-act="evAlumno" data-id="${a.id}">${esc(WD.nombreLista(a))}</button></td>${WD.CAMPOS.map((c) => `<td class="r">${r.porCampo[c].nota ?? '<span class="faint">—</span>'}</td>`).join('')}<td class="r"><b>${r.promedio ?? '—'}</b></td><td class="r">${r.promedio !== null ? WD.round1(r.promedio * 10) : '—'}</td><td class="r">${lugar(r.promedio)}</td><td class="r">${as.F}</td><td>${r.promedio !== null ? `<span class="dot ${WD.semaforo(r.promedio)}"></span>` : ''}</td></tr>`).join('')}
        </tbody></table></div>`;
    },
    after(v) { v.querySelector('#ev-al')?.addEventListener('change', (e) => { alumnoSel = e.target.value; WD.refrescar(); }); },
  };
})(window.WD);
