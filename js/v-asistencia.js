/* Web Docente · Asistencia: pasar lista, porcentajes y reporte mensual de la escuela */
(function (WD) {
  'use strict';
  const { esc, iso, pad, MESES } = WD;
  let tab = 'lista', fecha = null, mes = null; // mes = 'AAAA-MM'

  const diasHabilesMes = (ym) => { const [y, m] = ym.split('-').map(Number); const out = []; const d = new Date(y, m - 1, 1); while (d.getMonth() === m - 1) { if (d.getDay() > 0 && d.getDay() < 6) out.push(iso(d)); d.setDate(d.getDate() + 1); } return out; };
  const nombreMes = (ym) => { const [y, m] = ym.split('-').map(Number); return `${MESES[m - 1]} ${y}`; };

  WD.act.asistTab = (el) => { tab = el.dataset.t; WD.refrescar(); };
  WD.act.todosAsistio = (el) => { const f = el.dataset.f; WD.state.asistencia[f] = {}; WD.alumnosActivos().forEach((a) => { WD.state.asistencia[f][a.id] = 'A'; }); WD.save(); WD.refrescar(); WD.toast('Todos con asistencia'); };
  WD.act.quitarDia = async (el) => { if (!(await WD.confirmar('Quitar registro del día', 'Ese día dejará de contar como día hábil en los porcentajes.', 'Quitar', true))) return; delete WD.state.asistencia[el.dataset.f]; WD.save(); WD.refrescar(); };

  function tablaMes(ym) {
    const dias = WD.diasConRegistro(ym + '-01', ym + '-31');
    const als = WD.alumnosActivos();
    return { dias, filas: als.map((a) => { const c = WD.asistAlumno(a.id, ym + '-01', ym + '-31'); return { a, c, marcas: dias.map((d) => (WD.state.asistencia[d] || {})[a.id] || 'A') }; }) };
  }
  WD.act.excelAsistMes = async () => {
    const ym = mes; const { dias, filas } = tablaMes(ym); const r = WD.reporteMensual(...ym.split('-').map(Number));
    const e = WD.state.escuela;
    const hoja1 = [['N°', 'Alumno', ...dias.map((d) => Number(d.slice(8))), 'Asistencias', 'Faltas', 'Retardos', 'Justificadas', 'Salió antes', '% asistencia']];
    filas.forEach(({ a, c, marcas }) => hoja1.push([Number(a.num) || '', WD.nombreLista(a), ...marcas, c.A + c.R + c.S, c.F, c.R, c.J, c.S, c.porcentaje ?? '']));
    const hoja2 = [['GRADO', 'GRUPO', 'ALUMNOS', 'FALTAS 0', 'FALTAS 1 a 3', 'FALTAS 4 a 8', 'FALTAS 9 o más', 'DÍAS HÁBILES', 'ASISTENCIA', 'TOTAL ASISTENCIA', 'PORCENTAJE (%)'],
      [e.grado || '', e.grupo || '', r.alumnos, r.r0, r.r13, r.r48, r.r9, r.diasHabiles, r.asistencias, r.total, r.porcentaje ?? '']];
    const blob = await WD.xlsxBlob([{ name: 'Lista ' + nombreMes(ym), rows: hoja1, widths: [5, 30, ...dias.map(() => 4), 11, 8, 9, 11, 11, 12] }, { name: 'Reporte escuela', rows: hoja2, widths: [10, 8, 10, 10, 12, 12, 13, 13, 12, 16, 12] }]);
    WD.download(blob, `Asistencia_${ym}_${(e.grado || '').replace(/\W/g, '')}${e.grupo || ''}.xlsx`);
  };
  WD.act.imprimirAsistMes = () => {
    const ym = mes; const r = WD.reporteMensual(...ym.split('-').map(Number)); const e = WD.state.escuela; const { dias, filas } = tablaMes(ym);
    WD.vistaDocumento('Reporte de asistencia', `${WD.membrete()}<h2>REPORTE MENSUAL DE ASISTENCIA · ${nombreMes(ym).toUpperCase()}</h2>
      <table><thead><tr><th>Grado</th><th>Grupo</th><th>Alumnos</th><th>0 faltas</th><th>1 a 3</th><th>4 a 8</th><th>9 o más</th><th>Días hábiles</th><th>Asistencia</th><th>Total asistencia</th><th>Porcentaje</th></tr></thead>
      <tbody><tr><td>${esc(e.grado)}</td><td>${esc(e.grupo)}</td><td>${r.alumnos}</td><td>${r.r0}</td><td>${r.r13}</td><td>${r.r48}</td><td>${r.r9}</td><td>${r.diasHabiles}</td><td>${r.asistencias}</td><td>${r.total}</td><td>${r.porcentaje ?? '—'}${r.porcentaje !== null ? '%' : ''}</td></tr></tbody></table>
      <p style="margin:14px 0 6px;font-weight:700;font-size:10pt">Detalle por alumno</p>
      <table><thead><tr><th>N°</th><th>Alumno</th><th>Asist.</th><th>Faltas</th><th>Retardos</th><th>Justif.</th><th>Salió antes</th><th>%</th></tr></thead><tbody>${filas.map(({ a, c }) => `<tr><td>${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td><td>${c.A + c.R + c.S}</td><td>${c.F}</td><td>${c.R}</td><td>${c.J}</td><td>${c.S}</td><td>${c.porcentaje ?? '—'}</td></tr>`).join('')}</tbody></table>
      <div class="firmas" style="grid-template-columns:1fr 1fr"><div>${esc(WD.state.docente.nombre)}<br>Docente</div><div>${esc(e.director || '')}<br>Dirección</div></div>${WD.piePagina()}`);
  };

  WD.views.asistencia = {
    titulo: 'Asistencia',
    render() {
      const hoy = new Date(); fecha = fecha || iso(hoy); mes = mes || `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}`;
      const als = WD.alumnosActivos();
      const head = `<div class="row"><div style="flex:1;min-width:0"><h1>Asistencia</h1><p class="muted">Un toque para cambiar el estado. Todos empiezan con asistencia.</p></div>
        <div class="tabs" role="tablist">${[['lista', 'Pasar lista'], ['alumnos', 'Por alumno'], ['mes', 'Reporte mensual']].map(([t, n]) => `<button role="tab" aria-selected="${tab === t}" class="${tab === t ? 'on' : ''}" data-act="asistTab" data-t="${t}">${n}</button>`).join('')}</div></div>
        <div class="legend">${WD.ASIST_ORDEN.map((k) => `<span><b class="num">${k}</b> ${WD.ASIST[k].nombre}</span>`).join('')}</div>`;
      if (!als.length) return head + `<div class="empty"><h3>Aún no hay alumnos</h3><a class="btn pri" href="#grupo">Ir a Mi grupo</a></div>`;
      if (tab === 'lista') {
        const reg = WD.state.asistencia[fecha];
        return head + `<div class="card"><div class="card-h"><label class="field" style="max-width:200px"><span>Fecha</span><input class="in" type="date" id="as-fecha" value="${fecha}"></label>
          <div class="grow"><div class="small muted" style="text-transform:capitalize">${esc(WD.fechaLarga(fecha))}</div><div class="row" id="asist-resumen" style="margin-top:6px">${WD.resumenDia(fecha)}</div></div>
          <button class="btn sm" data-act="todosAsistio" data-f="${fecha}">Todos asistieron</button>${reg ? `<button class="btn sm ghost" data-act="quitarDia" data-f="${fecha}">Quitar día</button>` : ''}</div>
          ${reg ? '' : '<p class="note small" style="margin-bottom:10px">Este día aún no cuenta como día hábil. Se registra en cuanto tocas a un alumno o presionas “Todos asistieron”.</p>'}
          <div class="att-list grid g2" style="max-height:none">${WD.asistBotones(fecha)}</div></div>`;
      }
      if (tab === 'alumnos') {
        const ini = WD.state.trimestres[0].inicio || '';
        return head + `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="r">N°</th><th>Alumno</th><th class="r">Días</th><th class="r">Asistió</th><th class="r">Faltas</th><th class="r">Retardos</th><th class="r">Justif.</th><th class="r">Salió antes</th><th class="r">% asistencia</th></tr></thead><tbody>
          ${als.map((a) => { const c = WD.asistAlumno(a.id, ini); return `<tr><td class="r">${esc(a.num || '')}</td><td><button class="link" data-act="verAlumno" data-id="${a.id}">${esc(WD.nombreLista(a))}</button></td><td class="r">${c.dias}</td><td class="r">${c.A}</td><td class="r">${c.F}</td><td class="r">${c.R}</td><td class="r">${c.J}</td><td class="r">${c.S}</td><td class="r"><b>${c.porcentaje ?? '—'}${c.porcentaje !== null ? '%' : ''}</b></td></tr>`; }).join('')}
          </tbody></table></div><p class="tiny muted">Porcentaje del ciclo: (asistió + retardo + salió antes) ÷ días registrados.</p>`;
      }
      const r = WD.reporteMensual(...mes.split('-').map(Number)); const e = WD.state.escuela; const habiles = diasHabilesMes(mes).length;
      return head + `<div class="card"><div class="card-h"><label class="field" style="max-width:200px"><span>Mes</span><input class="in" type="month" id="as-mes" value="${mes}"></label><div class="grow"></div>
          <button class="btn" data-act="excelAsistMes">${WD.icon('descargar')} Excel</button><button class="btn" data-act="imprimirAsistMes">${WD.icon('imprimir')} Imprimir / PDF</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Grado</th><th>Grupo</th><th class="r">Alumnos</th><th class="r">0 faltas</th><th class="r">1 a 3</th><th class="r">4 a 8</th><th class="r">9 o más</th><th class="r">Días hábiles</th><th class="r">Asistencia</th><th class="r">Total asistencia</th><th class="r">Porcentaje</th></tr></thead>
        <tbody><tr><td>${esc(e.grado || '—')}</td><td>${esc(e.grupo || '—')}</td><td class="r">${r.alumnos}</td><td class="r">${r.r0}</td><td class="r">${r.r13}</td><td class="r">${r.r48}</td><td class="r">${r.r9}</td><td class="r">${r.diasHabiles}</td><td class="r">${r.asistencias}</td><td class="r">${r.total}</td><td class="r"><b>${r.porcentaje ?? '—'}${r.porcentaje !== null ? '%' : ''}</b></td></tr></tbody></table></div>
        <p class="tiny muted" style="margin-top:8px">Igual que el formato de la escuela: faltas en rangos, asistencia = suma de asistencias del mes, total = alumnos × días hábiles. ${r.diasHabiles < habiles ? `Llevas ${r.diasHabiles} de ${habiles} días entre semana registrados.` : ''}</p></div>`;
    },
    after(v) {
      v.querySelector('#as-fecha')?.addEventListener('change', (e) => { if (e.target.value) { fecha = e.target.value; WD.refrescar(); } });
      v.querySelector('#as-mes')?.addEventListener('change', (e) => { if (e.target.value) { mes = e.target.value; WD.refrescar(); } });
    },
  };
})(window.WD);
