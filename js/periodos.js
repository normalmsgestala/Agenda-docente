/* Web Docente · Periodos del ciclo: fechas de cada trimestre (editables a mano o «cerrar trimestre hoy»)
   y un selector compartido para ver asistencia, exámenes e incidencias por trimestre. */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const tris = () => WD.state.trimestres;
  // Rango de un trimestre: fechas que puso el docente; si faltan, las del calendario SEP o una aproximación
  WD.rangoTri = (n) => {
    const t = tris().find((x) => x.n === n) || {}; const y = Number(String(WD.state.escuela.ciclo || '').slice(0, 4)) || (new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1);
    const preset = (WD.CAL_PRESETS && Object.values(WD.CAL_PRESETS).find((p) => p.trimestres && p.trimestres[0][0].startsWith(String(y))))?.trimestres;
    const def = preset ? preset[n - 1] : [[`${y}-08-24`, `${y}-11-15`], [`${y}-11-16`, `${y + 1}-03-15`], [`${y + 1}-03-16`, `${y + 1}-07-15`]][n - 1];
    return { desde: t.inicio || def[0], hasta: t.fin || def[1], manual: !!(t.inicio && t.fin) };
  };
  const aprox = WD.trimestreDe;
  WD.trimestreDe = (fecha) => { for (const n of [1, 2, 3]) { const r = WD.rangoTri(n); if (fecha >= r.desde && fecha <= r.hasta) return n; } return aprox(fecha); };
  WD.asistTri = (id, n) => { const r = WD.rangoTri(Number(n) || WD.triActual()); return WD.asistAlumno(id, r.desde, r.hasta); };
  WD.triActual = () => WD.trimestreDe(WD.iso(new Date()));
  if (WD.triSel === undefined) WD.triSel = null; // null = el actual; 0 = todo el ciclo
  WD.triVista = () => (WD.triSel === null ? WD.triActual() : WD.triSel);
  // Rango que se está viendo (trimestre elegido o ciclo completo)
  WD.rangoVista = () => { const n = WD.triVista(); if (!n) return { desde: WD.rangoTri(1).desde, hasta: WD.rangoTri(3).hasta, n: 0 }; return { ...WD.rangoTri(n), n }; };
  WD.enVista = (fecha) => { const r = WD.rangoVista(); return !!fecha && fecha >= r.desde && fecha <= r.hasta; };
  WD.selectorTri = () => {
    const v = WD.triVista(); const r = WD.rangoVista(); const corto = (f) => new Date(f + 'T12:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    return `<div class="row" style="gap:8px"><div class="tabs">${[1, 2, 3].map((n) => `<button class="${v === n ? 'on' : ''}" data-act="triVer" data-n="${n}">Trimestre ${n}</button>`).join('')}<button class="${v === 0 ? 'on' : ''}" data-act="triVer" data-n="0">Ciclo</button></div>
      <span class="small muted">${corto(r.desde)} – ${corto(r.hasta)}</span><button class="btn sm ghost" data-act="triFechas">Fechas</button></div>`;
  };
  WD.act.triVer = (el) => { WD.triSel = Number(el.dataset.n); WD.refrescar(); };
  WD.act.triFechas = () => {
    const m = WD.modal(`<div class="row"><h2 style="flex:1">Fechas de los trimestres</h2><button class="x" data-act="cerrarModal" aria-label="Cerrar">×</button></div>
      <p class="small muted" style="margin:0">Separan la asistencia, los exámenes y las incidencias de cada trimestre. Ajústalas como las tenga tu escuela.</p>
      ${[1, 2, 3].map((n) => { const r = WD.rangoTri(n); return `<div class="grid g2"><label class="field"><span>Trimestre ${n} · inicia</span><input class="in" type="date" id="tr-i${n}" value="${r.desde}"></label><label class="field"><span>Termina</span><input class="in" type="date" id="tr-f${n}" value="${r.hasta}"></label></div>`; }).join('')}
      <div class="card flat stack" style="background:var(--surface-2);border:0"><b>Cerrar el trimestre ${WD.triActual()} hoy</b><p class="small muted" style="margin:0">Termina hoy y el siguiente empieza mañana. Lo que registres desde mañana cuenta para el siguiente.</p><button class="btn sm" id="tr-cerrar" style="justify-self:start" ${WD.triActual() >= 3 ? 'disabled' : ''}>Cerrar trimestre ${WD.triActual()}</button></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-act="cerrarModal">Cancelar</button><button class="btn pri" id="tr-ok">Guardar</button></div>`);
    m.querySelector('#tr-ok').onclick = () => {
      for (const n of [1, 2, 3]) { const i = m.querySelector(`#tr-i${n}`).value, f = m.querySelector(`#tr-f${n}`).value; if (i && f && i > f) { WD.toast(`El trimestre ${n} termina antes de empezar.`); return; } }
      [1, 2, 3].forEach((n) => { const t = tris().find((x) => x.n === n); t.inicio = m.querySelector(`#tr-i${n}`).value; t.fin = m.querySelector(`#tr-f${n}`).value; });
      WD.save(); WD.cerrarModal(); WD.refrescar(); WD.toast('Fechas guardadas');
    };
    m.querySelector('#tr-cerrar').onclick = () => {
      const n = WD.triActual(); const hoy = WD.iso(new Date()); const man = WD.iso(WD.addDays(new Date(), 1));
      [1, 2, 3].forEach((k) => { const t = tris().find((x) => x.n === k); const r = WD.rangoTri(k); t.inicio = r.desde; t.fin = r.hasta; });
      tris().find((x) => x.n === n).fin = hoy; const sig = tris().find((x) => x.n === n + 1); sig.inicio = man; if (sig.fin < man) sig.fin = WD.rangoTri(n + 1).hasta > man ? WD.rangoTri(n + 1).hasta : man;
      WD.triSel = null; WD.save(); WD.cerrarModal(); WD.refrescar(); WD.toast(`Trimestre ${n} cerrado. Desde mañana cuenta el trimestre ${n + 1}.`, 3500);
    };
  };
})(window.WD);
