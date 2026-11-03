/* Web Docente · Listas y notas: listas de cotejo rápidas (quién trajo qué) con columnas que agrega el docente
   y una nota libre por alumno. */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const lista = () => { if (!Array.isArray(WD.state.listas)) WD.state.listas = []; return WD.state.listas; };
  const L = (id) => lista().find((x) => x.id === id);
  let abierta = null;
  const corto = (a) => [a.nombres, a.paterno].filter(Boolean).join(' ');
  const SIG = { '': '✓', '✓': '✗', '✗': '' }; // un toque: trajo → no trajo → vacío

  WD.act.lsNueva = () => {
    const m = WD.modal(`<div class="row"><h2 style="flex:1">Nueva lista</h2><button class="x" data-act="cerrarModal" aria-label="Cerrar">×</button></div>
      <form class="stack" id="lsn"><label class="field"><span>Nombre de la lista</span><input class="in" name="nombre" required placeholder="Ej. Trabajos de Saberes · noviembre" autofocus></label>
      <label class="field"><span>Primer trabajo o cosa a revisar</span><input class="in" name="col" placeholder="Ej. Maqueta del cuerpo humano"></label>
      <p class="tiny muted" style="margin:0">Después puedes agregar más columnas (más trabajos) y escribir notas por alumno.</p>
      <button class="btn pri" style="justify-self:end">Crear</button></form>`);
    m.querySelector('#lsn').onsubmit = (e) => {
      e.preventDefault(); const f = e.target; const col = f.col.value.trim();
      const l = { id: WD.uid(), nombre: f.nombre.value.trim(), fecha: WD.iso(new Date()), cols: col ? [{ id: WD.uid(), nombre: col, fecha: WD.iso(new Date()) }] : [], marcas: {}, notas: {} };
      lista().push(l); WD.save(); WD.cerrarModal(); abierta = l.id; WD.refrescar();
    };
  };
  WD.act.lsAbrir = (el) => { abierta = el.dataset.id; WD.refrescar(); window.scrollTo(0, 0); };
  WD.act.lsVolver = () => { abierta = null; WD.refrescar(); };
  WD.act.lsCol = () => {
    const l = L(abierta); const n = prompt('¿Qué trabajo o cosa vas a revisar?', ''); if (!n || !n.trim()) return;
    l.cols.push({ id: WD.uid(), nombre: n.trim(), fecha: WD.iso(new Date()) }); WD.save(); WD.refrescar();
  };
  WD.act.lsColMenu = (el) => {
    const l = L(abierta); const c = l.cols.find((x) => x.id === el.dataset.c); const i = l.cols.indexOf(c);
    const m = WD.modal(`<div class="row"><h2 style="flex:1">${esc(c.nombre)}</h2><button class="x" data-act="cerrarModal" aria-label="Cerrar">×</button></div>
      <label class="field"><span>Nombre</span><input class="in" id="lsc-n" value="${esc(c.nombre)}"></label>
      <label class="field"><span>Fecha</span><input class="in" type="date" id="lsc-f" value="${esc(c.fecha || '')}"></label>
      <div class="row"><button class="btn sm" id="lsc-todos">Todos lo trajeron</button><button class="btn sm" id="lsc-limpiar">Borrar marcas</button><span style="flex:1"></span><button class="btn sm ghost danger" id="lsc-del">Quitar columna</button></div>
      <div class="row" style="justify-content:flex-end"><button class="btn pri" id="lsc-ok">Guardar</button></div>`);
    const fin = () => { WD.save(); WD.cerrarModal(); WD.refrescar(); };
    m.querySelector('#lsc-ok').onclick = () => { c.nombre = m.querySelector('#lsc-n').value.trim() || c.nombre; c.fecha = m.querySelector('#lsc-f').value; fin(); };
    m.querySelector('#lsc-todos').onclick = () => { WD.alumnosActivos().forEach((a) => { (l.marcas[a.id] = l.marcas[a.id] || {})[c.id] = '✓'; }); fin(); };
    m.querySelector('#lsc-limpiar').onclick = () => { Object.values(l.marcas).forEach((mm) => delete mm[c.id]); fin(); };
    m.querySelector('#lsc-del').onclick = async () => { WD.cerrarModal(); if (!(await WD.confirmar('Quitar columna', `Se borra «${esc(c.nombre)}» y sus marcas.`, 'Quitar', true))) return; l.cols.splice(i, 1); Object.values(l.marcas).forEach((mm) => delete mm[c.id]); fin(); };
  };
  WD.act.lsMarca = (el) => {
    const l = L(abierta); const { al, c } = el.dataset; const mm = (l.marcas[al] = l.marcas[al] || {}); const v = SIG[mm[c] || ''];
    if (v) mm[c] = v; else delete mm[c]; WD.save();
    el.textContent = v || ''; el.className = `ls-ck ${v === '✓' ? 'ok' : v === '✗' ? 'no' : ''}`;
    const tot = document.getElementById(`ls-t-${c}`); if (tot) tot.textContent = `${WD.alumnosActivos().filter((a) => l.marcas[a.id]?.[c] === '✓').length}/${WD.alumnosActivos().length}`;
  };
  WD.act.lsBorrar = async () => { const l = L(abierta); if (!(await WD.confirmar('Eliminar lista', `Se borra «${esc(l.nombre)}» con sus marcas y notas.`, 'Eliminar', true))) return; WD.state.listas = lista().filter((x) => x.id !== l.id); abierta = null; WD.save(); WD.refrescar(); };
  WD.act.lsFaltan = () => {
    const l = L(abierta); const als = WD.alumnosActivos();
    WD.modal(`<div class="row"><h2 style="flex:1">¿Quién falta?</h2><button class="x" data-act="cerrarModal" aria-label="Cerrar">×</button></div>
      ${l.cols.map((c) => { const f = als.filter((a) => l.marcas[a.id]?.[c.id] !== '✓'); return `<div class="stack" style="gap:6px"><div class="row"><b style="flex:1">${esc(c.nombre)}</b><span class="pill ${f.length ? 'warn' : 'ok'}">${f.length ? `Faltan ${f.length}` : 'Todos'}</span></div>${f.length ? `<p class="small" style="margin:0">${f.map((a) => esc(corto(a))).join(', ')}</p>` : ''}</div>`; }).join('<div class="sep"></div>') || '<p class="muted">Agrega una columna primero.</p>'}`);
  };
  const tabla = (l, html) => {
    const als = WD.alumnosActivos(); const v = (a, c) => l.marcas[a.id]?.[c.id] || '';
    return html ? `<table><thead><tr><th>Nº</th><th>Alumno</th>${l.cols.map((c) => `<th style="text-align:center">${esc(c.nombre)}</th>`).join('')}<th>Notas</th></tr></thead><tbody>${als.map((a) => `<tr><td>${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td>${l.cols.map((c) => `<td style="text-align:center;font-weight:700">${v(a, c)}</td>`).join('')}<td>${esc(l.notas[a.id] || '')}</td></tr>`).join('')}</tbody></table>`
      : [['Nº', 'Alumno', ...l.cols.map((c) => c.nombre), 'Notas'], ...als.map((a) => [a.num || '', WD.nombreLista(a), ...l.cols.map((c) => ({ '✓': 'Sí', '✗': 'No' }[v(a, c)] || '')), l.notas[a.id] || ''])];
  };
  WD.act.lsImprimir = () => { const l = L(abierta); WD.vistaDocumento(l.nombre, `${WD.membrete()}<h2>${esc(l.nombre.toUpperCase())}</h2>${tabla(l, true)}${WD.piePagina()}`); };
  WD.act.lsExcel = async () => { const l = L(abierta); WD.download(await WD.xlsxBlob([{ name: 'Lista', rows: tabla(l, false), widths: [5, 32, ...l.cols.map(() => 14), 40] }]), `${l.nombre.replace(/[^\wáéíóúñ]+/gi, '_')}.xlsx`); };

  WD.views.listas = {
    titulo: 'Listas y notas',
    render() {
      const als = WD.alumnosActivos(); const l = abierta && L(abierta);
      if (!l) {
        const ls = lista().slice().reverse();
        return `<div class="row"><div style="flex:1;min-width:0"><h1>Listas y notas</h1><p class="muted">Listas rápidas para saber quién trajo cada trabajo, con notas por alumno.</p></div><button class="btn pri" data-act="lsNueva">${WD.icon('mas')} Nueva lista</button></div>
          ${ls.length ? `<div class="stack">${ls.map((x) => { const tot = x.cols.length * als.length; const ok = als.reduce((t, a) => t + x.cols.filter((c) => x.marcas[a.id]?.[c.id] === '✓').length, 0);
            return `<button class="card row dg-ap" data-act="lsAbrir" data-id="${x.id}"><b style="flex:1;text-align:left">${esc(x.nombre)}</b><span class="small muted">${x.cols.length} columna${x.cols.length === 1 ? '' : 's'} · ${esc(WD.fechaLarga(x.fecha))}</span>${tot ? `<span class="pill ${ok === tot ? 'ok' : ''}">${ok}/${tot}</span>` : ''}</button>`; }).join('')}</div>`
            : '<div class="empty"><h3>Aún no tienes listas</h3><p class="small">Crea una lista, agrega el trabajo que vas a revisar y marca con un toque a quien lo trajo.</p></div>'}`;
      }
      if (!als.length) return '<p class="small muted">Carga a tus alumnos en Mi grupo.</p>';
      return `<div class="row"><button class="btn ghost" data-act="lsVolver">${WD.icon('izq')} Listas</button><span style="flex:1"></span><button class="btn sm" data-act="lsFaltan">¿Quién falta?</button><button class="btn sm" data-act="lsExcel">${WD.icon('descargar')} Excel</button><button class="btn sm" data-act="lsImprimir">${WD.icon('imprimir')} Imprimir</button><button class="btn pri sm" data-act="lsCol">${WD.icon('mas')} Agregar trabajo</button></div>
        <div class="row"><input class="in" data-bind="listas.${lista().indexOf(l)}.nombre" value="${esc(l.nombre)}" style="font-size:22px;font-weight:700;flex:1;max-width:620px" aria-label="Nombre de la lista"></div>
        <div class="tbl-wrap"><table class="tbl ls"><thead><tr><th class="c">Nº</th><th>Alumno</th>${l.cols.map((c) => `<th class="c"><button class="ls-h" data-act="lsColMenu" data-c="${c.id}" title="Editar">${esc(c.nombre)}</button></th>`).join('')}<th>Notas</th></tr></thead>
          <tbody>${als.map((a) => `<tr><td class="c">${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td>${l.cols.map((c) => { const v = l.marcas[a.id]?.[c.id] || ''; return `<td class="c"><button class="ls-ck ${v === '✓' ? 'ok' : v === '✗' ? 'no' : ''}" data-act="lsMarca" data-al="${a.id}" data-c="${c.id}" aria-label="${esc(corto(a))}: ${esc(c.nombre)}">${v}</button></td>`; }).join('')}
            <td><input class="in ls-n" data-bind="listas.${lista().indexOf(l)}.notas.${a.id}" value="${esc(l.notas[a.id] || '')}" placeholder="Nota…" aria-label="Nota de ${esc(corto(a))}"></td></tr>`).join('')}</tbody>
          <tfoot><tr><td></td><td class="small muted">Trajeron</td>${l.cols.map((c) => `<td class="c small"><b id="ls-t-${c.id}">${als.filter((a) => l.marcas[a.id]?.[c.id] === '✓').length}/${als.length}</b></td>`).join('')}<td></td></tr></tfoot></table></div>
        <p class="tiny muted">Toca la casilla: ✓ lo trajo · ✗ no lo trajo · vacío. Toca el nombre de un trabajo para cambiarlo, marcar a todos o quitarlo. Las notas se guardan solas.</p>
        <div class="row"><span style="flex:1"></span><button class="btn ghost danger sm" data-act="lsBorrar">Eliminar lista</button></div>`;
    },
  };
})(window.WD);
