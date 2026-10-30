/* Web Docente · IA con el Gemini de cada docente (la clave vive en su Drive / su dispositivo) */
(function (WD) {
  'use strict';
  const BASE = 'https://generativelanguage.googleapis.com/v1beta';
  const PREFERIDOS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  const ver = (n) => parseFloat((n.match(/gemini-([\d.]+)/) || [])[1] || '0');

  const tieneClave = () => !!(WD.state.ajustes.geminiKey || '').trim();
  const pareceClave = (s) => /^(AIza[0-9A-Za-z_\-]{30,}|AQ\.[0-9A-Za-z_\-.]{20,}|[0-9A-Za-z_\-.]{35,})$/.test(String(s || '').trim());

  // Modelos "Flash" que esa clave puede usar: el más nuevo primero, luego los "lite" (más rápidos)
  let candidatos = [];
  async function listarModelos(key) {
    const r = await fetch(`${BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'clave' : 'red');
    const j = await r.json();
    const nombres = (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => m.name.replace('models/', ''));
    const flash = nombres.filter((n) => /^gemini-[\d.]+-flash$/.test(n)).sort((a, b) => ver(b) - ver(a));
    const lite = nombres.filter((n) => /^gemini-[\d.]+-flash-lite$/.test(n)).sort((a, b) => ver(b) - ver(a));
    const alias = nombres.filter((n) => n === 'gemini-flash-latest' || n === 'gemini-flash-lite-latest');
    const lista = [...flash.slice(0, 1), ...lite.slice(0, 1), ...alias, ...flash.slice(1), ...lite.slice(1)];
    return lista.length ? lista : PREFERIDOS;
  }
  async function elegirModelo(key) {
    try { candidatos = await listarModelos(key); return candidatos[0]; }
    catch (e) {
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
  // Usa el modelo que ya funcionó; si está saturado, ya no existe o tarda demasiado, pasa solo al siguiente.
  async function generar(parts, { json = false, sistema = '', temperatura = 0.4, maxTokens = 8192, espera = 90000 } = {}) {
    if (!tieneClave()) { const e = new Error('Conecta tu Gemini para usar esta función.'); e.code = 'sin_clave'; throw e; }
    const key = WD.state.ajustes.geminiKey;
    if (!candidatos.length) { try { candidatos = await listarModelos(key); } catch (_) { candidatos = PREFERIDOS.slice(); } }
    const actual = WD.state.ajustes.geminiModel;
    const orden = [...new Set([...(actual && candidatos.includes(actual) ? [actual] : []), ...candidatos])].slice(0, 5);
    const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature: temperatura, maxOutputTokens: maxTokens } };
    if (json) body.generationConfig.responseMimeType = 'application/json';
    if (sistema) body.systemInstruction = { parts: [{ text: sistema }] };
    const sinPensar = {}; // modelos que aceptan "pensar poco" (responde más rápido)
    const llamar = async (m, rapido) => {
      const b = JSON.parse(JSON.stringify(body));
      if (rapido) b.generationConfig.thinkingConfig = ver(m) >= 3 ? { thinkingLevel: 'low' } : { thinkingBudget: 0 };
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), espera);
      try { return await fetch(`${BASE}/models/${m}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(b), signal: ctl.signal }); }
      catch (e) { return new Response('{"error":{"message":"Tardó demasiado."}}', { status: e.name === 'AbortError' ? 503 : 500 }); }
      finally { clearTimeout(t); }
    };
    let r = null, ultimoMsg = '';
    for (let k = 0; k < orden.length; k++) {
      const m = orden[k];
      if (k > 0 && WD.toast) WD.toast('Gemini está ocupado, probando con otro modelo…', 2500);
      r = await llamar(m, sinPensar[m] !== false);
      if (r.status === 400) {
        const t = await r.clone().text();
        if (/thinking/i.test(t)) { sinPensar[m] = false; r = await llamar(m, false); }
        else if (/max_?output_?tokens|maxOutputTokens/i.test(t)) { body.generationConfig.maxOutputTokens = 8192; r = await llamar(m, sinPensar[m] !== false); }
      }
      if (r.ok) { if (WD.state.ajustes.geminiModel !== m) { WD.state.ajustes.geminiModel = m; WD.save(); } break; }
      try { ultimoMsg = (await r.clone().json()).error.message || ''; } catch (_) { ultimoMsg = ''; }
      const noDisponible = r.status === 404 || /no longer available|not found|not supported|deprecated/i.test(ultimoMsg);
      if (noDisponible) candidatos = candidatos.filter((x) => x !== m);
      if (!noDisponible && ![429, 500, 503].includes(r.status)) break; // error real (clave, archivo…): no seguir probando
    }
    if (!r.ok) {
      if ([429, 500, 503].includes(r.status)) throw new Error('Gemini está muy ocupado en este momento. Espera un par de minutos y vuelve a intentar.');
      throw new Error('Gemini no pudo responder. ' + (ultimoMsg || `Código ${r.status}.`));
    }
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
  // Paso rápido: por cada campo formativo, solo lo que necesita la agenda (fecha, título y qué se evalúa)
  const PROMPT_INDICE = (campo, anioRef) => `Lee planeaciones didácticas de primaria de México (Nueva Escuela Mexicana). El documento puede traer UNA o VARIAS planeaciones juntas.
Extrae SOLO las sesiones del campo formativo "${campo}". Ignora los demás campos.
Devuelve SOLO JSON, sin texto extra:
{"planeaciones":[{"nombre":"Planeación 15","periodo":"Del 16 al 27 de marzo de 2026","sesiones":[{"numero":1,"fecha":"2026-03-17","titulo":"frase corta (máx. 10 palabras) de lo que se hace","proyecto":"nombre del proyecto","faseProyecto":"Identificamos","paginas":"70-72","pda":"C1 (P1, P2)","instrumento":"rubrica|cotejo","criterios":["rasgo observable","..."]}]}]}
Reglas: "fecha" en AAAA-MM-DD; si dice "Martes 17", deduce mes y año del periodo de esa planeación (año de referencia ${anioRef}). "criterios": del apartado Evaluación de la sesión, máximo 5 frases cortas; si no hay, 3 a partir de evidencias y PDA. "instrumento": "rubrica" si la planeación indica rúbrica para ese campo, si no "cotejo". No copies inicio, desarrollo ni cierre. Sin nombres de alumnos.`;
  // Paso detallado (solo cuando se abre una sesión)
  const PROMPT_DETALLE = (s) => `En el documento de planeaciones, busca la sesión del campo "${s.campo}" con fecha ${s.fecha}${s.numero ? ` (sesión ${s.numero})` : ''}${s.titulo ? `, sobre: ${s.titulo}` : ''}.
Devuelve SOLO JSON: {"inicio":"…","desarrollo":"…","cierre":"…","recursos":"…","evidencias":"…","ajustes":"…"}
Resume cada parte en viñetas cortas separadas por saltos de línea (máximo 4), sin inventar. Si algo no aparece, deja "".`;

  async function partesDocumento(file) {
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      if (file.size > 19 * 1024 * 1024) throw new Error('El PDF pesa más de 19 MB. Divídelo en partes más pequeñas.');
      return { tipo: 'pdf', data: (await WD.fileToDataURL(file)).split(',')[1] };
    }
    if (/\.docx$/i.test(file.name)) return { tipo: 'texto', data: anonimizar(await WD.docxText(file)).texto };
    if (/\.(txt|md)$/i.test(file.name)) return { tipo: 'texto', data: anonimizar(await file.text()).texto };
    throw new Error('Sube la planeación en PDF o Word (.docx).');
  }
  const conDocumento = (doc, prompt) => doc.tipo === 'pdf' ? [{ inline_data: { mime_type: 'application/pdf', data: doc.data } }, { text: prompt }] : [{ text: prompt + '\n\nDOCUMENTO:\n' + doc.data }];

  // Lee la planeación en 4 partes al mismo tiempo (una por campo). avance(campo, 'leyendo'|'ok'|'vacio'|'error', mensaje)
  async function leerPlaneacion(file, avance = () => {}) {
    const anio = new Date().getFullYear();
    const doc = await partesDocumento(file);
    const porCampo = await Promise.all(WD.CAMPOS.map(async (campo) => {
      avance(campo, 'leyendo');
      try {
        const out = await generar(conDocumento(doc, PROMPT_INDICE(campo, anio)), { json: true, temperatura: 0.1, maxTokens: 8192, espera: 120000 });
        const planes = Array.isArray(out) ? out : (out.planeaciones || []);
        const n = planes.reduce((k, p) => k + (p.sesiones || []).length, 0);
        avance(campo, n ? 'ok' : 'vacio', n);
        return planes.map((p) => ({ ...p, sesiones: (p.sesiones || []).map((x) => ({ ...x, campo })) }));
      } catch (e) { avance(campo, 'error', e.message); return { error: e.message, campo }; }
    }));
    // Los campos que fallaron (Gemini saturado) se vuelven a intentar uno por uno
    for (let i = 0; i < porCampo.length; i++) {
      const x = porCampo[i]; if (!x || !x.error) continue;
      avance(x.campo, 'leyendo');
      try {
        const out = await generar(conDocumento(doc, PROMPT_INDICE(x.campo, anio)), { json: true, temperatura: 0.1, maxTokens: 8192, espera: 120000 });
        const planes = Array.isArray(out) ? out : (out.planeaciones || []);
        const n = planes.reduce((k, p) => k + (p.sesiones || []).length, 0);
        avance(x.campo, n ? 'ok' : 'vacio', n);
        porCampo[i] = planes.map((p) => ({ ...p, sesiones: (p.sesiones || []).map((s) => ({ ...s, campo: x.campo })) }));
      } catch (e) { avance(x.campo, 'error', e.message); }
    }
    const errores = porCampo.filter((x) => x && x.error);
    // Juntar por planeación (mismo nombre o mismo periodo)
    const mapa = new Map();
    porCampo.filter(Array.isArray).flat().forEach((p) => {
      const k = WD.norm(p.nombre || p.periodo || 'planeación');
      if (!mapa.has(k)) mapa.set(k, { nombre: p.nombre || file.name.replace(/\.[^.]+$/, ''), periodo: p.periodo || '', sesiones: [] });
      mapa.get(k).sesiones.push(...p.sesiones);
    });
    // Si Gemini nombró distinto la misma planeación (fechas que se enciman), se juntan en una sola
    const rango = (p) => { const f = p.sesiones.map((s) => s.fecha).filter(Boolean).sort(); return [f[0] || '', f[f.length - 1] || '']; };
    const grupos = [...mapa.values()].sort((x, y) => y.sesiones.length - x.sesiones.length).reduce((acc, p) => {
      const [i, f] = rango(p); const dest = acc.find((q) => { const [qi, qf] = rango(q); return i && qi && i <= qf && f >= qi; });
      if (dest) dest.sesiones.push(...p.sesiones); else acc.push(p); return acc;
    }, []);
    const planes = grupos.map((p) => ({
      id: WD.uid(), nombre: p.nombre, periodo: p.periodo, archivo: file.name, subida: Date.now(),
      sesiones: p.sesiones.filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.fecha || '')).map((s) => ({
        id: WD.uid(), numero: s.numero || '', fecha: s.fecha, campo: s.campo, proyecto: s.proyecto || '', titulo: s.titulo || '', faseProyecto: s.faseProyecto || '',
        paginas: s.paginas || '', pda: s.pda || '', instrumento: s.instrumento === 'rubrica' ? 'rubrica' : 'cotejo', criterios: Array.isArray(s.criterios) ? s.criterios.slice(0, 8) : [],
        inicio: '', desarrollo: '', cierre: '', recursos: '', evidencias: '', ajustes: '', detalle: false,
      })).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    })).filter((p) => p.sesiones.length);
    if (!planes.length) throw new Error(errores.length ? errores[0].error : 'No encontré sesiones en el documento.');
    return { planes, doc, errores: errores.map((e) => e.campo) };
  }
  /* ---------- apunte para el cuaderno (exposición a los alumnos) ---------- */
  async function apunteSesion(s, grado) {
    const txt = [`Campo formativo: ${s.campo}`, `Proyecto: ${s.proyecto}`, `Fase: ${s.faseProyecto || ''}`, s.contenido ? `Contenido: ${s.contenido}` : '', (s.pdaTexto || []).length ? `PDA: ${s.pdaTexto.join(' | ')}` : `PDA: ${s.pda || ''}`,
      s.pregunta ? `Pregunta detonadora: ${s.pregunta}` : '', `Inicio: ${s.inicio || ''}`, `Desarrollo: ${s.desarrollo || ''}`, `Cierre: ${s.cierre || ''}`, s.tarea && s.tarea !== '—' ? `Tarea: ${s.tarea}` : ''].filter(Boolean).join('\n');
    const out = await generar([{ text: `Eres docente de ${grado || 'primaria'} en México. Con la sesión de abajo, prepara lo que se proyecta a los alumnos para que lo copien en su libreta en vez de escribirlo en el pizarrón.
Lenguaje claro para niños de esa edad, frases cortas, sin tecnicismos, sin nombres de alumnos ni instrucciones para el docente.
Devuelve JSON {"titulo":"título corto para la libreta","aprenderemos":"una frase: hoy aprenderemos a… (PDA en palabras de niño)","ideas":["3 a 5 ideas clave o conceptos para copiar, cada una de máximo 20 palabras"],"actividad":"qué harán en la libreta o el libro, en una o dos frases","preguntas":["1 a 3 preguntas para responder en la libreta"]}
${txt}` }], { json: true, temperatura: 0.4, maxTokens: 2048 });
    return { titulo: out.titulo || s.titulo || '', aprenderemos: out.aprenderemos || '', ideas: (out.ideas || []).slice(0, 6), actividad: out.actividad || '', preguntas: (out.preguntas || []).slice(0, 4) };
  }

  async function detalleSesion(doc, s) {
    const out = await generar(conDocumento(doc, PROMPT_DETALLE(s)), { json: true, temperatura: 0.1, maxTokens: 4096, espera: 90000 });
    return { inicio: out.inicio || '', desarrollo: out.desarrollo || '', cierre: out.cierre || '', recursos: out.recursos || '', evidencias: out.evidencias || '', ajustes: out.ajustes || '' };
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
- Calendario y CTE: calendario escolar SEP precargado (días sin clases, vacaciones, registro de calificaciones, valor del mes), fechas propias y registro de cada sesión de Consejo Técnico (temas, acuerdos, acciones para el grupo, pendientes) que se imprime.
- Juntas con padres: juntas de grupo con lista de asistencia de tutores (un toque), notas, acuerdos, acta redactada con IA, impresión del acta y de la lista para firmas; entrevistas individuales con cada familia y su registro; tabla de asistencia de tutores por junta.
- Herramientas de aula (para proyector): temporizador con sonido, semáforo de ruido con el micrófono o manual, alumno al azar sin repetir y sin los que faltaron, y hacer equipos al azar por número de equipos o de integrantes (se pueden imprimir). Botón "Modo proyector" para pantalla limpia.
- Exposición para los alumnos: en Inicio, al abrir una sesión de la planeación, el botón «Exposición para los alumnos» la proyecta en pantalla completa: portada con la pregunta del proyecto, qué vamos a aprender (contenido y PDA), apunte para la libreta y actividad con preguntas. La IA prepara el apunte y el docente lo puede editar. Se avanza tocando la pantalla o con las flechas.
- Tómbola: juego para el proyector por grado (1º primaria a 3º secundaria) con lotería de números, abecedario con palabra y sílabas, y desafío de cálculo mental; con voz y registro de lo que ya salió.
- Calendario: botón «Foto del calendario del mes»: tomas foto (o varias) del calendario de actividades que da la escuela y la IA agrega cada actividad en su día; antes de agregar se revisa y corrige.
- Trimestres: las fechas de cada trimestre se ajustan en el botón «Fechas» (en Asistencia › Por alumno, Exámenes o Incidencias) o con «Cerrar trimestre hoy». Así la asistencia, los exámenes y las incidencias se ven por Trimestre 1, 2, 3 o el ciclo completo. Una incidencia también se puede mover a mano a otro trimestre.
- Expediente y paquetes: en la ficha del alumno (Mi grupo) o en Incidencias › Archivo por alumno: «Expediente» (para imprimir o PDF) y «Paquete» (.zip con expediente, cada incidencia en reporte interno y acta de hechos, y Excel). En Incidencias, «Paquete del trimestre» descarga todo el grupo con una carpeta por alumno.
- Exámenes: se crea el examen (primero pregunta cuántas preguntas tiene, hasta 60; tipo diagnóstico o trimestre; campo formativo), el docente llena la clave tocando la respuesta correcta (o escanea una hoja de clave), imprime las hojas de respuestas con nombre (un código QR identifica al alumno; no hay matrícula) o en blanco, y las escanea con la cámara del iPad o con foto. Califica en base 100 y la nota (0 a 10) pasa sola a Evaluación › Examen del trimestre y campo; el diagnóstico aparece con valor 0. Se puede revisar y corregir cada hoja, ver análisis por pregunta y descargar Excel.
- Comunicación con familias: mensajes a una, varias o todas las familias por correo, enviados solos desde el Gmail del docente; plantillas (aviso, recordatorio de tarea, citatorio, felicitación, asistencia del mes con su tabla, avance del trimestre con sus calificaciones); se llenan solos el nombre del alumno y del tutor; la IA mejora la redacción; vista previa; a quien no tiene correo se le manda por WhatsApp con un toque; historial de lo enviado. También desde la ficha del alumno en Mi grupo: «Mensaje a la familia».
- Comisiones y cumpleaños: comisiones del aula por mes (jefe de grupo, biblioteca, orden y limpieza, etc.); se asignan tocando cada comisión, o con Copiar del mes anterior, Rotar o Repartir al azar; se proyectan y se imprimen; si está activado, la comisión se vuelve puesto con sueldo en Banco Estala. Cumpleaños por mes (de la fecha de nacimiento en Mi grupo), aparecen en la semana de Inicio y se felicita al alumno en el proyector.
- Control administrativo: tabla de entregas mensuales a la dirección (planeación con Vo. Bo., programa analítico, reporte de asistencia, producto del CTE, registro de calificaciones y comunicación de resultados en noviembre, marzo y julio, reporte a UDEI, avance de lectura); se marca con un toque y guarda la fecha; lo pendiente del mes aparece en Inicio. También registro de visitas de dirección y supervisión con aspectos observados y recomendaciones; Excel e impresión.
- Banco Estala: economía del aula. Cada alumno tiene cuenta (se abre sola con saldo inicial). Botones Abonar y Cobrar (a uno, varios o todos, con motivos rápidos), Transferir entre alumnos, Pagar sueldos (según puesto y sueldo de cada cuenta), Cobro semanal de servicios (directo o con recibos que generan recargo si se atrasan), préstamos de hasta 20 que se descuentan solos de lo que gane. Imprime billetes, tarjetas de cuenta, contratos y estados de cuenta; muestra saldos en el proyector; descarga Excel.
- IDAI / ICE: diagnóstico de escritura. IDAI = dictado de 6 palabras (mariposa, sol, venado, gusano, loro, toro) que ubica el nivel Presilábico, Silábico, Silábico Alfabético o Alfabético, más las 27 letras que identifica. ICE = 45 reactivos de convenciones (5 oraciones dictadas y puntuación del texto «El conejo»): Nivel esperado 38 a 45, En desarrollo 27 a 37, Requiere apoyo menos de 27. Se crea una aplicación (diagnóstico, intermedio, final), se imprime la hoja del alumno, se captura por alumno (a mano o con foto que lee la IA), y se descarga en Excel o se imprime el concentrado.
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

  WD.ai = { tieneClave, pareceClave, conectar, generar, anonimizar, leerPlaneacion, detalleSesion, apunteSesion, evaluarFoto, redactarIncidencia, preguntarMascota, AYUDA_APP };
})(window.WD);
