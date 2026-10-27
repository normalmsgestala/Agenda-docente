/* Web Docente · IDAI (alfabetización inicial) e ICE (convenciones de la lengua escrita) */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const NIVELES = ['Presilábico', 'Silábico', 'Silábico Alfabético', 'Alfabético'];
  const NIV_CLS = { 'Presilábico': 'bad', 'Silábico': 'warn', 'Silábico Alfabético': '', 'Alfabético': 'ok' };
  const LETRAS = ['P', 'A', 'T', 'O', 'V', 'B', 'E', 'G', 'W', 'X', 'M', 'C', 'R', 'D', 'S', 'F', 'H', 'Z', 'N', 'I', 'J', 'K', 'L', 'U', 'Ñ', 'Q', 'Y'];
  const PALABRAS = { mariposa: [4, 8, 'ma-ri-po-sa'], sol: [1, 3, 'sol'], venado: [3, 6, 've-na-do'], gusano: [3, 6, 'gu-sa-no'], loro: [2, 4, 'lo-ro'], toro: [2, 4, 'to-ro'] };
  const ORACIONES = [
    ['La pluma roja de Mara sigue junto a la silla y la mesa.', [['o1_mayuscula', 'Mayúscula inicial'], ['o1_pluma_pl', 'pluma con pl'], ['o1_roja_r', 'roja con r'], ['o1_mara_mayus', 'Mara con mayúscula'], ['o1_sigue_que', 'sigue con gu'], ['o1_silla_ll', 'silla con ll'], ['o1_la_mesa_sep', 'la mesa separado'], ['o1_punto', 'Punto final']]],
    ['Cuando se queman el arroz y el filete el guiso no sabe rico.', [['o2_mayuscula', 'Mayúscula inicial'], ['o2_queman_que', 'queman con que'], ['o2_arroz_rr', 'arroz con rr'], ['o2_el_filete_sep', 'el filete separado'], ['o2_guiso_gui', 'guiso con gui'], ['o2_rico_r', 'rico con r'], ['o2_punto', 'Punto final']]],
    ['Para bailar mucho en el salón les piden a Rafa y a Paco que saquen las bancas.', [['o3_mayuscula', 'Mayúscula inicial'], ['o3_bailar_ai', 'bailar con ai'], ['o3_mucho_ch', 'mucho con ch'], ['o3_a_rafa_sep', 'a Rafa separado'], ['o3_paco_mayus', 'Paco con mayúscula'], ['o3_saque_que', 'saquen con que'], ['o3_bancas_nc', 'bancas con nc'], ['o3_punto', 'Punto final']]],
    ['En el cerro con todo el aire en calma el águila vuela sobre las ramas.', [['o4_mayuscula', 'Mayúscula inicial'], ['o4_cerro_rr', 'cerro con rr'], ['o4_con_todo_sep', 'con todo separado'], ['o4_aire_ai', 'aire con ai'], ['o4_calma_lm', 'calma con lm'], ['o4_aguila_gui', 'águila con gui'], ['o4_ramas_r', 'ramas con r'], ['o4_punto', 'Punto final']]],
    ['El moño y el gorro de Ana no estaban y por eso ella quiso pasear conmigo.', [['o5_mayuscula', 'Mayúscula inicial'], ['o5_mono_n', 'moño con ñ'], ['o5_gorro_rr', 'gorro con rr'], ['o5_ana_mayus', 'Ana con mayúscula'], ['o5_quiso_qu', 'quiso con qu'], ['o5_pasear_ea', 'pasear con ea'], ['o5_conmigo_junta', 'conmigo junto'], ['o5_punto', 'Punto final']]],
  ];
  const PUNTUACION = [['punt_mamifero_su', 'Punto entre «mamífero. Su»'], ['punt_corrige_su', 'Cambió «su» por «Su»'], ['punt_coma_cafe_blanco', 'Coma entre «café, blanco»'], ['punt_corta', 'Punto después de «corta»'], ['punt_crecer_es', 'Punto entre «crecer. Es»'], ['punt_lastimarse', 'Punto después de «lastimarse»']];
  const ITEMS_ORA = ORACIONES.flatMap((o) => o[1].map((x) => x[0])); const ITEMS_PUN = PUNTUACION.map((x) => x[0]);
  const CONEJO = 'El conejo es un animal mamífero su cuerpo está cubierto de pelo espeso de color café blanco o gris. Tiene orejas largas que le ayudan a regular su temperatura y una cola muy corta\nUn aspecto interesante del conejo es que sus dientes no dejan de crecer\nEs por eso que debe desgastarlos todo el tiempo para no lastimarse';
  const PREGUNTAS = ['¿Qué tipo de animal es el conejo?', '¿De qué está cubierto su cuerpo y de qué colores puede ser?', '¿Para qué le ayudan sus orejas largas?', '¿Qué tienen de interesante sus dientes?', '¿Por qué debe desgastar sus dientes todo el tiempo?'];
  const LECTURAS = ['No lector', 'Silábica', 'Palabra por palabra', 'Corriente / Fluida'];
  const ICE_NIV = ['Requiere apoyo', 'En desarrollo', 'Nivel esperado']; const ICE_CLS = ['bad', 'warn', 'ok'];
  const GUIA = {
    'Presilábico': 'Aún no relaciona sonidos con letras: usa letras al azar, un repertorio fijo o pone muchas letras aunque la palabra sea corta (en «sol» escribe 3 o más letras sin relación).',
    'Silábico': 'Pone una letra por cada sílaba: «mariposa» con 4 letras, «sol» con 1, «loro» con 2.',
    'Silábico Alfabético': 'Transición: algunas sílabas con una letra y otras completas («sol» con 2 letras, «mrposa», «gusno»).',
    'Alfabético': 'Escribe todos o casi todos los sonidos de cada palabra. Errores de ortografía como b/v o s/z no le quitan el nivel.',
  };

  const lista = () => { if (!Array.isArray(WD.state.diagnosticos)) WD.state.diagnosticos = []; return WD.state.diagnosticos; };
  let abierta = null;
  const diag = (id) => lista().find((d) => d.id === id);
  const resDe = (d, alId) => (d.res[alId] = d.res[alId] || (d.tipo === 'idai' ? { pal: {}, letras: {}, nivel: '', obs: '' } : { rub: {}, obs: '', lectura: { tipo: '', seg: null, comp: [] } }));
  const capturado = (d, r) => !!r && (d.tipo === 'idai' ? !!(r.nivel || Object.values(r.letras || {}).some(Boolean)) : Object.keys(r.rub || {}).length > 0);

  /* ---------- reglas ---------- */
  // Auditoría IDAI (Emilia Ferreiro): cuenta grafías contra sílabas y fonemas de cada palabra dictada
  function nivelSugerido(pal = {}) {
    const escritas = Object.keys(PALABRAS).filter((w) => (pal[w] || '').trim());
    if (escritas.length < 3) return null;
    const limpia = (s) => String(s || '').replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚüÜ]/g, '');
    const freq = {}; escritas.forEach((w) => { const k = limpia(pal[w]).toUpperCase(); if (k) freq[k] = (freq[k] || 0) + 1; });
    let sil = 0, alf = 0, tra = 0, arb = 0, sol = -1; const det = [];
    escritas.forEach((w) => {
      const n = limpia(pal[w]).length; const [s, f] = PALABRAS[w]; let d;
      if (w === 'sol') { sol = n; if (n === 1) { sil++; d = '1 letra: silábico'; } else if (n === 2) { tra++; d = '2 letras: transición'; } else if (n === 3) { alf++; d = '3 letras: alfabético'; } else { arb++; d = n ? 'muchas letras para una sílaba' : 'sin respuesta'; } }
      else if (!n) { arb++; d = 'sin respuesta'; }
      else if (n === s) { sil++; d = `${n} letras para ${s} sílabas`; }
      else if (n >= f || (f >= 6 && n === f - 1)) { alf++; d = `${n} de ${f} sonidos`; }
      else if (n > s && n < f) { tra++; d = `entre sílabas y sonidos (${n})`; }
      else { arb++; d = `${n} letras sin relación con ${s} sílabas`; }
      det.push([w, d]);
    });
    let nivel, por;
    if (Object.values(freq).some((c) => c >= 3)) { nivel = 'Presilábico'; por = 'Repite las mismas letras en varias palabras.'; }
    else if (sil >= 4 && sol <= 1) { nivel = 'Silábico'; por = `${sil} palabras con una letra por sílaba.`; }
    else if (alf >= 5 && (sol === 3 || sol === -1)) { nivel = 'Alfabético'; por = `${alf} palabras con todos sus sonidos.`; }
    else if (tra >= 2 || (alf >= 2 && (tra >= 1 || sil >= 1)) || (sil >= 2 && tra >= 1) || (sol === 2 && arb < 3)) { nivel = 'Silábico Alfabético'; por = 'Combina sílabas de una letra con sílabas completas.'; }
    else if (arb >= 3 || (sil < 3 && alf < 2 && tra < 2)) { nivel = 'Presilábico'; por = 'Las letras no corresponden a las sílabas que suenan.'; }
    else { nivel = alf >= sil ? 'Silábico Alfabético' : 'Silábico'; por = 'Patrón mixto; revisa la hoja.'; }
    return { nivel, por, det };
  }
  const nLetras = (r) => LETRAS.filter((l) => r.letras?.[l]).length;
  function puntajeIce(r) {
    const o = ITEMS_ORA.filter((k) => r.rub?.[k] === true).length, p = ITEMS_PUN.filter((k) => r.rub?.[k] === true).length, t = o + p;
    const n = t >= 38 ? 2 : t >= 27 ? 1 : 0; return { o, p, t, pct: Math.round((t / 45) * 100), nivel: ICE_NIV[n], cls: ICE_CLS[n] };
  }
  const ppm = (r) => (r.lectura?.seg > 0 ? Math.round((53 / r.lectura.seg) * 60) : null);

  /* ---------- acciones ---------- */
  WD.act.diagNuevo = (el) => {
    const t = el.dataset.t; const n = lista().filter((d) => d.tipo === t).length;
    const d = { id: WD.uid(), tipo: t, nombre: `${t === 'idai' ? 'IDAI' : 'ICE'} · ${['Diagnóstico', 'Intermedio', 'Final'][n] || `Aplicación ${n + 1}`}`, fecha: WD.iso(new Date()), res: {} };
    lista().push(d); WD.save(); abierta = d.id; WD.refrescar();
  };
  WD.act.diagAbrir = (el) => { abierta = el.dataset.id; WD.refrescar(); window.scrollTo(0, 0); };
  WD.act.diagVolver = () => { abierta = null; WD.refrescar(); };
  WD.act.diagBorrar = async (el) => {
    const d = diag(el.dataset.id); if (!d || !(await WD.confirmar('Eliminar aplicación', `Se borrarán los resultados de «${esc(d.nombre)}».`, 'Eliminar', true))) return;
    WD.state.diagnosticos = lista().filter((x) => x.id !== d.id); abierta = null; WD.save(); WD.refrescar();
  };
  WD.act.diagGuia = () => WD.modal(`<div class="row"><h2 style="flex:1">Guía de niveles</h2><button class="x" data-act="cerrarModal" aria-label="Cerrar">×</button></div>
    <div class="label">IDAI · escritura (dictado de 6 palabras)</div>${NIVELES.map((n) => `<div class="stack" style="gap:4px"><span class="pill ${NIV_CLS[n]}" style="justify-self:start">${n}</span><p class="small" style="margin:0">${GUIA[n]}</p></div>`).join('')}
    <p class="small muted" style="margin:0">«Sol» es la palabra clave: con 1 letra es silábico, con 2 transición y con 3 alfabético.</p>
    <div class="sep"></div><div class="label">ICE · convenciones (45 reactivos)</div>
    <p class="small" style="margin:0"><span class="pill ok">Nivel esperado</span> 38 a 45 · <span class="pill warn">En desarrollo</span> 27 a 37 · <span class="pill bad">Requiere apoyo</span> menos de 27</p>
    <p class="small muted" style="margin:0">39 reactivos del dictado de 5 oraciones (mayúsculas, ortografía, separación de palabras y punto) y 6 del texto «El conejo» (puntos, coma y mayúscula).</p>`);

  /* ---------- ficha de captura ---------- */
  function abrirAlumno(dId, alId) {
    const d = diag(dId); const als = WD.alumnosActivos(); const i = als.findIndex((a) => a.id === alId); const a = als[i]; if (!a) return;
    const di = lista().indexOf(d); resDe(d, alId); const base = `diagnosticos.${di}.res.${alId}`;
    const nav = `<div class="row"><button class="btn sm" data-act="diagAl" data-d="${d.id}" data-al="${als[i - 1]?.id || ''}" ${i ? '' : 'disabled'}>${WD.icon('izq')} Anterior</button><span style="flex:1"></span><span class="small muted">${i + 1} de ${als.length}</span><span style="flex:1"></span><button class="btn sm" data-act="diagAl" data-d="${d.id}" data-al="${als[i + 1]?.id || ''}" ${i < als.length - 1 ? '' : 'disabled'}>Siguiente ${WD.icon('der')}</button></div>`;
    WD.abrirDrawer(WD.nombreCompleto(a), `<div id="dg-body"></div>${nav}`, (b) => { const box = b.querySelector('#dg-body'); box.dataset.d = dId; box.dataset.al = alId; pintar(box, d, alId, base); }, esc(d.nombre));
  }
  function pintar(box, d, alId, base) {
    const r = resDe(d, alId); const y = box.closest('.drawer-b')?.scrollTop || 0;
    box.innerHTML = d.tipo === 'idai' ? htmlIdai(d, r, alId, base) : htmlIce(d, r, alId, base);
    const sb = box.closest('.drawer-b'); if (sb) sb.scrollTop = y;
    box.querySelectorAll('[data-pal]').forEach((inp) => inp.addEventListener('input', () => { r.pal[inp.dataset.pal] = inp.value; sugerencia(box, r); }));
    box.querySelectorAll('[data-dgfoto]').forEach((inp) => inp.addEventListener('change', () => fotoIA(inp, d, alId, box, base)));
    box.querySelector('#dg-seg')?.addEventListener('input', (e) => { r.lectura.seg = Number(e.target.value) || null; const v = ppm(r); box.querySelector('#dg-ppm').textContent = v ? `${v} palabras por minuto` : ''; });
  }
  const repintar = (d, alId) => { const box = document.getElementById('dg-body'); if (box) pintar(box, d, alId, `diagnosticos.${lista().indexOf(d)}.res.${alId}`); };
  function sugerencia(box, r) {
    const s = nivelSugerido(r.pal); const el = box.querySelector('#dg-sug'); if (!el) return;
    el.innerHTML = s ? `<div class="row" style="gap:8px"><span class="small muted">Sugerido por las palabras:</span><span class="pill ${NIV_CLS[s.nivel]}">${s.nivel}</span>${r.nivel !== s.nivel ? `<button class="btn sm" data-act="diagUsar" data-n="${s.nivel}">Usar este nivel</button>` : ''}</div><p class="tiny muted" style="margin:4px 0 0">${esc(s.por)} ${s.det.map(([w, t]) => `<b>${w}</b>: ${esc(t)}`).join(' · ')}</p>` : '<p class="tiny muted" style="margin:0">Escribe al menos 3 palabras como las escribió el alumno y te sugiero el nivel.</p>';
  }
  const fotoBtn = (k, t) => `<label class="btn sm cam">${WD.icon('camara')} ${t}<input type="file" accept="image/*" data-dgfoto="${k}"></label>`;
  function htmlIdai(d, r, alId, base) {
    const n = nLetras(r);
    return `<div class="stack"><div class="row"><div class="label" style="flex:1">Tarea 1 · dictado de palabras</div>${fotoBtn('t1', 'Leer foto')}</div>
        <div class="grid g3">${Object.keys(PALABRAS).map((w) => `<label class="field"><span>${w} <span class="tiny faint">${PALABRAS[w][2]}</span></span><input class="in" data-pal="${w}" data-bind="${base}.pal.${w}" value="${esc(r.pal?.[w] || '')}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Como lo escribió"></label>`).join('')}</div>
        <div id="dg-sug"></div>
        <div class="label">Nivel de escritura</div>
        <div class="row" style="gap:6px">${NIVELES.map((x) => `<button class="btn sm ${r.nivel === x ? 'pri' : ''}" data-act="diagNivel" data-n="${x}">${x}</button>`).join('')}</div></div>
      <div class="sep"></div>
      <div class="stack"><div class="row"><div class="label" style="flex:1">Tarea 2 · letras que identifica</div><span class="pill ${n >= 22 ? 'ok' : n >= 12 ? 'warn' : 'bad'}">${n} de 27</span>${fotoBtn('t2', 'Leer foto')}</div>
        <div class="dg-letras">${LETRAS.map((l) => `<button class="${r.letras?.[l] ? 'on' : ''}" data-act="diagLetra" data-l="${l}" aria-pressed="${!!r.letras?.[l]}">${l}</button>`).join('')}</div>
        <div class="row"><button class="btn sm ghost" data-act="diagLetras" data-v="1">Marcar todas</button><button class="btn sm ghost" data-act="diagLetras" data-v="0">Quitar todas</button></div></div>
      <label class="field"><span>Observaciones</span><textarea class="in" data-bind="${base}.obs" placeholder="Ej. reconoce vocales, inicia fonetización">${esc(r.obs || '')}</textarea></label>
      <p class="tiny muted" id="dg-ia" style="margin:0">La foto se revisa con tu Gemini sin el nombre del alumno y no se guarda. Revisa siempre lo que propone.</p>`;
  }
  function htmlIce(d, r, alId, base) {
    const s = puntajeIce(r); const v = ppm(r);
    const item = ([k, t]) => `<button class="dg-it ${r.rub?.[k] === true ? 'on' : r.rub?.[k] === false ? 'no' : ''}" data-act="diagItem" data-k="${k}">${esc(t)}</button>`;
    return `<div class="row"><span class="pill ${s.cls}" style="font-size:14px">${s.nivel}</span><b>${s.t} de 45</b><span class="small muted">${s.pct}% · dictado ${s.o}/39 · puntuación ${s.p}/6</span><span style="flex:1"></span>${fotoBtn('ice', 'Leer foto')}</div>
      <p class="tiny muted" style="margin:0">Toca cada reactivo: verde sí lo logró, rojo no. Lo que no marques cuenta como no logrado.</p>
      ${ORACIONES.map(([t, its], i) => `<div class="stack" style="gap:6px"><div class="row"><div class="small" style="flex:1"><b>${i + 1}.</b> ${esc(t)}</div><button class="btn sm ghost" data-act="diagOra" data-i="${i}">Todo bien</button></div><div class="dg-its">${its.map(item).join('')}</div></div>`).join('')}
      <div class="stack" style="gap:6px"><div class="row"><div class="small" style="flex:1"><b>Texto «El conejo»</b> · puntuación</div><button class="btn sm ghost" data-act="diagOra" data-i="p">Todo bien</button></div><div class="dg-its">${PUNTUACION.map(item).join('')}</div></div>
      <div class="sep"></div>
      <details class="stack"><summary class="label" style="cursor:pointer">Lectura y comprensión (opcional)</summary>
        <div class="grid g2" style="margin-top:10px"><label class="field"><span>Tipo de lectura</span><select class="in" data-bind="${base}.lectura.tipo"><option value="">Sin evaluar</option>${LECTURAS.map((x) => `<option ${r.lectura?.tipo === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field"><span>Segundos en leer «El conejo» (53 palabras)</span><input class="in" type="number" min="0" id="dg-seg" data-bind="${base}.lectura.seg" value="${r.lectura?.seg ?? ''}"><span class="tiny muted" id="dg-ppm">${v ? `${v} palabras por minuto` : ''}</span></label></div>
        ${PREGUNTAS.map((q, i) => { const c = r.lectura?.comp?.[i]; return `<div class="row" style="gap:6px"><span class="small" style="flex:1">${i + 1}. ${esc(q)}</span><button class="btn sm ${c === true ? 'pri' : ''}" data-act="diagComp" data-i="${i}" data-v="1">Correcta</button><button class="btn sm ${c === false ? 'danger' : ''}" data-act="diagComp" data-i="${i}" data-v="0">Incorrecta</button></div>`; }).join('')}
      </details>
      <label class="field"><span>Observaciones</span><textarea class="in" data-bind="${base}.obs">${esc(r.obs || '')}</textarea></label>
      <p class="tiny muted" id="dg-ia" style="margin:0">La foto se revisa con tu Gemini sin el nombre del alumno y no se guarda. Revisa siempre lo que propone.</p>`;
  }
  const ctx = () => { const b = document.getElementById('dg-body'); return b ? { d: diag(b.dataset.d), al: b.dataset.al } : {}; };
  const conCtx = (fn) => (el) => { const { d, al } = ctx(); if (!d) return; fn(resDe(d, al), el, d); WD.save(); repintar(d, al); };
  WD.act.diagAl = (el) => { if (el.dataset.al) abrirAlumno(el.dataset.d, el.dataset.al); };
  WD.act.diagNivel = conCtx((r, el) => { r.nivel = r.nivel === el.dataset.n ? '' : el.dataset.n; });
  WD.act.diagUsar = conCtx((r, el) => { r.nivel = el.dataset.n; });
  WD.act.diagLetra = conCtx((r, el) => { r.letras[el.dataset.l] = !r.letras[el.dataset.l]; });
  WD.act.diagLetras = conCtx((r, el) => { LETRAS.forEach((l) => { r.letras[l] = el.dataset.v === '1'; }); });
  WD.act.diagItem = conCtx((r, el) => { const k = el.dataset.k; r.rub[k] = r.rub[k] === true ? false : r.rub[k] === false ? undefined : true; if (r.rub[k] === undefined) delete r.rub[k]; });
  WD.act.diagOra = conCtx((r, el) => { const ks = el.dataset.i === 'p' ? ITEMS_PUN : ORACIONES[el.dataset.i][1].map((x) => x[0]); ks.forEach((k) => { r.rub[k] = true; }); });
  WD.act.diagComp = conCtx((r, el) => { r.lectura.comp = r.lectura.comp || []; const v = el.dataset.v === '1'; r.lectura.comp[el.dataset.i] = r.lectura.comp[el.dataset.i] === v ? null : v; });
  WD.act.diagAlumno = (el) => abrirAlumno(el.dataset.d, el.dataset.al);

  /* ---------- foto con IA ---------- */
  async function fotoIA(inp, d, alId, box) {
    const f = inp.files[0]; inp.value = ''; if (!f || !WD.requiereIA()) return;
    const r = resDe(d, alId); const msg = box.querySelector('#dg-ia'); msg.innerHTML = '<span class="spinner"></span> Leyendo la hoja con tu Gemini…';
    try {
      const url = await WD.shrinkImage(f, 1800, 0.86); const [meta, data] = url.split(','); const img = { inline_data: { mime_type: (meta.match(/data:(.*?);/) || [])[1] || 'image/jpeg', data } };
      const k = inp.dataset.dgfoto;
      if (k === 't1') {
        const out = await WD.ai.generar([img, { text: `Eres especialista en el IDAI (psicogénesis de la escritura, Emilia Ferreiro). La foto muestra la hoja de un alumno de primaria donde se le dictaron 6 palabras en este orden: mariposa, sol, venado, gusano, loro (o perico), toro.
Transcribe EXACTAMENTE lo que escribió en cada una, letra por letra, sin corregir ortografía ni completar letras faltantes (si escribió "AIOA" pon "AIOA"; si es garabato ilegible pon ""). Devuelve JSON {"palabras":{"mariposa":"","sol":"","venado":"","gusano":"","loro":"","toro":""},"nivel":"Presilábico|Silábico|Silábico Alfabético|Alfabético","nota":"una frase para el docente"}` }], { json: true, temperatura: 0.1 });
        Object.keys(PALABRAS).forEach((w) => { if (out.palabras && typeof out.palabras[w] === 'string') r.pal[w] = out.palabras[w]; });
        const s = nivelSugerido(r.pal); r.nivel = s ? s.nivel : NIVELES.includes(out.nivel) ? out.nivel : r.nivel;
        if (out.nota) r.obs = r.obs ? r.obs : out.nota;
      } else if (k === 't2') {
        const out = await WD.ai.generar([img, { text: `Evalúas la Tarea 2 del IDAI (identificación de letras). En la hoja el alumno escribió, para cada letra (${LETRAS.join(', ')}), una palabra que empieza con ella o el nombre de la letra (ej. "A = árbol", "B = burro"). Si dejó en blanco, puso "no sé", "nsnc" o letras sin sentido, NO la reconoce. Devuelve JSON {"reconocidas":["A","P",...],"nota":"una frase para el docente"} con las letras en mayúscula.` }], { json: true, temperatura: 0.1 });
        const set = new Set((out.reconocidas || []).map((x) => String(x).trim().toUpperCase())); LETRAS.forEach((l) => { r.letras[l] = set.has(l); });
        if (out.nota && !r.obs) r.obs = out.nota;
      } else {
        const lista = ORACIONES.map(([t, its], i) => `Oración ${i + 1}: "${t}"\n${its.map(([id, x]) => `- ${id}: ${x}`).join('\n')}`).join('\n');
        const out = await WD.ai.generar([img, { text: `Evalúas el Instrumento de Convenciones de la Lengua Escrita (ICE, Hess-Mora). La foto es la hoja de un alumno de primaria. Tarea 1: se le dictaron 5 oraciones (renglones 1 a 5). Tarea 2: en el texto impreso "El conejo" (sin puntuación) el alumno debía agregar a mano puntos, una coma y una mayúscula.
Califica cada reactivo como true (lo logró) o false (no lo logró o no se ve):
${lista}
Texto "El conejo":
${PUNTUACION.map(([id, x]) => `- ${id}: ${x}`).join('\n')}
Devuelve JSON {"rubrica":{"o1_mayuscula":true,...todos los ids...},"observacion":"2 o 3 frases sobre mayúsculas, ortografía, separación de palabras y puntuación"}` }], { json: true, temperatura: 0.1, maxTokens: 4096 });
        [...ITEMS_ORA, ...ITEMS_PUN].forEach((id) => { if (typeof out.rubrica?.[id] === 'boolean') r.rub[id] = out.rubrica[id]; });
        if (out.observacion && !r.obs) r.obs = out.observacion;
      }
      WD.save(); repintar(d, alId); WD.toast('Listo. Revisa lo que propuso y corrige si hace falta.', 3500);
    } catch (e) { msg.textContent = e.message; WD.toast(e.message, 4500); }
  }

  /* ---------- reportes ---------- */
  WD.act.diagExcel = async (el) => {
    const d = diag(el.dataset.id); const als = WD.alumnosActivos(); let rows;
    if (d.tipo === 'idai') {
      rows = [['Nº', 'Alumno', ...NIVELES, ...Object.keys(PALABRAS), ...LETRAS, 'Letras', 'Observaciones']];
      als.forEach((a) => { const r = d.res[a.id] || { pal: {}, letras: {} }; rows.push([a.num || '', WD.nombreLista(a), ...NIVELES.map((n) => (r.nivel === n ? 'X' : '')), ...Object.keys(PALABRAS).map((w) => r.pal?.[w] || ''), ...LETRAS.map((l) => (r.letras?.[l] ? 'X' : '')), capturado(d, r) ? nLetras(r) : '', r.obs || '']); });
      rows.push(['', 'TOTALES', ...NIVELES.map((n) => als.filter((a) => d.res[a.id]?.nivel === n).length), ...Object.keys(PALABRAS).map(() => ''), ...LETRAS.map((l) => als.filter((a) => d.res[a.id]?.letras?.[l]).length)]);
    } else {
      const ids = [...ITEMS_ORA, ...ITEMS_PUN]; const tit = [...ORACIONES.flatMap((o, i) => o[1].map((x) => `O${i + 1}: ${x[1]}`)), ...PUNTUACION.map((x) => x[1])];
      rows = [['Nº', 'Alumno', ...tit, 'Dictado /39', 'Puntuación /6', 'Total /45', '%', 'Diagnóstico', 'Tipo de lectura', 'Palabras por minuto', 'Comprensión /5', 'Observaciones']];
      als.forEach((a) => { const r = d.res[a.id]; if (!capturado(d, r)) { rows.push([a.num || '', WD.nombreLista(a)]); return; } const s = puntajeIce(r); rows.push([a.num || '', WD.nombreLista(a), ...ids.map((k) => (r.rub[k] === true ? 1 : 0)), s.o, s.p, s.t, s.pct, s.nivel, r.lectura?.tipo || '', ppm(r) ?? '', (r.lectura?.comp || []).filter((x) => x === true).length, r.obs || '']); });
    }
    const e = WD.state.escuela; WD.download(await WD.xlsxBlob([{ name: d.tipo === 'idai' ? 'IDAI' : 'ICE', rows, widths: [5, 32] }]), `${[d.nombre, `${e.grado || ''}${e.grupo || ''}`].filter((x) => x.trim()).join(' ').replace(/[^\wáéíóúñ]+/gi, '_')}.xlsx`);
  };
  WD.act.diagImprimir = (el) => {
    const d = diag(el.dataset.id); const als = WD.alumnosActivos(); let tabla;
    if (d.tipo === 'idai') {
      tabla = `<table><thead><tr><th>Nº</th><th>Alumno</th>${NIVELES.map((n) => `<th>${n}</th>`).join('')}<th>Letras /27</th></tr></thead><tbody>${als.map((a) => { const r = d.res[a.id] || {}; return `<tr><td>${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td>${NIVELES.map((n) => `<td style="text-align:center">${r.nivel === n ? 'X' : ''}</td>`).join('')}<td style="text-align:center">${capturado(d, r) ? nLetras(r) : ''}</td></tr>`; }).join('')}
        <tr><td></td><td><b>TOTAL</b></td>${NIVELES.map((n) => `<td style="text-align:center"><b>${als.filter((a) => d.res[a.id]?.nivel === n).length}</b></td>`).join('')}<td></td></tr></tbody></table>`;
    } else {
      tabla = `<table><thead><tr><th>Nº</th><th>Alumno</th><th>Dictado /39</th><th>Puntuación /6</th><th>Total /45</th><th>%</th><th>Diagnóstico</th></tr></thead><tbody>${als.map((a) => { const r = d.res[a.id]; if (!capturado(d, r)) return `<tr><td>${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td><td colspan="5"></td></tr>`; const s = puntajeIce(r); return `<tr><td>${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td><td style="text-align:center">${s.o}</td><td style="text-align:center">${s.p}</td><td style="text-align:center"><b>${s.t}</b></td><td style="text-align:center">${s.pct}%</td><td>${s.nivel}</td></tr>`; }).join('')}</tbody></table>`;
    }
    WD.vistaDocumento('Concentrado', `${WD.membrete()}<h2>${d.tipo === 'idai' ? 'INSTRUMENTO DIAGNÓSTICO DE ALFABETIZACIÓN INICIAL (IDAI)' : 'CONVENCIONES BÁSICAS DE LA LENGUA ESCRITA (ICE)'}</h2><p style="text-align:center;margin-top:-8px">${esc(d.nombre)} · ${esc(WD.fechaLarga(d.fecha))}</p>${tabla}${WD.piePagina()}`);
  };
  WD.act.diagHoja = (el) => {
    const t = el.dataset.t; const lin = (n) => Array.from({ length: n }, (_, i) => `<div style="display:flex;gap:10px;align-items:flex-end;height:42px;border-bottom:1px solid #999"><b>${i + 1}.</b></div>`).join('');
    const enc = '<p>Nombre: ______________________________________________ &nbsp; Fecha: ______________</p>';
    const html = t === 'idai' ? `${WD.membrete()}<h2>IDAI · HOJA DEL ALUMNO</h2>${enc}<p><b>Tarea 1.</b> Escribe las palabras que te dicte tu maestro.</p>${lin(6)}<p style="margin-top:22px"><b>Tarea 2.</b> Escribe una palabra que empiece con cada letra.</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0 18px">${LETRAS.map((l) => `<div style="height:34px;border-bottom:1px solid #999;display:flex;align-items:flex-end;gap:8px"><b style="font-size:14pt">${l}</b></div>`).join('')}</div>`
      : `${WD.membrete()}<h2>ICE · HOJA DEL ALUMNO</h2>${enc}<p><b>Tarea 1.</b> Escribe las oraciones que te dicte tu maestro.</p>${lin(5)}<p style="margin-top:22px"><b>Tarea 2.</b> Lee el texto y agrega los puntos, comas y mayúsculas que le hacen falta.</p><p style="font-size:13pt;line-height:2"><b>El conejo</b><br>${esc(CONEJO).replace(/\n/g, '<br>')}</p>`;
    WD.vistaDocumento('Hoja del alumno', html);
  };
  WD.act.diagTextos = () => WD.modal(`<div class="row"><h2 style="flex:1">Para dictar</h2><button class="x" data-act="cerrarModal" aria-label="Cerrar">×</button></div>
    <div class="label">IDAI · palabras</div><p style="margin:0">mariposa · sol · venado · gusano · loro (o perico) · toro</p>
    <div class="label">ICE · oraciones</div><ol class="small" style="margin:0;padding-left:20px">${ORACIONES.map((o) => `<li>${esc(o[0])}</li>`).join('')}</ol>
    <div class="label">Preguntas de comprensión de «El conejo»</div><ol class="small" style="margin:0;padding-left:20px">${PREGUNTAS.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>`);

  /* ---------- vista ---------- */
  function resumen(d, als) {
    const hechos = als.filter((a) => capturado(d, d.res[a.id])); if (!hechos.length) return '';
    const grupos = d.tipo === 'idai' ? NIVELES.map((n) => [n, NIV_CLS[n], hechos.filter((a) => d.res[a.id].nivel === n).length]) : ICE_NIV.map((n, i) => [n, ICE_CLS[i], hechos.filter((a) => puntajeIce(d.res[a.id]).nivel === n).length]);
    const extra = d.tipo === 'idai' ? `Promedio de letras: <b>${WD.round1(hechos.reduce((s, a) => s + nLetras(d.res[a.id]), 0) / hechos.length)}</b> de 27` : `Promedio: <b>${WD.round1(hechos.reduce((s, a) => s + puntajeIce(d.res[a.id]).t, 0) / hechos.length)}</b> de 45`;
    return `<div class="card stack"><div class="row"><div class="label" style="flex:1">Resumen del grupo</div><span class="small muted">${hechos.length} de ${als.length} capturados · ${extra}</span></div>
      ${grupos.map(([n, c, k]) => `<div class="dg-bar"><span class="small">${n}</span><div><i class="${c}" style="width:${(k / hechos.length) * 100}%"></i></div><b class="small">${k}</b></div>`).join('')}</div>`;
  }
  WD.views.idai = {
    titulo: 'IDAI / ICE',
    render() {
      const als = WD.alumnosActivos(); const d = abierta && diag(abierta);
      if (!d) {
        const ds = lista().slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        return `<div class="row"><div style="flex:1;min-width:0"><h1>IDAI / ICE</h1><p class="muted">Diagnóstico de escritura (IDAI) y de convenciones de la lengua escrita (ICE) para tu grupo.</p></div><button class="btn" data-act="diagTextos">Para dictar</button><button class="btn" data-act="diagGuia">Guía de niveles</button></div>
          <div class="grid g2">
            <div class="card stack"><b>IDAI · Alfabetización inicial</b><p class="small muted" style="margin:0">Dictado de 6 palabras para ubicar el nivel de escritura y las 27 letras que identifica.</p><div class="row"><button class="btn pri" data-act="diagNuevo" data-t="idai">${WD.icon('mas')} Nueva aplicación</button><button class="btn sm ghost" data-act="diagHoja" data-t="idai">${WD.icon('imprimir')} Hoja del alumno</button></div></div>
            <div class="card stack"><b>ICE · Convenciones de la lengua escrita</b><p class="small muted" style="margin:0">Dictado de 5 oraciones y puntuación del texto «El conejo»: 45 reactivos.</p><div class="row"><button class="btn pri" data-act="diagNuevo" data-t="ice">${WD.icon('mas')} Nueva aplicación</button><button class="btn sm ghost" data-act="diagHoja" data-t="ice">${WD.icon('imprimir')} Hoja del alumno</button></div></div>
          </div>
          ${ds.length ? `<div class="stack"><div class="label">Aplicaciones</div>${ds.map((x) => { const n = als.filter((a) => capturado(x, x.res[a.id])).length; return `<button class="card row dg-ap" data-act="diagAbrir" data-id="${x.id}"><span class="pill">${x.tipo.toUpperCase()}</span><b style="flex:1;text-align:left">${esc(x.nombre)}</b><span class="small muted">${esc(WD.fechaLarga(x.fecha))}</span><span class="pill ${n === als.length && n ? 'ok' : ''}">${n} de ${als.length}</span></button>`; }).join('')}</div>` : '<p class="small muted">Aún no tienes aplicaciones. Crea una, imprime la hoja del alumno y captura los resultados de cada quien.</p>'}`;
      }
      const di = lista().indexOf(d);
      const cab = d.tipo === 'idai' ? '<th>Nivel de escritura</th><th class="c">Letras</th><th>Palabras</th>' : '<th class="c">Dictado</th><th class="c">Puntuación</th><th class="c">Total</th><th>Diagnóstico</th>';
      const fila = (a) => { const r = d.res[a.id]; const ok = capturado(d, r);
        let c; if (!ok) c = `<td colspan="${d.tipo === 'idai' ? 3 : 4}" class="faint small">Sin capturar</td>`;
        else if (d.tipo === 'idai') c = `<td>${r.nivel ? `<span class="pill ${NIV_CLS[r.nivel]}">${r.nivel}</span>` : '<span class="small faint">Sin nivel</span>'}</td><td class="c">${nLetras(r)}/27</td><td class="small muted" style="white-space:normal">${Object.keys(PALABRAS).map((w) => esc(r.pal?.[w] || '')).filter(Boolean).join(' · ')}</td>`;
        else { const s = puntajeIce(r); c = `<td class="c">${s.o}/39</td><td class="c">${s.p}/6</td><td class="c"><b>${s.t}</b> <span class="tiny muted">${s.pct}%</span></td><td><span class="pill ${s.cls}">${s.nivel}</span></td>`; }
        return `<tr><td class="c">${esc(a.num || '')}</td><td><button class="link" data-act="diagAlumno" data-d="${d.id}" data-al="${a.id}">${esc(WD.nombreLista(a))}</button></td>${c}</tr>`; };
      return `<div class="row"><button class="btn ghost" data-act="diagVolver">${WD.icon('izq')} IDAI / ICE</button><span style="flex:1"></span><button class="btn sm" data-act="diagTextos">Para dictar</button><button class="btn sm" data-act="diagHoja" data-t="${d.tipo}">${WD.icon('imprimir')} Hoja del alumno</button><button class="btn sm" data-act="diagExcel" data-id="${d.id}">${WD.icon('descargar')} Excel</button><button class="btn sm" data-act="diagImprimir" data-id="${d.id}">${WD.icon('imprimir')} Concentrado</button></div>
        <div class="card grid g3"><label class="field"><span>Nombre de la aplicación</span><input class="in" data-bind="diagnosticos.${di}.nombre" value="${esc(d.nombre)}"></label><label class="field"><span>Fecha</span><input class="in" type="date" data-bind="diagnosticos.${di}.fecha" value="${esc(d.fecha)}"></label><div class="field"><span>Instrumento</span><div style="padding-top:8px"><b>${d.tipo === 'idai' ? 'IDAI · Alfabetización inicial' : 'ICE · Convenciones de la lengua escrita'}</b></div></div></div>
        ${resumen(d, als)}
        ${als.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">Nº</th><th>Alumno</th>${cab}</tr></thead><tbody>${als.map(fila).join('')}</tbody></table></div><p class="tiny muted">Toca el nombre del alumno para capturar. Con «Siguiente» pasas al que sigue sin cerrar.</p>` : '<p class="small muted">Carga a tus alumnos en Mi grupo para capturar resultados.</p>'}
        <div class="row"><span style="flex:1"></span><button class="btn ghost danger sm" data-act="diagBorrar" data-id="${d.id}">Eliminar aplicación</button></div>`;
    },
  };
})(window.WD);
