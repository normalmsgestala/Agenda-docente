/* Web Docente · datos, cálculos y guardado */
(function (WD) {
  'use strict';
  const { uid, iso, round1 } = WD;

  const CAMPOS = ['Lenguajes', 'Saberes y pensamiento científico', 'Ética, naturaleza y sociedades', 'De lo humano y lo comunitario'];
  const CAMPO_CORTO = { 'Lenguajes': 'Lenguajes', 'Saberes y pensamiento científico': 'Saberes', 'Ética, naturaleza y sociedades': 'Ética', 'De lo humano y lo comunitario': 'Humano' };
  const RUBROS = [
    { id: 'actividades', nombre: 'Actividades' },
    { id: 'tareas', nombre: 'Tareas' },
    { id: 'examen', nombre: 'Examen' },
    { id: 'extra', nombre: 'Puntos extra' },
  ];
  const ASIST = {
    A: { nombre: 'Asistió', corto: 'A', cuenta: true },
    F: { nombre: 'Falta', corto: 'F', cuenta: false },
    R: { nombre: 'Retardo', corto: 'R', cuenta: true },
    J: { nombre: 'Justificada', corto: 'J', cuenta: false },
    S: { nombre: 'Salió antes', corto: 'S', cuenta: true },
  };
  const ASIST_ORDEN = ['A', 'F', 'R', 'J', 'S'];
  const TIPOS_INC = {
    C: { nombre: 'Conducta y convivencia', prefijo: 'C' },
    A: { nombre: 'Accidente o herida', prefijo: 'A' },
    B: { nombre: 'Caso de violencia', prefijo: 'B' },
  };

  const pesosDefault = () => Object.fromEntries(CAMPOS.map((c) => [c, { actividades: 30, tareas: 30, examen: 30, extra: 10 }]));

  function blank() {
    return {
      version: 1,
      actualizado: 0,
      docente: { nombre: '', correo: '' },
      escuela: { nombre: '', cct: '', turno: 'Matutino', zona: '', sector: '', region: '', municipio: '', entidad: '', direccion: '', correo: '', telefono: '', director: '', ciclo: cicloActual(), grado: '', grupo: '', fase: '', logoIzq: '', logoDer: '' },
      alumnos: [],
      asistencia: {},
      horario: { bloques: [
        { id: uid(), inicio: '08:00', fin: '08:50', tipo: 'clase' }, { id: uid(), inicio: '08:50', fin: '09:40', tipo: 'clase' },
        { id: uid(), inicio: '09:40', fin: '10:30', tipo: 'clase' }, { id: uid(), inicio: '10:30', fin: '11:00', tipo: 'recreo' },
        { id: uid(), inicio: '11:00', fin: '11:50', tipo: 'clase' }, { id: uid(), inicio: '11:50', fin: '12:40', tipo: 'clase' },
      ] },
      planeaciones: [],
      trimestres: [
        { n: 1, inicio: '', fin: '', pesos: pesosDefault() },
        { n: 2, inicio: '', fin: '', pesos: pesosDefault() },
        { n: 3, inicio: '', fin: '', pesos: pesosDefault() },
      ],
      actividades: [],
      incidencias: [],
      ajustes: { tema: 'auto', mascota: 'ajo', geminiKey: '', geminiModel: '' },
    };
  }
  function cicloActual() { const d = new Date(); const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-${y + 1}`; }

  /* ---------- estado y guardado ---------- */
  WD.state = blank();
  const listeners = new Set();
  let saveTimer = null;
  WD.onSave = (fn) => listeners.add(fn);
  WD.save = function (opts = {}) {
    WD.state.actualizado = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await WD.kv.set('estado', WD.state);
      listeners.forEach((fn) => { try { fn(opts); } catch (e) { console.error(e); } });
    }, 250);
  };
  WD.load = async function () {
    const s = await WD.kv.get('estado');
    if (s && typeof s === 'object') WD.state = migrate(s);
    return WD.state;
  };
  function migrate(s) {
    const b = blank();
    const out = { ...b, ...s };
    out.docente = { ...b.docente, ...(s.docente || {}) };
    out.escuela = { ...b.escuela, ...(s.escuela || {}) };
    out.ajustes = { ...b.ajustes, ...(s.ajustes || {}) };
    out.horario = s.horario && Array.isArray(s.horario.bloques) ? s.horario : b.horario;
    out.trimestres = (s.trimestres && s.trimestres.length === 3) ? s.trimestres.map((t, i) => ({ ...b.trimestres[i], ...t, pesos: { ...pesosDefault(), ...(t.pesos || {}) } })) : b.trimestres;
    ['alumnos', 'planeaciones', 'actividades', 'incidencias'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
    if (!out.asistencia || typeof out.asistencia !== 'object') out.asistencia = {};
    return out;
  }
  WD.replaceState = (s) => { WD.state = migrate(s); WD.save({ remoto: true }); };

  /* ---------- alumnos ---------- */
  const nombreCompleto = (a) => [a.nombres, a.paterno, a.materno].filter(Boolean).join(' ').trim() || 'Sin nombre';
  const nombreLista = (a) => [a.paterno, a.materno].filter(Boolean).join(' ') + (a.nombres ? ', ' + a.nombres : '');
  const alumnosActivos = () => WD.state.alumnos.filter((a) => a.activo !== false).sort((x, y) => (Number(x.num) || 999) - (Number(y.num) || 999) || nombreLista(x).localeCompare(nombreLista(y), 'es'));
  const alumno = (id) => WD.state.alumnos.find((a) => a.id === id);

  /* ---------- trimestre de una fecha ---------- */
  // Calendario SEP típico: T1 sep–nov, T2 dic–mar, T3 mar–jul
  function trimestreAprox(fecha) {
    const m = Number(fecha.slice(5, 7)), d = Number(fecha.slice(8, 10));
    if (m >= 8 && m <= 11) return m === 11 && d > 15 ? 2 : 1;
    if (m === 12 || m <= 2 || (m === 3 && d <= 15)) return 2;
    return 3;
  }
  WD.trimestreDe = (fecha) => { const t = WD.state.trimestres.find((t) => t.inicio && t.fin && fecha >= t.inicio && fecha <= t.fin); return t ? t.n : trimestreAprox(fecha); };

  /* ---------- evaluación ---------- */
  // Valor de cada actividad dentro de su rubro: las que tienen valor fijo lo conservan; las demás se reparten lo que falta para llegar a 100.
  function valoresRubro(acts) {
    const fijos = acts.filter((a) => a.valor !== null && a.valor !== '' && a.valor !== undefined && !isNaN(Number(a.valor)));
    const libres = acts.filter((a) => !fijos.includes(a));
    let sumaFijos = fijos.reduce((s, a) => s + Number(a.valor), 0);
    const map = {};
    if (sumaFijos >= 100 || libres.length === 0) {
      const tot = sumaFijos || 1; fijos.forEach((a) => { map[a.id] = Number(a.valor) * 100 / tot; }); libres.forEach((a) => { map[a.id] = 0; });
    } else {
      fijos.forEach((a) => { map[a.id] = Number(a.valor); });
      const resto = (100 - sumaFijos) / libres.length; libres.forEach((a) => { map[a.id] = resto; });
    }
    return map;
  }
  // Calificación 0–10 de un alumno en una actividad (null si no está calificada)
  function califActividad(act, alumnoId) {
    const r = (act.calif || {})[alumnoId];
    if (r === undefined || r === null || r === '') return null;
    if (typeof r === 'number') return r; // incluye 0 = no entregó
    if (typeof r === 'object') {
      const crit = act.criterios || [];
      if (!crit.length) return typeof r.nota === 'number' ? r.nota : null;
      if (act.instrumento === 'rubrica') {
        const niveles = crit.map((_, i) => r.niveles ? r.niveles[i] : null).filter((x) => x);
        if (!niveles.length) return null;
        const prom = niveles.reduce((s, x) => s + x, 0) / crit.length; // 1–4 (sin calificar cuenta como 0)
        return Math.max(0, Math.min(10, 10 * prom / 4));
      }
      const checks = crit.filter((_, i) => r.checks && r.checks[i]).length;
      return 10 * checks / crit.length;
    }
    return null;
  }
  // Resultado de un alumno en un campo y trimestre → {nota (5–10), detalle por rubro}
  function califCampo(alumnoId, trimestre, campo) {
    const t = WD.state.trimestres.find((x) => x.n === trimestre); const pesos = t ? t.pesos[campo] : null;
    const acts = WD.state.actividades.filter((a) => a.trimestre === trimestre && a.campo === campo);
    const det = {}; let wTot = 0, acum = 0;
    RUBROS.forEach((rb) => {
      const lista = acts.filter((a) => a.rubro === rb.id);
      if (!lista.length) { det[rb.id] = null; return; }
      const vals = valoresRubro(lista); let sv = 0, s = 0;
      lista.forEach((a) => { const c = califActividad(a, alumnoId); if (c === null) return; const v = vals[a.id]; sv += v; s += v * c / 10; });
      if (!sv) { det[rb.id] = null; return; }
      const frac = s / sv; det[rb.id] = round1(frac * 10);
      const w = Number(pesos ? pesos[rb.id] : 0) || 0; wTot += w; acum += w * frac;
    });
    if (!wTot) return { nota: null, det };
    const bruto = 10 * acum / wTot;
    return { nota: round1(Math.max(5, Math.min(10, bruto))), bruto: round1(bruto), det };
  }
  function resumenAlumno(alumnoId, trimestre) {
    const porCampo = {}; const notas = [];
    CAMPOS.forEach((c) => { const r = califCampo(alumnoId, trimestre, c); porCampo[c] = r; if (r.nota !== null) notas.push(r.nota); });
    const prom = notas.length ? round1(notas.reduce((s, x) => s + x, 0) / notas.length) : null;
    return { porCampo, promedio: prom };
  }
  const semaforo = (n) => n === null || n === undefined ? '' : n >= 8 ? 'verde' : n >= 6 ? 'amarillo' : 'rojo';

  /* ---------- asistencia ---------- */
  function diasConRegistro(desde, hasta) { return Object.keys(WD.state.asistencia).filter((d) => (!desde || d >= desde) && (!hasta || d <= hasta)).sort(); }
  function asistAlumno(alumnoId, desde, hasta) {
    const dias = diasConRegistro(desde, hasta); const c = { A: 0, F: 0, R: 0, J: 0, S: 0, dias: dias.length };
    dias.forEach((d) => { const v = WD.state.asistencia[d][alumnoId] || 'A'; c[v] = (c[v] || 0) + 1; });
    const presentes = c.A + c.R + c.S; c.porcentaje = dias.length ? Math.round(1000 * presentes / dias.length) / 10 : null;
    return c;
  }
  // Reporte mensual con el formato de la escuela
  function reporteMensual(anio, mes) { // mes 1–12
    const p = WD.pad; const desde = `${anio}-${p(mes)}-01`, hasta = `${anio}-${p(mes)}-31`;
    const dias = diasConRegistro(desde, hasta); const als = alumnosActivos();
    const rangos = { r0: 0, r13: 0, r48: 0, r9: 0 }; let asistencias = 0;
    als.forEach((a) => {
      let f = 0; dias.forEach((d) => { const v = WD.state.asistencia[d][a.id] || 'A'; if (v === 'F' || v === 'J') f++; else asistencias++; });
      if (f === 0) rangos.r0++; else if (f <= 3) rangos.r13++; else if (f <= 8) rangos.r48++; else rangos.r9++;
    });
    const total = als.length * dias.length;
    return { alumnos: als.length, ...rangos, diasHabiles: dias.length, asistencias, total, porcentaje: total ? Math.round(1000 * asistencias / total) / 10 : null };
  }

  /* ---------- planeación ---------- */
  const sesionesDe = (fecha) => WD.state.planeaciones.flatMap((p) => p.sesiones.filter((s) => s.fecha === fecha).map((s) => ({ ...s, planeacionId: p.id, planeacion: p.nombre })));
  function actividadDeSesion(sesion, planeacion) {
    let act = WD.state.actividades.find((a) => a.sesionId === sesion.id);
    if (!act) {
      act = { id: uid(), sesionId: sesion.id, trimestre: WD.trimestreDe(sesion.fecha), campo: sesion.campo, rubro: 'actividades',
        nombre: sesion.titulo || `Sesión ${sesion.numero || ''}`.trim(), fecha: sesion.fecha, valor: null,
        instrumento: sesion.instrumento === 'rubrica' ? 'rubrica' : 'cotejo', criterios: (sesion.criterios || []).slice(0, 8), calif: {} };
      WD.state.actividades.push(act); WD.save();
    }
    return act;
  }

  /* ---------- incidencias ---------- */
  function siguienteFolio(tipo) {
    const n = WD.state.incidencias.filter((i) => i.tipo === tipo).length + 1;
    return `${TIPOS_INC[tipo].prefijo}-${String(n).padStart(2, '0')}`;
  }

  /* ---------- respaldo y borrado ---------- */
  async function respaldoZip() {
    const s = WD.state; const files = [];
    files.push({ name: 'web-docente-datos.json', data: JSON.stringify(s, null, 1) });
    files.push({ name: 'LEEME.txt', data: `Respaldo de Web Docente\nDocente: ${s.docente.nombre}\nEscuela: ${s.escuela.nombre} (${s.escuela.cct})\nCiclo: ${s.escuela.ciclo}\nGenerado: ${new Date().toLocaleString('es-MX')}\n\nweb-docente-datos.json contiene todo y sirve para restaurar.\nLos archivos de Excel se pueden abrir directamente.\n` });
    const xl = await WD.excelEvaluacionAsistencia();
    files.push({ name: 'Evaluacion_y_asistencia.xlsx', data: new Uint8Array(await xl.arrayBuffer()) });
    const keys = (await WD.kv.keys()).filter((k) => String(k).startsWith('foto:'));
    for (const k of keys) {
      const d = await WD.kv.get(k); if (!d) continue;
      const b64 = d.split(',')[1]; const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      files.push({ name: `fotos/${String(k).slice(5).replace(/[^\w.-]/g, '_')}.jpg`, data: u8 });
    }
    return WD.zipFiles(files);
  }
  async function borrarTodo() {
    const keep = { docente: WD.state.docente, escuela: { ...WD.state.escuela }, ajustes: WD.state.ajustes, horario: WD.state.horario };
    const keys = await WD.kv.keys();
    for (const k of keys) if (String(k).startsWith('foto:')) await WD.kv.del(k);
    const b = blank(); WD.state = { ...b, ...keep, escuela: { ...keep.escuela, ciclo: cicloActual() } };
    WD.save();
  }

  Object.assign(WD, { CAMPOS, CAMPO_CORTO, RUBROS, ASIST, ASIST_ORDEN, TIPOS_INC, blank, nombreCompleto, nombreLista, alumnosActivos, alumno, valoresRubro, califActividad, califCampo, resumenAlumno, semaforo, asistAlumno, reporteMensual, diasConRegistro, sesionesDe, actividadDeSesion, siguienteFolio, respaldoZip, borrarTodo, cicloActual });
})(window.WD);
