/* Web Docente · Exámenes con hoja de respuestas: se imprime la hoja (sin matrícula; un código QR identifica al alumno),
   se escanea con la cámara, se califica en base 100 y pasa a Evaluación › Examen. */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const LET = ['A', 'B', 'C', 'D', 'E'];
  const TIPOS = { diagnostico: 'Diagnóstico', t1: 'Trimestre 1', t2: 'Trimestre 2', t3: 'Trimestre 3' };
  const MAXQ = 60;

  /* ---------- geometría de la hoja (mm, dentro del área imprimible 186 × 246) ---------- */
  const G = { w: 186, h: 246, mk: 7, row: 7.6, sep: 6.8, bub: 5.2, num: 9, gapX: 14, gapY: 8, y0: 54, qr: 26, qrx: 152, qry: 7 };
  G.marcas = [[7, 46], [179, 46], [7, 239], [179, 239]]; // centros de las 4 marcas: sup-izq, sup-der, inf-izq, inf-der
  function layout(n, op) {
    const bloques = Math.ceil(n / 10); const cols = Math.min(3, bloques); const bw = G.num + op * G.sep;
    const ancho = cols * bw + (cols - 1) * G.gapX; const x0 = (G.w - ancho) / 2;
    const pos = []; // pos[q][o] = [x, y] centro de la burbuja
    for (let q = 0; q < n; q++) {
      const b = Math.floor(q / 10), r = q % 10, c = b % cols, f = Math.floor(b / cols);
      const bx = x0 + c * (bw + G.gapX), by = G.y0 + f * (6 + 10 * G.row + G.gapY);
      pos.push(Array.from({ length: op }, (_, o) => [bx + G.num + o * G.sep + G.sep / 2, by + 6 + r * G.row + G.row / 2]));
    }
    return { pos, x0, cols, bw };
  }

  /* ---------- datos ---------- */
  const lista = () => { if (!Array.isArray(WD.state.examenes)) WD.state.examenes = []; return WD.state.examenes; };
  const ex = (id) => lista().find((e) => e.id === id);
  const alumno = (id) => WD.state.alumnos.find((a) => a.id === id);
  const aciertos = (e, resp) => e.clave.reduce((t, k, i) => t + (k && resp[i] === k ? 1 : 0), 0);
  const puntaje = (e, resp) => { const n = e.clave.filter(Boolean).length || e.n; return Math.round((aciertos(e, resp) / n) * 1000) / 10; };
  const claveLista = (e) => e.clave.slice(0, e.n).every(Boolean);

  // Pasa los resultados a Evaluación › Examen (el diagnóstico se registra con valor 0: se ve pero no cuenta)
  function aEvaluacion(e) {
    if (!e.campo || !WD.CAMPOS.includes(e.campo)) return;
    let a = WD.state.actividades.find((x) => x.examenId === e.id);
    const tri = e.tipo === 'diagnostico' ? 1 : Number(e.tipo.slice(1));
    if (!a) { a = { id: WD.uid(), examenId: e.id, rubro: 'examen', instrumento: 'nota', criterios: [], calif: {}, valor: e.tipo === 'diagnostico' ? 0 : null }; WD.state.actividades.push(a); }
    Object.assign(a, { trimestre: tri, campo: e.campo, nombre: `${e.tipo === 'diagnostico' ? 'Diagnóstico · ' : ''}${e.nombre}`, fecha: e.fecha });
    a.calif = {}; if (claveLista(e)) Object.entries(e.res).forEach(([al, r]) => { a.calif[al] = Math.round(puntaje(e, r.resp)) / 10; });
  }
  const guardar = (e) => { aEvaluacion(e); WD.save(); };

  /* ---------- crear examen ---------- */
  WD.act.exNuevo = () => {
    const m = WD.modal(`<div class="row"><h2 style="flex:1">Nuevo examen</h2><button class="x" data-act="cerrarModal" aria-label="Cerrar">×</button></div>
      <form class="stack" id="exn">
        <label class="field"><span>¿Cuántas preguntas tiene?</span><input class="in" name="n" type="number" min="1" max="${MAXQ}" required autofocus placeholder="Ej. 25" style="font-size:22px"></label>
        <label class="field"><span>Nombre</span><input class="in" name="nombre" required placeholder="Ej. Examen diagnóstico de Saberes"></label>
        <div class="grid g2"><label class="field"><span>Tipo</span><select class="in" name="tipo">${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}" ${k === `t${WD.trimestreDe(WD.iso(new Date()))}` ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="field"><span>Campo formativo</span><select class="in" name="campo">${WD.CAMPOS.map((c) => `<option>${c}</option>`).join('')}</select></label>
          <label class="field"><span>Fecha</span><input class="in" type="date" name="fecha" value="${WD.iso(new Date())}"></label>
          <label class="field"><span>Opciones por pregunta</span><select class="in" name="op"><option value="4">A, B, C, D</option><option value="5" selected>A, B, C, D, E</option></select></label></div>
        <p class="tiny muted" style="margin:0">Se califica en base 100: cada pregunta vale 100 entre el número de preguntas.</p>
        <button class="btn pri" style="justify-self:end">Crear y llenar la clave</button></form>`);
    m.querySelector('#exn').onsubmit = (ev) => {
      ev.preventDefault(); const f = ev.target; const n = Math.max(1, Math.min(MAXQ, Number(f.n.value) || 0));
      const e = { id: WD.uid(), nombre: f.nombre.value.trim(), tipo: f.tipo.value, campo: f.campo.value, fecha: f.fecha.value, n, op: Number(f.op.value), clave: Array(n).fill(null), res: {} };
      lista().push(e); WD.save(); WD.cerrarModal(); abierto = e.id; tabEx = 'clave'; WD.refrescar(); window.scrollTo(0, 0);
    };
  };
  let abierto = null, tabEx = 'resultados';
  WD.act.exAbrir = (el) => { abierto = el.dataset.id; tabEx = claveLista(ex(abierto)) ? 'resultados' : 'clave'; WD.refrescar(); window.scrollTo(0, 0); };
  WD.act.exVolver = () => { abierto = null; WD.refrescar(); };
  WD.act.exTab = (el) => { tabEx = el.dataset.t; WD.refrescar(); };
  WD.act.exClave = (el) => {
    const e = ex(abierto); const q = Number(el.dataset.q); const l = el.dataset.l; e.clave[q] = e.clave[q] === l ? null : l; guardar(e);
    const fila = el.closest('.exk-f'); fila.querySelectorAll('.exb').forEach((b) => b.classList.toggle('on', b.dataset.l === e.clave[q]));
    const listo = document.getElementById('exk-n'); if (listo) listo.textContent = `${e.clave.filter(Boolean).length} de ${e.n}`;
  };
  WD.act.exBorrar = async () => {
    const e = ex(abierto); if (!(await WD.confirmar('Eliminar examen', `Se borra «${esc(e.nombre)}», sus resultados y su calificación en Evaluación.`, 'Eliminar', true))) return;
    WD.state.examenes = lista().filter((x) => x.id !== e.id); WD.state.actividades = WD.state.actividades.filter((a) => a.examenId !== e.id);
    abierto = null; WD.save(); WD.refrescar();
  };
  WD.act.exPreguntas = async () => {
    const e = ex(abierto); const v = prompt('¿Cuántas preguntas tiene el examen?', e.n); const n = Math.max(1, Math.min(MAXQ, Number(v) || 0)); if (!n || n === e.n) return;
    if (Object.keys(e.res).length && !(await WD.confirmar('Cambiar número de preguntas', 'Ya hay hojas escaneadas. Las que tengan otro número de preguntas tendrás que volver a escanearlas.', 'Cambiar'))) return;
    e.clave = Array.from({ length: n }, (_, i) => e.clave[i] || null); Object.values(e.res).forEach((r) => { r.resp = Array.from({ length: n }, (_, i) => r.resp[i] ?? null); }); e.n = n; guardar(e); WD.refrescar();
  };

  /* ---------- hoja de respuestas para imprimir ---------- */
  const qrSVG = (txt, mm) => {
    const q = window.qrcode(0, 'M'); q.addData(txt); q.make(); const n = q.getModuleCount(); let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n} ${n}" style="position:absolute;left:${G.qrx}mm;top:${G.qry}mm;width:${mm}mm;height:${mm}mm" shape-rendering="crispEdges"><path d="${d}" fill="#000"/></svg>`;
  };
  function hojaHTML(e, a) {
    const L = layout(e.n, e.op); const E = WD.state.escuela; const mm = (v) => `${v}mm`;
    const marca = ([x, y]) => `<div style="position:absolute;left:${mm(x - G.mk / 2)};top:${mm(y - G.mk / 2)};width:${mm(G.mk)};height:${mm(G.mk)};background:#000"></div>`;
    const etq = (t, x, y, w) => `<div style="position:absolute;left:${mm(x)};top:${mm(y)};width:${mm(w)};height:8mm;background:#d9d9d9;border-right:1px solid #555;font:11pt Arial;display:flex;align-items:center;padding-left:2mm;box-sizing:border-box">${t}</div>`;
    let h = `<div class="exhoja" style="position:relative;width:${mm(G.w)};height:${mm(G.h)};page-break-after:always;break-after:page;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#000">`;
    h += `<div style="position:absolute;left:0;top:6mm;width:146mm;height:24mm;border:2px solid #000;border-radius:4mm;overflow:hidden">
      ${etq('Nombre', 0, 0, 22)}<div style="position:absolute;left:22mm;top:0;width:124mm;height:8mm;border-bottom:1px solid #555;font:bold 11.5pt Arial;display:flex;align-items:center;padding-left:2mm;box-sizing:border-box">${a ? esc(WD.nombreCompleto(a).toUpperCase()) : ''}</div>
      ${etq('Examen', 0, 8, 22)}<div style="position:absolute;left:22mm;top:8mm;width:124mm;height:8mm;border-bottom:1px solid #555;font:11pt Arial;display:flex;align-items:center;padding-left:2mm;box-sizing:border-box">${esc(e.nombre)}</div>
      ${etq('Fecha', 0, 16, 22)}<div style="position:absolute;left:22mm;top:16mm;width:50mm;height:8mm;font:10.5pt Arial;display:flex;align-items:center;padding-left:2mm;box-sizing:border-box">${esc(WD.fechaLarga(e.fecha))}</div>
      ${etq('Grupo', 72, 16, 22)}<div style="position:absolute;left:94mm;top:16mm;width:52mm;height:8mm;font:10.5pt Arial;display:flex;align-items:center;padding-left:2mm;box-sizing:border-box">${esc(`${String(E.grado || '').replace(/°+$/, '')}° ${E.grupo || ''}`)}</div></div>`;
    h += qrSVG(`WDX1|${e.id}|${a ? a.id : '-'}`, G.qr);
    h += `<div style="position:absolute;left:0;top:36mm;width:${mm(G.w)};text-align:center;font:9pt Arial;color:#333">Rellena completamente el círculo de tu respuesta con lápiz. No dobles ni maltrates la hoja.</div>`;
    h += G.marcas.map(marca).join('');
    const cols = L.cols;
    for (let b = 0; b < Math.ceil(e.n / 10); b++) {
      const c = b % cols, f = Math.floor(b / cols); const bx = L.x0 + c * (L.bw + G.gapX), by = G.y0 + f * (6 + 10 * G.row + G.gapY);
      h += LET.slice(0, e.op).map((l, o) => `<div style="position:absolute;left:${mm(bx + G.num + o * G.sep)};top:${mm(by)};width:${mm(G.sep)};text-align:center;font:12pt Arial">${l}</div>`).join('');
    }
    L.pos.forEach((fila, q) => {
      const [x, y] = fila[0];
      h += `<div style="position:absolute;left:${mm(x - G.sep / 2 - G.num)};top:${mm(y - 3)};width:${mm(G.num - 1)};text-align:right;font:bold 12pt Arial;line-height:6mm">${q + 1}</div>`;
      h += fila.map(([bx, by]) => `<div style="position:absolute;left:${mm(bx - G.bub / 2)};top:${mm(by - G.bub / 2)};width:${mm(G.bub)};height:${mm(G.bub)};border:0.3mm solid #666;border-radius:50%;box-sizing:border-box"></div>`).join('');
    });
    h += `<div style="position:absolute;left:0;bottom:0;width:${mm(G.w)};text-align:center;font:8pt Arial;color:#555">${esc(E.nombre || 'Web Docente')} · Hoja de respuestas</div></div>`;
    return h;
  }
  WD.act.exHojas = (el) => {
    const e = ex(abierto); const blanco = el.dataset.b === '1';
    let n = 0; if (blanco) { n = Math.max(1, Math.min(60, Number(prompt('¿Cuántas hojas en blanco?', '5')) || 0)); if (!n) return; }
    const hojas = blanco ? Array.from({ length: n }, () => hojaHTML(e, null)) : WD.alumnosActivos().map((a) => hojaHTML(e, a));
    if (!hojas.length) { WD.toast('Primero carga a tus alumnos en Mi grupo.'); return; }
    WD.imprimir(hojas.join(''));
  };
  WD.act.exVerHoja = () => { const e = ex(abierto); WD.vistaDocumento('Hoja de respuestas', `<div style="transform-origin:0 0">${hojaHTML(e, WD.alumnosActivos()[0] || null)}</div>`); };

  /* ---------- lectura de la hoja ---------- */
  function homografia(src, dst) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    for (let c = 0; c < 8; c++) { // eliminación gaussiana
      let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = 0; r < 8; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
    }
    const h = b.map((v, i) => v / A[i][i]); return [...h, 1];
  }
  const aplicar = (H, x, y) => { const w = H[6] * x + H[7] * y + 1; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };
  function gris(img) { const g = new Float32Array(img.width * img.height); const d = img.data; for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]; return g; }
  const px = (g, W, Hh, x, y) => { const xi = Math.max(0, Math.min(W - 2, x | 0)), yi = Math.max(0, Math.min(Hh - 2, y | 0)); const fx = x - xi, fy = y - yi, i = yi * W + xi; return g[i] * (1 - fx) * (1 - fy) + g[i + 1] * fx * (1 - fy) + g[i + W] * (1 - fx) * fy + g[i + W + 1] * fx * fy; };
  // Candidatos a marca: manchas negras cuadradas de tamaño parecido al esperado (umbral adaptativo, imagen reducida)
  function candidatos(g, W, Hh, ladoPx) {
    const f = Math.max(1, Math.floor(ladoPx / 9)); const w = Math.floor(W / f), h = Math.floor(Hh / f);
    const s = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) s[y * w + x] = g[(y * f) * W + x * f];
    const I = new Float64Array((w + 1) * (h + 1)); for (let y = 0; y < h; y++) { let fila = 0; for (let x = 0; x < w; x++) { fila += s[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + fila; } }
    const r = Math.max(4, Math.round((ladoPx / f) * 1.5)); const osc = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(w, x + r + 1), y1 = Math.min(h, y + r + 1);
      const m = (I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0));
      osc[y * w + x] = s[y * w + x] < m * 0.72 ? 1 : 0;
    }
    const area = (ladoPx / f) ** 2; const out = []; const vis = new Uint8Array(w * h);
    for (let k = 0; k < w * h; k++) {
      if (!osc[k] || vis[k]) continue;
      let n = 0, sx = 0, sy = 0, mnx = w, mxx = 0, mny = h, mxy = 0; const pila = [k]; vis[k] = 1;
      while (pila.length) {
        const q = pila.pop(); const x = q % w, y = (q / w) | 0; n++; sx += x; sy += y; if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y;
        if (x > 0 && osc[q - 1] && !vis[q - 1]) { vis[q - 1] = 1; pila.push(q - 1); } if (x < w - 1 && osc[q + 1] && !vis[q + 1]) { vis[q + 1] = 1; pila.push(q + 1); }
        if (y > 0 && osc[q - w] && !vis[q - w]) { vis[q - w] = 1; pila.push(q - w); } if (y < h - 1 && osc[q + w] && !vis[q + w]) { vis[q + w] = 1; pila.push(q + w); }
      }
      const bw = mxx - mnx + 1, bh = mxy - mny + 1;
      if (n < area * 0.6 || n > area * 2.4 || n / (bw * bh) < 0.62 || bw / bh < 0.55 || bw / bh > 1.8) continue;
      out.push({ x: (sx / n) * f + f / 2, y: (sy / n) * f + f / 2 });
    }
    return out;
  }
  // Lee una hoja en un canvas: devuelve {examenId, alumnoId, resp[], H, ...} o null
  function leerHoja(ctx, W, Hh) {
    const img = ctx.getImageData(0, 0, W, Hh); const qr = window.jsQR(img.data, W, Hh, { inversionAttempts: 'attemptBoth' });
    if (!qr || !/^WDX1\|/.test(qr.data)) return null;
    const [, examenId, al] = qr.data.split('|'); const e = ex(examenId); if (!e) return { examenId, ajeno: true };
    const L = qr.location; const s = G.qr;
    const H0 = homografia([[G.qrx, G.qry], [G.qrx + s, G.qry], [G.qrx, G.qry + s], [G.qrx + s, G.qry + s]], [[L.topLeftCorner.x, L.topLeftCorner.y], [L.topRightCorner.x, L.topRightCorner.y], [L.bottomLeftCorner.x, L.bottomLeftCorner.y], [L.bottomRightCorner.x, L.bottomRightCorner.y]]);
    const g = gris(img); const escala = Math.hypot(L.topRightCorner.x - L.topLeftCorner.x, L.topRightCorner.y - L.topLeftCorner.y) / s; // px por mm
    const cand = candidatos(g, W, Hh, G.mk * escala); const usados = new Set();
    const ms = G.marcas.map(([x, y]) => { const [u, v] = aplicar(H0, x, y); let mejor = null, d = Infinity; cand.forEach((c, i) => { const dd = Math.hypot(c.x - u, c.y - v); if (dd < d && !usados.has(i)) { d = dd; mejor = i; } }); if (mejor === null || d > escala * 45) return null; usados.add(mejor); return cand[mejor]; });
    if (ms.some((m) => !m)) return { examenId, alumnoId: al, parcial: true };
    const H = homografia(G.marcas, ms.map((m) => [m.x, m.y]));
    const negro = ms.reduce((t, m) => t + px(g, W, Hh, m.x, m.y), 0) / 4;
    const L2 = layout(e.n, e.op); const rIn = G.bub * 0.3; const pts = [[0, 0]]; for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; pts.push([Math.cos(a) * rIn, Math.sin(a) * rIn], [Math.cos(a) * rIn * 0.5, Math.sin(a) * rIn * 0.5]); }
    const medias = L2.pos.map((fila) => fila.map(([x, y]) => pts.reduce((t, [dx, dy]) => { const [u, v] = aplicar(H, x + dx, y + dy); return t + px(g, W, Hh, u, v); }, 0) / pts.length));
    const todas = medias.flat().slice().sort((a, b) => a - b); const blanco = todas[Math.floor(todas.length * 0.85)];
    const thr = blanco - 0.42 * (blanco - negro);
    const resp = medias.map((fila) => { const llenas = fila.map((m, o) => (m < thr ? o : -1)).filter((o) => o >= 0); return llenas.length === 1 ? LET[llenas[0]] : llenas.length > 1 ? '*' : null; });
    return { examenId, alumnoId: al === '-' ? null : al, resp, H, e };
  }

  /* ---------- escáner ---------- */
  const cargarLector = () => (window.jsQR ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = `js/lib/jsQR.js?v=${WD.VERSION}`; s.onload = res; s.onerror = () => rej(new Error('No pude cargar el lector.')); document.head.appendChild(s); }));
  let cam = null, modoClave = false;
  function detener() { if (!cam) return; cam.activo = false; clearTimeout(cam.t); cam.stream?.getTracks().forEach((t) => t.stop()); cam = null; }
  window.addEventListener('hashchange', detener);
  WD.act.exEscanear = async (el) => {
    const e = ex(abierto); modoClave = el.dataset.clave === '1';
    if (!modoClave && !claveLista(e)) { WD.toast('Primero llena la clave de respuestas.'); tabEx = 'clave'; WD.refrescar(); return; }
    const o = document.createElement('div'); o.id = 'expo'; o.className = 'exs';
    o.innerHTML = `<div class="exs-v"><video id="exs-v" playsinline muted></video><canvas id="exs-c"></canvas><div class="exs-guia"><i></i><i></i><i></i><i></i></div></div>
      <div class="ex-bar"><div id="exs-msg" style="flex:1">${modoClave ? 'Escanea una hoja llena con las respuestas correctas.' : 'Pon la hoja de frente, que se vean las 4 marcas negras y el código.'}</div>
      <span class="pill" id="exs-cuenta">${Object.keys(e.res).length} de ${WD.alumnosActivos().length}</span><label class="btn sm cam">${WD.icon('camara')} Foto<input type="file" accept="image/*" capture="environment" id="exs-f"></label><button class="btn sm" data-act="exsCerrar">Terminar</button></div>`;
    document.body.appendChild(o); document.body.classList.add('expo-on');
    o.querySelector('#exs-f').onchange = (ev) => { const f = ev.target.files[0]; if (f) leerFoto(f); };
    try {
      await cargarLector();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      const v = o.querySelector('#exs-v'); v.srcObject = stream; await v.play().catch(() => {});
      cam = { stream, activo: true, ultimo: '', iguales: 0, pausa: 0 }; ciclo(v);
    } catch (er) { msg(er.name === 'NotAllowedError' ? 'Da permiso de usar la cámara, o toca «Foto».' : 'No pude abrir la cámara. Usa «Foto».'); await cargarLector().catch(() => {}); }
  };
  WD.act.exsCerrar = () => { detener(); document.getElementById('expo')?.remove(); document.body.classList.remove('expo-on'); WD.refrescar(); };
  const msg = (t, cls = '') => { const m = document.getElementById('exs-msg'); if (m) { m.innerHTML = t; m.className = cls; } };
  const lienzo = (fuente, w, h) => { const k = Math.min(1, 1600 / Math.max(w, h)); const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(fuente, 0, 0, c.width, c.height); return { c, x }; };
  function ciclo(v) {
    if (!cam || !cam.activo) return;
    if (Date.now() > cam.pausa && v.videoWidth) {
      const { c, x } = lienzo(v, v.videoWidth, v.videoHeight); const r = leerHoja(x, c.width, c.height);
      if (!r) { cam.iguales = 0; msg(modoClave ? 'Buscando la hoja de la clave…' : 'Buscando la hoja…'); }
      else if (r.ajeno) msg('Esta hoja es de otro examen.', 'mal');
      else if (r.parcial) msg('Acércate un poco: no veo las 4 marcas negras.');
      else {
        const firma = `${r.alumnoId}|${r.resp.join(',')}`;
        cam.iguales = firma === cam.ultimo ? cam.iguales + 1 : 0; cam.ultimo = firma;
        if (cam.iguales >= 1) { cam.pausa = Date.now() + 2600; cam.iguales = 0; cam.ultimo = ''; listo(r, c); }
        else msg('Leyendo… no muevas la hoja.');
      }
    }
    cam.t = setTimeout(() => ciclo(v), 220);
  }
  async function leerFoto(f) {
    try {
      await cargarLector(); const url = URL.createObjectURL(f); const im = new Image(); im.src = url; await im.decode();
      const { c, x } = lienzo(im, im.naturalWidth, im.naturalHeight); URL.revokeObjectURL(url); const r = leerHoja(x, c.width, c.height);
      if (!r) msg('No encontré el código de la hoja en la foto. Toma la foto de frente y con buena luz.', 'mal');
      else if (r.ajeno) msg('Esta hoja es de otro examen.', 'mal');
      else if (r.parcial) msg('En la foto no se ven las 4 marcas negras.', 'mal');
      else { if (cam) cam.pausa = Date.now() + 2600; listo(r, c); }
    } catch (er) { msg(er.message, 'mal'); }
  }
  function dibujar(c, r, e) {
    const x = c.getContext('2d'); const L = layout(e.n, e.op); const k = Math.hypot(...[0, 1].map((i) => aplicar(r.H, 10, 0)[i] - aplicar(r.H, 0, 0)[i])) / 10;
    L.pos.forEach((fila, q) => fila.forEach(([bx, by], o) => {
      const [u, v] = aplicar(r.H, bx, by); const l = LET[o]; const clave = e.clave[q] === l; const marco = r.resp[q] === l || (r.resp[q] === '*' && false);
      if (clave) { x.strokeStyle = '#2e8b57'; x.lineWidth = Math.max(2, k * 0.6); x.beginPath(); x.arc(u, v, k * 3.1, 0, 7); x.stroke(); }
      if (marco && !clave) { x.strokeStyle = '#d33'; x.lineWidth = Math.max(2, k * 0.6); x.beginPath(); x.moveTo(u - k * 2.6, v - k * 2.6); x.lineTo(u + k * 2.6, v + k * 2.6); x.moveTo(u + k * 2.6, v - k * 2.6); x.lineTo(u - k * 2.6, v + k * 2.6); x.stroke(); }
    }));
  }
  async function listo(r, c) {
    const e = r.e; if (WD.herrSonar) WD.herrSonar(1);
    if (modoClave) { e.clave = r.resp.map((x) => (x === '*' ? null : x)); guardar(e); msg(`Clave leída: ${e.clave.filter(Boolean).length} de ${e.n} respuestas. Revísala y corrige si hace falta.`, 'bien'); setTimeout(() => { WD.act.exsCerrar(); tabEx = 'clave'; WD.refrescar(); }, 1800); return; }
    let al = r.alumnoId;
    if (!al) { al = await elegirAlumno(e); if (!al) { msg('Hoja sin nombre: no se guardó.'); return; } }
    if (!alumno(al)) { msg('Esta hoja es de un alumno que ya no está en el grupo.', 'mal'); return; }
    const antes = e.res[al]; e.res[al] = { resp: r.resp, fecha: new Date().toISOString(), editado: false }; guardar(e);
    dibujar(c, r, e);
    try { const k = Math.min(1, 900 / c.width); const t = document.createElement('canvas'); t.width = c.width * k; t.height = c.height * k; t.getContext('2d').drawImage(c, 0, 0, t.width, t.height); await WD.kv.set(`exh:${e.id}:${al}`, t.toDataURL('image/jpeg', 0.7)); } catch (_) {}
    const p = puntaje(e, r.resp); const a = alumno(al);
    const cv = document.getElementById('exs-c'); if (cv) { cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); cv.classList.add('on'); setTimeout(() => cv.classList.remove('on'), 2400); }
    msg(`<b>${esc(WD.nombreCompleto(a))}</b> · ${aciertos(e, r.resp)} de ${e.n} · <b>${p}</b>${antes ? ' <span class="tiny">(reemplazó la anterior)</span>' : ''}`, 'bien');
    const ct = document.getElementById('exs-cuenta'); if (ct) ct.textContent = `${Object.keys(e.res).length} de ${WD.alumnosActivos().length}`;
  }
  function elegirAlumno(e) {
    return new Promise((res) => {
      if (cam) cam.pausa = Date.now() + 864e5;
      const sin = WD.alumnosActivos().filter((a) => !e.res[a.id]);
      const m = WD.modal(`<h2>¿De quién es esta hoja?</h2><div class="dg-its">${(sin.length ? sin : WD.alumnosActivos()).map((a) => `<button class="dg-it" data-id="${a.id}">${esc(WD.nombreLista(a))}</button>`).join('')}</div><div class="row" style="justify-content:flex-end"><button class="btn" id="ea-no">Cancelar</button></div>`);
      m.style.zIndex = 90; const fin = (v) => { WD.cerrarModal(); if (cam) cam.pausa = Date.now() + 1200; res(v); };
      m.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => fin(b.dataset.id))); m.querySelector('#ea-no').onclick = () => fin(null);
    });
  }

  /* ---------- revisar una hoja ---------- */
  WD.act.exRevisar = async (el) => {
    const e = ex(abierto); const al = el.dataset.al; const a = alumno(al); const r = e.res[al] || (e.res[al] = { resp: Array(e.n).fill(null), fecha: new Date().toISOString(), manual: true });
    const img = await WD.kv.get(`exh:${e.id}:${al}`);
    const pintar = () => `<div class="row"><span class="pill ${puntaje(e, r.resp) >= 60 ? 'ok' : 'bad'}" style="font-size:16px">${puntaje(e, r.resp)} / 100</span><span class="small muted">${aciertos(e, r.resp)} de ${e.n} correctas · nota ${Math.round(puntaje(e, r.resp)) / 10}</span></div>
      <p class="tiny muted" style="margin:0">Toca una letra para corregir lo que leyó la cámara. Verde es la respuesta correcta.</p>
      <div class="exk">${Array.from({ length: e.n }, (_, q) => `<div class="exk-f"><b>${q + 1}</b>${LET.slice(0, e.op).map((l) => `<button class="exb ${r.resp[q] === l ? (e.clave[q] === l ? 'ok' : 'mal') : e.clave[q] === l ? 'clave' : ''}" data-q="${q}" data-l="${l}">${l}</button>`).join('')}${r.resp[q] === '*' ? '<span class="tiny" style="color:var(--bad)">doble</span>' : ''}</div>`).join('')}</div>
      ${img ? `<details><summary class="small" style="cursor:pointer">Ver la hoja escaneada</summary><img src="${img}" alt="Hoja escaneada" style="width:100%;border-radius:8px;margin-top:8px"></details>` : ''}
      <div class="row"><span style="flex:1"></span><button class="btn ghost danger sm" id="exr-del">Quitar resultado</button></div>`;
    WD.abrirDrawer(WD.nombreCompleto(a), `<div id="exr">${pintar()}</div>`, (box) => {
      const enlazar = () => {
        box.querySelectorAll('.exb').forEach((b) => (b.onclick = () => { const q = Number(b.dataset.q); r.resp[q] = r.resp[q] === b.dataset.l ? null : b.dataset.l; r.editado = true; guardar(e); box.querySelector('#exr').innerHTML = pintar(); enlazar(); }));
        box.querySelector('#exr-del').onclick = async () => { if (!(await WD.confirmar('Quitar resultado', 'Se borra la hoja de este alumno.', 'Quitar', true))) return; delete e.res[al]; WD.kv.del(`exh:${e.id}:${al}`); guardar(e); WD.cerrarDrawer(); WD.refrescar(); };
      };
      enlazar();
    }, esc(e.nombre));
  };
  WD.act.exExcel = async () => {
    const e = ex(abierto); const als = WD.alumnosActivos();
    const rows = [['Nº', 'Alumno', ...Array.from({ length: e.n }, (_, i) => `P${i + 1}`), 'Aciertos', 'Puntaje /100', 'Nota']];
    rows.push(['', 'CLAVE', ...e.clave.slice(0, e.n).map((x) => x || ''), '', '', '']);
    als.forEach((a) => { const r = e.res[a.id]; rows.push([a.num || '', WD.nombreLista(a), ...(r ? r.resp.map((x) => x || '') : Array(e.n).fill('')), r ? aciertos(e, r.resp) : '', r ? puntaje(e, r.resp) : '', r ? Math.round(puntaje(e, r.resp)) / 10 : '']); });
    WD.download(await WD.xlsxBlob([{ name: 'Resultados', rows, headerRows: 2, widths: [5, 32, ...Array(e.n).fill(5), 9, 11, 7] }]), `${e.nombre.replace(/[^\wáéíóúñ]+/gi, '_')}.xlsx`);
  };

  /* ---------- vista ---------- */
  WD.views.examenes = {
    titulo: 'Exámenes',
    render() {
      const als = WD.alumnosActivos(); const e = abierto && ex(abierto);
      if (!e) {
        const es = lista().slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        return `<div class="row"><div style="flex:1;min-width:0"><h1>Exámenes</h1><p class="muted">Imprime la hoja de respuestas, escanéala con la cámara y la calificación pasa sola a Evaluación › Examen.</p></div><button class="btn pri" data-act="exNuevo">${WD.icon('mas')} Nuevo examen</button></div>
          ${es.length ? `<div class="stack">${es.map((x) => { const n = Object.keys(x.res).length; const prom = n && claveLista(x) ? Math.round(Object.values(x.res).reduce((t, r) => t + puntaje(x, r.resp), 0) / n * 10) / 10 : null;
            return `<button class="card row dg-ap" data-act="exAbrir" data-id="${x.id}"><span class="pill">${TIPOS[x.tipo]}</span><span style="flex:1;text-align:left"><b>${esc(x.nombre)}</b><span class="small muted"> · ${esc(WD.CAMPO_CORTO[x.campo] || x.campo)} · ${x.n} preguntas · ${esc(WD.fechaLarga(x.fecha))}</span></span>${claveLista(x) ? '' : '<span class="pill warn">Falta la clave</span>'}<span class="pill">${n} de ${als.length}</span>${prom !== null ? `<b>${prom}</b>` : ''}</button>`; }).join('')}</div>`
            : '<div class="empty"><h3>Aún no hay exámenes</h3><p class="small">Crea uno: te pregunto cuántas preguntas tiene, llenas la clave, imprimes las hojas y las escaneas.</p></div>'}`;
      }
      const tabs = [['clave', `Clave (${e.clave.filter(Boolean).length}/${e.n})`], ['resultados', `Resultados (${Object.keys(e.res).length})`], ['analisis', 'Análisis']];
      let cuerpo;
      if (tabEx === 'clave') {
        cuerpo = `<div class="row"><span class="small muted" style="flex:1">Toca la respuesta correcta de cada pregunta · <b id="exk-n">${e.clave.filter(Boolean).length} de ${e.n}</b></span><button class="btn sm" data-act="exEscanear" data-clave="1">${WD.icon('camara')} Escanear clave</button><button class="btn sm" data-act="exPreguntas">Cambiar número de preguntas</button></div>
          <div class="exk">${Array.from({ length: e.n }, (_, q) => `<div class="exk-f"><b>${q + 1}</b>${LET.slice(0, e.op).map((l) => `<button class="exb ${e.clave[q] === l ? 'on' : ''}" data-act="exClave" data-q="${q}" data-l="${l}">${l}</button>`).join('')}<span class="tiny muted">${Math.round(1000 / e.n) / 10} pts</span></div>`).join('')}</div>`;
      } else if (tabEx === 'resultados') {
        const hechos = als.filter((a) => e.res[a.id]); const ps = hechos.map((a) => puntaje(e, e.res[a.id].resp));
        const est = ps.length ? { min: Math.min(...ps), max: Math.max(...ps), prom: Math.round(ps.reduce((t, x) => t + x, 0) / ps.length * 10) / 10 } : null;
        cuerpo = `${est ? `<div class="grid g3"><div class="card"><div class="label">Promedio</div><div style="font-size:28px;font-weight:700">${est.prom}</div></div><div class="card"><div class="label">Más alta</div><div style="font-size:28px;font-weight:700">${est.max}</div></div><div class="card"><div class="label">Más baja</div><div style="font-size:28px;font-weight:700">${est.min}</div></div></div>` : ''}
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">Nº</th><th>Alumno</th><th class="c">Aciertos</th><th class="r">Puntaje</th><th class="r">Nota</th></tr></thead><tbody>${als.map((a) => { const r = e.res[a.id]; const p = r && puntaje(e, r.resp);
            return `<tr><td class="c">${esc(a.num || '')}</td><td><button class="link" data-act="exRevisar" data-al="${a.id}">${esc(WD.nombreLista(a))}</button>${r?.editado ? ' <span class="tiny muted">corregida</span>' : ''}</td>${r ? `<td class="c">${aciertos(e, r.resp)}/${e.n}</td><td class="r"><b>${p}</b>/100</td><td class="r">${Math.round(p) / 10}</td>` : '<td colspan="3" class="small faint">Sin escanear</td>'}</tr>`; }).join('')}</tbody></table></div>
          <p class="tiny muted">${e.campo && WD.CAMPOS.includes(e.campo) ? `Las notas se ven en Evaluación › ${e.tipo === 'diagnostico' ? 'Trimestre 1' : TIPOS[e.tipo]} › ${esc(WD.CAMPO_CORTO[e.campo])} › Examen${e.tipo === 'diagnostico' ? ' (el diagnóstico aparece con valor 0: se ve pero no cuenta; dale valor si quieres que cuente)' : ''}.` : ''} Toca un nombre para revisar o corregir su hoja.</p>`;
      } else {
        const rs = Object.values(e.res); const n = rs.length || 1;
        cuerpo = rs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">Pregunta</th><th class="c">Correcta</th><th>% de aciertos</th>${LET.slice(0, e.op).map((l) => `<th class="c">${l}</th>`).join('')}<th class="c">Sin resp.</th></tr></thead><tbody>${Array.from({ length: e.n }, (_, q) => { const ok = rs.filter((r) => r.resp[q] === e.clave[q]).length; const pct = Math.round((ok / n) * 100);
            return `<tr><td class="c"><b>${q + 1}</b></td><td class="c">${e.clave[q] || '—'}</td><td><div class="dg-bar" style="grid-template-columns:1fr 44px"><div><i class="${pct >= 70 ? 'ok' : pct >= 40 ? 'warn' : 'bad'}" style="width:${pct}%"></i></div><b class="small">${pct}%</b></div></td>${LET.slice(0, e.op).map((l) => `<td class="c small ${e.clave[q] === l ? '' : 'muted'}">${rs.filter((r) => r.resp[q] === l).length}</td>`).join('')}<td class="c small muted">${rs.filter((r) => !r.resp[q] || r.resp[q] === '*').length}</td></tr>`; }).join('')}</tbody></table></div><p class="tiny muted">Las preguntas en rojo son las que más se fallaron: buenas para repasar.</p>` : '<p class="small muted">Escanea hojas para ver el análisis por pregunta.</p>';
      }
      return `<div class="row"><button class="btn ghost" data-act="exVolver">${WD.icon('izq')} Exámenes</button><span style="flex:1"></span>
          <button class="btn sm" data-act="exVerHoja">Ver hoja</button><button class="btn sm" data-act="exHojas">${WD.icon('imprimir')} Hojas con nombre</button><button class="btn sm" data-act="exHojas" data-b="1">${WD.icon('imprimir')} Hojas en blanco</button><button class="btn sm" data-act="exExcel">${WD.icon('descargar')} Excel</button><button class="btn pri" data-act="exEscanear">${WD.icon('camara')} Escanear hojas</button></div>
        <div><h1 style="margin:0">${esc(e.nombre)}</h1><p class="muted" style="margin:4px 0 0">${TIPOS[e.tipo]} · ${esc(e.campo)} · ${e.n} preguntas · ${esc(WD.fechaLarga(e.fecha))}</p></div>
        <div class="tabs">${tabs.map(([t, n]) => `<button class="${tabEx === t ? 'on' : ''}" data-act="exTab" data-t="${t}">${n}</button>`).join('')}</div>
        ${cuerpo}
        <div class="row"><span style="flex:1"></span><button class="btn ghost danger sm" data-act="exBorrar">Eliminar examen</button></div>`;
    },
  };
  WD.exLeerHoja = leerHoja; WD.exHojaHTML = hojaHTML; // para pruebas
})(window.WD);
