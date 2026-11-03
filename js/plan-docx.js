/* Web Docente · lectura directa de planeaciones en Word (.docx) sin IA: instantánea y exacta.
   Reconoce el formato de tablas por sesión (Sesión | Tema | Momento/Fase | Campo formativo; Inicio | Desarrollo | Cierre | Evaluación | Materiales)
   y el instrumento de evaluación de cada proyecto (Rúbrica, Lista de cotejo, Escala estimativa). Si no lo reconoce, se usa Gemini. */
(function (WD) {
  'use strict';
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  const MESES_C = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
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
    let meta = { contenidos: {}, pdas: {}, pregunta: '' }, proyPD = null;
    const mnom = nombrePlan.match(/(?:planeaci[oó]n|plano[\s_-]*did[aá]ctico)[\s_-]*(\d+)/i); if (mnom) nombrePlan = `Planeación ${Number(mnom[1])}`;
    const sesiones = [];

    for (const el of Array.from(body.childNodes)) {
      if (el.namespaceURI !== W) continue;
      if (el.localName === 'p') {
        const t = textoP(el).trim();
        const mi = t.match(/^Instrumento\s*:\s*([^·«]+)/i);
        if (mi) { instrumentoTxt = mi[1].trim(); esperandoCriterios = true; }
        const mpp = t.match(/Periodo\s*:\s*(.+)$/i); if (mpp && !periodo) { periodo = mpp[1].trim(); const my = periodo.match(/([a-záéíóú]+)\s+de\s+(\d{4})\s*$/i); if (my && MESES[WD.norm(my[1])]) anioIni = MESES[WD.norm(my[1])] >= 8 ? Number(my[2]) : Number(my[2]) - 1; }
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
      // Formato «plano didáctico»: tabla del proyecto (Campo formativo | …) y tabla de sesiones (Proceso de desarrollo | Sesión | Actividades | Evaluación | Páginas)
      if (WD.norm(fs[0][0]) === 'campo formativo' && fs[0][1]) {
        const v = (et) => (fs.find((r) => WD.norm(r[0]).startsWith(et)) || [])[1] || '';
        const tit = v('titulo'); const prop = v('proposito'); const q = prop.match(/Pregunta detonadora\s*:\s*(¿[^?]*\?)/i);
        proyPD = { campo: campoDe(fs[0][1]), proyecto: ((tit.match(/«([^»]+)»/) || [])[1] || tit.split('·')[0]).trim(), libro: tit.split('·').slice(1).join('·').trim(), contenido: v('contenido').replace(/^\s*\*\s*/gm, '').trim(), pregunta: q ? q[1] : '' };
        continue;
      }
      if (/^proceso de desarrollo/.test(WD.norm(fs[0][0])) && proyPD && proyPD.campo) {
        let ult = null;
        for (const r of fs.slice(1)) {
          if (/^\s*Ajustes\s*:/i.test(r[0] || '')) { const extra = r.map((c) => quitar(c, 'Ajustes')).filter(Boolean).join(' '); if (ult && extra) ult.ajustes = [ult.ajustes, extra].filter(Boolean).join('\n'); continue; }
          const ses = (r[1] || '').split('\n').map((x) => x.trim()).filter(Boolean);
          const mn = (ses[0] || '').match(/(\d+)\s*\/\s*(\d+)/); const md = (ses[1] || '').match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)/i);
          if (!mn || !md) continue;
          const mes = MESES[WD.norm(md[2])] || MESES_C[WD.norm(md[2]).slice(0, 3)]; if (!mes) continue;
          const anio = mes >= 8 ? anioIni : anioIni + 1;
          const mh = (ses[2] || '').match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
          const fase = (mh ? ses[3] : ses[2]) || '';
          // Actividades: Inicio / Desarrollo / Cierre / Tarea / Ajustes razonables
          const sec = { inicio: [], desarrollo: [], cierre: [], tarea: [], ajustes: [] }; let cur = 'inicio';
          (r[2] || '').split('\n').forEach((ln) => { const m = ln.match(/^\s*(Inicio|Desarrollo|Cierre|Tarea|Ajustes razonables)\s*:\s*(.*)$/i); if (m) { cur = { inicio: 'inicio', desarrollo: 'desarrollo', cierre: 'cierre', tarea: 'tarea' }[WD.norm(m[1])] || 'ajustes'; if (m[2].trim()) sec[cur].push(m[2].trim()); } else if (ln.trim()) sec[cur].push(ln.trim()); });
          const evalL = (r[3] || '').split('\n').map((x) => x.trim()).filter(Boolean); const instL = evalL.find((x) => /^Instrumento\s*:/i.test(x)) || '';
          const evid = evalL.filter((x) => x !== instL).join(' ');
          const pdaM = (r[0] || '').match(/^\s*(P\d+)\.?\s*([\s\S]*)$/);
          const s = {
            id: WD.uid(), numero: `${mn[1]}/${mn[2]}`, fecha: `${anio}-${WD.pad(mes)}-${WD.pad(Number(md[1]))}`, campo: proyPD.campo,
            hora: mh ? mh[1].padStart(5, '0') : '', horaFin: mh ? mh[2].padStart(5, '0') : '',
            proyecto: proyPD.proyecto, titulo: [proyPD.proyecto, fase.split(',')[0].trim()].filter(Boolean).join(' · '), faseProyecto: fase,
            pda: pdaM ? pdaM[1] : '', contenido: proyPD.contenido, pdaTexto: pdaM ? [`${pdaM[1]}: ${pdaM[2].trim()}`] : (r[0] ? [r[0].trim()] : []), pregunta: proyPD.pregunta,
            paginas: [(r[4] || '').replace(/\n/g, ' · '), proyPD.libro].filter(Boolean).join(' · '),
            inicio: sec.inicio.join('\n'), desarrollo: sec.desarrollo.join('\n'), cierre: sec.cierre.join('\n'), tarea: sec.tarea.join('\n'), ajustes: sec.ajustes.join('\n'),
            recursos: '', evidencias: evid.replace(/\((r[uú]brica|lista de cotejo|escala[^)]*)\)/ig, '').trim(), instrumento: instrumentoDe(instL || evid), instrumentoNombre: quitar(instL, 'Instrumento'), criterios: [], detalle: true,
          };
          sesiones.push(s); ult = s;
        }
        continue;
      }
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
