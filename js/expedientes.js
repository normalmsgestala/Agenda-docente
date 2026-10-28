/* Web Docente · Expediente del alumno y paquetes descargables (.zip) por alumno o por trimestre:
   asistencia, calificaciones, exámenes, incidencias con sus formatos, entrevistas y mensajes a la familia. */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const T = (n) => (n ? `Trimestre ${n}` : 'Ciclo escolar');
  const trisDe = (n) => (n ? [n] : [1, 2, 3]);
  const enRango = (f, n) => { if (!f) return false; const d = WD.rangoTri(n || 1).desde, h = WD.rangoTri(n || 3).hasta; return f.slice(0, 10) >= d && f.slice(0, 10) <= h; };
  const exTri = (e) => (e.tipo === 'diagnostico' ? 1 : Number(String(e.tipo).slice(1)));
  const incsDe = (alId, n) => WD.state.incidencias.filter((x) => x.alumnoId === alId && (!n || WD.triDeInc(x) === n)).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const examenesDe = (alId, n) => (WD.state.examenes || []).filter((e) => e.res[alId] && (!n || exTri(e) === n));
  const puntaje = (e, resp) => { const k = e.clave.filter(Boolean).length || e.n; return Math.round((e.clave.reduce((t, c, i) => t + (c && resp[i] === c ? 1 : 0), 0) / k) * 1000) / 10; };
  const limpio = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');

  /* ---------- expediente (HTML) ---------- */
  function expedienteHTML(alId, n, conFormatos = true) {
    const a = WD.alumno(alId); const e = WD.state.escuela; if (!a) return '';
    const fila = (k, v) => (v ? `<tr><td style="width:34%"><b>${k}</b></td><td>${esc(v)}</td></tr>` : '');
    let h = `${WD.membrete()}<h2>EXPEDIENTE DEL ALUMNO · ${esc(T(n).toUpperCase())}</h2>
      <table><tbody>${fila('Alumno(a)', WD.nombreCompleto(a))}${fila('Número de lista', a.num)}${fila('Grado y grupo', `${String(e.grado || '').replace(/°+$/, '')}° ${e.grupo || ''}`)}${fila('CURP', a.curp)}${fila('Fecha de nacimiento', a.nacimiento)}
      ${fila('Madre, padre o tutor', a.tutor)}${fila('Teléfono', a.telefono)}${fila('Correo', a.correo)}${fila('NEE o diagnóstico', a.nee)}${fila('Alergias o indicaciones', a.alergias)}${fila('Ciclo escolar', e.ciclo)}</tbody></table>`;
    // asistencia
    h += `<h3 style="margin-top:16px">Asistencia</h3><table><thead><tr><th>Periodo</th><th>Días</th><th>Asistencias</th><th>Faltas</th><th>Justificadas</th><th>Retardos</th><th>Salió antes</th><th>%</th></tr></thead><tbody>${trisDe(n).map((t) => { const r = WD.rangoTri(t); const c = WD.asistAlumno(alId, r.desde, r.hasta); return `<tr><td>${T(t)}</td><td>${c.dias}</td><td>${c.A}</td><td>${c.F}</td><td>${c.J}</td><td>${c.R}</td><td>${c.S}</td><td>${c.porcentaje ?? '—'}${c.porcentaje !== null ? '%' : ''}</td></tr>`; }).join('')}</tbody></table>`;
    // calificaciones
    h += `<h3 style="margin-top:16px">Calificaciones</h3><table><thead><tr><th>Campo formativo</th>${trisDe(n).map((t) => `<th>${T(t)}</th>`).join('')}</tr></thead><tbody>${WD.CAMPOS.map((c) => `<tr><td>${c}</td>${trisDe(n).map((t) => `<td style="text-align:center">${WD.califCampo(alId, t, c).nota ?? '—'}</td>`).join('')}</tr>`).join('')}
      <tr><td><b>Promedio</b></td>${trisDe(n).map((t) => `<td style="text-align:center"><b>${WD.resumenAlumno(alId, t).promedio ?? '—'}</b></td>`).join('')}</tr></tbody></table>`;
    // exámenes
    const exs = examenesDe(alId, n);
    h += `<h3 style="margin-top:16px">Exámenes</h3>${exs.length ? `<table><thead><tr><th>Examen</th><th>Tipo</th><th>Campo</th><th>Fecha</th><th>Puntaje</th></tr></thead><tbody>${exs.map((x) => `<tr><td>${esc(x.nombre)}</td><td>${x.tipo === 'diagnostico' ? 'Diagnóstico' : T(exTri(x))}</td><td>${esc(WD.CAMPO_CORTO[x.campo] || x.campo)}</td><td>${esc(x.fecha)}</td><td style="text-align:center"><b>${puntaje(x, x.res[alId].resp)}</b>/100</td></tr>`).join('')}</tbody></table>` : '<p>Sin exámenes registrados en este periodo.</p>'}`;
    // incidencias
    const incs = incsDe(alId, n);
    h += `<h3 style="margin-top:16px">Incidencias</h3>${incs.length ? `<table><thead><tr><th>Folio</th><th>Fecha</th><th>Tipo</th><th>Gravedad</th><th>Estado</th><th>Trimestre</th></tr></thead><tbody>${incs.map((x) => `<tr><td>${esc(x.folio)}</td><td>${esc(x.fecha)} ${esc(x.hora)}</td><td>${esc(WD.TIPOS_INC[x.tipo].nombre)}</td><td>${esc(x.gravedad)}</td><td>${x.estado === 'cerrado' ? 'Cerrado' : 'Abierto'}</td><td>${WD.triDeInc(x)}</td></tr>`).join('')}</tbody></table>` : '<p>Sin incidencias en este periodo.</p>'}`;
    // entrevistas y mensajes
    const ents = (WD.state.entrevistas || []).filter((x) => x.alumnoId === alId && (n ? enRango(x.fecha, n) : true));
    if (ents.length) h += `<h3 style="margin-top:16px">Entrevistas con la familia</h3><table><thead><tr><th>Fecha</th><th>Motivo</th><th>Acuerdos</th></tr></thead><tbody>${ents.map((x) => `<tr><td>${esc(x.fecha)}</td><td>${esc(x.motivo)}</td><td style="white-space:pre-wrap">${esc(x.acuerdos)}</td></tr>`).join('')}</tbody></table>`;
    const msgs = (WD.state.comunicados || []).filter((x) => x.res && x.res[alId] && (n ? enRango(x.fecha, n) : true));
    if (msgs.length) h += `<h3 style="margin-top:16px">Mensajes a la familia</h3><table><thead><tr><th>Fecha</th><th>Asunto</th><th>Estado</th></tr></thead><tbody>${msgs.map((x) => `<tr><td>${esc(x.fecha.slice(0, 10))}</td><td>${esc(String(x.asunto || '').replace(/\{alumno\}/g, WD.nombreCompleto(a)).replace(/\{\w+\}/g, ''))}</td><td>${{ enviado: 'Correo enviado', wa: 'WhatsApp', whatsapp: 'Pendiente', error: 'No se envió' }[x.res[alId]] || x.res[alId]}</td></tr>`).join('')}</tbody></table>`;
    h += `<div class="firmas" style="grid-template-columns:1fr 1fr"><div>${esc(WD.state.docente.nombre)}<br>Docente</div><div>${esc(e.director || '')}<br>Dirección</div></div>${WD.piePagina()}`;
    if (conFormatos) incs.forEach((x) => { h += `<div style="page-break-before:always;break-before:page">${WD.incReporteHTML(x)}</div>`; });
    return h;
  }

  /* ---------- archivos sueltos ---------- */
  let css = null;
  const estilos = async () => { if (css !== null) return css; try { css = await (await fetch('app.css')).text(); } catch (_) { css = ''; } return css; };
  const pagina = async (titulo, html) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title><style>${await estilos()}
    body{background:#fff;color:#111;margin:0} .doc{max-width:800px;margin:24px auto;padding:0 20px} @media print{.doc{margin:0;padding:0}}</style></head><body><div class="doc">${html}</div></body></html>`;
  const bytes = async (blob) => new Uint8Array(await blob.arrayBuffer());
  async function archivosAlumno(alId, n, carpeta = '') {
    const a = WD.alumno(alId); const files = [];
    files.push({ name: `${carpeta}Expediente.html`, data: await pagina(`Expediente · ${WD.nombreCompleto(a)}`, expedienteHTML(alId, n, false)) });
    for (const x of incsDe(alId, n)) {
      files.push({ name: `${carpeta}Incidencias/${limpio(x.folio)}_Reporte_interno.html`, data: await pagina(`${x.folio} · Reporte interno`, WD.incReporteHTML(x)) });
      files.push({ name: `${carpeta}Incidencias/${limpio(x.folio)}_Acta_de_hechos.html`, data: await pagina(`${x.folio} · Acta de hechos`, WD.incActaHTML(x)) });
    }
    return files;
  }
  async function excelResumen(alumnos, n) {
    const ts = trisDe(n);
    const asis = [['Nº', 'Alumno', ...ts.flatMap((t) => [`T${t} días`, `T${t} faltas`, `T${t} justif.`, `T${t} retardos`, `T${t} %`])]];
    const cal = [['Nº', 'Alumno', ...ts.flatMap((t) => [...WD.CAMPOS.map((c) => `T${t} ${WD.CAMPO_CORTO[c]}`), `T${t} promedio`])]];
    const exs = (WD.state.examenes || []).filter((e) => !n || exTri(e) === n);
    const exa = [['Nº', 'Alumno', ...exs.map((e) => e.nombre)]];
    const inc = [['Folio', 'Fecha', 'Hora', 'Alumno', 'Tipo', 'Gravedad', 'Estado', 'Trimestre', 'Hechos']];
    alumnos.forEach((a) => {
      asis.push([a.num || '', WD.nombreLista(a), ...ts.flatMap((t) => { const r = WD.rangoTri(t); const c = WD.asistAlumno(a.id, r.desde, r.hasta); return [c.dias, c.F, c.J, c.R, c.porcentaje ?? '']; })]);
      cal.push([a.num || '', WD.nombreLista(a), ...ts.flatMap((t) => [...WD.CAMPOS.map((c) => WD.califCampo(a.id, t, c).nota ?? ''), WD.resumenAlumno(a.id, t).promedio ?? ''])]);
      exa.push([a.num || '', WD.nombreLista(a), ...exs.map((e) => (e.res[a.id] ? puntaje(e, e.res[a.id].resp) : ''))]);
      incsDe(a.id, n).forEach((x) => inc.push([x.folio, x.fecha, x.hora, WD.nombreLista(a), WD.TIPOS_INC[x.tipo].nombre, x.gravedad, x.estado === 'cerrado' ? 'Cerrado' : 'Abierto', WD.triDeInc(x), x.hechos || x.notas || '']));
    });
    return bytes(await WD.xlsxBlob([{ name: 'Asistencia', rows: asis, widths: [5, 32] }, { name: 'Calificaciones', rows: cal, widths: [5, 32] }, { name: 'Exámenes', rows: exa, widths: [5, 32] }, { name: 'Incidencias', rows: inc, widths: [10, 11, 7, 30, 22, 10, 10, 9, 60] }]));
  }

  /* ---------- acciones ---------- */
  WD.act.expVer = (el) => { const n = el.dataset.n !== undefined ? Number(el.dataset.n) : WD.triVista(); WD.vistaDocumento('Expediente del alumno', expedienteHTML(el.dataset.al, n)); };
  WD.act.expZip = async (el) => {
    const alId = el.dataset.al; const n = el.dataset.n !== undefined ? Number(el.dataset.n) : WD.triVista(); const a = WD.alumno(alId);
    el.disabled = true; try {
      const files = await archivosAlumno(alId, n); files.push({ name: 'Resumen.xlsx', data: await excelResumen([a], n) });
      WD.download(await WD.zipFiles(files), `Expediente_${limpio(WD.nombreLista(a))}_${n ? `T${n}` : 'Ciclo'}.zip`);
    } catch (er) { WD.toast(er.message, 4000); } el.disabled = false;
  };
  WD.act.paqueteTri = async (el) => {
    const n = WD.triVista(); const als = WD.alumnosActivos(); if (!als.length) { WD.toast('No hay alumnos.'); return; }
    el.disabled = true; const txt = el.innerHTML; el.textContent = 'Armando el paquete…';
    try {
      const files = [{ name: `Resumen_del_grupo_${n ? `T${n}` : 'Ciclo'}.xlsx`, data: await excelResumen(als, n) }];
      for (const a of als) files.push(...(await archivosAlumno(a.id, n, `Alumnos/${String(a.num || '').padStart(2, '0')}_${limpio(WD.nombreLista(a))}/`)));
      const e = WD.state.escuela;
      WD.download(await WD.zipFiles(files), `Paquete_${String(e.grado || '').replace(/\W/g, '')}${e.grupo || ''}_${n ? `Trimestre_${n}` : 'Ciclo'}.zip`);
      WD.toast('Paquete listo');
    } catch (er) { WD.toast(er.message, 4000); }
    el.disabled = false; el.innerHTML = txt;
  };

  // Archivo de incidencias ordenado por alumno
  WD.archivoIncHTML = (n) => {
    const als = WD.alumnosActivos(); const con = als.map((a) => ({ a, xs: incsDe(a.id, n) })).filter((o) => o.xs.length).sort((p, q) => q.xs.length - p.xs.length);
    return `${con.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Alumno</th><th class="c">Conducta</th><th class="c">Accidentes</th><th class="c">Violencia</th><th class="c">Abiertas</th><th>Última</th><th></th></tr></thead><tbody>${con.map(({ a, xs }) => `<tr><td><b>${esc(WD.nombreLista(a))}</b><div class="tiny muted">${xs.map((x) => `<button class="link" data-act="verInc" data-id="${x.id}">${esc(x.folio)}</button>`).join(' · ')}</div></td>${['C', 'A', 'B'].map((t) => `<td class="c">${xs.filter((x) => x.tipo === t).length || ''}</td>`).join('')}<td class="c">${xs.filter((x) => x.estado !== 'cerrado').length || ''}</td><td class="small">${esc(xs[xs.length - 1].fecha)}</td>
        <td class="r"><button class="btn sm" data-act="expVer" data-al="${a.id}">${WD.icon('imprimir')} Expediente</button> <button class="btn sm" data-act="expZip" data-al="${a.id}">${WD.icon('descargar')} Paquete</button></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty"><h3>Sin incidencias ${n ? `en el trimestre ${n}` : 'en el ciclo'}</h3></div>`}
      <p class="tiny muted">El paquete (.zip) trae el expediente del alumno, cada incidencia en reporte interno y acta de hechos (se abren en el navegador y se imprimen o guardan en PDF) y un Excel con asistencia, calificaciones, exámenes e incidencias del periodo. El expediente de cualquier alumno también está en su ficha de Mi grupo.</p>`;
  };
})(window.WD);
