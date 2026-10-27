/* Web Docente · Exposición para los alumnos: la sesión del día en pantalla completa para el proyector
   (portada, PDA, apunte para la libreta y actividad), para no escribir todo en el pizarrón. */
(function (WD) {
  'use strict';
  const { esc } = WD;
  let ses = null, pag = 0, editando = false;
  const buscar = (id) => { let s = null; WD.state.planeaciones.forEach((p) => p.sesiones.forEach((x) => { if (x.id === id) s = x; })); return s; };
  const lineas = (t) => String(t || '').split('\n').map((x) => x.replace(/^[•\-–\d.)\s]+/, '').trim()).filter(Boolean);
  const grado = () => { const g = String(WD.state.escuela.grado || '').replace(/°+$/, ''); return g ? `${g}° de primaria` : 'primaria'; };

  function apunteLocal(s) {
    const frases = (t) => String(t || '').split(/(?<=[.?!])\s+|\n/).map((x) => x.replace(/^[•\-–]\s*/, '').trim()).filter((x) => x.length > 12);
    return { titulo: s.proyecto || s.titulo || '', aprenderemos: '', ideas: frases(s.cierre).slice(0, 3), actividad: s.paginas ? `Trabajamos en el libro: ${s.paginas}.` : '', preguntas: s.pregunta ? [s.pregunta] : [], local: true };
  }
  function paginas(s) {
    const a = s.apunte || apunteLocal(s);
    const pdas = (s.pdaTexto || []).map((p) => p.replace(/…|\.\.\.$/g, '…'));
    const out = [];
    out.push(`<div class="ex-k">${esc(WD.CAMPOS_LARGO?.[s.campo] || s.campo)} · ${esc(WD.fechaLarga(s.fecha))}</div>
      <h1 class="ex-h">${esc(s.proyecto || s.titulo)}</h1>${s.faseProyecto ? `<div class="ex-sub">${esc(s.faseProyecto)}</div>` : ''}
      ${s.pregunta ? `<div class="ex-preg"><span>Pregunta del proyecto</span>${esc(s.pregunta)}</div>` : ''}`);
    out.push(`<div class="ex-k">¿Qué vamos a aprender?</div>${a.aprenderemos ? `<h1 class="ex-h" style="font-size:clamp(34px,4.6vw,64px)">${esc(a.aprenderemos)}</h1>` : ''}
      ${s.contenido ? `<p class="ex-p"><b>Contenido:</b> ${esc(s.contenido)}</p>` : ''}
      ${pdas.length ? `<ul class="ex-pda">${pdas.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : `<p class="ex-p">${esc(s.pda || '')}</p>`}`);
    out.push(`<div class="ex-k">Para tu libreta</div><div class="ex-fecha">${esc(WD.fechaLarga(s.fecha))}</div><h1 class="ex-h" style="font-size:clamp(36px,4.8vw,68px)">${esc(a.titulo)}</h1>
      ${(a.ideas || []).length ? `<ol class="ex-ideas">${a.ideas.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : '<p class="ex-p muted">Toca «Editar» para escribir lo que copiarán.</p>'}`);
    if (a.actividad || (a.preguntas || []).length || s.paginas || (s.tarea && s.tarea !== '—'))
      out.push(`<div class="ex-k">Actividad</div>${a.actividad ? `<p class="ex-big">${esc(a.actividad)}</p>` : ''}
        ${(a.preguntas || []).length ? `<div class="ex-sec">Responde en tu libreta</div><ol class="ex-ideas">${a.preguntas.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
        ${s.paginas ? `<p class="ex-p"><b>Libro:</b> ${esc(s.paginas)}</p>` : ''}${s.tarea && s.tarea !== '—' ? `<p class="ex-p"><b>Tarea:</b> ${esc(s.tarea)}</p>` : ''}`);
    return out;
  }
  function pintar() {
    const el = document.getElementById('expo'); if (!el || !ses) return;
    if (editando) { pintarEditor(el); return; }
    const ps = paginas(ses); pag = Math.max(0, Math.min(pag, ps.length - 1));
    el.innerHTML = `<div class="ex-pag" data-act="exSig">${ps[pag]}</div>
      <div class="ex-bar"><button class="btn" data-act="exAnt" ${pag ? '' : 'disabled'} aria-label="Anterior">${WD.icon('izq')}</button><span class="small muted">${pag + 1} de ${ps.length}</span><button class="btn" data-act="exSig" ${pag < ps.length - 1 ? '' : 'disabled'} aria-label="Siguiente">${WD.icon('der')}</button>
        <span style="flex:1"></span>${ses.apunte?.local || !ses.apunte ? '<span class="tiny muted">Apunte básico</span>' : ''}<button class="btn sm" data-act="exEditar">Editar</button><button class="btn sm" data-act="exCerrar">Cerrar</button></div>`;
  }
  function pintarEditor(el) {
    const a = ses.apunte || apunteLocal(ses);
    el.innerHTML = `<div class="ex-ed card stack"><div class="row"><h2 style="flex:1">Lo que verán los alumnos</h2>${WD.ai.tieneClave() ? `<button class="btn sm" data-act="exIA">${WD.icon('chispa')} Hacerlo con IA</button>` : ''}</div>
      <label class="field"><span>Título para la libreta</span><input class="in" id="ex-t" value="${esc(a.titulo)}"></label>
      <label class="field"><span>Hoy aprenderemos a…</span><input class="in" id="ex-a" value="${esc(a.aprenderemos)}"></label>
      <label class="field"><span>Ideas para copiar (una por renglón)</span><textarea class="in" id="ex-i" style="min-height:130px">${esc((a.ideas || []).join('\n'))}</textarea></label>
      <label class="field"><span>Actividad</span><textarea class="in" id="ex-ac">${esc(a.actividad)}</textarea></label>
      <label class="field"><span>Preguntas para la libreta (una por renglón)</span><textarea class="in" id="ex-p">${esc((a.preguntas || []).join('\n'))}</textarea></label>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-act="exCancelar">Cancelar</button><button class="btn pri" data-act="exGuardar">Guardar y proyectar</button></div></div>`;
  }
  async function generar(el) {
    const box = document.getElementById('expo');
    if (box) box.innerHTML = '<div class="ex-pag" style="place-content:center;text-align:center"><span class="spinner" style="width:42px;height:42px;border-width:4px;justify-self:center"></span><p class="ex-p" style="text-align:center">Preparando el apunte…</p></div>';
    try { ses.apunte = await WD.ai.apunteSesion(ses, grado()); WD.save(); }
    catch (e) { WD.toast(e.message, 4000); if (!ses.apunte) ses.apunte = apunteLocal(ses); }
    editando = false; pintar();
  }
  WD.act.exposicion = (el) => {
    ses = buscar(el.dataset.id); if (!ses) return; pag = 0; editando = false; WD.cerrarDrawer();
    let o = document.getElementById('expo'); if (!o) { o = document.createElement('div'); o.id = 'expo'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Exposición para los alumnos'); document.body.appendChild(o); }
    document.body.classList.add('expo-on');
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (_) {}
    if (!ses.apunte && WD.ai.tieneClave()) generar(); else pintar();
  };
  WD.act.exSig = () => { if (!editando) { pag++; pintar(); } };
  WD.act.exAnt = () => { pag--; pintar(); };
  WD.act.exEditar = () => { editando = true; pintar(); };
  WD.act.exCancelar = () => { editando = false; pintar(); };
  WD.act.exIA = () => generar();
  WD.act.exGuardar = () => {
    const v = (id) => document.getElementById(id).value.trim();
    ses.apunte = { titulo: v('ex-t'), aprenderemos: v('ex-a'), ideas: lineas(v('ex-i')), actividad: v('ex-ac'), preguntas: lineas(v('ex-p')) };
    WD.save(); editando = false; pag = 2; pintar();
  };
  WD.act.exCerrar = () => { document.getElementById('expo')?.remove(); document.body.classList.remove('expo-on'); ses = null; try { if (document.fullscreenElement) document.exitFullscreen(); } catch (_) {} };
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('expo') || editando) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); WD.act.exSig(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); if (pag) WD.act.exAnt(); }
    else if (e.key === 'Escape') { e.stopImmediatePropagation(); WD.act.exCerrar(); }
  }, true);
})(window.WD);
