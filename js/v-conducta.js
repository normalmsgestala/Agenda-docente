/* Web Docente · Conducta diaria: rúbrica individual con palomitas por día.
   Si el alumno tiene una incidencia (conducta o violencia) ese día, su conducta queda «Mala» en automático. */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const CRIT_DEF = ['Respeta a sus compañeros y al maestro', 'Sigue las indicaciones', 'Trabaja y participa en clase', 'Cuida su material y el salón', 'Convive sin agredir ni molestar'];
  const C = () => { const s = WD.state; if (!s.conducta || typeof s.conducta !== 'object') s.conducta = {}; if (!Array.isArray(s.conducta.criterios) || !s.conducta.criterios.length) s.conducta.criterios = CRIT_DEF.slice(); if (!s.conducta.dias) s.conducta.dias = {}; return s.conducta; };
  const NIV = {
    excelente: { t: 'Excelente', c: '😄', cls: 'ok' }, buena: { t: 'Buena', c: '🙂', cls: 'ok' }, regular: { t: 'Regular', c: '😐', cls: 'warn' },
    mala: { t: 'Mala', c: '😟', cls: 'bad' }, falta: { t: 'Faltó', c: '—', cls: '' }, nada: { t: 'Sin registrar', c: '', cls: '' },
  };
  let dia = null, tab = 'dia';
  const hoy = () => WD.iso(new Date());

  // Incidencias que cuentan para la conducta (conducta y convivencia, y violencia; los accidentes no)
  const incDe = (alId, f) => (WD.state.incidencias || []).filter((i) => i.alumnoId === alId && i.fecha === f && (i.tipo === 'C' || i.tipo === 'B'));
  const faltoDe = (alId, f) => { const v = (WD.state.asistencia[f] || {})[alId]; return v === 'F' || v === 'J'; };
  // Resultado de un alumno en un día
  WD.conductaDia = (alId, f) => {
    const crit = C().criterios; const inc = incDe(alId, f);
    if (inc.length) return { nivel: 'mala', inc, pct: 0 };
    const r = (C().dias[f] || {})[alId];
    if (!r) return { nivel: faltoDe(alId, f) ? 'falta' : 'nada', inc: [], pct: null };
    const n = crit.filter((_, i) => r[i]).length; const pct = n / crit.length;
    return { nivel: pct === 1 ? 'excelente' : pct >= 0.75 ? 'buena' : pct >= 0.5 ? 'regular' : 'mala', inc: [], pct, n };
  };
  const diasDe = (desde, hasta) => {
    const set = new Set(Object.keys(C().dias)); (WD.state.incidencias || []).forEach((i) => { if (i.tipo === 'C' || i.tipo === 'B') set.add(i.fecha); });
    return [...set].filter((d) => d >= desde && d <= hasta).sort();
  };
  WD.conductaResumen = (alId, desde, hasta) => {
    const cuenta = { excelente: 0, buena: 0, regular: 0, mala: 0 }; let suma = 0, n = 0; const inc = [];
    diasDe(desde, hasta).forEach((f) => { const r = WD.conductaDia(alId, f); if (cuenta[r.nivel] !== undefined) { cuenta[r.nivel]++; suma += r.pct || 0; n++; } inc.push(...r.inc); });
    const pct = n ? suma / n : null;
    return { cuenta, dias: n, pct, inc, nivel: pct === null ? 'nada' : pct >= 0.95 ? 'excelente' : pct >= 0.75 ? 'buena' : pct >= 0.5 ? 'regular' : 'mala' };
  };

  /* ---------- acciones ---------- */
  const reg = (f, alId) => { const d = (C().dias[f] = C().dias[f] || {}); return (d[alId] = d[alId] || C().criterios.map(() => false)); };
  const pintarFila = (alId) => { const tr = document.querySelector(`tr[data-cfila="${alId}"]`); if (tr) tr.outerHTML = filaHTML(WD.alumno(alId)); pintarCuenta(); };
  WD.act.coMarca = (el) => { const f = dia || hoy(); const r = reg(f, el.dataset.al); const i = Number(el.dataset.i); r[i] = !r[i]; WD.save(); pintarFila(el.dataset.al); };
  WD.act.coTodo = (el) => { const f = dia || hoy(); const r = reg(f, el.dataset.al); const todo = r.every(Boolean); r.fill(!todo); WD.save(); pintarFila(el.dataset.al); };
  WD.act.coTodos = () => { const f = dia || hoy(); WD.alumnosActivos().forEach((a) => { if (!(C().dias[f] || {})[a.id] && !faltoDe(a.id, f) && !incDe(a.id, f).length) reg(f, a.id).fill(true); }); WD.save(); WD.refrescar(); WD.toast('Listo. Ahora quita las palomitas a quien no cumplió.'); };
  WD.act.coBorrarDia = async () => { const f = dia || hoy(); if (!(await WD.confirmar('Borrar el registro del día', `Se borran las palomitas del ${WD.fechaLarga(f)}. Las incidencias no se tocan.`, 'Borrar', true))) return; delete C().dias[f]; WD.save(); WD.refrescar(); };
  WD.act.coDia = (el) => { const f = dia || hoy(); const d = WD.parseISO(f); d.setDate(d.getDate() + Number(el.dataset.d)); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + Math.sign(Number(el.dataset.d))); dia = WD.iso(d); WD.refrescar(); };
  WD.act.coHoy = () => { dia = null; WD.refrescar(); };
  WD.act.coTab = (el) => { tab = el.dataset.t; WD.refrescar(); };
  WD.act.coCriterios = () => {
    const m = WD.modal(`<div class="row"><h2 style="flex:1">Rúbrica de conducta</h2><button class="x" data-act="cerrarModal" aria-label="Cerrar">×</button></div>
      <p class="small muted" style="margin:0">Un criterio por renglón. Cada día le pones palomita a los que cumplió.</p>
      <textarea class="in" id="co-crit" style="min-height:150px">${esc(C().criterios.join('\n'))}</textarea>
      <p class="tiny muted" style="margin:0">Todos: Excelente · 75 % o más: Buena · 50 % o más: Regular · menos: Mala. Con incidencia de conducta o violencia ese día: Mala.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-act="cerrarModal">Cancelar</button><button class="btn pri" id="co-ok">Guardar</button></div>`);
    m.querySelector('#co-ok').onclick = () => {
      const nuevos = m.querySelector('#co-crit').value.split('\n').map((x) => x.trim()).filter(Boolean); if (!nuevos.length) { WD.toast('Escribe al menos un criterio.'); return; }
      const viejos = C().criterios; Object.values(C().dias).forEach((d) => Object.keys(d).forEach((al) => { const r = d[al]; d[al] = nuevos.map((c) => { const k = viejos.indexOf(c); return k >= 0 ? !!r[k] : false; }); }));
      C().criterios = nuevos; WD.save(); WD.cerrarModal(); WD.refrescar();
    };
  };
  WD.act.coVerInc = (el) => WD.abrirInc && WD.abrirInc(el.dataset.id);

  /* ---------- reporte para imprimir ---------- */
  WD.act.coImprimir = (el) => {
    const r = WD.rangoVista(); const als = el.dataset.al ? [WD.alumno(el.dataset.al)] : WD.alumnosActivos(); const dias = diasDe(r.desde, r.hasta);
    const corta = (f) => WD.parseISO(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');
    const hoja = (a) => { const res = WD.conductaResumen(a.id, r.desde, r.hasta);
      return `${WD.membrete()}<h2>REGISTRO DE CONDUCTA</h2><p style="text-align:center;margin:-6px 0 10px">${r.n ? `Trimestre ${r.n}` : 'Ciclo escolar'} · del ${esc(WD.fechaLarga(r.desde))} al ${esc(WD.fechaLarga(r.hasta))}</p>
        <p><b>Alumno(a):</b> ${esc(WD.nombreCompleto(a))} &nbsp; <b>N° de lista:</b> ${esc(a.num || '')}</p>
        <p><b>Conducta general:</b> ${NIV[res.nivel].t}${res.pct !== null ? ` (${Math.round(res.pct * 100)} % de cumplimiento)` : ''} · Excelente ${res.cuenta.excelente} · Buena ${res.cuenta.buena} · Regular ${res.cuenta.regular} · Mala ${res.cuenta.mala} · Incidencias ${res.inc.length}</p>
        <table><thead><tr><th>Fecha</th>${C().criterios.map((c, i) => `<th style="text-align:center" title="${esc(c)}">${i + 1}</th>`).join('')}<th>Conducta</th><th>Observación</th></tr></thead><tbody>
        ${dias.map((f) => { const d = WD.conductaDia(a.id, f); if (d.nivel === 'nada') return ''; const rr = (C().dias[f] || {})[a.id]; return `<tr><td>${esc(corta(f))}</td>${C().criterios.map((_, i) => `<td style="text-align:center;font-weight:700">${d.inc.length ? '✗' : rr ? (rr[i] ? '✓' : '') : ''}</td>`).join('')}<td><b>${NIV[d.nivel].t}</b></td><td>${d.inc.length ? `Incidencia ${esc(d.inc.map((i) => i.folio).join(', '))}` : d.nivel === 'falta' ? 'Faltó' : ''}</td></tr>`; }).join('')}</tbody></table>
        <p style="font-size:9pt">${C().criterios.map((c, i) => `${i + 1}. ${esc(c)}`).join(' · ')}</p>
        <div style="display:flex;gap:40px;margin-top:40px"><div style="flex:1;border-top:1px solid #000;text-align:center;padding-top:4px">${esc(WD.state.docente.nombre || '')}<br>Docente</div><div style="flex:1;border-top:1px solid #000;text-align:center;padding-top:4px">${esc(a.tutor || '')}<br>Madre, padre o tutor</div></div>`; };
    WD.vistaDocumento(els(als), als.map(hoja).join('<div style="page-break-after:always"></div>'));
    function els(x) { return x.length === 1 ? `Conducta · ${WD.nombreLista(x[0])}` : 'Conducta del grupo'; }
  };

  /* ---------- vista ---------- */
  function filaHTML(a) {
    const f = dia || hoy(); const crit = C().criterios; const d = WD.conductaDia(a.id, f); const r = (C().dias[f] || {})[a.id]; const bloq = d.inc.length > 0;
    const CHK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    return `<tr data-cfila="${a.id}"><td class="c faint">${esc(a.num || '')}</td><td style="white-space:normal;min-width:150px"><button class="link" data-act="coTodo" data-al="${a.id}" title="Palomita a todo / quitar todo" ${bloq ? 'disabled' : ''}>${esc(WD.nombreLista(a))}</button>${faltoDe(a.id, f) ? ' <span class="pill">Faltó</span>' : ''}</td>
      ${crit.map((c, i) => { const on = !bloq && r && r[i]; return `<td class="c"><button class="ckb ${on ? 'on' : ''} ${bloq ? 'ckb-x' : ''}" ${bloq ? 'disabled' : ''} title="${esc(c)}" aria-label="${esc(WD.nombreLista(a))}: ${esc(c)}" aria-pressed="${on ? 'true' : 'false'}" data-act="coMarca" data-al="${a.id}" data-i="${i}"><span class="ckb-c">${bloq ? '✗' : on ? CHK : ''}</span></button></td>`; }).join('')}
      <td>${d.nivel === 'nada' ? '<span class="faint small">—</span>' : `<span class="pill ${NIV[d.nivel].cls}" style="white-space:nowrap">${NIV[d.nivel].c} ${NIV[d.nivel].t}</span>`}${bloq ? `<div><button class="link tiny" data-act="coVerInc" data-id="${d.inc[0].id}">Incidencia ${esc(d.inc[0].folio)}</button></div>` : ''}</td></tr>`;
  }
  function pintarCuenta() {
    const f = dia || hoy(); const als = WD.alumnosActivos(); const c = { excelente: 0, buena: 0, regular: 0, mala: 0 }; let sin = 0;
    als.forEach((a) => { const n = WD.conductaDia(a.id, f).nivel; if (c[n] !== undefined) c[n]++; else if (n === 'nada') sin++; });
    const b = document.getElementById('co-cuenta'); if (b) b.innerHTML = `${['excelente', 'buena', 'regular', 'mala'].map((k) => `<span class="pill ${NIV[k].cls}">${NIV[k].c} ${NIV[k].t}: ${c[k]}</span>`).join('')}${sin ? `<span class="pill">Sin registrar: ${sin}</span>` : ''}`;
  }

  WD.views.conducta = {
    titulo: 'Conducta',
    render() {
      const als = WD.alumnosActivos(); const f = dia || hoy(); const crit = C().criterios;
      const head = `<div class="row"><div style="flex:1;min-width:0"><h1>Conducta</h1><p class="muted">Cada día palomita a lo que cumplió cada alumno. Con una incidencia de conducta ese día, queda «Mala» sola.</p></div><button class="btn" data-act="coCriterios">Rúbrica</button></div>
        <div class="tabs">${[['dia', 'Registro del día'], ['resumen', 'Resumen']].map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" data-act="coTab" data-t="${k}">${t}</button>`).join('')}</div>`;
      if (!als.length) return head + '<div class="empty"><h3>Aún no hay alumnos</h3><a class="btn pri" href="#grupo">Ir a Mi grupo</a></div>';
      if (tab === 'resumen') {
        const r = WD.rangoVista(); const filas = als.map((a) => ({ a, res: WD.conductaResumen(a.id, r.desde, r.hasta) }));
        const dias = diasDe(r.desde, r.hasta).slice(-15);
        return head + WD.selectorTri() + `<div class="row"><span class="small muted" style="flex:1">Últimos ${dias.length} días con registro. El color de cada cuadrito es la conducta de ese día.</span><button class="btn sm" data-act="coImprimir">${WD.icon('imprimir')} Reporte de todo el grupo</button></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">N°</th><th>Alumno</th><th>Días</th><th class="c">😄</th><th class="c">🙂</th><th class="c">😐</th><th class="c">😟</th><th class="c">Incid.</th><th>General</th><th></th></tr></thead><tbody>
          ${filas.map(({ a, res }) => `<tr><td class="c faint">${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td>
            <td><div class="row" style="gap:2px;flex-wrap:nowrap">${dias.map((d) => { const n = WD.conductaDia(a.id, d).nivel; const col = { excelente: 'var(--ok)', buena: 'color-mix(in srgb, var(--ok) 55%, var(--surface))', regular: 'var(--warn)', mala: 'var(--bad)' }[n] || 'var(--surface-2)'; return `<i title="${esc(WD.fechaLarga(d))}: ${NIV[n].t}" style="display:block;width:10px;height:16px;border-radius:2px;background:${col}"></i>`; }).join('')}</div></td>
            <td class="c">${res.cuenta.excelente}</td><td class="c">${res.cuenta.buena}</td><td class="c">${res.cuenta.regular}</td><td class="c">${res.cuenta.mala ? `<b>${res.cuenta.mala}</b>` : 0}</td><td class="c">${res.inc.length ? `<span class="pill bad">${res.inc.length}</span>` : '<span class="faint">0</span>'}</td>
            <td>${res.nivel === 'nada' ? '<span class="faint small">—</span>' : `<span class="pill ${NIV[res.nivel].cls}">${NIV[res.nivel].c} ${NIV[res.nivel].t}${res.pct !== null ? ` · ${Math.round(res.pct * 100)}%` : ''}</span>`}</td>
            <td class="r"><button class="btn sm" data-act="coImprimir" data-al="${a.id}">${WD.icon('imprimir')}</button></td></tr>`).join('')}</tbody></table></div>`;
      }
      const esHoy = f === hoy(); const finde = [0, 6].includes(WD.parseISO(f).getDay());
      return head + `<div class="row" style="gap:8px"><button class="btn sm" data-act="coDia" data-d="-1" aria-label="Día anterior">${WD.icon('izq')}</button><b style="min-width:220px;text-align:center">${esc(WD.fechaLarga(f))}${esHoy ? ' · hoy' : ''}</b><button class="btn sm" data-act="coDia" data-d="1" aria-label="Día siguiente">${WD.icon('der')}</button>${esHoy ? '' : '<button class="btn sm ghost" data-act="coHoy">Hoy</button>'}
          <span style="flex:1"></span><button class="btn sm" data-act="coTodos">✓ Todos cumplieron</button><button class="btn sm ghost danger" data-act="coBorrarDia">Borrar día</button></div>
        ${finde ? '<p class="small muted" style="margin:0">Es fin de semana.</p>' : ''}
        <div class="row" style="gap:6px" id="co-cuenta"></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">N°</th><th>Alumno</th>${crit.map((c, i) => `<th class="c" style="white-space:normal;min-width:76px;max-width:110px;font-size:11px;line-height:1.2" title="${esc(c)}">${esc(c)}</th>`).join('')}<th>Conducta</th></tr></thead>
        <tbody>${als.map(filaHTML).join('')}</tbody></table></div>
        <p class="tiny muted">Toca la casilla para poner o quitar la palomita; toca el nombre para palomear todo. Todos: Excelente · 75 % o más: Buena · 50 % o más: Regular · menos: Mala. Las incidencias de conducta o violencia del día ponen «Mala» y bloquean las casillas; los accidentes no cuentan.</p>`;
    },
    after() { pintarCuenta(); },
  };
})(window.WD);
