/* Web Docente · Para la agenda: hojas del tamaño exacto del recuadro de la agenda impresa (media carta)
   para imprimir, recortar y pegar. Se imprimen dos por hoja carta horizontal con línea de corte. */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const AN = 119, AL = 176; // mm del recuadro «Pegar aquí» de la agenda (5.5 × 8.5 in)
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mesNombre = (ym) => { const [y, m] = ym.split('-').map(Number); return `${MES[m - 1]} ${y}`; };
  const corto = (a) => { const ap = [a.paterno, a.materno].filter(Boolean); return `${a.nombres || ''} ${ap[0] || ''} ${ap[1] ? ap[1][0] + '.' : ''}`.trim(); };
  const E = () => WD.state.escuela;
  const grupo = () => `${String(E().grado || '').replace(/°+$/, '')}° ${E().grupo || ''}`;

  const tarjeta = (titulo, sub, cuerpo, pie = '') => `<div class="agt"><div class="agt-h"><b>${esc(titulo)}</b><span>${esc(sub)}</span></div>${cuerpo}<div class="agt-p">${pie || `${esc(E().nombre || '')} · ${esc(grupo())} · Web Docente`}</div></div>`;

  /* ---------- hojas ---------- */
  const H = {};
  H.asistencia = (ym) => {
    const [y, m] = ym.split('-').map(Number); const ult = new Date(y, m, 0).getDate();
    const reg = WD.diasConRegistro(`${ym}-01`, `${ym}-31`);
    const dias = reg.length ? reg : Array.from({ length: ult }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`).filter((f) => { const d = new Date(f + 'T12:00').getDay(); return d > 0 && d < 6 && !(WD.diaSinClases && WD.diaSinClases(f)); });
    const als = WD.alumnosActivos(); const r = WD.reporteMensual(y, m);
    const cel = (f, a) => { const v = (WD.state.asistencia[f] || {})[a.id]; return !WD.state.asistencia[f] ? '' : v && v !== 'A' ? `<b class="${v === 'F' ? 'f' : ''}">${v}</b>` : '·'; };
    const cuerpo = `<table class="agt-t agt-fx"><colgroup><col style="width:3.6mm"><col style="width:23mm">${dias.map(() => '<col>').join('')}<col style="width:3.4mm"><col style="width:3.4mm"><col style="width:5.6mm"></colgroup><thead><tr><th>N°</th><th class="l">Alumno</th>${dias.map((f) => `<th>${Number(f.slice(8))}</th>`).join('')}<th>F</th><th>R</th><th>%</th></tr></thead><tbody>
      ${als.map((a) => { const c = WD.asistAlumno(a.id, `${ym}-01`, `${ym}-31`); return `<tr><td>${esc(a.num || '')}</td><td class="l">${esc(corto(a))}</td>${dias.map((f) => `<td>${cel(f, a)}</td>`).join('')}<td><b>${c.F || ''}</b></td><td>${c.R || ''}</td><td>${c.porcentaje ?? ''}</td></tr>`; }).join('')}</tbody></table>
      <table class="agt-t agt-r"><thead><tr><th>Alumnos</th><th>0 faltas</th><th>1 a 3</th><th>4 a 8</th><th>9 o más</th><th>Días hábiles</th><th>Asistencia</th><th>Total</th><th>%</th></tr></thead>
      <tbody><tr><td>${r.alumnos}</td><td>${r.r0}</td><td>${r.r13}</td><td>${r.r48}</td><td>${r.r9}</td><td>${r.diasHabiles}</td><td>${r.asistencias}</td><td>${r.total}</td><td><b>${r.porcentaje ?? '—'}</b></td></tr></tbody></table>
      <p class="agt-n">· asistió · F falta · R retardo · J justificada · S salió antes</p>`;
    return tarjeta(`Asistencia · ${mesNombre(ym)}`, grupo(), cuerpo);
  };
  H.evaluacion = (n) => {
    const als = WD.alumnosActivos(); const C = WD.CAMPOS; const ab = { 'Lenguajes': 'LEN', 'Saberes y pensamiento científico': 'SPC', 'Ética, naturaleza y sociedades': 'ENS', 'De lo humano y lo comunitario': 'HUC' };
    const cuerpo = `<table class="agt-t agt-g"><thead><tr><th>N°</th><th class="l">Alumno</th>${C.map((c) => `<th>${ab[c]}</th>`).join('')}<th>Prom.</th></tr></thead><tbody>
      ${als.map((a) => { const r = WD.resumenAlumno(a.id, n); return `<tr><td>${esc(a.num || '')}</td><td class="l">${esc(corto(a))}</td>${C.map((c) => `<td>${r.porCampo[c]?.nota ?? ''}</td>`).join('')}<td><b>${r.promedio ?? ''}</b></td></tr>`; }).join('')}</tbody></table>
      <p class="agt-n">LEN Lenguajes · SPC Saberes y pensamiento científico · ENS Ética, naturaleza y sociedades · HUC De lo humano y lo comunitario</p>`;
    return tarjeta(`Registro de evaluación · Trimestre ${n}`, grupo(), cuerpo);
  };
  const aplicaciones = (tipo) => (WD.state.diagnosticos || []).filter((d) => d.tipo === tipo).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).slice(0, 3);
  H.idai = () => {
    const ap = aplicaciones('idai'); const ab = { 'Presilábico': 'PS', 'Silábico': 'S', 'Silábico Alfabético': 'SA', 'Alfabético': 'A' };
    const cuerpo = `<table class="agt-t agt-g"><thead><tr><th>N°</th><th class="l">Alumno</th>${['Inicial', 'Intermedia', 'Final'].map((t, i) => `<th>${t}${ap[i] ? `<br><span class="agt-d">${esc(ap[i].fecha.slice(5).split('-').reverse().join('/'))}</span>` : ''}</th>`).join('')}</tr></thead><tbody>
      ${WD.alumnosActivos().map((a) => `<tr><td>${esc(a.num || '')}</td><td class="l">${esc(corto(a))}</td>${[0, 1, 2].map((i) => `<td><b>${ap[i] ? ab[ap[i].res[a.id]?.nivel] || '' : ''}</b></td>`).join('')}</tr>`).join('')}</tbody></table>
      <p class="agt-n">PS presilábico · S silábico · SA silábico-alfabético · A alfabético</p>`;
    return tarjeta('IDAI · Diagnóstico de alfabetización inicial', grupo(), cuerpo);
  };
  H.ice = () => {
    const ap = aplicaciones('ice'); const pts = (r) => (r && r.rub && Object.keys(r.rub).length ? Object.values(r.rub).filter((v) => v === true).length : '');
    const cuerpo = `<table class="agt-t agt-g"><thead><tr><th>N°</th><th class="l">Alumno</th>${['Inicial', 'Intermedia', 'Final'].map((t, i) => `<th>${t}${ap[i] ? `<br><span class="agt-d">${esc(ap[i].fecha.slice(5).split('-').reverse().join('/'))}</span>` : ''}</th>`).join('')}</tr></thead><tbody>
      ${WD.alumnosActivos().map((a) => `<tr><td>${esc(a.num || '')}</td><td class="l">${esc(corto(a))}</td>${[0, 1, 2].map((i) => { const p = ap[i] ? pts(ap[i].res[a.id]) : ''; return `<td><b>${p === '' ? '' : `${p}/45`}</b></td>`; }).join('')}</tr>`).join('')}</tbody></table>
      <p class="agt-n">Aciertos de 45 · Nivel esperado 38 a 45 · En desarrollo 27 a 37 · Requiere apoyo menos de 27</p>`;
    return tarjeta('ICE · Convencionalidades de la escritura', grupo(), cuerpo);
  };
  H.directorio = () => tarjeta('Directorio del grupo', `${WD.alumnosActivos().length} alumnos`, `<table class="agt-t agt-g"><thead><tr><th>N°</th><th class="l">Alumno(a)</th><th class="l">Madre, padre o tutor</th><th class="l">Teléfono</th></tr></thead><tbody>
    ${WD.alumnosActivos().map((a) => `<tr><td>${esc(a.num || '')}</td><td class="l">${esc(WD.nombreCompleto(a))}</td><td class="l">${esc(a.tutor || '')}</td><td class="l">${esc(a.telefono || '')}</td></tr>`).join('')}</tbody></table>`);
  H.calendario = (ym) => {
    const [y, m] = ym.split('-').map(Number); const pr = new Date(y, m - 1, 1).getDay(); const ult = new Date(y, m, 0).getDate(); const cel = [];
    for (let i = 0; i < pr; i++) cel.push('<td></td>');
    for (let d = 1; d <= ult; d++) {
      const f = `${ym}-${String(d).padStart(2, '0')}`; const evs = WD.eventosDe ? WD.eventosDe(f) : []; const sc = WD.diaSinClases && WD.diaSinClases(f);
      cel.push(`<td class="${sc ? 'sc' : ''}"><b>${d}</b>${evs.slice(0, 3).map((e) => `<i>${esc(e.titulo)}</i>`).join('')}${(WD.cumplesDe ? WD.cumplesDe(f) : []).map((a) => `<i>Cumple ${esc(a.nombres?.split(/\s+/)[0] || '')}</i>`).join('')}</td>`);
    }
    while (cel.length % 7) cel.push('<td></td>');
    const filas = []; for (let i = 0; i < cel.length; i += 7) filas.push(`<tr>${cel.slice(i, i + 7).join('')}</tr>`);
    return tarjeta(`Calendario · ${mesNombre(ym)}`, WD.valorDelMes ? `Valor: ${WD.valorDelMes(ym + '-01') || ''}` : '', `<table class="agt-cal"><thead><tr>${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => `<th>${d}</th>`).join('')}</tr></thead><tbody>${filas.join('')}</tbody></table>`);
  };
  H.incidencias = (tipo) => {
    const xs = WD.state.incidencias.filter((x) => x.tipo === tipo).sort((a, b) => (a.folio || '').localeCompare(b.folio || '', 'es', { numeric: true }));
    return tarjeta(`Índice · ${WD.TIPOS_INC[tipo].nombre}`, `${xs.length} folio${xs.length === 1 ? '' : 's'}`, `<table class="agt-t agt-g"><thead><tr><th>Folio</th><th>Fecha</th><th class="l">Alumno(a)</th><th class="l">Breve descripción</th><th>Estado</th></tr></thead><tbody>
      ${xs.map((x) => { const a = WD.alumno(x.alumnoId); return `<tr><td><b>${esc(x.folio)}</b></td><td>${esc(x.fecha.slice(5).split('-').reverse().join('/'))}</td><td class="l">${a ? esc(corto(a)) : ''}</td><td class="l">${esc(String(x.hechos || x.notas || '').slice(0, 70))}</td><td>${x.estado === 'cerrado' ? 'Cerrado' : 'Abierto'}</td></tr>`; }).join('') || '<tr><td colspan="5">Sin folios</td></tr>'}</tbody></table>`);
  };
  // Cualquier documento de la app reducido al recuadro de la agenda
  H.documento = (html, titulo) => `<div class="agt agt-doc"><div class="agt-z"><div class="doc">${html}</div></div></div>`;
  WD.hojaAgenda = H;

  /* ---------- imprimir ---------- */
  // Hoja carta vertical (márgenes normales) con dos recuadros girados: funciona en cualquier navegador a escala 100%
  function imprimir(tarjetas) {
    const pares = []; for (let i = 0; i < tarjetas.length; i += 2) pares.push(`<div class="ag-hoja"><div class="ag-rot">${tarjetas[i]}</div>${tarjetas[i + 1] ? `<div class="ag-rot">${tarjetas[i + 1]}</div>` : ''}</div>`);
    let pa = document.getElementById('print-area'); if (!pa) { pa = document.createElement('div'); pa.id = 'print-area'; document.body.appendChild(pa); }
    pa.innerHTML = pares.join('');
    try { window.print(); } catch (e) { WD.toast('Este visor no permite imprimir. Abre la app desde su vínculo.'); }
  }
  WD.imprimirAgenda = imprimir;
  function vista(tarjetas, titulo) {
    const m = WD.modal(`<div class="row"><h2 style="flex:1">${esc(titulo)}</h2><button class="x" data-act="cerrarModal" aria-label="Cerrar">×</button></div>
      <div class="ag-prev">${tarjetas.map((t) => `<div class="ag-prev-i">${t}</div>`).join('')}</div>
      <p class="tiny muted" style="margin:0">Cada recuadro mide ${AN} × ${AL} mm, igual que el espacio de tu agenda. Salen dos por hoja carta (de lado); en la impresión deja tamaño <b>Carta</b> y escala <b>100%</b> (sin «ajustar a la página»), recorta por la línea punteada y pega.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-act="cerrarModal">Cerrar</button><button class="btn pri" id="ag-print">${WD.icon('imprimir')} Imprimir</button></div>`);
    m.querySelector('.card').style.width = 'min(980px, 100%)';
    m.querySelector('#ag-print').onclick = () => imprimir(tarjetas);
  }
  WD.vistaAgenda = vista;

  /* ---------- vista ---------- */
  const mesesCiclo = () => { const y = Number(String(E().ciclo || '').slice(0, 4)) || (new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1); return Array.from({ length: 11 }, (_, i) => { const mm = (8 + i) % 12; return `${mm <= 6 ? y + 1 : y}-${String(mm + 1).padStart(2, '0')}`; }); };
  const hoyYM = () => WD.iso(new Date()).slice(0, 7);
  const sel = { meses: new Set([hoyYM()]), tri: null, cal: hoyYM() };
  WD.act.agMes = (el) => { const k = el.dataset.k; sel.meses.has(k) ? sel.meses.delete(k) : sel.meses.add(k); WD.refrescar(); };
  WD.act.agVer = (el) => {
    const q = el.dataset.q; let ts = [], t = '';
    if (q === 'asistencia') { ts = [...sel.meses].sort().map(H.asistencia); t = 'Asistencia mensual'; if (!ts.length) { WD.toast('Elige al menos un mes.'); return; } }
    else if (q === 'evaluacion') { ts = [H.evaluacion(Number(document.getElementById('ag-tri').value))]; t = 'Registro de evaluación'; }
    else if (q === 'idai') { ts = [H.idai(), H.ice()]; t = 'IDAI e ICE'; }
    else if (q === 'directorio') { ts = [H.directorio()]; t = 'Directorio del grupo'; }
    else if (q === 'calendario') { ts = [H.calendario(document.getElementById('ag-cal').value)]; t = 'Calendario del mes'; }
    else if (q === 'incidencias') { ts = ['A', 'B', 'C'].map(H.incidencias); t = 'Índices de incidencias'; }
    else if (q === 'perfil' && WD.hojaPerfil) { ts = [WD.hojaPerfil(), WD.hojaAtencion()]; t = 'Perfil del grupo y atención diferenciada'; }
    vista(ts, t);
  };
  WD.views.agenda = {
    titulo: 'Para la agenda',
    render() {
      const ms = mesesCiclo(); const tri = WD.triActual ? WD.triActual() : 1;
      const item = (sec, titulo, desc, extra, q) => `<div class="card stack"><div><div class="label">${sec}</div><b>${titulo}</b></div><p class="small muted" style="margin:0">${desc}</p>${extra}<button class="btn pri sm" data-act="agVer" data-q="${q}" style="justify-self:start">${WD.icon('imprimir')} Ver e imprimir</button></div>`;
      return `<div><h1>Para la agenda</h1><p class="muted">Hojas del tamaño del recuadro de tu agenda impresa: imprime, recorta por la línea punteada y pega. Se llenan solas con lo que registras en la app.</p></div>
        <div class="grid g2">
          ${item('5.5 · Asistencia mensual', 'Asistencia del mes', 'La tabla del mes para el recuadro «Pegar aquí la asistencia». Elige uno o varios meses: salen dos por hoja.', `<div class="dg-its">${ms.map((k) => `<button class="dg-it ${sel.meses.has(k) ? 'on' : ''}" data-act="agMes" data-k="${k}" style="text-transform:capitalize">${MES[Number(k.slice(5)) - 1].slice(0, 3)}</button>`).join('')}</div>`, 'asistencia')}
          ${item('5.1 · Evaluación y seguimiento', 'Registro de evaluación trimestral', 'Calificación de cada campo formativo y promedio por alumno.', `<select class="in" id="ag-tri" style="max-width:180px">${[1, 2, 3].map((n) => `<option value="${n}" ${n === tri ? 'selected' : ''}>Trimestre ${n}</option>`).join('')}</select>`, 'evaluacion')}
          ${item('5.2 y 5.3 · Evaluación y seguimiento', 'IDAI e ICE', 'Niveles de cada alumno en las aplicaciones inicial, intermedia y final que capturaste en IDAI / ICE.', '', 'idai')}
          ${item('1.3 y 1.4 · Mi grupo', 'Perfil del grupo y atención diferenciada', 'El concentrado del diagnóstico y los grupos de atención con sus estrategias.', '', 'perfil')}
          ${item('1.1 · Mi grupo', 'Directorio del grupo', 'Alumnos con su tutor y teléfono.', '', 'directorio')}
          ${item('2.3 · Calendario mensual', 'Calendario del mes', 'Las fechas y actividades del mes, incluidas las de la foto del calendario de la escuela y los cumpleaños.', `<input class="in" type="month" id="ag-cal" value="${sel.cal}" style="max-width:200px">`, 'calendario')}
          ${item('6 · Bitácora de incidencias', 'Índices de incidencias', 'Folios A, B y C con fecha, alumno, descripción y estado.', '', 'incidencias')}
        </div>
        <p class="small muted">Cualquier documento de la app (actas, reportes, CTE, entrevistas, expedientes) también tiene el botón <b>«Tamaño agenda»</b> en su vista previa para imprimirlo reducido y pegarlo.</p>`;
    },
    after(v) { v.querySelector('#ag-cal')?.addEventListener('change', (e) => { sel.cal = e.target.value; }); },
  };
})(window.WD);
