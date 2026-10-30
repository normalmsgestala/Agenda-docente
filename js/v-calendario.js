/* Web Docente · Calendario escolar y Consejo Técnico Escolar (CTE) */
(function (WD) {
  'use strict';
  const { esc, iso, pad, MESES } = WD;
  let mesVista = null; // 'AAAA-MM'
  const DIAS_CORTOS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  const cal = () => { if (!WD.state.calendario) WD.state.calendario = { preset: '', eventos: [], valores: {} }; return WD.state.calendario; };
  WD.eventosDe = (fecha) => cal().eventos.filter((e) => fecha >= e.inicio && fecha <= (e.fin || e.inicio));
  WD.diaSinClases = (fecha) => WD.eventosDe(fecha).find((e) => (WD.TIPOS_EVENTO[e.tipo] || {}).sinClase) || null;
  WD.valorDelMes = (fecha) => (cal().valores || {})[Number(fecha.slice(5, 7))] || '';

  WD.act.cargarCalendario = (el) => {
    const p = WD.CAL_PRESETS[el.dataset.p]; if (!p) return;
    const c = cal(); const propios = c.eventos.filter((e) => e.tipo === 'personal' || e.cte);
    c.preset = el.dataset.p; c.valores = { ...p.valores };
    c.eventos = [...p.eventos.map((e) => ({ id: WD.uid(), ...e })), ...propios.filter((e) => e.tipo === 'personal')];
    // Las notas de CTE ya capturadas se conservan en la sesión de la misma fecha
    propios.filter((e) => e.cte).forEach((v) => { const n = c.eventos.find((e) => e.tipo === v.tipo && e.inicio === v.inicio); if (n) n.cte = v.cte; });
    p.trimestres.forEach(([i, f], k) => { const t = WD.state.trimestres[k]; if (t && !t.inicio && !t.fin) { t.inicio = i; t.fin = f; } });
    const e = WD.state.escuela; if (!e.ciclo) e.ciclo = '2026-2027';
    WD.save(); WD.refrescar(); WD.toast('Calendario cargado. Puedes editar cualquier fecha.');
  };
  WD.act.calMes = (el) => {
    const [y, m] = (mesVista || iso(new Date()).slice(0, 7)).split('-').map(Number);
    const d = new Date(y, m - 1 + Number(el.dataset.d), 1); mesVista = Number(el.dataset.d) === 0 ? null : `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; WD.refrescar();
  };
  WD.act.calDia = (el) => abrirDia(el.dataset.f);
  WD.act.nuevoEvento = (el) => {
    const f = el.dataset.f || iso(new Date());
    const e = { id: WD.uid(), tipo: el.dataset.tipo || 'personal', inicio: f, fin: f, titulo: '', notas: '' };
    cal().eventos.push(e); WD.save(); abrirEvento(e.id, true);
  };
  WD.act.verEvento = (el) => abrirEvento(el.dataset.id);

  function chip(e, corto) {
    const t = WD.TIPOS_EVENTO[e.tipo] || {};
    if (e.tipo === 'efemeride') return `<span class="tiny faint" style="display:block;line-height:1.25">${esc(e.titulo)}</span>`;
    return `<span class="pill ${t.clase || ''}" style="white-space:normal;line-height:1.2;padding:2px 7px">${esc(corto ? (e.tipo === 'cte' ? 'CTE' : e.tipo === 'cte_intensiva' ? 'CTE intensiva' : e.titulo.split('·')[0].trim()) : e.titulo)}</span>`;
  }
  WD.chipEvento = chip;

  function abrirDia(f) {
    const evs = WD.eventosDe(f); const ses = WD.sesionesDe(f);
    WD.abrirDrawer(WD.fechaLarga(f), `
      ${evs.length ? `<div class="stack">${evs.map((e) => `<button class="hit" data-act="verEvento" data-id="${e.id}">${chip(e)}<span class="k">${esc((WD.TIPOS_EVENTO[e.tipo] || {}).nombre || '')}</span></button>`).join('')}</div>` : '<p class="small muted">Sin fechas importantes este día.</p>'}
      ${ses.length ? `<div class="label">Clases planeadas</div><div class="stack">${ses.map((s) => `<button class="hit" data-act="verSesion" data-id="${s.id}">${esc(WD.CAMPO_CORTO[s.campo])} · ${esc(s.titulo)}</button>`).join('')}</div>` : ''}
      <div class="row"><button class="btn" data-act="nuevoEvento" data-f="${f}">${WD.icon('mas')} Agregar algo a este día</button></div>`, null, WD.valorDelMes(f) ? `Valor del mes: ${esc(WD.valorDelMes(f))}` : '');
  }

  /* ---------- evento y registro de CTE ---------- */
  function abrirEvento(id, nuevo) {
    const i = cal().eventos.findIndex((e) => e.id === id); if (i < 0) return; const e = cal().eventos[i]; const p = `calendario.eventos.${i}`;
    const esCTE = e.tipo === 'cte' || e.tipo === 'cte_intensiva';
    if (esCTE && !e.cte) e.cte = { temas: '', acuerdos: '', acciones: '', pendientes: '' };
    WD.abrirDrawer(nuevo ? 'Nueva fecha' : (e.titulo || 'Fecha'), `
      <div class="grid g2">
        <label class="field" style="grid-column:1/-1"><span>Qué es</span><input class="in" data-bind="${p}.titulo" value="${esc(e.titulo)}" placeholder="Ej. Junta con padres, entrega de planeación…"></label>
        <label class="field"><span>Tipo</span><select class="in" data-bind="${p}.tipo" data-rerender>${Object.entries(WD.TIPOS_EVENTO).map(([k, t]) => `<option value="${k}" ${k === e.tipo ? 'selected' : ''}>${t.nombre}</option>`).join('')}</select></label>
        <span></span>
        <label class="field"><span>Desde</span><input class="in" type="date" data-bind="${p}.inicio" data-rerender value="${e.inicio}"></label>
        <label class="field"><span>Hasta</span><input class="in" type="date" data-bind="${p}.fin" data-rerender value="${e.fin || e.inicio}"></label>
      </div>
      ${(WD.TIPOS_EVENTO[e.tipo] || {}).sinClase ? '<p class="note small">Ese día no hay clases: no cuenta como día hábil y se marca así en tu semana.</p>' : ''}
      ${esCTE ? `<div class="sep"></div><h3>Registro de la sesión</h3>
        ${[['temas', 'Temas y propósitos de la sesión'], ['acuerdos', 'Acuerdos y compromisos del colectivo'], ['acciones', `Acciones para mi grupo ${esc(WD.state.escuela.grado || '')} ${esc(WD.state.escuela.grupo || '')} (PEMC / problemáticas)`], ['pendientes', 'Pendientes y fechas de entrega']].map(([k, t]) => `<label class="field"><span>${t}</span><textarea class="in" data-bind="${p}.cte.${k}">${esc(e.cte[k] || '')}</textarea></label>`).join('')}
        <div class="row"><button class="btn" data-act="cteIA" data-id="${e.id}">${WD.icon('chispa')} Ordenar mis notas con IA</button><button class="btn" data-act="cteImprimir" data-id="${e.id}">${WD.icon('imprimir')} Imprimir registro</button></div>`
      : `<label class="field"><span>Notas</span><textarea class="in" data-bind="${p}.notas">${esc(e.notas || '')}</textarea></label>`}
      <div class="row"><span style="flex:1"></span><button class="btn ghost danger sm" data-act="borrarEvento" data-id="${e.id}">Eliminar fecha</button></div>`,
      null, `${esc(WD.fechaLarga(e.inicio))}${e.fin && e.fin !== e.inicio ? ' al ' + esc(WD.fechaLarga(e.fin)) : ''}`);
  }
  WD.act.borrarEvento = async (el) => {
    if (!(await WD.confirmar('Eliminar fecha', 'Se quita del calendario.', 'Eliminar', true))) return;
    cal().eventos = cal().eventos.filter((e) => e.id !== el.dataset.id); WD.save(); WD.cerrarDrawer(); WD.refrescar();
  };
  WD.act.cteIA = async (el) => {
    const e = cal().eventos.find((x) => x.id === el.dataset.id); if (!e) return;
    const todo = Object.values(e.cte || {}).join('\n').trim(); if (!todo) { WD.toast('Primero escribe tus notas de la sesión.'); return; }
    if (!WD.requiereIA()) return;
    el.disabled = true; el.innerHTML = '<span class="spinner"></span> Ordenando…';
    try {
      const a = WD.ai.anonimizar(JSON.stringify(e.cte));
      const out = await WD.ai.generar([{ text: `Eres docente de primaria en México. Ordena y redacta de forma clara y profesional las notas de una sesión de Consejo Técnico Escolar. No inventes datos; si algo no está, deja "". Usa viñetas cortas con "• ".\nDevuelve JSON {"temas":"","acuerdos":"","acciones":"","pendientes":""}.\nNotas: ${a.texto}` }], { json: true, temperatura: 0.3 });
      ['temas', 'acuerdos', 'acciones', 'pendientes'].forEach((k) => { if (out[k]) e.cte[k] = a.restaurar(out[k]); });
      WD.save(); abrirEvento(e.id); WD.toast('Listo. Revisa y ajusta lo que necesites.');
    } catch (er) { WD.toast(er.message, 4500); el.disabled = false; el.innerHTML = `${WD.icon('chispa')} Ordenar mis notas con IA`; }
  };
  WD.act.cteImprimir = (el) => {
    const e = cal().eventos.find((x) => x.id === el.dataset.id); const c = e.cte || {}; const es = WD.state.escuela;
    const caja = (t, v) => `<div class="box"><div class="t">${t}</div><div style="white-space:pre-wrap;min-height:50px">${esc(v || '')}</div></div>`;
    WD.vistaDocumento('Registro de CTE', `${WD.membrete()}<h2>CONSEJO TÉCNICO ESCOLAR</h2>
      <p style="text-align:center;margin:-6px 0 12px">${esc(e.titulo)} · ${esc(WD.fechaLarga(e.inicio))}${e.fin && e.fin !== e.inicio ? ' al ' + esc(WD.fechaLarga(e.fin)) : ''}</p>
      ${caja('TEMAS Y PROPÓSITOS DE LA SESIÓN', c.temas)}${caja('ACUERDOS Y COMPROMISOS DEL COLECTIVO', c.acuerdos)}${caja(`ACCIONES PARA MI GRUPO ${esc(es.grado || '')} ${esc(es.grupo || '')}`, c.acciones)}${caja('PENDIENTES Y FECHAS DE ENTREGA', c.pendientes)}
      <div class="firmas" style="grid-template-columns:1fr 1fr"><div>${esc(WD.state.docente.nombre)}<br>Docente</div><div>${esc(es.director || '')}<br>Dirección</div></div>${WD.piePagina()}`);
  };

  /* ---------- foto del calendario del mes (lo lee la IA) ---------- */
  WD.act.calFoto = () => { if (!WD.requiereIA()) return; const inp = document.getElementById('cal-foto'); inp.value = ''; inp.click(); };
  async function leerFotoCal(files) {
    if (!files.length) return;
    const ym = mesVista || iso(new Date()).slice(0, 7);
    WD.abrirDrawer('Calendario de la foto', '<div class="row"><span class="spinner"></span><span class="small muted">Leyendo el calendario con tu Gemini…</span></div>');
    try {
      const partes = [];
      for (const f of files) { const url = await WD.shrinkImage(f, 2000, 0.88); const [meta, data] = url.split(','); partes.push({ inline_data: { mime_type: (meta.match(/data:(.*?);/) || [])[1] || 'image/jpeg', data } }); }
      const tipos = Object.entries(WD.TIPOS_EVENTO).map(([k, t]) => `${k} = ${t.nombre}`).join('; ');
      partes.push({ text: `Eres asistente de un maestro de primaria en Nuevo León, México. Las imágenes son un calendario mensual de actividades que le dio su escuela (puede ser foto de una hoja impresa o captura).
Extrae TODAS las actividades escritas en cada día. El mes que el maestro está viendo es ${ym}; si la imagen indica otro mes o año, usa el de la imagen. Ciclo escolar ${WD.state.escuela.ciclo || ''}.
Para cada actividad: fecha (AAAA-MM-DD; si abarca varios días usa inicio y fin), titulo corto y claro, hora si aparece (HH:MM, 24 h), notas (responsable, lugar, materiales u otros detalles escritos) y tipo, uno de: ${tipos}. Usa "sin_clases" solo si dice suspensión o sin clases; "cte" para Consejo Técnico; "efemeride" para días conmemorativos u honores; "personal" para todo lo demás (juntas, entregas, eventos, actividades).
No inventes: si algo no se lee, omítelo. Devuelve JSON {"mes":"AAAA-MM","eventos":[{"inicio":"AAAA-MM-DD","fin":"AAAA-MM-DD","titulo":"","hora":"","tipo":"personal","notas":""}]}` });
      const out = await WD.ai.generar(partes, { json: true, temperatura: 0.1, maxTokens: 8192 });
      const evs = (out.eventos || []).filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.inicio || '') && (e.titulo || '').trim()).map((e) => ({ inicio: e.inicio, fin: /^\d{4}-\d{2}-\d{2}$/.test(e.fin || '') && e.fin >= e.inicio ? e.fin : e.inicio, titulo: e.titulo.trim(), hora: /^\d{1,2}:\d{2}$/.test(e.hora || '') ? e.hora : '', tipo: WD.TIPOS_EVENTO[e.tipo] ? e.tipo : 'personal', notas: (e.notas || '').trim() }));
      if (!evs.length) { WD.abrirDrawer('Calendario de la foto', '<p class="small">No encontré actividades en la foto. Intenta con una foto más cercana, de frente y con buena luz.</p>'); return; }
      revisarFotoCal(evs, out.mes);
    } catch (e) { WD.abrirDrawer('Calendario de la foto', `<p class="small" style="color:var(--bad)">${esc(e.message)}</p>`); }
  }
  document.addEventListener('change', (e) => { if (e.target && e.target.id === 'cal-foto') leerFotoCal([...e.target.files]); });
  function revisarFotoCal(evs, mes) {
    const ya = (e) => cal().eventos.some((x) => x.inicio === e.inicio && (WD.norm(x.titulo) === WD.norm(e.titulo) || (x.tipo === e.tipo && ['cte', 'cte_intensiva', 'sin_clases', 'vacaciones', 'registro', 'comunicacion'].includes(e.tipo))));
    WD.abrirDrawer('Calendario de la foto', `<p class="small muted" style="margin:0">Encontré ${evs.length} actividad${evs.length === 1 ? '' : 'es'}. Revisa, corrige lo que haga falta y quita la palomita a lo que no quieras agregar.</p>
      <div class="stack" id="cf-l" style="gap:8px">${evs.map((e, i) => `<div class="card stack" style="gap:6px;padding:12px" data-i="${i}"><div class="row" style="gap:8px"><input type="checkbox" class="cf-ok" ${ya(e) ? '' : 'checked'} aria-label="Agregar"><input class="in cf-t" value="${esc(e.titulo)}" style="flex:1"></div>
        <div class="grid g3" style="gap:6px"><input class="in cf-i" type="date" value="${e.inicio}" aria-label="Fecha"><input class="in cf-h" type="time" value="${e.hora}" aria-label="Hora"><select class="in cf-y" aria-label="Tipo">${Object.entries(WD.TIPOS_EVENTO).map(([k, t]) => `<option value="${k}" ${k === e.tipo ? 'selected' : ''}>${t.nombre}</option>`).join('')}</select></div>
        ${e.notas ? `<input class="in cf-n" value="${esc(e.notas)}" aria-label="Notas">` : '<input class="cf-n" type="hidden" value="">'}${e.fin !== e.inicio ? `<span class="tiny muted">Hasta el ${esc(WD.fechaLarga(e.fin))}</span>` : ''}${ya(e) ? '<span class="tiny muted">Ya estaba en tu calendario</span>' : ''}</div>`).join('')}</div>
      <div class="row"><span style="flex:1"></span><button class="btn pri" id="cf-add">Agregar al calendario</button></div>`, (box) => {
      box.querySelector('#cf-add').onclick = () => {
        let n = 0;
        box.querySelectorAll('#cf-l [data-i]').forEach((d) => {
          if (!d.querySelector('.cf-ok').checked) return; const e = evs[Number(d.dataset.i)];
          const inicio = d.querySelector('.cf-i').value || e.inicio; const dur = (WD.parseISO(e.fin) - WD.parseISO(e.inicio)) / 864e5; const fin = dur > 0 ? iso(WD.addDays(WD.parseISO(inicio), dur)) : inicio;
          const hora = d.querySelector('.cf-h').value; const notas = d.querySelector('.cf-n').value;
          cal().eventos.push({ id: WD.uid(), tipo: d.querySelector('.cf-y').value, inicio, fin, titulo: d.querySelector('.cf-t').value.trim() || e.titulo, hora, notas: [hora ? `Hora: ${hora}` : '', notas].filter(Boolean).join(' · '), deFoto: true }); n++;
        });
        WD.save(); WD.cerrarDrawer(); if (mes && /^\d{4}-\d{2}$/.test(mes)) mesVista = mes; WD.refrescar(); WD.toast(`${n} actividad${n === 1 ? '' : 'es'} agregada${n === 1 ? '' : 's'} al calendario`, 3000);
      };
    }, 'Puedes tomar varias fotos si el calendario no cabe en una');
  }

  /* ---------- vista ---------- */
  WD.views.calendario = {
    titulo: 'Calendario y CTE',
    render() {
      const c = cal(); const hoy = iso(new Date());
      if (!c.eventos.length) return `<div><h1>Calendario y CTE</h1><p class="muted">Fechas del ciclo escolar, días sin clases y tus sesiones de Consejo Técnico.</p></div>
        <div class="empty"><h3>Carga el calendario de tu ciclo</h3><p class="small">Trae inicio y fin de clases, las 8 sesiones de CTE, días sin clases, vacaciones, registro de calificaciones, el valor de cada mes y los días conmemorativos. Después puedes cambiar lo que quieras.</p>
          <div class="row">${Object.entries(WD.CAL_PRESETS).map(([k, p]) => `<button class="btn pri" data-act="cargarCalendario" data-p="${k}">${esc(p.nombre)}</button>`).join('')}<button class="btn" data-act="nuevoEvento">Empezar sin calendario</button><button class="btn" data-act="calFoto">${WD.icon('camara')} Foto del calendario del mes</button><input type="file" id="cal-foto" accept="image/*" multiple hidden></div></div>`;
      const ym = mesVista || hoy.slice(0, 7); const [y, m] = ym.split('-').map(Number);
      const primero = new Date(y, m - 1, 1); const dias = new Date(y, m, 0).getDate(); const vacios = primero.getDay();
      const celdas = [];
      for (let k = 0; k < vacios; k++) celdas.push('<div></div>');
      for (let d = 1; d <= dias; d++) {
        const f = `${y}-${pad(m)}-${pad(d)}`; const evs = WD.eventosDe(f); const sc = WD.diaSinClases(f); const n = WD.sesionesDe(f).length;
        const finde = [0, 6].includes(new Date(y, m - 1, d).getDay());
        celdas.push(`<button class="cal-d ${f === hoy ? 'hoy' : ''} ${finde ? 'finde' : ''} ${sc ? 'sc' : ''}" data-act="calDia" data-f="${f}"><b class="num">${d}</b>${evs.slice(0, 3).map((e) => chip(e, true)).join('')}${n && !sc ? `<span class="tiny faint">${n} clase${n > 1 ? 's' : ''}</span>` : ''}</button>`);
      }
      const prox = c.eventos.filter((e) => e.tipo !== 'efemeride' && (e.fin || e.inicio) >= hoy).sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 6);
      const ctes = c.eventos.filter((e) => e.tipo === 'cte' || e.tipo === 'cte_intensiva').sort((a, b) => a.inicio.localeCompare(b.inicio));
      return `<div class="row"><div style="flex:1;min-width:0"><h1>Calendario y CTE</h1><p class="muted">${esc((WD.CAL_PRESETS[c.preset] || {}).nombre || 'Mi calendario')}</p></div>
          <button class="btn" data-act="calFoto">${WD.icon('camara')} Foto del calendario del mes</button><button class="btn" data-act="nuevoEvento">${WD.icon('mas')} Agregar fecha</button><input type="file" id="cal-foto" accept="image/*" multiple hidden></div>
        <div class="grid g-cal">
          <div class="card"><div class="card-h"><div class="grow"><h2 style="text-transform:capitalize">${MESES[m - 1]} ${y}</h2>${WD.valorDelMes(ym + '-01') ? `<div class="small muted">Valor del mes: <b>${esc(WD.valorDelMes(ym + '-01'))}</b></div>` : ''}</div>
              <button class="btn sm ghost" data-act="calMes" data-d="-1" aria-label="Mes anterior">${WD.icon('izq')}</button><button class="btn sm" data-act="calMes" data-d="0">Hoy</button><button class="btn sm ghost" data-act="calMes" data-d="1" aria-label="Mes siguiente">${WD.icon('der')}</button></div>
            <div class="cal">${DIAS_CORTOS.map((d) => `<div class="cal-h">${d}</div>`).join('')}${celdas.join('')}</div>
            <div class="legend" style="margin-top:10px">${['cte', 'sin_clases', 'vacaciones', 'registro', 'personal'].map((k) => `<span class="pill ${WD.TIPOS_EVENTO[k].clase}">${WD.TIPOS_EVENTO[k].nombre}</span>`).join('')}</div></div>
          <div class="stack">
            <div class="card"><h2 style="margin-bottom:10px">Próximas fechas</h2><div class="stack" style="gap:6px">${prox.map((e) => `<button class="hit" data-act="verEvento" data-id="${e.id}"><span class="num tiny" style="width:52px;flex:none">${e.inicio.slice(8)} ${MESES[Number(e.inicio.slice(5, 7)) - 1].slice(0, 3)}</span>${chip(e)}</button>`).join('') || '<p class="small muted">Nada próximo.</p>'}</div></div>
            <div class="card"><h2 style="margin-bottom:10px">Sesiones de CTE</h2><div class="stack" style="gap:6px">${ctes.map((e, k) => { const lleno = e.cte && Object.values(e.cte).some((v) => String(v).trim()); return `<button class="hit" data-act="verEvento" data-id="${e.id}"><span class="num tiny" style="width:52px;flex:none">${e.inicio.slice(8)} ${MESES[Number(e.inicio.slice(5, 7)) - 1].slice(0, 3)}</span>${e.tipo === 'cte_intensiva' ? 'Fase intensiva' : `${k}ª sesión ordinaria`}<span class="k">${lleno ? 'registrada' : e.inicio < hoy ? 'sin registro' : ''}</span></button>`; }).join('')}</div></div>
          </div></div>`;
    },
  };
})(window.WD);
