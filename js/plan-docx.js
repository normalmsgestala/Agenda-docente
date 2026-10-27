/* Web Docente · lectura directa de planeaciones en Word (.docx) sin IA: instantánea y exacta.
   Reconoce el formato de tablas por sesión (Sesión | Tema | Momento/Fase | Campo formativo; Inicio | Desarrollo | Cierre | Evaluación | Materiales)
   y el instrumento de evaluación de cada proyecto (Rúbrica, Lista de cotejo, Escala estimativa). Si no lo reconoce, se usa Gemini. */
(function (WD) {
  'use strict';
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  const kids = (el, name) => Array.from(el.childNodes).filter((n) => n.namespaceURI === W && n.localName === name);
  const textoP = (p) => Array.from(p.getElementsByTagNameNS(W, 't')).map((t) => t.textContent).join('');
  const textoCelda = (tc) => kids(tc, 'p').map(textoP).join('\n').trim();
  const filas = (tbl) => kids(tbl, 'tr').map((tr) => kids(tr, 'tc').map(textoCelda));
  const quitar = (s, etiqueta) => String(s || '').replace(new RegExp('^\\s*' + etiqueta + '\\s*:?\\s*', 'i'), '').trim();
  const campoDe = (s) => { const n = WD.norm(s); return WD.CAMPOS.find((c) => n.startsWith(WD.norm(c).slice(0, 6))) || null; };
  const instrumentoDe = (s) => /r[uú]brica|escala/i.test(s) ? 'rubrica' : 'cotejo';

  // PDA de la sesión: «C1 (P1, P2)» → textos del contenido y de cada PDA del proyecto
  function metaSesion(meta, ref) {
    const cs = [...ref.matchAll(/C(\d+)/g)].map((m) => 'C' + m[1]); const ps = [...ref.matchAll(/P(\d+)/g)].map((m) => 'P' + m[1]);
    return { contenido: (cs.length ? cs : Object.keys(meta.contenidos)).map((k) => meta.contenidos[k]).filter(Boolean).join('\n'),
      pdaTexto: (ps.length ? ps : Object.keys(meta.pdas)).map((k) => meta.pdas[k] ? `${k}: ${meta.pdas[k]}` : '').filter(Boolean), pregunta: meta.pregunta || '' };
  }

  WD.leerPlaneacionDocx = async function (file) {
    const z = await WD.unzip(await file.arrayBuffer());
    if (!z['word/document.xml']) return null;
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(z['word/document.xml']), 'application/xml');
    const body = doc.getElementsByTagNameNS(W, 'body')[0]; if (!body) return null;
    let anioIni = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    let nombrePlan = file.name.replace(/\.[^.]+$/, ''), periodo = '';
    let proyecto = '', instrumentoTxt = '', pendientes = [], esperandoCriterios = false;
    let meta = { contenidos: {}, pdas: {}, pregunta: '' };
    const sesiones = [];

    for (const el of Array.from(body.childNodes)) {
      if (el.namespaceURI !== W) continue;
      if (el.localName === 'p') {
        const t = textoP(el).trim();
        const mi = t.match(/^Instrumento\s*:\s*([^·«]+)/i);
        if (mi) { instrumentoTxt = mi[1].trim(); esperandoCriterios = true; }
        continue;
      }
      if (el.localName !== 'tbl') continue;
      const fs = filas(el); if (!fs.length) continue;
      const plano = fs.flat().join('\n');
      // Encabezado: ciclo, número de planeación y periodo
      const mc = plano.match(/Ciclo\s+(\d{4})\s*[-–]\s*\d{4}/i); if (mc) anioIni = Number(mc[1]);
      const mp = plano.match(/(Planeaci[oó]n\s+\d+)/i); if (mp && !sesiones.length && !pendientes.length) nombrePlan = mp[1].replace(/planeacion/i, 'Planeación');
      const mper = plano.match(/Periodo\s*:\s*([^\n]+)/i); if (mper && !periodo) periodo = mper[1].trim();
      const mproy = plano.match(/Nombre del proyecto\s*:\s*«([^»]+)»/i); if (mproy) proyecto = mproy[1].trim();
      // Datos del proyecto: contenidos (C1: …), PDA (P1: …) y pregunta detonadora
      if (/^\s*PDA\s*:/im.test(plano) && /^\s*C\d+\s*:/m.test(plano)) {
        meta = { contenidos: {}, pdas: {}, pregunta: '' };
        for (const m of plano.matchAll(/^\s*C(\d+)\s*:\s*(.+)$/gm)) meta.contenidos['C' + m[1]] = m[2].trim();
        for (const m of plano.matchAll(/^\s*P(\d+)\s*:\s*(.+)$/gm)) meta.pdas['P' + m[1]] = m[2].trim();
      }
      const mpreg = plano.match(/Pregunta detonadora\s*:\s*([^\n]+)/i); if (mpreg && !meta.pregunta) { const q = mpreg[1].match(/¿[^?]*\?/); meta.pregunta = (q ? q[0] : mpreg[1]).trim(); }
      // Tabla de una sesión
      if (WD.norm(fs[0][0]) === 'sesion' && fs.length >= 4) {
        const [s0, tema = '', fase = '', campoTxt = ''] = fs[1];
        const mf = s0.match(/(\d+)\s*\/\s*(\d+)[\s\S]*?(\d{1,2})\s+de\s+([a-záéíóú]+)/i);
        const campo = campoDe(campoTxt) || campoDe(fs[1][fs[1].length - 1]);
        if (!mf || !campo) continue;
        const mes = MESES[WD.norm(mf[4])]; if (!mes) continue;
        const anio = mes >= 8 ? anioIni : anioIni + 1;
        const cab = fs.findIndex((r) => WD.norm(r[0]) === 'inicio');
        const cont = cab >= 0 ? (fs[cab + 1] || []) : [];
        const col = (nombre) => { const i = cab >= 0 ? fs[cab].findIndex((c) => WD.norm(c).startsWith(nombre)) : -1; return i >= 0 ? (cont[i] || '') : ''; };
        const resto = fs.slice(cab >= 0 ? cab + 2 : 2).flat();
        const buscar = (et) => quitar(resto.find((c) => WD.norm(c).startsWith(WD.norm(et))) || '', et);
        const temaLineas = tema.split('\n').map((x) => x.trim()).filter(Boolean);
        const evaluacion = col('evaluacion');
        const s = {
          id: WD.uid(), numero: mf[1], fecha: `${anio}-${WD.pad(mes)}-${WD.pad(Number(mf[3]))}`, campo,
          proyecto: proyecto || temaLineas[0] || '', titulo: temaLineas[0] || proyecto || '', faseProyecto: fase.trim(),
          pda: quitar(temaLineas.find((x) => /PDA/i.test(x)) || '', 'Contenido/PDA'),
          paginas: buscar('Pág. libro'), inicio: col('inicio'), desarrollo: col('desarrollo'), cierre: col('cierre'),
          recursos: col('materiales'), evidencias: evaluacion.replace(/\((r[uú]brica|lista de cotejo|escala[^)]*)\)/ig, '').trim(),
          ajustes: buscar('Ajustes razonables'), tarea: buscar('Tarea'), ...metaSesion(meta, temaLineas.find((x) => /PDA/i.test(x)) || ''), instrumento: instrumentoDe(evaluacion), criterios: [], detalle: true,
        };
        // Título: proyecto · fase de la sesión (ej. «¡Con pan, festejamos!» · Lo que sabemos)
        const faseCorta = (fase.split(',')[0] || '').trim();
        s.titulo = [temaLineas[0] || proyecto, faseCorta].filter(Boolean).join(' · ');
        pendientes.push(s); sesiones.push(s);
        continue;
      }
      // Tabla del instrumento (criterios del proyecto): se aplica a las sesiones anteriores
      if (esperandoCriterios && /^criterio/i.test(WD.norm(fs[0][0]))) {
        const criterios = fs.slice(1).map((r) => (r[0] || '').trim()).filter(Boolean).slice(0, 8);
        const inst = instrumentoDe(instrumentoTxt);
        pendientes.forEach((s) => { s.instrumento = inst; s.criterios = criterios; s.instrumentoNombre = instrumentoTxt; });
        pendientes = []; esperandoCriterios = false;
      }
    }
    // Sesiones sin tabla de instrumento: criterios a partir de la evaluación de la sesión
    sesiones.filter((s) => !s.criterios.length).forEach((s) => { s.criterios = s.evidencias.split(/(?<=\.)\s+/).map((x) => x.trim()).filter((x) => x.length > 5).slice(0, 4); });
    if (!sesiones.length) return null;
    sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha) || WD.CAMPOS.indexOf(a.campo) - WD.CAMPOS.indexOf(b.campo));
    return [{ id: WD.uid(), nombre: nombrePlan, periodo, archivo: file.name, subida: Date.now(), sesiones }];
  };
})(window.WD);
