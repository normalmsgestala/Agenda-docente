/* Web Docente · Subir la agenda completa (PDF): se divide en el dispositivo (pdf-lib) y tu Gemini lee
   cada planeación (sesiones con su detalle) y el programa analítico de cada mes (horario de cada día),
   y todo se vincula: sesiones en su día y su hora, listas de evaluación, exposición y calendario. */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const cargarPdfLib = () => (window.PDFLib ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = `js/lib/pdf-lib.min.js?v=${WD.VERSION}`; s.onload = res; s.onerror = () => rej(new Error('No pude cargar el lector de PDF.')); document.head.appendChild(s); }));
  const b64 = (u8) => { let s = ''; const k = 0x8000; for (let i = 0; i < u8.length; i += k) s += String.fromCharCode.apply(null, u8.subarray(i, i + k)); return btoa(s); };
  async function trozo(pdf, desde, hasta) { // páginas 1..n incluidas
    const { PDFDocument } = window.PDFLib; const nuevo = await PDFDocument.create();
    const idx = []; for (let p = desde; p <= hasta; p++) if (p >= 1 && p <= pdf.getPageCount()) idx.push(p - 1);
    (await nuevo.copyPages(pdf, idx)).forEach((pg) => nuevo.addPage(pg));
    return { inline_data: { mime_type: 'application/pdf', data: b64(await nuevo.save()) } };
  }
  const ymOk = (s) => /^\d{4}-\d{2}$/.test(s || ''); const fOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const hhmm = (s) => { const m = String(s || '').match(/(\d{1,2}):(\d{2})/); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''; };
  const campoDe = (s) => { const n = WD.norm(s); if (!n) return ''; if (n.startsWith('len')) return WD.CAMPOS[0]; if (n.startsWith('sab')) return WD.CAMPOS[1]; if (n.startsWith('eti')) return WD.CAMPOS[2]; if (n.startsWith('hum') || n.startsWith('de lo')) return WD.CAMPOS[3]; return ''; };

  const PROMPT_INDICE = `Este PDF son las primeras páginas de la agenda de un docente de primaria. Busca el índice.
Devuelve JSON {"programa":[{"mes":"AAAA-MM","pagina":80}],"planeaciones":[{"nombre":"Planeación 0 · Diagnóstico","pagina":197}],"despues_de_planeaciones":492,"despues_de_programa":196}
"pagina" es el número de página que dice el índice. "despues_de_planeaciones" = página donde empieza la sección que sigue a las planeaciones. "despues_de_programa" = página donde empieza la sección que sigue al programa analítico. Si no hay programa o planeaciones, deja la lista vacía.`;
  const PROMPT_PLAN = (nombre, anio) => `El PDF es «${nombre}» de la agenda de un docente de primaria (Nueva Escuela Mexicana, ciclo ${anio}-${anio + 1}). Tiene los proyectos de cada campo formativo y las sesiones con su fecha.
Extrae TODAS las sesiones de los 4 campos formativos (Lenguajes; Saberes y pensamiento científico; Ética, naturaleza y sociedades; De lo humano y lo comunitario).
Devuelve SOLO JSON: {"nombre":"${nombre}","periodo":"Del … al …","sesiones":[{"campo":"Lenguajes","fecha":"AAAA-MM-DD","numero":"1/2","proyecto":"nombre del proyecto","titulo":"frase corta de lo que se hace","faseProyecto":"fase o momento","paginas":"páginas de libros","pda":"C1 (P1, P2)","contenido":"texto del contenido","pdaTexto":["P1: texto del PDA","P2: …"],"pregunta":"pregunta detonadora del proyecto","inicio":"…","desarrollo":"…","cierre":"…","tarea":"","ajustes":"ajustes razonables","evidencias":"sugerencias de evaluación","instrumento":"rubrica|cotejo","criterios":["rasgo a evaluar","…"]}]}
Reglas: fecha en AAAA-MM-DD (deduce el año del periodo). Inicio, desarrollo y cierre: resúmelos en 2 a 4 viñetas cortas separadas por salto de línea, sin inventar. "instrumento": "rubrica" si dice rúbrica o escala, si no "cotejo". "criterios": máximo 5, de la evaluación de la sesión o del instrumento. No escribas nombres de alumnos: si aparecen en ajustes, escribe "alumno con NEE" o "grupo de rezago".`;
  const PROMPT_PROG = (ym) => `El PDF es el programa analítico del mes ${ym} de la agenda de un docente de primaria. Trae el horario semanal de cada día.
Devuelve SOLO JSON: {"mes":"${ym}","bloques":[{"fecha":"AAAA-MM-DD","inicio":"09:00","fin":"10:30","campo":"Lenguajes|Saberes|Ética|Humano|","proyecto":"","sesion":"S1/4","fase":"","actividad":"texto si no es una clase de campo formativo (honores, exploradores matemáticos, educación física, recreo no)"}],"sinClases":[{"fecha":"AAAA-MM-DD","motivo":""}],"notas":"diagnóstico escolar u otra información general del mes, resumida en máximo 6 renglones"}
Incluye cada clase de campo formativo con su hora y las actividades fijas con hora (honores, exploradores matemáticos, educación física). No incluyas recreo. Horas en 24 h.`;

  let corriendo = null; // { pasos: [{t, st}], t0 }
  const paso = (t) => { const p = { t, st: 'espera' }; corriendo.pasos.push(p); return p; };
  function pintar() {
    const b = document.getElementById('agi-av'); if (!b || !corriendo) return;
    const hechos = corriendo.pasos.filter((p) => p.st === 'ok' || p.st === 'error').length;
    b.innerHTML = `<div class="small"><b>${hechos} de ${corriendo.pasos.length}</b> partes · ${Math.round((Date.now() - corriendo.t0) / 1000)} s</div><div class="dg-its" style="margin-top:6px">${corriendo.pasos.map((p) => `<span class="pill ${p.st === 'ok' ? 'ok' : p.st === 'error' ? 'bad' : ''}">${p.st === 'leyendo' ? '<span class="spinner" style="width:9px;height:9px"></span> ' : p.st === 'ok' ? '✓ ' : p.st === 'error' ? '✕ ' : ''}${esc(p.t)}</span>`).join('')}</div>`;
  }
  WD.agendaImportando = () => !!corriendo;
  WD.agendaAvanceHTML = () => (corriendo ? '<div id="agi-av" class="stack" style="gap:4px"></div>' : '');
  WD.agendaPintar = pintar;

  async function enParalelo(tareas, n) { const cola = tareas.slice(); await Promise.all(Array.from({ length: n }, async () => { while (cola.length) await cola.shift()(); })); }

  WD.subirAgenda = async (file) => {
    // IDAI e ICE de la agenda: se leen en el dispositivo, sin IA (los nombres no salen)
    if (WD.leerDiagnosticoAgenda && WD.alumnosActivos().length) WD.leerDiagnosticoAgenda(file).then((r) => { if (r) WD.aplicarNivelesDiag(r, 'tu agenda'); }).catch((e) => console.warn('IDAI/ICE', e));
    if (!WD.requiereIA()) return;
    if (corriendo) { WD.toast('Ya estoy leyendo tu agenda.'); return; }
    corriendo = { pasos: [], t0: Date.now() }; const reloj = setInterval(pintar, 1000); WD.refrescar();
    WD.toast('Leyendo tu agenda. Puede tardar varios minutos; puedes seguir usando la app y te aviso.', 5000);
    const anio = Number(String(WD.state.escuela.ciclo || '').slice(0, 4)) || (new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1);
    let nPlan = 0, nSes = 0, nHoras = 0; const errores = [];
    try {
      await cargarPdfLib();
      const pdf = await window.PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true }); const total = pdf.getPageCount();
      const pi = paso('Índice'); pi.st = 'leyendo'; pintar();
      const ind = await WD.ai.generar([await trozo(pdf, 1, Math.min(4, total)), { text: PROMPT_INDICE }], { json: true, temperatura: 0, maxTokens: 4096 });
      pi.st = 'ok';
      const planes = (ind.planeaciones || []).filter((x) => x.pagina > 0).sort((a, b) => a.pagina - b.pagina);
      const meses = (ind.programa || []).filter((x) => x.pagina > 0 && ymOk(x.mes)).sort((a, b) => a.pagina - b.pagina);
      if (!planes.length && !meses.length) throw new Error('No encontré el índice con las planeaciones y el programa analítico.');
      const finP = Number(ind.despues_de_planeaciones) || total + 1; const finM = Number(ind.despues_de_programa) || (planes[0]?.pagina || total + 1);
      // 1) Planeaciones: una lectura por planeación
      const nuevas = [];
      const tPlan = planes.map((pl, i) => { const p = paso(pl.nombre.replace(/^Planeaci[oó]n\s*/i, 'P')); const hasta = (planes[i + 1]?.pagina || finP) - 1; return async () => {
        p.st = 'leyendo'; pintar();
        try {
          const out = await WD.ai.generar([await trozo(pdf, pl.pagina, Math.min(hasta, pl.pagina + 39)), { text: PROMPT_PLAN(pl.nombre, anio) }], { json: true, temperatura: 0.1, maxTokens: 32000, espera: 180000 });
          const ses = (out.sesiones || []).filter((s) => fOk(s.fecha) && campoDe(s.campo)).map((s) => ({
            id: WD.uid(), numero: s.numero || '', fecha: s.fecha, campo: campoDe(s.campo), proyecto: s.proyecto || '', titulo: s.titulo || s.proyecto || '', faseProyecto: s.faseProyecto || '', paginas: s.paginas || '',
            pda: s.pda || '', contenido: s.contenido || '', pdaTexto: Array.isArray(s.pdaTexto) ? s.pdaTexto.slice(0, 8) : [], pregunta: s.pregunta || '',
            inicio: s.inicio || '', desarrollo: s.desarrollo || '', cierre: s.cierre || '', tarea: s.tarea || '', ajustes: s.ajustes || '', evidencias: s.evidencias || '', recursos: '',
            instrumento: s.instrumento === 'rubrica' ? 'rubrica' : 'cotejo', criterios: Array.isArray(s.criterios) ? s.criterios.slice(0, 8) : [], detalle: true,
          })).sort((a, b) => a.fecha.localeCompare(b.fecha));
          if (ses.length) { nuevas.push({ id: WD.uid(), nombre: out.nombre || pl.nombre, periodo: out.periodo || '', archivo: file.name, origen: 'agenda', subida: Date.now(), sesiones: ses }); nSes += ses.length; nPlan++; p.st = 'ok'; }
          else { p.st = 'error'; errores.push(pl.nombre); }
        } catch (e) { p.st = 'error'; errores.push(pl.nombre); console.warn(pl.nombre, e); }
        pintar();
      }; });
      // 2) Programa analítico: una lectura por mes
      const programa = {};
      const tMes = meses.map((m, i) => { const p = paso(`Programa ${m.mes.slice(5)}/${m.mes.slice(2, 4)}`); const hasta = (meses[i + 1]?.pagina || finM) - 1; return async () => {
        p.st = 'leyendo'; pintar();
        try {
          const out = await WD.ai.generar([await trozo(pdf, m.pagina, Math.min(hasta, m.pagina + 19)), { text: PROMPT_PROG(m.mes) }], { json: true, temperatura: 0.1, maxTokens: 16000, espera: 150000 });
          programa[m.mes] = { bloques: (out.bloques || []).filter((b) => fOk(b.fecha) && hhmm(b.inicio)).map((b) => ({ fecha: b.fecha, inicio: hhmm(b.inicio), fin: hhmm(b.fin), campo: campoDe(b.campo), proyecto: b.proyecto || '', sesion: b.sesion || '', fase: b.fase || '', actividad: b.actividad || '' })), sinClases: (out.sinClases || []).filter((x) => fOk(x.fecha)), notas: out.notas || '' };
          p.st = 'ok';
        } catch (e) { p.st = 'error'; errores.push(`Programa ${m.mes}`); console.warn(m.mes, e); }
        pintar();
      }; });
      await enParalelo([...tPlan, ...tMes], 2);
      // 3) Guardar y vincular: reemplaza lo que venía de la agenda anterior
      if (nuevas.length) {
        const viejas = new Set(WD.state.planeaciones.filter((p) => p.origen === 'agenda').flatMap((p) => p.sesiones.map((s) => s.id)));
        WD.state.planeaciones = WD.state.planeaciones.filter((p) => p.origen !== 'agenda');
        WD.state.actividades = WD.state.actividades.filter((a) => !viejas.has(a.sesionId) || Object.keys(a.calif || {}).length);
        WD.state.planeaciones.push(...nuevas);
        nuevas.forEach((p) => p.sesiones.forEach((s) => { if (s.criterios.length) WD.actividadDeSesion(s, p); }));
      }
      if (Object.keys(programa).length) {
        WD.state.programa = Object.assign(WD.state.programa || {}, programa);
        nHoras = WD.vincularHoras();
      }
      WD.save(); clearInterval(reloj); corriendo = null; WD.refrescar();
      WD.petDecir(`¡Listo! De tu agenda acomodé ${nSes} sesiones de ${nPlan} planeaciones${nHoras ? ` y puse la hora a ${nHoras} clases con el programa analítico` : ''}.${errores.length ? ` No pude leer: ${errores.join(', ')}. Vuelve a subir la agenda para intentarlo.` : ''} Ve a Inicio para ver tu semana.`, 'inicio');
    } catch (e) { clearInterval(reloj); corriendo = null; WD.refrescar(); WD.petDecir('No pude leer la agenda. ' + e.message); }
  };

  // Pone a cada sesión la hora del programa analítico (mismo día y campo, en orden)
  WD.vincularHoras = () => {
    const pr = WD.state.programa || {}; let n = 0;
    const porDia = {}; Object.values(pr).forEach((m) => m.bloques.filter((b) => b.campo).forEach((b) => { (porDia[`${b.fecha}|${b.campo}`] = porDia[`${b.fecha}|${b.campo}`] || []).push(b); }));
    const usados = {};
    WD.state.planeaciones.flatMap((p) => p.sesiones).sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach((s) => {
      const k = `${s.fecha}|${s.campo}`; const bs = (porDia[k] || []).sort((a, b) => a.inicio.localeCompare(b.inicio)); const i = usados[k] || 0;
      if (bs[i]) { s.hora = bs[i].inicio; s.horaFin = bs[i].fin; usados[k] = i + 1; n++; }
    });
    return n;
  };
  WD.horaSesion = (s) => (s.hora ? `${s.hora}${s.horaFin ? `–${s.horaFin}` : ''}` : '');
  // Actividades fijas del día (honores, exploradores, educación física)
  WD.fijasDe = (fecha) => { const m = (WD.state.programa || {})[fecha.slice(0, 7)]; return m ? m.bloques.filter((b) => b.fecha === fecha && !b.campo && b.actividad) : []; };
})(window.WD);
