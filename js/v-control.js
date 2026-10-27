/* Web Docente · Control administrativo: entregas mensuales, visitas de dirección y supervisión, observaciones */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const DEF = [
    ['Planeación (Vo. Bo.)', null, 'planeacion'], ['Programa analítico', null, ''], ['Reporte de asistencia', null, 'asistencia'],
    ['Producto / acuerdos CTE', null, 'calendario'], ['Registro de calificaciones', [11, 3, 7], 'evaluacion'], ['Comunicación de resultados', [11, 3, 7], 'juntas'],
    ['Reporte a UDEI', null, ''], ['Avance de lectura', null, 'idai'], ['Otro', null, ''],
  ];
  const IR = { '': 'Ninguna', planeacion: 'Planeación', asistencia: 'Asistencia', calendario: 'Calendario y CTE', evaluacion: 'Evaluación', juntas: 'Juntas con padres', idai: 'IDAI / ICE', incidencias: 'Incidencias', grupo: 'Mi grupo' };
  const VISITAS = ['Dirección', 'Supervisión', 'Asesor técnico pedagógico', 'UDEI', 'Otra'];

  function C() {
    const s = WD.state; if (!s.control) s.control = {};
    const c = s.control;
    if (!c.entregas) c.entregas = DEF.map(([nombre, meses, ir]) => ({ id: WD.uid(), nombre, meses, ir }));
    c.marcas = c.marcas || {}; c.visitas = c.visitas || []; c.obs = c.obs || '';
    return c;
  }
  // meses del ciclo: septiembre del primer año a julio del segundo
  function mesesCiclo() {
    const y = Number(String(WD.state.escuela.ciclo || '').slice(0, 4)) || (new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1);
    const out = []; for (let i = 0; i < 11; i++) { const m = (8 + i) % 12; out.push({ k: `${m <= 6 ? y + 1 : y}-${String(m + 1).padStart(2, '0')}`, m: m + 1, t: MES[m] }); }
    return out;
  }
  const aplica = (e, m) => !e.meses || !e.meses.length || e.meses.includes(m);
  const mesActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  WD.entregasPendientes = () => {
    const k = mesActual(); const mc = mesesCiclo().find((x) => x.k === k); if (!mc) return [];
    return C().entregas.filter((e) => e.nombre !== 'Otro' && aplica(e, mc.m) && !C().marcas[e.id]?.[k]);
  };

  let tab = 'entregas';
  WD.act.ctTab = (el) => { tab = el.dataset.t; WD.refrescar(); };
  WD.act.ctMarca = (el) => {
    const c = C(); const { id, k } = el.dataset; c.marcas[id] = c.marcas[id] || {};
    if (c.marcas[id][k]) delete c.marcas[id][k]; else c.marcas[id][k] = WD.iso(new Date());
    WD.save(); WD.refrescar();
  };
  WD.act.ctEditar = () => {
    const c = C(); const ms = mesesCiclo();
    WD.abrirDrawer('Entregas', `<p class="small muted" style="margin:0">Cambia nombres, en qué meses aplica cada entrega y a qué sección te lleva. Los cambios se guardan solos.</p>
      ${c.entregas.map((e, i) => `<div class="card stack" style="gap:8px"><div class="row"><input class="in" style="flex:1" data-bind="control.entregas.${i}.nombre" value="${esc(e.nombre)}"><button class="btn sm ghost danger" data-act="ctQuitar" data-id="${e.id}" aria-label="Quitar entrega">×</button></div>
        <div class="dg-its">${ms.map((x) => `<button type="button" class="dg-it ${aplica(e, x.m) ? 'on' : ''}" data-act="ctMes" data-id="${e.id}" data-m="${x.m}">${x.t}</button>`).join('')}</div>
        <label class="row small" style="gap:8px"><span class="muted">Abre:</span><select class="in" style="max-width:220px" data-bind="control.entregas.${i}.ir">${Object.entries(IR).map(([k, t]) => `<option value="${k}" ${e.ir === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>`).join('')}
      <button class="btn" data-act="ctAgregar" style="justify-self:start">${WD.icon('mas')} Agregar entrega</button>`);
  };
  const reabrir = () => { const d = document.querySelector('#drawer .drawer-b'); const y = d ? d.scrollTop : 0; WD.act.ctEditar(); const n = document.querySelector('#drawer .drawer-b'); if (n) n.scrollTop = y; WD.refrescar(); };
  WD.act.ctMes = (el) => {
    const e = C().entregas.find((x) => x.id === el.dataset.id); const m = Number(el.dataset.m); const todos = mesesCiclo().map((x) => x.m);
    let ms = e.meses && e.meses.length ? [...e.meses] : [...todos]; ms = ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m];
    e.meses = ms.length === todos.length ? null : ms; WD.save(); reabrir();
  };
  WD.act.ctAgregar = () => { C().entregas.push({ id: WD.uid(), nombre: 'Nueva entrega', meses: null, ir: '' }); WD.save(); reabrir(); };
  WD.act.ctQuitar = async (el) => {
    const c = C(); const e = c.entregas.find((x) => x.id === el.dataset.id);
    if (!(await WD.confirmar('Quitar entrega', `Se quitará «${esc(e.nombre)}» y sus marcas.`, 'Quitar', true))) { WD.act.ctEditar(); return; }
    c.entregas = c.entregas.filter((x) => x.id !== e.id); delete c.marcas[e.id]; WD.save(); reabrir();
  };

  /* ---------- visitas ---------- */
  WD.act.ctVisita = (el) => {
    const c = C(); let v = c.visitas.find((x) => x.id === el.dataset.id);
    if (!v) { v = { id: WD.uid(), fecha: WD.iso(new Date()), quien: VISITAS[0], nombre: '', aspectos: '', recom: '' }; c.visitas.push(v); WD.save(); }
    const i = c.visitas.indexOf(v); const p = `control.visitas.${i}`;
    WD.abrirDrawer('Visita', `<div class="grid g2">
        <label class="field"><span>Fecha</span><input class="in" type="date" data-bind="${p}.fecha" value="${esc(v.fecha)}"></label>
        <label class="field"><span>Visita de</span><select class="in" data-bind="${p}.quien">${VISITAS.map((x) => `<option ${v.quien === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>
      <label class="field"><span>Nombre de quien visitó (opcional)</span><input class="in" data-bind="${p}.nombre" value="${esc(v.nombre || '')}"></label>
      <label class="field"><span>Aspectos observados</span><textarea class="in" data-bind="${p}.aspectos" style="min-height:110px" placeholder="Ej. Observación de clase de Saberes; uso de material concreto">${esc(v.aspectos)}</textarea></label>
      <label class="field"><span>Recomendaciones y compromisos</span><textarea class="in" data-bind="${p}.recom" style="min-height:110px">${esc(v.recom)}</textarea></label>
      <div class="row"><span style="flex:1"></span><button class="btn ghost danger sm" data-act="ctVisitaBorrar" data-id="${v.id}">Eliminar</button></div>`, null, 'Se guarda sola.');
  };
  WD.act.ctVisitaBorrar = async (el) => {
    if (!(await WD.confirmar('Eliminar visita', 'Se borrará este registro.', 'Eliminar', true))) return;
    const c = C(); c.visitas = c.visitas.filter((x) => x.id !== el.dataset.id); WD.save(); WD.cerrarDrawer(); WD.refrescar();
  };

  /* ---------- impresión y Excel ---------- */
  WD.act.ctImprimir = () => {
    const c = C(); const ms = mesesCiclo();
    const tabla = `<table><thead><tr><th>Entrega</th>${ms.map((x) => `<th style="text-align:center">${x.t}</th>`).join('')}</tr></thead><tbody>${c.entregas.map((e) => `<tr><td>${esc(e.nombre)}</td>${ms.map((x) => `<td style="text-align:center">${aplica(e, x.m) ? (c.marcas[e.id]?.[x.k] ? '✓' : '☐') : ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const vis = c.visitas.slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    WD.vistaDocumento('Control administrativo', `${WD.membrete()}<h2>CONTROL DE ENTREGAS MENSUALES</h2>${tabla}
      <p style="margin-top:14px"><b>Observaciones de dirección / supervisión:</b><br>${esc(c.obs || '').replace(/\n/g, '<br>') || '<br><br>'}</p>
      <h2 style="margin-top:22px">VISITAS DE DIRECCIÓN Y SUPERVISIÓN</h2>
      <table><thead><tr><th>Fecha</th><th>Visita de</th><th>Aspectos observados</th><th>Recomendaciones / compromisos</th></tr></thead><tbody>${vis.length ? vis.map((v) => `<tr><td>${esc(WD.fechaLarga(v.fecha))}</td><td>${esc(v.quien)}${v.nombre ? `<br>${esc(v.nombre)}` : ''}</td><td>${esc(v.aspectos).replace(/\n/g, '<br>')}</td><td>${esc(v.recom).replace(/\n/g, '<br>')}</td></tr>`).join('') : '<tr><td colspan="4" style="height:60px"></td></tr>'}</tbody></table>${WD.piePagina()}`);
  };
  WD.act.ctExcel = async () => {
    const c = C(); const ms = mesesCiclo();
    const h1 = [['Entrega', ...ms.map((x) => x.t)]].concat(c.entregas.map((e) => [e.nombre, ...ms.map((x) => (aplica(e, x.m) ? (c.marcas[e.id]?.[x.k] ? `Entregado ${c.marcas[e.id][x.k]}` : 'Pendiente') : ''))]));
    const h2 = [['Fecha', 'Visita de', 'Nombre', 'Aspectos observados', 'Recomendaciones / compromisos']].concat(c.visitas.map((v) => [v.fecha, v.quien, v.nombre || '', v.aspectos, v.recom]));
    WD.download(await WD.xlsxBlob([{ name: 'Entregas', rows: h1, widths: [30, ...ms.map(() => 18)] }, { name: 'Visitas', rows: h2, widths: [12, 18, 24, 50, 50] }]), 'Control_administrativo.xlsx');
  };

  /* ---------- vista ---------- */
  WD.views.control = {
    titulo: 'Control administrativo',
    render() {
      const c = C(); const ms = mesesCiclo(); const hoyK = mesActual(); const pend = WD.entregasPendientes();
      const mesHoy = ms.find((x) => x.k === hoyK);
      const tabs = `<div class="tabs">${[['entregas', 'Entregas mensuales'], ['visitas', `Visitas (${c.visitas.length})`]].map(([t, n]) => `<button class="${tab === t ? 'on' : ''}" data-act="ctTab" data-t="${t}">${n}</button>`).join('')}</div>`;
      let cuerpo;
      if (tab === 'entregas') {
        cuerpo = `${mesHoy ? `<div class="card row">${pend.length ? `<span class="pill warn">Faltan ${pend.length}</span><span style="flex:1">Este mes: ${pend.map((e) => e.ir ? `<a href="#${e.ir}">${esc(e.nombre)}</a>` : esc(e.nombre)).join(' · ')}</span>` : '<span class="pill ok">Al día</span><span style="flex:1">Ya entregaste todo lo de este mes.</span>'}</div>` : ''}
          <div class="tbl-wrap"><table class="tbl ct"><thead><tr><th>Entrega</th>${ms.map((x) => `<th class="c ${x.k === hoyK ? 'hoy' : ''}">${x.t}</th>`).join('')}</tr></thead><tbody>
          ${c.entregas.map((e) => `<tr><td>${e.ir ? `<a href="#${e.ir}" class="link">${esc(e.nombre)}</a>` : esc(e.nombre)}</td>${ms.map((x) => { if (!aplica(e, x.m)) return `<td class="${x.k === hoyK ? 'hoy' : ''}"></td>`; const f = c.marcas[e.id]?.[x.k]; const tarde = !f && x.k < hoyK; return `<td class="c ${x.k === hoyK ? 'hoy' : ''}"><button class="ct-ck ${f ? 'on' : tarde ? 'tarde' : ''}" data-act="ctMarca" data-id="${e.id}" data-k="${x.k}" title="${f ? `Entregado el ${esc(WD.fechaLarga(f))}` : 'Marcar como entregado'}" aria-label="${esc(e.nombre)} ${x.t}: ${f ? 'entregado' : 'pendiente'}">${f ? '✓' : ''}</button></td>`; }).join('')}</tr>`).join('')}
          </tbody></table></div>
          <p class="tiny muted">Toca la casilla al entregar; guarda la fecha. En rojo, lo que quedó pendiente de meses pasados. El nombre te lleva a la sección para prepararlo.</p>
          <label class="field"><span>Observaciones de dirección / supervisión</span><textarea class="in" data-bind="control.obs" style="min-height:90px">${esc(c.obs)}</textarea></label>`;
      } else {
        const vs = c.visitas.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        cuerpo = `<div class="row"><span style="flex:1"></span><button class="btn pri" data-act="ctVisita">${WD.icon('mas')} Registrar visita</button></div>
          ${vs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Visita de</th><th>Aspectos observados</th><th>Recomendaciones</th></tr></thead><tbody>${vs.map((v) => `<tr><td><button class="link" data-act="ctVisita" data-id="${v.id}">${esc(WD.fechaLarga(v.fecha))}</button></td><td>${esc(v.quien)}${v.nombre ? `<div class="tiny muted">${esc(v.nombre)}</div>` : ''}</td><td class="small" style="white-space:normal;max-width:320px">${esc(v.aspectos)}</td><td class="small" style="white-space:normal;max-width:320px">${esc(v.recom)}</td></tr>`).join('')}</tbody></table></div>`
            : '<div class="empty"><h3>Sin visitas registradas</h3><p class="small">Registra observaciones de clase y visitas de dirección o supervisión, con sus recomendaciones.</p></div>'}`;
      }
      return `<div class="row"><div style="flex:1;min-width:0"><h1>Control administrativo</h1><p class="muted">Entregas mensuales a la dirección y registro de visitas.</p></div>
          ${tab === 'entregas' ? '<button class="btn" data-act="ctEditar">Editar entregas</button>' : ''}<button class="btn" data-act="ctExcel">${WD.icon('descargar')} Excel</button><button class="btn" data-act="ctImprimir">${WD.icon('imprimir')} Imprimir</button></div>
        ${tabs}${cuerpo}`;
    },
  };
})(window.WD);
