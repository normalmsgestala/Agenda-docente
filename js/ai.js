/* Web Docente · IA con el Gemini de cada docente (la clave vive en su Drive / su dispositivo) */
(function (WD) {
  'use strict';
  const BASE = 'https://generativelanguage.googleapis.com/v1beta';
  const PREFERIDOS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  const tieneClave = () => !!(WD.state.ajustes.geminiKey || '').trim();
  const pareceClave = (s) => /^(AIza[0-9A-Za-z_\-]{30,}|AQ\.[0-9A-Za-z_\-.]{20,}|[0-9A-Za-z_\-.]{35,})$/.test(String(s || '').trim());

  // Elige el modelo "flash" más reciente disponible para esa clave
  // Lista de modelos "flash" disponibles para esa clave, del más nuevo al más viejo (sin versiones de prueba primero)
  let respaldo = [];
  async function listarModelos(key) {
    const r = await fetch(`${BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'clave' : 'red');
    const j = await r.json();
    const nombres = (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => m.name.replace('models/', ''));
    const ver = (n) => parseFloat((n.match(/gemini-([\d.]+)/) || [])[1] || '0');
    const flash = nombres.filter((n) => /^gemini-[\d.]+-flash(-lite)?$/.test(n)).sort((a, b) => (a.includes('lite') - b.includes('lite')) || ver(b) - ver(a));
    return flash.length ? flash : PREFERIDOS;
  }
  async function elegirModelo(key) {
    try {
      const r = await fetch(`${BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
      if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'clave' : 'red');
      const j = await r.json();
      const nombres = (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => m.name.replace('models/', ''));
      const flash = nombres.filter((n) => /^gemini-[\d.]+-flash$/.test(n)).sort((a, b) => parseFloat(b.slice(7)) - parseFloat(a.slice(7)));
      return flash[0] || nombres.find((n) => n.includes('flash') && !n.includes('lite') && !n.includes('image') && !n.includes('tts')) || PREFERIDOS[0];
    } catch (e) {
      if (e.message === 'clave') throw new Error('La clave no es válida. Cópiala otra vez desde Google AI Studio.');
      throw new Error('No hay conexión con Google en este momento. Intenta de nuevo en un rato.');
    }
  }
  async function conectar(key) {
    key = String(key || '').trim();
    if (!pareceClave(key)) throw new Error('Eso no parece una clave de Gemini. Cópiala completa desde Google AI Studio.');
    const modelo = await elegirModelo(key);
    WD.state.ajustes.geminiKey = key; WD.state.ajustes.geminiModel = modelo; WD.save({ clave: true });
    return modelo;
  }

  // Llamada base. parts: [{text}|{inline_data:{mime_type,data}}]
  async function generar(parts, { json = false, sistema = '', temperatura = 0.4, maxTokens = 8192 } = {}) {
    if (!tieneClave()) { const e = new Error('Conecta tu Gemini para usar esta función.'); e.code = 'sin_clave'; throw e; }
    const key = WD.state.ajustes.geminiKey; let modelo = WD.state.ajustes.geminiModel || PREFERIDOS[0];
    const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature: temperatura, maxOutputTokens: maxTokens } };
    if (json) body.generationConfig.responseMimeType = 'application/json';
    if (sistema) body.systemInstruction = { parts: [{ text: sistema }] };
    const llamar = (m) => fetch(`${BASE}/models/${m}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
    let r = await llamar(modelo);
    if (r.status === 404) { modelo = await elegirModelo(key); WD.state.ajustes.geminiModel = modelo; WD.save(); r = await llamar(modelo); }
    // Gemini saturado (503/500/429): reintenta y luego prueba con otro modelo disponible
    if ([429, 500, 503].includes(r.status)) {
      await new Promise((ok) => setTimeout(ok, 2500)); r = await llamar(modelo);
      if ([429, 500, 503].includes(r.status)) {
        if (!respaldo.length) { try { respaldo = await listarModelos(key); } catch (_) { respaldo = PREFERIDOS; } }
        for (const m of respaldo.filter((x) => x !== modelo).slice(0, 4)) {
          WD.toast && WD.toast('Gemini está saturado, probando con otro modelo…', 2500);
          r = await llamar(m);
          if (r.ok) break;
          if (![404, 429, 500, 503].includes(r.status)) break;
        }
      }
    }
    if (r.status === 400 && maxTokens > 8192) {
      const t = await r.clone().text();
      if (/max_?output_?tokens|maxOutputTokens/i.test(t)) { body.generationConfig.maxOutputTokens = 8192; r = await llamar(modelo); }
    }
    if ([429, 500, 503].includes(r.status)) throw new Error('Gemini está muy ocupado en este momento. Espera un par de minutos y vuelve a intentar.');
    if (!r.ok) { let msg = ''; try { msg = (await r.json()).error.message; } catch (_) {} throw new Error('Gemini no pudo responder. ' + (msg || `Código ${r.status}.`)); }
    const j = await r.json();
    const txt = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    if (!txt) throw new Error('Gemini no devolvió respuesta. Intenta de nuevo.');
    if (!json) return txt;
    try { return JSON.parse(txt); } catch (e) { const m = txt.match(/[\[{][\s\S]*[\]}]/); if (m) return JSON.parse(m[0]); throw new Error('La respuesta de Gemini llegó incompleta. Intenta con un archivo más pequeño.'); }
  }

  /* ---------- privacidad: nombres de alumnos fuera ---------- */
  function anonimizar(texto) {
    const mapa = {}; let t = String(texto || '');
    WD.alumnosActivos().forEach((a, i) => {
      const alias = `Alumno ${i + 1}`; mapa[alias] = WD.nombreCompleto(a);
      [WD.nombreCompleto(a), [a.nombres, a.paterno].filter(Boolean).join(' '), a.nombres].filter((x) => x && x.length > 2)
        .sort((x, y) => y.length - x.length).forEach((n) => { t = t.split(n).join(alias); });
    });
    return { texto: t, restaurar: (s) => Object.entries(mapa).sort((a, b) => b[0].length - a[0].length).reduce((acc, [alias, real]) => acc.split(alias).join(real), String(s || '')) };
  }

  /* ---------- planeaciones ---------- */
  const PROMPT_PLAN = (anioRef) => `Eres un asistente que lee planeaciones didácticas de primaria de México (Nueva Escuela Mexicana).
El documento puede contener UNA planeación o VARIAS juntas (un trimestre o todo el ciclo). Extrae TODAS las sesiones de clase.
Devuelve SOLO JSON con esta forma:
{"planeaciones":[{"nombre":"Planeación 15","periodo":"Del 16 al 27 de marzo de 2026","grado":"1º","sesiones":[
 {"numero":1,"fecha":"2026-03-17","campo":"Lenguajes","proyecto":"¡Arriba la vida, abajo el peligro!","titulo":"frase corta de lo que se hace","faseProyecto":"Identificamos","paginas":"70-72","pda":"C1 (P1, P2)","inicio":"…","desarrollo":"…","cierre":"…","recursos":"…","evidencias":"…","instrumento":"rubrica|cotejo","criterios":["criterio observable 1","criterio 2"],"ajustes":"…"}]}]}
Reglas:
- "campo" debe ser exactamente uno de: "Lenguajes", "Saberes y pensamiento científico", "Ética, naturaleza y sociedades", "De lo humano y lo comunitario".
- "fecha" en formato AAAA-MM-DD. Si la sesión solo dice "Martes 17", deduce mes y año del periodo de esa planeación. Año de referencia: ${anioRef}.
- "criterios": toma los rasgos del apartado Evaluación de la sesión (frases observables, máximo 6). Si no hay, propón 3 a partir de las evidencias y el PDA.
- "instrumento": "rubrica" si la planeación indica rúbrica para ese campo; si no, "cotejo".
- Resume inicio, desarrollo y cierre en viñetas cortas separadas por saltos de línea (máximo 6 líneas cada uno), sin inventar actividades.
- No incluyas nombres de alumnos.`;

  async function leerPlaneacion(file) {
    const anio = new Date().getFullYear();
    let parts;
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      if (file.size > 19 * 1024 * 1024) throw new Error('El PDF pesa más de 19 MB. Divídelo en partes más pequeñas.');
      const data = (await WD.fileToDataURL(file)).split(',')[1];
      parts = [{ inline_data: { mime_type: 'application/pdf', data } }, { text: PROMPT_PLAN(anio) }];
    } else if (/\.docx$/i.test(file.name)) {
      const txt = await WD.docxText(file);
      parts = [{ text: PROMPT_PLAN(anio) + '\n\nDOCUMENTO:\n' + anonimizar(txt).texto }];
    } else if (/\.(txt|md)$/i.test(file.name)) {
      parts = [{ text: PROMPT_PLAN(anio) + '\n\nDOCUMENTO:\n' + anonimizar(await file.text()).texto }];
    } else throw new Error('Sube la planeación en PDF o Word (.docx).');
    const out = await generar(parts, { json: true, temperatura: 0.1, maxTokens: 65536 });
    const planes = Array.isArray(out) ? out : (out.planeaciones || []);
    if (!planes.length) throw new Error('No encontré sesiones en el documento.');
    return planes.map((p) => ({
      id: WD.uid(), nombre: p.nombre || file.name.replace(/\.[^.]+$/, ''), periodo: p.periodo || '', grado: p.grado || '', archivo: file.name, subida: Date.now(),
      sesiones: (p.sesiones || []).filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.fecha || '')).map((s) => ({
        id: WD.uid(), numero: s.numero || '', fecha: s.fecha, campo: WD.CAMPOS.includes(s.campo) ? s.campo : (WD.CAMPOS.find((c) => WD.norm(c).startsWith(WD.norm(s.campo).slice(0, 5))) || WD.CAMPOS[0]),
        proyecto: s.proyecto || '', titulo: s.titulo || '', faseProyecto: s.faseProyecto || '', paginas: s.paginas || '', pda: s.pda || '',
        inicio: s.inicio || '', desarrollo: s.desarrollo || '', cierre: s.cierre || '', recursos: s.recursos || '', evidencias: s.evidencias || '',
        instrumento: s.instrumento === 'rubrica' ? 'rubrica' : 'cotejo', criterios: Array.isArray(s.criterios) ? s.criterios.slice(0, 8) : [], ajustes: s.ajustes || '',
      })),
    })).filter((p) => p.sesiones.length);
  }

  /* ---------- evaluación con foto ---------- */
  async function evaluarFoto(dataURL, act) {
    const [meta, data] = dataURL.split(','); const mime = (meta.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
    const crit = (act.criterios || []).map((c, i) => `${i + 1}. ${c}`).join('\n') || '1. Cumple con la actividad';
    const inst = act.instrumento === 'rubrica'
      ? `Para cada criterio asigna un nivel de 1 a 4 (1 requiere apoyo, 2 en proceso, 3 logrado, 4 destacado). Devuelve {"niveles":[n,...],"comentario":"una frase para el docente"}.`
      : `Para cada criterio indica si se cumple (true/false). Devuelve {"checks":[true,...],"comentario":"una frase para el docente"}.`;
    return generar([{ inline_data: { mime_type: mime, data } }, { text: `Eres docente de primaria. Revisa la foto del trabajo de un alumno para la actividad "${act.nombre}".\nCriterios:\n${crit}\n${inst}\nSé justo y prudente; si algo no se ve en la foto, márcalo como no logrado y dilo en el comentario.` }], { json: true, temperatura: 0.2 });
  }

  /* ---------- incidencias ---------- */
  async function redactarIncidencia({ tipo, notas, medidas, fecha, grado }) {
    const a = anonimizar(notas), b = anonimizar(medidas);
    const out = await generar([{ text: `Redacta un reporte interno de incidencia escolar (primaria, Nuevo León) en tono formal, objetivo y respetuoso, sin juicios ni diagnósticos.
Tipo: ${WD.TIPOS_INC[tipo].nombre}. Fecha: ${fecha}. Grado y grupo: ${grado}.
Notas del docente (hechos): ${a.texto}
Medidas que tomó el docente: ${b.texto || '(no indicó)'}
Devuelve JSON {"gravedad":"leve|moderada|grave","hechos":"I. Descripción formal de los hechos en un párrafo","medidas":["medida 1","medida 2","..."]}. Conserva los alias "Alumno N" tal cual.` }], { json: true, temperatura: 0.3 });
    return { gravedad: out.gravedad || 'leve', hechos: a.restaurar(out.hechos || ''), medidas: (out.medidas || []).map((m) => b.restaurar(a.restaurar(m))) };
  }

  /* ---------- mascota asesora ---------- */
  const AYUDA_APP = `Web Docente es la agenda digital del maestro. Secciones del menú lateral:
- Inicio: la semana con las clases de cada día en tarjetas (salen de la planeación) y la asistencia del día a un lado.
- Mi grupo: alumnos. Se cargan con la plantilla de Excel (botón "Descargar plantilla" y luego "Subir Excel"). Clic en el nombre abre su ficha editable.
- Asistencia: pasar lista con un toque (Asistió, Falta, Retardo, Justificada, Salió antes), porcentaje por alumno y reporte mensual de la escuela; descarga en Excel.
- Evaluación: por trimestre y campo formativo; en "Valores del trimestre" el docente pone cuánto vale examen, tareas, actividades y puntos extra. Cada actividad puede tener valor o repartirse sola. Vista del grupo y vista por alumno. Foto por alumno para que la IA proponga la evaluación.
- Planeación: subir PDF o Word (una o varias planeaciones juntas); la IA acomoda cada sesión en su día y crea la lista de evaluación.
- Horario: solo se ponen las horas de los bloques y el recreo; los días salen de la planeación.
- Incidencias: reportes con folio (C conducta, A accidente, B violencia), la IA redacta en formato oficial, se imprime o se envía al tutor.
- Escuela: datos y logos que llenan todos los formatos.
- Ajustes: tema claro u oscuro, cambiar de mascota, conectar Gemini, descargar todos los datos en .zip y borrar todo para el nuevo ciclo.`;
  async function preguntarMascota(pregunta, historial = []) {
    const m = WD.mascota();
    const contexto = `Docente: ${WD.state.docente.nombre || 'maestro'}. Grado y grupo: ${WD.state.escuela.grado} ${WD.state.escuela.grupo}. Alumnos registrados: ${WD.alumnosActivos().length}. Hoy: ${WD.fechaLarga(WD.iso(new Date()))}.`;
    const sistema = `${m.personalidad}
Eres el asesor dentro de la app Web Docente. Respondes en español de México, breve (máximo 120 palabras), práctico y amable.
Si la pregunta es sobre cómo usar la app, explica los pasos y al final agrega una línea exacta "IR: <seccion>" con una de: inicio, grupo, asistencia, evaluacion, planeacion, horario, incidencias, escuela, ajustes.
Si es una duda docente general (pedagogía, NEM, redacción, actividades), responde con ideas concretas.
Nunca pidas ni repitas datos personales de alumnos.
${AYUDA_APP}
${contexto}`;
    const parts = historial.slice(-6).map((h) => ({ text: `${h.de === 'yo' ? 'Docente' : m.nombre}: ${h.texto}` }));
    parts.push({ text: `Docente: ${anonimizar(pregunta).texto}` });
    return generar(parts, { sistema, temperatura: 0.7, maxTokens: 1024 });
  }

  WD.ai = { tieneClave, pareceClave, conectar, generar, anonimizar, leerPlaneacion, evaluarFoto, redactarIncidencia, preguntarMascota, AYUDA_APP };
})(window.WD);
