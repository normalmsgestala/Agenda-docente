/* Web Docente · Mi grupo: alumnos, plantilla de Excel y ficha editable */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const COLS = [
    { k: 'num', t: 'N° de lista', w: 10, ej: '1' },
    { k: 'paterno', t: 'Apellido paterno', w: 18, ej: 'Pérez' },
    { k: 'materno', t: 'Apellido materno', w: 18, ej: 'García' },
    { k: 'nombres', t: 'Nombre(s)', w: 22, ej: 'Ana Sofía' },
    { k: 'sexo', t: 'Sexo (H/M)', w: 11, ej: 'M' },
    { k: 'nacimiento', t: 'Fecha de nacimiento (dd/mm/aaaa)', w: 22, ej: '14/03/2017' },
    { k: 'curp', t: 'CURP (opcional)', w: 22, ej: '' },
    { k: 'tutor', t: 'Nombre del tutor', w: 26, ej: 'María García López' },
    { k: 'parentesco', t: 'Parentesco', w: 13, ej: 'Mamá' },
    { k: 'telefono', t: 'Teléfono del tutor', w: 16, ej: '8112345678' },
    { k: 'correo', t: 'Correo del tutor', w: 28, ej: 'tutor@correo.com' },
    { k: 'emergencia', t: 'Teléfono de emergencia', w: 18, ej: '' },
    { k: 'nee', t: 'NEE o diagnóstico', w: 22, ej: '' },
    { k: 'alergias', t: 'Alergias o indicaciones médicas', w: 26, ej: '' },
    { k: 'observaciones', t: 'Observaciones', w: 30, ej: '' },
  ];
  WD.COLS_ALUMNO = COLS;
  const ALIAS = { num: ['no', 'n', 'numero', 'n de lista', 'no de lista', 'lista', '#', 'n lista', 'num'], paterno: ['apellido paterno', 'paterno', 'primer apellido'], materno: ['apellido materno', 'materno', 'segundo apellido'], nombres: ['nombre(s)', 'nombres', 'nombre'], sexo: ['sexo', 'genero', 'sexo (h/m)'], nacimiento: ['fecha de nacimiento', 'nacimiento', 'fecha nacimiento'], curp: ['curp'], tutor: ['nombre del tutor', 'tutor', 'padre o tutor', 'madre, padre o tutor', 'nombre tutor'], parentesco: ['parentesco'], telefono: ['telefono', 'telefono del tutor', 'celular', 'tel'], correo: ['correo', 'correo del tutor', 'email', 'e-mail'], emergencia: ['telefono de emergencia', 'emergencia'], nee: ['nee', 'nee o diagnostico', 'diagnostico'], alergias: ['alergias', 'alergias o indicaciones medicas'], observaciones: ['observaciones', 'notas'] };
  const keyDeEncabezado = (h) => { const n = WD.norm(h).replace(/\s*\(.*?\)\s*/g, '').replace(/[°º.]/g, '').trim(); for (const [k, list] of Object.entries(ALIAS)) if (list.some((x) => WD.norm(x).replace(/\s*\(.*?\)\s*/g, '').replace(/[°º.]/g, '') === n)) return k; return null; };

  WD.act.plantillaAlumnos = async () => {
    const blob = await WD.xlsxBlob([
      { name: 'Alumnos', rows: [COLS.map((c) => c.t), COLS.map((c) => c.ej)], widths: COLS.map((c) => c.w) },
      { name: 'Instrucciones', rows: [['Cómo llenar la plantilla'], ['1. Un alumno por renglón. Borra el renglón de ejemplo.'], ['2. No cambies los títulos de la primera fila.'], ['3. Lo único obligatorio es apellido paterno y nombre(s).'], ['4. El correo del tutor se usa para enviarle reportes.'], ['5. Guarda el archivo y súbelo en Web Docente › Mi grupo › Subir Excel.']], widths: [70] },
    ]);
    WD.download(blob, 'Plantilla_alumnos_Web_Docente.xlsx');
  };

  WD.act.subirAlumnos = (el) => { const inp = document.getElementById('in-alumnos'); inp.value = ''; inp.click(); };
  WD.importarAlumnos = async function (file, despues) {
    let rows;
    try { rows = await WD.readSheet(file); } catch (e) { WD.toast(e.message || 'No pude leer el archivo.'); return; }
    const hi = rows.findIndex((r) => r && r.filter((x) => keyDeEncabezado(x)).length >= 2);
    if (hi < 0) { WD.toast('No reconocí los títulos. Usa la plantilla de la app.'); return; }
    const mapa = rows[hi].map(keyDeEncabezado);
    const nuevos = rows.slice(hi + 1).map((r) => { const a = {}; mapa.forEach((k, i) => { if (k) a[k] = String((r || [])[i] ?? '').trim(); }); return a; })
      .filter((a) => (a.paterno || a.nombres) && !(a.paterno === 'Pérez' && a.nombres === 'Ana Sofía' && a.tutor === 'María García López'));
    nuevos.forEach((a) => { a.nacimiento = WD.excelDate(a.nacimiento); a.sexo = (a.sexo || '').toUpperCase().startsWith('H') ? 'H' : (a.sexo || '').toUpperCase().startsWith('M') ? 'M' : a.sexo; });
    if (!nuevos.length) { WD.toast('El archivo no tiene alumnos. Revisa que no esté vacío.'); return; }
    const clave = (a) => WD.norm([a.paterno, a.materno, a.nombres].join(' '));
    const existentes = new Map(WD.state.alumnos.map((a) => [clave(a), a]));
    const act = nuevos.filter((a) => existentes.has(clave(a))).length;
    const m = WD.modal(`<h2>Subir ${nuevos.length} alumnos</h2>
      <p class="muted small">${act ? `${act} ya existen y se actualizarán. ` : ''}${nuevos.length - act} son nuevos. Revisa que los nombres estén bien escritos.</p>
      <div class="tbl-wrap" style="max-height:300px;overflow:auto"><table class="tbl"><thead><tr><th>N°</th><th>Nombre</th><th>Tutor</th><th>Correo</th></tr></thead><tbody>${nuevos.map((a) => `<tr><td>${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td><td>${esc(a.tutor || '')}</td><td>${esc(a.correo || '')}</td></tr>`).join('')}</tbody></table></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-act="cerrarModal">Cancelar</button><button class="btn pri" id="imp-ok">Guardar alumnos</button></div>`);
    m.querySelector('#imp-ok').onclick = () => {
      nuevos.forEach((a) => { const ex = existentes.get(clave(a)); if (ex) Object.entries(a).forEach(([k, v]) => { if (v) ex[k] = v; }); else WD.state.alumnos.push({ id: WD.uid(), activo: true, ...a }); });
      WD.save(); WD.cerrarModal(); (despues || WD.refrescar)(); WD.toast(`${nuevos.length} alumnos guardados`);
    };
  };
  WD.act.nuevoAlumno = () => { const a = { id: WD.uid(), activo: true, num: String(WD.alumnosActivos().length + 1), paterno: '', materno: '', nombres: '' }; WD.state.alumnos.push(a); WD.save(); WD.abrirFicha(a.id, true); };

  /* ---------- ficha del alumno ---------- */
  WD.abrirFicha = (id, nuevo) => {
    const i = WD.state.alumnos.findIndex((a) => a.id === id); if (i < 0) return; const a = WD.state.alumnos[i];
    const tri = WD.trimestreDe(WD.iso(new Date()));
    const res = WD.resumenAlumno(id, tri); const as = WD.asistAlumno(id);
    const incs = WD.state.incidencias.filter((x) => x.alumnoId === id);
    const campo = (c) => `<label class="field"><span>${c.t.replace(' (opcional)', '')}</span>${c.k === 'observaciones' || c.k === 'nee' || c.k === 'alergias' ? `<textarea class="in" data-bind="alumnos.${i}.${c.k}" style="min-height:60px">${esc(a[c.k] || '')}</textarea>` : `<input class="in" data-bind="alumnos.${i}.${c.k}" value="${esc(a[c.k] || '')}" ${c.k === 'nacimiento' ? 'type="date"' : c.k === 'correo' ? 'type="email"' : c.k === 'telefono' || c.k === 'emergencia' ? 'type="tel"' : ''}>`}</label>`;
    WD.abrirDrawer(nuevo ? 'Nuevo alumno' : WD.nombreCompleto(a), `
      ${nuevo ? '' : `<div class="grid g3"><div class="card flat"><div class="label">Asistencia</div><div style="font-size:22px;font-weight:600" class="num">${as.porcentaje ?? '—'}${as.porcentaje !== null ? '%' : ''}</div><div class="tiny muted">${as.F} faltas · ${as.R} retardos</div></div>
        <div class="card flat"><div class="label">Promedio T${tri}</div><div style="font-size:22px;font-weight:600" class="num">${res.promedio ?? '—'}</div><div class="tiny muted">${res.promedio !== null ? `<span class="dot ${WD.semaforo(res.promedio)}"></span>` : 'Sin calificaciones'}</div></div>
        <div class="card flat"><div class="label">Incidencias</div><div style="font-size:22px;font-weight:600" class="num">${incs.length}</div><div class="tiny muted">${incs.slice(-1).map((x) => esc(x.folio)).join('') || 'Ninguna'}</div></div></div>`}
      <div class="label">Datos del alumno</div>
      <div class="grid g2">${COLS.slice(0, 7).map(campo).join('')}</div>
      <div class="label">Tutor y salud</div>
      <div class="grid g2">${COLS.slice(7, 12).map(campo).join('')}</div>
      <div class="grid">${COLS.slice(12).map(campo).join('')}</div>
      <p class="tiny muted">Los cambios se guardan solos.</p>
      <div class="sep"></div>
      <div class="row"><button class="btn" data-act="reporteAlumno" data-id="${id}">${WD.icon('imprimir')} Reporte individual</button><button class="btn" data-act="nuevaEntrevista" data-al="${id}">${WD.icon('mas')} Entrevista con la familia</button><button class="btn" data-act="famNuevo" data-p="libre" data-al="${id}">${WD.icon('correo')} Mensaje a la familia</button><span style="flex:1"></span><button class="btn danger" data-act="bajaAlumno" data-id="${id}">Dar de baja</button></div>`,
      null, nuevo ? 'Escribe sus datos; se guardan solos.' : `N° ${esc(a.num || '—')} · ${esc(WD.state.escuela.grado)} ${esc(WD.state.escuela.grupo)}`);
  };
  WD.act.verAlumno = (el) => { WD.petCerrar && WD.petCerrar(); WD.abrirFicha(el.dataset.id); };
  WD.act.bajaAlumno = async (el) => {
    const a = WD.alumno(el.dataset.id);
    if (!(await WD.confirmar('Dar de baja', `${esc(WD.nombreCompleto(a))} dejará de aparecer en las listas. Sus registros se conservan y puedes reactivarlo cuando quieras.`, 'Dar de baja', true))) return;
    a.activo = false; WD.save(); WD.cerrarDrawer(); WD.refrescar();
  };
  WD.act.reactivar = (el) => { const a = WD.alumno(el.dataset.id); a.activo = true; WD.save(); WD.refrescar(); };

  let verBajas = false;
  WD.act.toggleBajas = () => { verBajas = !verBajas; WD.refrescar(); };
  WD.views.grupo = {
    titulo: 'Mi grupo',
    render() {
      const als = WD.alumnosActivos(); const bajas = WD.state.alumnos.filter((a) => a.activo === false);
      const tri = WD.trimestreDe(WD.iso(new Date()));
      return `
      <div class="row"><div style="flex:1;min-width:0"><h1>Mi grupo</h1><p class="muted">${als.length} alumnos${als.length ? ` · ${als.filter((a) => a.sexo === 'M').length} niñas y ${als.filter((a) => a.sexo === 'H').length} niños` : ''}</p></div>
        <button class="btn" data-act="plantillaAlumnos">${WD.icon('descargar')} Descargar plantilla</button>
        <button class="btn" data-act="subirAlumnos">${WD.icon('subir')} Subir Excel</button>
        <button class="btn pri" data-act="nuevoAlumno">${WD.icon('mas')} Agregar alumno</button>
        <input type="file" id="in-alumnos" accept=".xlsx,.csv" hidden></div>
      ${als.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="r">N°</th><th>Alumno</th><th>Tutor</th><th>Teléfono</th><th>Correo</th><th class="r">Asistencia</th><th class="r">Prom. T${tri}</th><th>Notas</th></tr></thead><tbody>
        ${als.map((a) => { const as = WD.asistAlumno(a.id); const p = WD.resumenAlumno(a.id, tri).promedio; return `<tr><td class="r">${esc(a.num || '')}</td><td><button class="link" data-act="verAlumno" data-id="${a.id}">${esc(WD.nombreLista(a))}</button></td><td>${esc(a.tutor || '')}</td><td>${esc(a.telefono || '')}</td><td>${esc(a.correo || '')}</td><td class="r">${as.porcentaje ?? '—'}${as.porcentaje !== null ? '%' : ''}</td><td class="r">${p !== null ? `<span class="dot ${WD.semaforo(p)}"></span> ${p}` : '—'}</td><td>${a.nee ? '<span class="pill warn">NEE</span>' : ''}${a.alergias ? ' <span class="pill bad">Alergia</span>' : ''}</td></tr>`; }).join('')}
      </tbody></table></div>`
      : `<div class="empty"><h3>Carga a tus alumnos una sola vez</h3><p class="small">1. Descarga la plantilla · 2. Llénala en Excel · 3. Súbela aquí. Aparecerán en asistencia, evaluación, incidencias y todo lo demás.</p><div class="row"><button class="btn" data-act="plantillaAlumnos">${WD.icon('descargar')} Descargar plantilla</button><button class="btn pri" data-act="subirAlumnos">${WD.icon('subir')} Subir Excel</button></div></div>`}
      ${bajas.length ? `<div><button class="btn ghost sm" data-act="toggleBajas">${verBajas ? 'Ocultar' : 'Ver'} alumnos dados de baja (${bajas.length})</button>${verBajas ? `<div class="stack" style="margin-top:8px">${bajas.map((a) => `<div class="row"><span style="flex:1">${esc(WD.nombreLista(a))}</span><button class="btn sm" data-act="reactivar" data-id="${a.id}">Reactivar</button></div>`).join('')}</div>` : ''}</div>` : ''}`;
    },
    after(v) { v.querySelector('#in-alumnos').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) WD.importarAlumnos(f); }); },
  };
})(window.WD);
