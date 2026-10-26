/* Web Docente · configuración inicial guiada (la primera vez que entra un docente) */
(function (WD) {
  'use strict';
  const { esc } = WD;
  let paso = 0;
  const PASOS = ['Tu escuela', 'Tus alumnos', 'Tu Gemini', 'Tu mascota'];

  WD.necesitaAsistente = () => WD.enAsistente || !WD.state.ajustes.asistenteHecho && !WD.state.alumnos.length && !WD.state.escuela.nombre;

  function dichoMascota(t) { const m = WD.mascota(); return `<div class="row" style="align-items:flex-start;gap:12px;flex-wrap:nowrap"><div style="width:58px;flex:none">${m.svg}</div><div class="bubble">${t}</div></div>`; }

  function contenido() {
    const e = WD.state.escuela; const nombre = (WD.state.docente.nombre || '').split(' ')[0];
    if (paso === 0) return `${dichoMascota(`¡Hola${nombre ? ', ' + esc(nombre) : ''}! Soy ${esc(WD.mascota().nombre)}. Vamos a dejar lista tu agenda en 4 pasos cortitos. Primero, tu escuela.`)}
      <div class="grid g2">
        <label class="field" style="grid-column:1/-1"><span>Nombre de la escuela</span><input class="in" data-bind="escuela.nombre" value="${esc(e.nombre)}" placeholder="Ej. Benito Juárez"></label>
        <label class="field"><span>Clave (C.C.T.)</span><input class="in" data-bind="escuela.cct" value="${esc(e.cct)}" placeholder="Ej. 19DPR0000X"></label>
        <label class="field"><span>Turno</span><select class="in" data-bind="escuela.turno">${['Matutino', 'Vespertino', 'Tiempo completo'].map((x) => `<option ${e.turno === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field"><span>Grado</span><select class="in" data-bind="escuela.grado"><option value="">Elige…</option>${['1°', '2°', '3°', '4°', '5°', '6°'].map((x) => `<option ${e.grado === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field"><span>Grupo</span><input class="in" data-bind="escuela.grupo" value="${esc(e.grupo)}" placeholder="Ej. B" maxlength="3"></label>
      </div><p class="tiny muted">Zona, sector, director y logos los puedes agregar después en Escuela.</p>`;
    if (paso === 1) {
      const n = WD.alumnosActivos().length;
      return `${dichoMascota(n ? `¡Ya tienes ${n} alumnos! Puedes agregar más o seguir.` : 'Ahora tus alumnos. Elige la forma que te sea más fácil.')}
        <div class="stack">
          <div class="card flat" style="background:var(--surface-2);border:0"><div class="stack"><b>Opción rápida: pega la lista</b><p class="small muted">Un alumno por renglón, primero apellidos y luego nombre. Ej.: <i>Pérez García Ana Sofía</i></p>
            <textarea class="in" id="wz-lista" placeholder="Pérez García Ana Sofía&#10;López Martínez Diego&#10;…" style="min-height:120px"></textarea>
            <button class="btn" data-act="wzLista" style="justify-self:start">Agregar a mi grupo</button></div></div>
          <div class="card flat" style="background:var(--surface-2);border:0"><div class="stack"><b>Opción completa: con Excel</b><p class="small muted">Incluye tutor, teléfono y correo para enviar reportes.</p>
            <div class="row"><button class="btn" data-act="plantillaAlumnos">${WD.icon('descargar')} Descargar plantilla</button><button class="btn" data-act="subirAlumnos">${WD.icon('subir')} Subir Excel lleno</button></div>
            <input type="file" id="in-alumnos" accept=".xlsx,.csv" hidden></div></div>
          ${n ? `<p class="small"><span class="pill ok">${n} alumnos guardados</span></p>` : ''}
        </div>`;
    }
    if (paso === 2) return `${dichoMascota(WD.ai.tieneClave() ? '¡Tu Gemini ya está conectado! Con él leo tus planeaciones, te ayudo a evaluar y a redactar reportes.' : 'Conecta tu Gemini para que yo lea tus planeaciones, te ayude a evaluar y redacte reportes. Es gratis y se hace una sola vez.')}
      ${WD.ai.tieneClave() ? '<p><span class="pill ok">✓ Conectado</span></p>' : `<button class="btn pri" data-act="conectarGemini" style="justify-self:start">Conectar mi Gemini</button><p class="tiny muted">Si prefieres hacerlo después, está en Ajustes.</p>`}`;
    return `${dichoMascota('Por último, elige quién te acompaña. Siempre estaré abajo a la derecha: tócame si no sabes algo.')}
      <div class="pet-pick">${Object.entries(WD.MASCOTAS).map(([k, m]) => `<button class="${WD.state.ajustes.mascota === k ? 'on' : ''}" data-act="wzMascota" data-m="${k}" aria-pressed="${WD.state.ajustes.mascota === k}">${m.svg}<b>${esc(m.nombre)}</b><span class="tiny muted">${esc(m.lema)}</span></button>`).join('')}</div>`;
  }

  WD.asistenteHTML = () => `<div class="welcome"><div class="box card" style="width:min(620px,100%)">
      <div class="row"><div class="k" style="flex:1">Agenda Maestro · Paso ${paso + 1} de ${PASOS.length}</div><button class="btn ghost sm" data-act="wzSaltar">Saltar todo</button></div>
      <div class="row" style="gap:6px">${PASOS.map((p, i) => `<span style="flex:1;height:4px;border-radius:4px;background:${i <= paso ? 'var(--accent)' : 'var(--line)'}" title="${p}"></span>`).join('')}</div>
      <h1>${PASOS[paso]}</h1>
      <div class="stack" id="wz-body">${contenido()}</div>
      <div class="row"><button class="btn" data-act="wzAtras" ${paso === 0 ? 'hidden' : ''}>Atrás</button><span style="flex:1"></span>
        <button class="btn pri" data-act="wzSiguiente">${paso === PASOS.length - 1 ? 'Abrir mi agenda' : paso === 1 && !WD.alumnosActivos().length ? 'Lo hago después' : 'Siguiente'}</button></div>
    </div></div>`;

  const repintar = () => {
    const app = document.getElementById('app'); app.innerHTML = WD.asistenteHTML();
    app.querySelector('#in-alumnos')?.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) WD.importarAlumnos(f, repintar); });
  };
  WD.repintarAsistente = repintar;
  const terminar = () => { WD.enAsistente = false; WD.state.ajustes.asistenteHecho = true; WD.save(); paso = 0; WD.ir('inicio'); WD.render(); setTimeout(() => WD.petAbrir && WD.petAbrir(true), 400); };
  WD.act.wzSiguiente = () => { if (paso === PASOS.length - 1) return terminar(); paso++; repintar(); };
  WD.act.wzAtras = () => { paso = Math.max(0, paso - 1); repintar(); };
  WD.act.wzSaltar = terminar;
  WD.act.wzMascota = (el) => { WD.state.ajustes.mascota = el.dataset.m; WD.save(); repintar(); };
  WD.act.wzLista = () => {
    const t = document.getElementById('wz-lista').value;
    const filas = t.split('\n').map((s) => s.replace(/^\s*\d+[\.\)\-\s]+/, '').trim()).filter(Boolean);
    if (!filas.length) { WD.toast('Escribe o pega al menos un nombre.'); return; }
    let n = WD.alumnosActivos().length;
    filas.forEach((s) => {
      let paterno = '', materno = '', nombres = '';
      if (s.includes(',')) { const [ap, nom] = s.split(','); const a = ap.trim().split(/\s+/); paterno = a[0] || ''; materno = a.slice(1).join(' '); nombres = (nom || '').trim(); }
      else { const w = s.split(/\s+/); paterno = w[0] || ''; materno = w.length > 2 ? w[1] : ''; nombres = w.slice(w.length > 2 ? 2 : 1).join(' '); }
      WD.state.alumnos.push({ id: WD.uid(), activo: true, num: String(++n), paterno, materno, nombres });
    });
    WD.save(); WD.toast(`${filas.length} alumnos agregados`); repintar();
  };
})(window.WD);
