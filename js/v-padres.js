/* Web Docente · Actividades para padres: de las actividades de la planeación que se están evaluando,
   qué entregó y qué le falta a cada alumno. Se descarga en PDF (uno por alumno o todo el grupo) o se envía por correo. */
(function (WD) {
  'use strict';
  const { esc } = WD;
  let sel = null, soloFaltan = false, alVer = null;
  const aj = () => WD.state.ajustes;
  const planes = () => WD.state.planeaciones.filter((p) => p.sesiones && p.sesiones.length).slice().sort((a, b) => (b.sesiones[0]?.fecha || '').localeCompare(a.sesiones[0]?.fecha || ''));

  // Periodo elegido: una planeación (sus sesiones) o un trimestre completo
  function periodo() {
    const ps = planes(); const hoy = WD.iso(new Date());
    if (!sel) { const actual = ps.find((p) => p.sesiones.some((s) => s.fecha <= hoy)); sel = actual ? `p:${actual.id}` : `t:${WD.triActual()}`; }
    if (sel.startsWith('p:')) { const p = ps.find((x) => x.id === sel.slice(2)); if (p) { const ids = new Set(p.sesiones.map((s) => s.id)); return { nombre: p.nombre, sub: p.periodo || '', filtro: (a) => ids.has(a.sesionId) }; } sel = `t:${WD.triActual()}`; }
    const n = Number(sel.slice(2)); return { nombre: `Trimestre ${n}`, sub: '', filtro: (a) => a.trimestre === n };
  }
  // Actividades evaluadas del periodo que ya debieron entregarse (hasta hoy)
  function actividades() {
    const per = periodo(); const hoy = WD.iso(new Date());
    return WD.state.actividades.filter((a) => per.filtro(a) && (a.fecha || '') <= hoy).sort((x, y) => (x.fecha || '').localeCompare(y.fecha || '') || WD.CAMPOS.indexOf(x.campo) - WD.CAMPOS.indexOf(y.campo));
  }
  // ok = entregada · falta = NE · revisar = aún sin calificar
  WD.estadoEntrega = (act, alId) => { const r = (act.calif || {})[alId]; if (r === 0) return 'falta'; const v = WD.califActividad(act, alId); if (v === null) return aj().padresSinCalif ? 'falta' : 'revisar'; return 'ok'; };
  const ETQ = { ok: 'Entregada', falta: 'Falta', revisar: 'Por revisar' }; const CLS = { ok: 'ok', falta: 'bad', revisar: '' };
  // Para las familias: sin la instrucción al docente («Confirme que…»)
  const paraFamilia = (t) => { const x = String(t || '').replace(/^\s*(confirme|corrobore|verifique|revise|compruebe|observe|constate|asegúrese de)\s+(que|de que)\s+/i, '').trim(); return x ? x[0].toUpperCase() + x.slice(1) : x; };
  const queEvalua = (act) => { const s = WD.sesionDeActividad && WD.sesionDeActividad(act); return ((act.criterios || []).map(paraFamilia).join('; ')) || paraFamilia(s && s.evidencias) || ''; };
  const fechaCorta = (f) => WD.parseISO(f).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  const resumen = (acts, alId) => { const st = acts.map((a) => WD.estadoEntrega(a, alId)); return { ok: st.filter((x) => x === 'ok').length, falta: st.filter((x) => x === 'falta').length, revisar: st.filter((x) => x === 'revisar').length }; };

  WD.act.paSel = (el) => { sel = el.value; alVer = null; WD.refrescar(); };
  WD.act.paSolo = () => { soloFaltan = !soloFaltan; WD.refrescar(); };
  WD.act.paSinCalif = () => { aj().padresSinCalif = !aj().padresSinCalif; WD.save(); WD.refrescar(); };
  WD.act.paVer = (el) => { alVer = alVer === el.dataset.id ? null : el.dataset.id; WD.refrescar(); };

  /* ---------- PDF de verdad (pdf-lib), para descargar o compartir ---------- */
  const cargarPdfLib = () => (window.PDFLib ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = `js/lib/pdf-lib.min.js?v=${WD.VERSION}`; s.onload = res; s.onerror = () => rej(new Error('No pude preparar el PDF.')); document.head.appendChild(s); }));
  const limpio = (t) => String(t ?? '').replace(/[✓✔]/g, '').replace(/[^\x0A\x20-\x7E\xA0-\xFF–—‘’“”•…]/g, '').replace(/\s+/g, ' ').trim();
  async function pdfAlumnos(ids) {
    await cargarPdfLib(); const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const doc = await PDFDocument.create(); const F = await doc.embedFont(StandardFonts.Helvetica); const B = await doc.embedFont(StandardFonts.HelveticaBold);
    const W = 612, H = 792, M = 40; const e = WD.state.escuela; const per = periodo(); const acts = actividades();
    const gris = rgb(0.42, 0.42, 0.42), negro = rgb(0.1, 0.1, 0.1), rojo = rgb(0.72, 0.1, 0.1), verde = rgb(0.1, 0.45, 0.2), linea = rgb(0.8, 0.8, 0.8);
    const partir = (t, f, size, ancho) => { const out = []; let l = ''; limpio(t).split(' ').forEach((w) => { const p = l ? `${l} ${w}` : w; if (f.widthOfTextAtSize(p, size) <= ancho) l = p; else { if (l) out.push(l); l = w; while (f.widthOfTextAtSize(l, size) > ancho && l.length > 1) { let k = l.length - 1; while (k > 1 && f.widthOfTextAtSize(l.slice(0, k), size) > ancho) k--; out.push(l.slice(0, k)); l = l.slice(k); } } }); if (l) out.push(l); return out.length ? out : ['']; };
    const COL = [{ t: 'Fecha', w: 52 }, { t: 'Campo', w: 62 }, { t: 'Actividad', w: 168 }, { t: 'Qué se evalúa', w: 192 }, { t: 'Estado', w: 58 }];
    for (const id of ids) {
      const a = WD.alumno(id); if (!a) continue; const r = resumen(acts, id);
      const lista = acts.filter((x) => !soloFaltan || WD.estadoEntrega(x, id) !== 'ok');
      let pg = doc.addPage([W, H]); let y = H - M;
      const txt = (t, x, yy, { f = F, s = 9, c = negro } = {}) => pg.drawText(limpio(t), { x, y: yy, size: s, font: f, color: c });
      const centro = (t, yy, f, s, c = negro) => { const l = limpio(t); pg.drawText(l, { x: (W - f.widthOfTextAtSize(l, s)) / 2, y: yy, size: s, font: f, color: c }); };
      const encabezado = (cont) => {
        centro(`ESCUELA PRIMARIA “${(e.nombre || '').toUpperCase()}”`, y, B, 10); y -= 13;
        centro([e.cct && `C.C.T. ${e.cct}`, `Ciclo escolar ${e.ciclo || ''}`, `${e.grado || ''} ${e.grupo || ''}`.trim()].filter(Boolean).join(' · '), y, F, 8.5, gris); y -= 20;
        if (cont) { txt(`${WD.nombreCompleto(a)} · continuación`, M, y, { f: B, s: 9 }); y -= 16; }
      };
      const cabTabla = () => { let x = M; pg.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 15, color: rgb(0.93, 0.93, 0.93) }); COL.forEach((c) => { txt(c.t, x + 3, y, { f: B, s: 8 }); x += c.w; }); y -= 16; };
      encabezado(false);
      centro('ACTIVIDADES EVALUADAS', y, B, 13); y -= 15;
      centro([per.nombre, per.sub].filter(Boolean).join(' · '), y, F, 9.5, gris); y -= 24;
      txt('Alumno(a):', M, y, { f: B, s: 10 }); txt(WD.nombreCompleto(a), M + 62, y, { s: 10 }); txt(`N° de lista: ${a.num || ''}`, W - M - 80, y, { s: 10 }); y -= 15;
      txt(`Docente: ${WD.state.docente.nombre || ''}`, M, y, { s: 9, c: gris }); y -= 20;
      // Resumen
      const caja = [[`${r.ok} de ${acts.length}`, 'entregadas', verde], [String(r.falta), r.falta === 1 ? 'le falta' : 'le faltan', r.falta ? rojo : gris], [String(r.revisar), 'por revisar', gris]];
      const cw = (W - 2 * M - 20) / 3; caja.forEach(([n, t, c], i) => { const x = M + i * (cw + 10); pg.drawRectangle({ x, y: y - 26, width: cw, height: 36, borderColor: linea, borderWidth: 1 }); txt(n, x + 10, y - 10, { f: B, s: 15, c }); txt(t, x + 10 + B.widthOfTextAtSize(limpio(n), 15) + 6, y - 9, { s: 9.5, c: gris }); });
      y -= 48;
      if (!lista.length) { txt(soloFaltan ? '¡No le falta ninguna actividad! Gracias por su apoyo.' : 'Aún no hay actividades evaluadas en este periodo.', M, y, { s: 10 }); y -= 20; }
      else cabTabla();
      for (const act of lista) {
        const st = WD.estadoEntrega(act, id); const v = WD.califActividad(act, id);
        const celdas = [[WD.parseISO(act.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')], partir(WD.CAMPO_CORTO[act.campo], F, 8, COL[1].w - 6), partir(act.nombre || 'Actividad', F, 8, COL[2].w - 6), partir(queEvalua(act), F, 7.5, COL[3].w - 6), [ETQ[st] + (st === 'ok' && v !== null && aj().padresNota ? ` (${WD.round1(v)})` : '')]];
        const alto = Math.max(...celdas.map((c) => c.length)) * 10 + 6;
        if (y - alto < M + 70) { pg = doc.addPage([W, H]); y = H - M; encabezado(true); cabTabla(); }
        let x = M; celdas.forEach((ls, i) => { ls.forEach((l, k) => txt(l, x + 3, y - k * 10, { s: i === 3 ? 7.5 : 8, f: i === 4 ? B : F, c: i === 4 ? (st === 'falta' ? rojo : st === 'ok' ? verde : gris) : i === 3 ? gris : negro })); x += COL[i].w; });
        y -= alto; pg.drawLine({ start: { x: M, y: y + 7 }, end: { x: W - M, y: y + 7 }, thickness: 0.5, color: linea });
      }
      // Mensaje y firmas
      y -= 10; const msg = aj().padresMsg || 'Les pedimos su apoyo para que su hijo(a) entregue las actividades que le faltan. Cualquier duda, con gusto la atiendo.';
      partir(msg, F, 9.5, W - 2 * M).forEach((l) => { if (y < M + 50) { pg = doc.addPage([W, H]); y = H - M; } txt(l, M, y, { s: 9.5 }); y -= 13; });
      y = Math.max(y - 40, M + 20); if (y < M + 20) { pg = doc.addPage([W, H]); y = H - M - 60; }
      [[WD.state.docente.nombre || '', 'Docente'], [a.tutor || '', 'Madre, padre o tutor']].forEach(([n, t], i) => { const x = M + 20 + i * 280; pg.drawLine({ start: { x, y: y + 12 }, end: { x: x + 220, y: y + 12 }, thickness: 0.7, color: negro }); txt(n, x, y, { s: 8.5 }); txt(t, x, y - 11, { s: 8, c: gris }); });
    }
    return new Blob([await doc.save()], { type: 'application/pdf' });
  }
  const nombreArchivo = (extra) => `Actividades_${periodo().nombre}_${extra}`.replace(/[^\wáéíóúñÁÉÍÓÚÑ]+/g, '_') + '.pdf';
  WD.act.paPdf = async (el) => {
    const id = el.dataset.id; const als = WD.alumnosActivos(); const acts = actividades();
    const ids = id ? [id] : als.filter((a) => !el.dataset.faltan || resumen(acts, a.id).falta).map((a) => a.id);
    if (!ids.length) { WD.toast('Ningún alumno debe actividades en este periodo.'); return; }
    const t = el.innerHTML; el.innerHTML = '<span class="spinner"></span> Preparando PDF'; el.disabled = true;
    try { const b = await pdfAlumnos(ids); WD.download(b, nombreArchivo(id ? WD.nombreLista(WD.alumno(id)) : el.dataset.faltan ? 'con_pendientes' : 'grupo')); WD.toast(ids.length > 1 ? `PDF listo: una hoja por alumno (${ids.length}).` : 'PDF listo.'); }
    catch (e) { console.warn(e); WD.toast('No pude hacer el PDF. ' + e.message, 4000); }
    el.innerHTML = t; el.disabled = false;
  };

  /* ---------- por correo a cada familia ---------- */
  const correoHTML = (a, acts) => { const r = resumen(acts, a.id); const per = periodo(); const falt = acts.filter((x) => WD.estadoEntrega(x, a.id) !== 'ok');
    return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222"><p>Estimada familia de <b>${esc(WD.nombreCompleto(a))}</b>:</p><p>Le comparto cómo va con las actividades evaluadas de <b>${esc(per.nombre)}</b>${per.sub ? ` (${esc(per.sub)})` : ''}: entregó <b>${r.ok} de ${acts.length}</b>.</p>
      ${falt.length ? `<p>Le falta${falt.length === 1 ? '' : 'n'}:</p><table style="border-collapse:collapse;font-size:13px">${falt.map((x) => `<tr><td style="border:1px solid #ccc;padding:4px 8px">${esc(WD.fechaLarga(x.fecha))}</td><td style="border:1px solid #ccc;padding:4px 8px">${esc(WD.CAMPO_CORTO[x.campo])}</td><td style="border:1px solid #ccc;padding:4px 8px">${esc(x.nombre || '')}</td><td style="border:1px solid #ccc;padding:4px 8px">${ETQ[WD.estadoEntrega(x, a.id)]}</td></tr>`).join('')}</table>` : '<p>¡No le falta ninguna actividad! Gracias por su apoyo.</p>'}
      <p>${esc(aj().padresMsg || 'Les pedimos su apoyo para que su hijo(a) entregue las actividades que le faltan. Cualquier duda, con gusto la atiendo.')}</p><p>${esc(WD.state.docente.nombre || '')}<br>${esc(`${WD.state.escuela.grado || ''} ${WD.state.escuela.grupo || ''}`)}</p></div>`; };
  WD.act.paCorreo = async () => {
    const acts = actividades(); const con = WD.alumnosActivos().filter((a) => resumen(acts, a.id).falta);
    const ok = con.filter((a) => (a.correo || '').trim()); const sin = con.length - ok.length;
    if (!con.length) { WD.toast('Ningún alumno debe actividades.'); return; }
    if (!ok.length) { WD.toast('Ninguna de esas familias tiene correo. Agrégalo en Mi grupo o descarga el PDF.', 4500); return; }
    if (!(await WD.confirmar('Enviar a las familias', `Se enviará a ${ok.length} familia${ok.length === 1 ? '' : 's'} la lista de lo que le falta a su hijo(a), desde tu Gmail.${sin ? ` ${sin} no tienen correo: a esas dales el PDF.` : ''}`, 'Enviar'))) return;
    let n = 0; for (const a of ok) { try { await WD.google.enviarCorreo({ para: a.correo.trim(), asunto: `Actividades pendientes de ${WD.nombreCompleto(a).split(' ')[0]} · ${periodo().nombre}`, html: correoHTML(a, acts) }); n++; } catch (e) { WD.toast(e.message, 4000); break; } }
    WD.toast(`Enviado a ${n} familia${n === 1 ? '' : 's'}.`);
  };

  WD.views.padres = {
    titulo: 'Actividades para padres',
    render() {
      const als = WD.alumnosActivos(); const ps = planes(); periodo(); const acts = actividades();
      const opts = `${ps.map((p) => `<option value="p:${p.id}" ${sel === `p:${p.id}` ? 'selected' : ''}>${esc(p.nombre)}${p.periodo ? ` · ${esc(p.periodo)}` : ''}</option>`).join('')}${[1, 2, 3].map((n) => `<option value="t:${n}" ${sel === `t:${n}` ? 'selected' : ''}>Todo el trimestre ${n}</option>`).join('')}`;
      const head = `<div class="row"><div style="flex:1;min-width:0"><h1>Actividades para padres</h1><p class="muted">Lo que se está evaluando de tu planeación y lo que le falta entregar a cada alumno, listo en PDF para las familias.</p></div></div>
        <div class="card stack"><div class="row" style="gap:10px"><label class="field" style="flex:1;min-width:240px"><span>Periodo</span><select class="in" id="pa-sel">${opts}</select></label>
          <div class="row" style="gap:6px;align-self:flex-end"><button class="btn sm ${soloFaltan ? 'pri' : ''}" data-act="paSolo">Solo lo que falta</button><button class="btn sm ${aj().padresSinCalif ? 'pri' : ''}" data-act="paSinCalif" title="Si lo activas, lo que aún no calificas aparece como Falta">Sin calificar = Falta</button><button class="btn sm ${aj().padresNota ? 'pri' : ''}" data-act="paNota">Mostrar calificación</button></div></div>
          <label class="field"><span>Mensaje para las familias (va al final de la hoja)</span><input class="in" data-bind="ajustes.padresMsg" value="${esc(aj().padresMsg || '')}" placeholder="Les pedimos su apoyo para que su hijo(a) entregue las actividades que le faltan. Cualquier duda, con gusto la atiendo."></label></div>`;
      if (!als.length) return head + '<div class="empty"><h3>Aún no hay alumnos</h3><a class="btn pri" href="#grupo">Ir a Mi grupo</a></div>';
      if (!acts.length) return head + `<div class="empty"><h3>Sin actividades evaluadas en este periodo</h3><p class="small">Se toman de tu planeación: cuando subes una, cada sesión con su evaluación aparece aquí al llegar su fecha.</p><a class="btn" href="#planeacion">Ir a Planeación</a></div>`;
      const filas = als.map((a) => ({ a, r: resumen(acts, a.id) }));
      const deben = filas.filter((f) => f.r.falta).length;
      return head + `<div class="row" style="gap:8px"><span class="small muted" style="flex:1"><b>${acts.length}</b> actividades evaluadas hasta hoy · <b>${deben}</b> alumno${deben === 1 ? '' : 's'} con pendientes</span>
          <button class="btn" data-act="paCorreo">${WD.icon('familias')} Enviar por correo</button><button class="btn" data-act="paPdf" data-faltan="1">${WD.icon('descargar')} PDF de los que deben</button><button class="btn pri" data-act="paPdf">${WD.icon('descargar')} PDF de todo el grupo</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="r">N°</th><th>Alumno</th><th class="c">Entregadas</th><th class="c">Faltan</th><th class="c">Por revisar</th><th></th></tr></thead><tbody>
        ${filas.map(({ a, r }) => `<tr><td class="r">${esc(a.num || '')}</td><td><button class="link" data-act="paVer" data-id="${a.id}">${esc(WD.nombreLista(a))}</button></td><td class="c">${r.ok}/${acts.length}</td><td class="c">${r.falta ? `<span class="pill bad">${r.falta}</span>` : '<span class="faint">0</span>'}</td><td class="c">${r.revisar || '<span class="faint">0</span>'}</td><td class="r"><button class="btn sm" data-act="paPdf" data-id="${a.id}">${WD.icon('descargar')} PDF</button></td></tr>
          ${alVer === a.id ? `<tr><td></td><td colspan="5"><div class="stack" style="gap:4px;padding:4px 0 8px">${acts.filter((x) => !soloFaltan || WD.estadoEntrega(x, a.id) !== 'ok').map((x) => { const st = WD.estadoEntrega(x, a.id); return `<div class="row" style="gap:8px;flex-wrap:nowrap"><span class="tiny muted" style="width:92px;flex:none">${esc(fechaCorta(x.fecha))}</span><span class="pill" style="flex:none">${WD.CAMPO_CORTO[x.campo]}</span><button class="link small" style="flex:1;text-align:left" data-act="verActividad" data-id="${x.id}">${esc(x.nombre || '')}</button><span class="pill ${CLS[st]}" style="flex:none">${ETQ[st]}</span></div>`; }).join('')}</div></td></tr>` : ''}`).join('')}
        </tbody></table></div>
        <p class="tiny muted">Toca un alumno para ver su lista; toca una actividad para calificarla. «Falta» es lo que marcaste como NE (no entregó). Lo que aún no calificas sale como «Por revisar», o como «Falta» si activas «Sin calificar = Falta».</p>`;
    },
    after(v) { v.querySelector('#pa-sel')?.addEventListener('change', (e) => WD.act.paSel(e.target)); },
  };
  WD.act.paNota = () => { aj().padresNota = !aj().padresNota; WD.save(); WD.refrescar(); };
})(window.WD);
