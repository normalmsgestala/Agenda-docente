/* Web Docente · Atención diferenciada: perfil del grupo (concentrado del diagnóstico), grupos de atención
   (NEE, rezago, alerta socioemocional) con estrategias, y evidencias de atención al rezago por alumno. */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const ESTILOS = ['Auditivo', 'Visual', 'Kinestésico'];
  const TIPOS = { nee: 'Diagnóstico (NEE)', rezago: 'Rezago', socio: 'Alerta socioemocional', otro: 'Otro' };
  function A() {
    const s = WD.state; if (!s.atencion) s.atencion = {};
    const t = s.atencion;
    if (!t.grupos) t.grupos = [
      { id: WD.uid(), nombre: 'Alumnos con diagnóstico (NEE)', tipo: 'nee', alumnos: WD.alumnosActivos().filter((a) => String(a.nee || '').trim()).map((a) => a.id), desc: '', estrategias: '' },
      { id: WD.uid(), nombre: 'Grupo de rezago', tipo: 'rezago', alumnos: [], desc: '', estrategias: '' },
      { id: WD.uid(), nombre: 'Alerta socioemocional', tipo: 'socio', alumnos: [], desc: '', estrategias: '' },
    ];
    t.evidencias = t.evidencias || {}; t.estilos = t.estilos || {}; t.notas = t.notas || '';
    return t;
  }
  const al = (id) => WD.alumno(id); const corto = (a) => [a.nombres, a.paterno].filter(Boolean).join(' ');
  const primera = (tipo) => (WD.state.diagnosticos || []).filter((d) => d.tipo === tipo).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))[0];
  const puntaje = (e, resp) => { const k = e.clave.filter(Boolean).length || e.n; return (e.clave.reduce((t, c, i) => t + (c && resp[i] === c ? 1 : 0), 0) / k) * 10; };
  function perfil() {
    const t = A(); const als = WD.alumnosActivos(); const n = als.length;
    const estilos = ESTILOS.map((e) => [e, als.filter((a) => t.estilos[a.id] === e).length]);
    const di = primera('idai'); const niv = ['Presilábico', 'Silábico', 'Silábico Alfabético', 'Alfabético'];
    const idai = niv.map((x) => [x, di ? als.filter((a) => di.res[a.id]?.nivel === x).length : 0]);
    const ic = primera('ice'); const icePts = (r) => (r && r.rub && Object.keys(r.rub).length ? Object.values(r.rub).filter((v) => v === true).length : null);
    const ice = [['Requiere apoyo', (p) => p < 27], ['En desarrollo', (p) => p >= 27 && p < 38], ['Nivel esperado', (p) => p >= 38]].map(([k, f]) => [k, ic ? als.filter((a) => { const p = icePts(ic.res[a.id]); return p !== null && f(p); }).length : 0]);
    const iceSin = ic ? als.filter((a) => icePts(ic.res[a.id]) === null).length : n;
    const diag = (WD.state.examenes || []).filter((e) => e.tipo === 'diagnostico');
    const prom = WD.CAMPOS.map((c) => { const xs = diag.filter((e) => e.campo === c).flatMap((e) => Object.values(e.res).map((r) => puntaje(e, r.resp))); return [c, xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null]; });
    const conProm = prom.filter(([, v]) => v !== null); const general = conProm.length ? Math.round((conProm.reduce((s, [, v]) => s + v, 0) / conProm.length) * 10) / 10 : null;
    return { n, estilos, idai, ice, iceSin, prom, general, hayIdai: !!di, hayIce: !!ic, grupos: t.grupos };
  }
  const barra = ([k, v], n, html) => html
    ? `<tr><td>${esc(k)}</td><td style="width:45%"><div style="height:8px;border:1px solid #333;border-radius:4px"><div style="height:100%;width:${n ? (v / n) * 100 : 0}%;background:#555"></div></div></td><td style="text-align:right"><b>${v}</b></td></tr>`
    : `<div class="dg-bar"><span class="small">${esc(k)}</span><div><i style="width:${n ? (v / n) * 100 : 0}%"></i></div><b class="small">${v}</b></div>`;

  /* ---------- hojas para la agenda ---------- */
  const tarjeta = (t, s, c) => `<div class="agt"><div class="agt-h"><b>${esc(t)}</b><span>${esc(s)}</span></div>${c}<div class="agt-p">${esc(WD.state.escuela.nombre || '')} · Web Docente</div></div>`;
  WD.hojaPerfil = () => {
    const p = perfil(); const caja = (t, c) => `<div class="agt-c"><b>${t}</b>${c}</div>`;
    return tarjeta('Perfil del grupo', `Concentrado del diagnóstico · ${p.n} alumnos`, `
      <div class="agt-2">${caja('Estilos de aprendizaje', `<table class="agt-b">${p.estilos.map((x) => barra(x, p.n, true)).join('')}</table>`)}
      ${caja('Promedios (examen diagnóstico)', `<p>${p.prom.map(([c, v]) => `${esc(WD.CAMPO_CORTO[c])} <b>${v ?? '—'}</b>`).join(' · ')}<br>General <b>${p.general ?? '—'}</b></p>`)}
      ${caja('IDAI (lectoescritura)', `<table class="agt-b">${p.idai.map((x) => barra(x, p.n, true)).join('')}</table>`)}
      ${caja('ICE (convencionalidades)', `<table class="agt-b">${p.ice.map((x) => barra(x, p.n, true)).join('')}</table>${p.iceSin ? `<p class="agt-n">${p.iceSin} sin registro</p>` : ''}`)}</div>
      ${caja('Alumnos que requieren apoyo', p.grupos.filter((g) => g.alumnos.length).map((g) => `<p><b>${esc(g.nombre)}:</b> ${g.alumnos.map(al).filter(Boolean).map((a) => esc(WD.nombreCompleto(a))).join(', ')}.</p>`).join('') || '<p>—</p>')}
      ${caja('Notas del diagnóstico', `<p style="white-space:pre-wrap">${esc(A().notas)}</p>`)}`);
  };
  WD.hojaAtencion = () => tarjeta('Atención diferenciada', '', A().grupos.map((g) => `<div class="agt-c"><b>${esc(g.nombre)}</b><p class="agt-n" style="margin:0 0 3px">${g.alumnos.map(al).filter(Boolean).map((a) => esc(corto(a))).join(' · ')}${g.desc ? ` · ${esc(g.desc)}` : ''}</p><ul>${String(g.estrategias || '').split('\n').filter((x) => x.trim()).map((x) => `<li>${esc(x.replace(/^[•\-]\s*/, ''))}</li>`).join('')}</ul></div>`).join(''));
  WD.hojaEvidencias = (id) => { const a = al(id); const xs = (A().evidencias[id] || []).slice().sort((p, q) => (p.fecha || '').localeCompare(q.fecha || ''));
    return tarjeta(`Evidencias de atención al rezago`, WD.nombreCompleto(a), `<table class="agt-t agt-g"><thead><tr><th>Fecha</th><th class="l">Dificultad detectada</th><th class="l">Estrategia o actividad aplicada</th></tr></thead><tbody>${xs.map((x) => `<tr><td>${esc((x.fecha || '').slice(5).split('-').reverse().join('/'))}</td><td class="l">${esc(x.dificultad)}</td><td class="l">${esc(x.estrategia)}</td></tr>`).join('')}${Array.from({ length: Math.max(0, 14 - xs.length) }, () => '<tr><td>&nbsp;</td><td></td><td></td></tr>').join('')}</tbody></table>`); };

  /* ---------- acciones ---------- */
  let tab = 'perfil', alSel = null;
  WD.act.atTab = (el) => { tab = el.dataset.t; WD.refrescar(); };
  WD.act.atEstilo = (el) => { const t = A(); t.estilos[el.dataset.al] = t.estilos[el.dataset.al] === el.dataset.e ? '' : el.dataset.e; WD.save(); WD.refrescar(); };
  WD.act.atGrupo = (el) => {
    const t = A(); let g = t.grupos.find((x) => x.id === el.dataset.id);
    if (!g) { g = { id: WD.uid(), nombre: 'Nuevo grupo', tipo: 'otro', alumnos: [], desc: '', estrategias: '' }; t.grupos.push(g); WD.save(); }
    const i = t.grupos.indexOf(g); const sel = new Set(g.alumnos); const als = WD.alumnosActivos();
    WD.abrirDrawer(g.nombre, `<label class="field"><span>Nombre del grupo</span><input class="in" data-bind="atencion.grupos.${i}.nombre" value="${esc(g.nombre)}"></label>
      <label class="field"><span>Tipo</span><select class="in" data-bind="atencion.grupos.${i}.tipo">${Object.entries(TIPOS).map(([k, n]) => `<option value="${k}" ${g.tipo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <div class="label">Alumnos</div><div class="dg-its" id="atg-a"></div>
      <label class="field"><span>Descripción breve (diagnóstico, estilo, nivel)</span><input class="in" data-bind="atencion.grupos.${i}.desc" value="${esc(g.desc)}" placeholder="Ej. kinestésico · IDAI silábico"></label>
      <label class="field"><span>Estrategias (una por renglón)</span><textarea class="in" data-bind="atencion.grupos.${i}.estrategias" style="min-height:140px" placeholder="Consignas breves con apoyo visual&#10;Material concreto: letras móviles, regletas">${esc(g.estrategias)}</textarea></label>
      ${WD.ai.tieneClave() ? `<button class="btn sm" id="atg-ia" style="justify-self:start">${WD.icon('chispa')} Sugerir estrategias con IA</button>` : ''}
      <div class="row"><span style="flex:1"></span><button class="btn ghost danger sm" id="atg-del">Quitar grupo</button></div>`, (box) => {
      const pintar = () => { box.querySelector('#atg-a').innerHTML = als.map((a) => `<button type="button" class="dg-it ${sel.has(a.id) ? 'on' : ''}" data-id="${a.id}">${esc(corto(a))}</button>`).join(''); };
      pintar();
      box.querySelector('#atg-a').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (!b) return; sel.has(b.dataset.id) ? sel.delete(b.dataset.id) : sel.add(b.dataset.id); g.alumnos = [...sel]; WD.save(); pintar(); });
      box.querySelector('#atg-del').onclick = async () => { if (!(await WD.confirmar('Quitar grupo', 'Se quita el grupo y sus estrategias.', 'Quitar', true))) return; t.grupos = t.grupos.filter((x) => x.id !== g.id); WD.save(); WD.cerrarDrawer(); WD.refrescar(); };
      box.querySelector('#atg-ia')?.addEventListener('click', async (e) => {
        const b = e.currentTarget; b.disabled = true; b.textContent = 'Pensando…';
        try { const out = await WD.ai.generar([{ text: `Eres docente de ${String(WD.state.escuela.grado || '4').replace(/°+$/, '')}° de primaria en México (NEM). Propón 5 estrategias concretas, breves y aplicables en el aula para este grupo de atención: «${g.nombre}» (${TIPOS[g.tipo]}). Descripción: ${g.desc || 'sin descripción'}. ${g.alumnos.length} alumno(s). Sin nombres. Devuelve JSON {"estrategias":["...","..."]}` }], { json: true, temperatura: 0.5 });
          g.estrategias = [g.estrategias, ...(out.estrategias || [])].filter((x) => String(x).trim()).join('\n'); WD.save(); WD.act.atGrupo({ dataset: { id: g.id } }); }
        catch (er) { WD.toast(er.message, 4000); b.disabled = false; }
      });
    });
  };
  WD.act.atAlumno = (el) => { alSel = el.dataset.al; WD.refrescar(); };
  WD.act.atEvNueva = () => { const t = A(); (t.evidencias[alSel] = t.evidencias[alSel] || []).push({ id: WD.uid(), fecha: WD.iso(new Date()), dificultad: '', estrategia: '' }); WD.save(); WD.refrescar(); };
  WD.act.atEvBorrar = (el) => { const t = A(); t.evidencias[alSel] = (t.evidencias[alSel] || []).filter((x) => x.id !== el.dataset.id); WD.save(); WD.refrescar(); };
  WD.act.atImprimir = (el) => {
    const q = el.dataset.q;
    if (q === 'perfil') WD.vistaAgenda([WD.hojaPerfil(), WD.hojaAtencion()], 'Perfil del grupo y atención diferenciada');
    else WD.vistaAgenda((q === 'todos' ? [...new Set(A().grupos.filter((g) => g.tipo !== 'socio').flatMap((g) => g.alumnos))] : [alSel]).filter((id) => al(id)).map(WD.hojaEvidencias), 'Evidencias de atención al rezago');
  };

  WD.views.atencion = {
    titulo: 'Atención diferenciada',
    render() {
      const t = A(); const als = WD.alumnosActivos();
      const tabs = `<div class="tabs">${[['perfil', 'Perfil del grupo'], ['grupos', 'Grupos de atención'], ['evidencias', 'Evidencias de rezago']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="atTab" data-t="${k}">${n}</button>`).join('')}</div>`;
      let c;
      if (!als.length) c = '<p class="small muted">Carga a tus alumnos en Mi grupo.</p>';
      else if (tab === 'perfil') {
        const p = perfil();
        c = `<div class="grid g2">
          <div class="card stack"><b>Estilos de aprendizaje</b>${p.estilos.map((x) => barra(x, p.n)).join('')}<p class="tiny muted" style="margin:0">Se marcan abajo, alumno por alumno.</p></div>
          <div class="card stack"><b>Promedios del examen diagnóstico</b><p class="small" style="margin:0">${p.prom.map(([cp, v]) => `${esc(WD.CAMPO_CORTO[cp])} <b>${v ?? '—'}</b>`).join(' · ')}<br>General <b>${p.general ?? '—'}</b></p><p class="tiny muted" style="margin:0">De los exámenes tipo Diagnóstico en Exámenes.</p></div>
          <div class="card stack"><b>IDAI (lectoescritura)</b>${p.idai.map((x) => barra(x, p.n)).join('')}${p.hayIdai ? '' : '<p class="tiny muted" style="margin:0">Captura el IDAI en IDAI / ICE.</p>'}</div>
          <div class="card stack"><b>ICE (convencionalidades)</b>${p.ice.map((x) => barra(x, p.n)).join('')}${p.iceSin ? `<p class="tiny muted" style="margin:0">${p.iceSin} sin registro.</p>` : ''}</div></div>
          <label class="field"><span>Notas del diagnóstico</span><textarea class="in" data-bind="atencion.notas" style="min-height:90px">${esc(t.notas)}</textarea></label>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">Nº</th><th>Alumno</th><th>Estilo de aprendizaje</th></tr></thead><tbody>${als.map((a) => `<tr><td class="c">${esc(a.num || '')}</td><td>${esc(WD.nombreLista(a))}</td><td>${ESTILOS.map((e) => `<button class="btn sm ${t.estilos[a.id] === e ? 'pri' : ''}" data-act="atEstilo" data-al="${a.id}" data-e="${e}">${e}</button>`).join(' ')}</td></tr>`).join('')}</tbody></table></div>`;
      } else if (tab === 'grupos') {
        c = `<div class="k-grid">${t.grupos.map((g) => `<button class="card k-c" data-act="atGrupo" data-id="${g.id}"><div class="row"><b style="flex:1;text-align:left">${esc(g.nombre)}</b><span class="pill">${TIPOS[g.tipo]}</span></div>
          <div class="k-m">${g.alumnos.map(al).filter(Boolean).map((a) => `<span class="pill">${esc(corto(a))}</span>`).join('') || '<span class="small faint">Toca para elegir alumnos</span>'}</div>
          <ul class="small" style="margin:0;padding-left:18px;text-align:left">${String(g.estrategias || '').split('\n').filter((x) => x.trim()).slice(0, 5).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></button>`).join('')}</div>
          <button class="btn" data-act="atGrupo" style="justify-self:start">${WD.icon('mas')} Agregar grupo</button>`;
      } else {
        const ids = [...new Set(t.grupos.filter((g) => g.tipo !== 'socio').flatMap((g) => g.alumnos))].filter((id) => al(id));
        if (!alSel || !al(alSel)) alSel = ids[0] || als[0].id; const xs = t.evidencias[alSel] || []; const ev = (k) => `atencion.evidencias.${alSel}.${xs.indexOf(k)}`;
        c = `<div class="row"><label class="field" style="max-width:320px"><span>Alumno</span><select class="in" id="at-al">${[...ids.map(al), ...als.filter((a) => !ids.includes(a.id))].map((a) => `<option value="${a.id}" ${a.id === alSel ? 'selected' : ''}>${esc(WD.nombreLista(a))}${ids.includes(a.id) ? '' : ' (sin grupo)'}</option>`).join('')}</select></label><span style="flex:1"></span><button class="btn pri" data-act="atEvNueva">${WD.icon('mas')} Registrar evidencia</button></div>
          ${xs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Dificultad detectada</th><th>Estrategia o actividad aplicada</th><th></th></tr></thead><tbody>${xs.map((x) => `<tr><td><input class="in" type="date" data-bind="${ev(x)}.fecha" value="${esc(x.fecha)}"></td><td><input class="in" data-bind="${ev(x)}.dificultad" value="${esc(x.dificultad)}" placeholder="Ej. Confunde b y d"></td><td><input class="in" data-bind="${ev(x)}.estrategia" value="${esc(x.estrategia)}" placeholder="Ej. Letras móviles 10 min"></td><td><button class="btn sm ghost" data-act="atEvBorrar" data-id="${x.id}" aria-label="Quitar">×</button></td></tr>`).join('')}</tbody></table></div>`
            : '<p class="small muted">Sin evidencias de este alumno. Registra cada vez que trabajes con él: la dificultad que viste y lo que aplicaste.</p>'}
          <div class="row"><button class="btn sm" data-act="atImprimir" data-q="uno">${WD.icon('imprimir')} Para la agenda (este alumno)</button><button class="btn sm" data-act="atImprimir" data-q="todos">${WD.icon('imprimir')} Para la agenda (todos los de rezago)</button></div>`;
      }
      return `<div class="row"><div style="flex:1;min-width:0"><h1>Atención diferenciada</h1><p class="muted">Perfil del grupo, grupos de atención con sus estrategias y evidencias de atención al rezago.</p></div><button class="btn" data-act="atImprimir" data-q="perfil">${WD.icon('imprimir')} Para la agenda</button></div>${tabs}${c}`;
    },
    after(v) { v.querySelector('#at-al')?.addEventListener('change', (e) => { alSel = e.target.value; WD.refrescar(); }); },
  };
})(window.WD);
