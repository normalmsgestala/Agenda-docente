/* Web Docente · Lee en el dispositivo (sin IA) las tablas del IDAI y el ICE de la agenda en PDF
   y devuelve el nivel de cada alumno: inicial, intermedia y final. Usa pdf.js (Apache-2.0). */
(function (WD) {
  'use strict';
  let pdfjs = null;
  const base = () => new URL('js/lib/pdfjs/', location.href).href;
  async function cargar() {
    if (pdfjs) return pdfjs;
    try { pdfjs = await import(`${base()}pdf.min.js?v=${WD.VERSION}`); } catch (e) { throw new Error('Este navegador no pudo cargar el lector de PDF (' + (e.message || e) + ').'); }
    pdfjs.GlobalWorkerOptions.workerSrc = `${base()}pdf.worker.min.js?v=${WD.VERSION}`;
    return pdfjs;
  }
  // Si el navegador no deja usar el «worker», se lee en la página misma (más lento pero funciona)
  async function sinWorker() { if (!globalThis.pdfjsWorker) globalThis.pdfjsWorker = await import(`${base()}pdf.worker.min.js?v=${WD.VERSION}`); }
  async function abrir(lib, datos) {
    const op = { disableFontFace: true, isEvalSupported: false, verbosity: 0 };
    try { const t = lib.getDocument({ data: datos.slice(0), ...op }); const d = await Promise.race([t.promise, new Promise((_, r) => setTimeout(() => r(new Error('tiempo')), 25000))]); return [t, d]; }
    catch (e) { console.warn('pdf.js con worker falló, sin worker', e); await sinWorker(); const t = lib.getDocument({ data: datos.slice(0), ...op }); return [t, await t.promise]; }
  }
  // Renglones de una página: agrupa el texto por altura y lo ordena de izquierda a derecha
  async function renglones(page) {
    const tc = await page.getTextContent(); const filas = [];
    tc.items.forEach((it) => { const s = (it.str || '').trim(); if (!s) return; const x = it.transform[4], y = it.transform[5];
      let f = filas.find((r) => Math.abs(r.y - y) < 3); if (!f) filas.push((f = { y, items: [] })); f.items.push({ x, s }); });
    return filas.sort((a, b) => b.y - a.y).map((f) => f.items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim());
  }
  const IDAI_T = /^(PS|SA|S|A)$/i, ICE_T = /^([1-4]|—|-)$/;
  function filasTabla(lineas, tipo) {
    const re = tipo === 'idai' ? IDAI_T : ICE_T; const out = [];
    lineas.forEach((l) => {
      const m = l.match(/^(\d{1,2})\s+(.+)$/); if (!m) return;
      const w = m[2].split(' '); const niv = [];
      while (w.length > 1 && re.test(w[w.length - 1])) niv.unshift(w.pop());
      if (!niv.length || niv.length > 3) return;
      out.push({ num: Number(m[1]), nombre: w.join(' '), niveles: niv.map((x) => (x === '—' || x === '-' ? '' : x.toUpperCase())) });
    });
    return out;
  }
  WD.leerDiagnosticoAgenda = async (file, avance = () => {}) => {
    const lib = await cargar();
    const [tarea, doc] = await abrir(lib, new Uint8Array(await file.arrayBuffer()));
    const n = doc.numPages; const res = {};
    // Orden de búsqueda: las tablas suelen estar en la sección de evaluación (segunda mitad del libro)
    const orden = []; for (let p = Math.floor(n * 0.55); p <= n; p++) orden.push(p); for (let p = 1; p < Math.floor(n * 0.55); p++) orden.push(p);
    for (let k = 0; k < orden.length; k++) {
      if (res.idai && res.ice) break;
      const page = await doc.getPage(orden[k]); const ls = await renglones(page); page.cleanup(); const plano = WD.norm(ls.slice(0, 14).join(' '));
      if (k % 10 === 0) avance(k, orden.length);
      const tipo = !res.idai && /idai/.test(plano) && /alfabetizacion inicial/.test(plano) ? 'idai' : !res.ice && /\bice\b/.test(plano) && /convencionalidades/.test(plano) ? 'ice' : null;
      if (!tipo) continue;
      const filas = filasTabla(ls, tipo); if (filas.length >= 5) res[tipo] = filas;
    }
    try { await tarea.destroy(); } catch (_) {}
    if (!res.idai && !res.ice) return null;
    const porNum = {}; ['idai', 'ice'].forEach((t) => (res[t] || []).forEach((f) => { const r = (porNum[f.num] = porNum[f.num] || { num: f.num, nombre: f.nombre, idai: [], ice: [] }); r[t] = f.niveles; }));
    return Object.values(porNum);
  };
})(window.WD);
