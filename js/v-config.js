/* Web Docente · Escuela (datos que llenan los formatos) y Ajustes */
(function (WD) {
  'use strict';
  const { esc } = WD;
  let respaldoHecho = false;

  const CAMPOS_ESC = [
    ['nombre', 'Nombre de la escuela', 'Ej. Benito Juárez'], ['cct', 'C.C.T.', 'Ej. 19DPR0000X'], ['turno', 'Turno', ''],
    ['zona', 'Zona escolar', 'Ej. 82'], ['sector', 'Sector', 'Ej. 03'], ['region', 'Región / Unidad Regional', 'Ej. 11'],
    ['grado', 'Grado', 'Ej. 4°'], ['grupo', 'Grupo', 'Ej. B'], ['fase', 'Fase', 'Ej. 4'], ['ciclo', 'Ciclo escolar', 'Ej. 2026-2027'],
    ['director', 'Director(a)', 'Nombre completo'], ['telefono', 'Teléfono de la escuela', ''], ['correo', 'Correo de la escuela', ''],
    ['direccion', 'Domicilio', 'Calle, número y colonia'], ['municipio', 'Municipio', 'Ej. Monterrey'], ['entidad', 'Estado', 'Ej. Nuevo León'],
  ];
  WD.act.logo = (el) => { const i = document.getElementById('in-logo'); i.dataset.lado = el.dataset.lado; i.value = ''; i.click(); };
  WD.act.quitarLogo = (el) => { WD.state.escuela[el.dataset.lado] = ''; WD.save(); WD.refrescar(); };
  WD.views.escuela = {
    titulo: 'Escuela',
    render() {
      const e = WD.state.escuela;
      return `<div><h1>Escuela</h1><p class="muted">Estos datos llenan solos el membrete, las actas, los reportes y las boletas.</p></div>
      <div class="card"><div class="grid g3">${CAMPOS_ESC.map(([k, t, ph]) => k === 'turno'
        ? `<label class="field"><span>${t}</span><select class="in" data-bind="escuela.turno" data-rerender>${['Matutino', 'Vespertino', 'Tiempo completo'].map((x) => `<option ${e.turno === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>`
        : `<label class="field"><span>${t}</span><input class="in" data-bind="escuela.${k}" data-rerender value="${esc(e[k] || '')}" placeholder="${esc(ph)}"></label>`).join('')}</div>
        <div class="sep" style="margin:16px 0"></div>
        <div class="row" style="gap:20px;align-items:flex-start">${[['logoIzq', 'Logo izquierdo'], ['logoDer', 'Logo derecho']].map(([k, t]) => `<div class="stack" style="justify-items:start"><span class="small muted">${t}</span>${e[k] ? `<img src="${e[k]}" alt="${t}" style="max-height:70px;max-width:140px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:6px">` : '<div class="empty" style="padding:14px 18px">Sin logo</div>'}<div class="row"><button class="btn sm" data-act="logo" data-lado="${k}">${e[k] ? 'Cambiar' : 'Subir imagen'}</button>${e[k] ? `<button class="btn sm ghost" data-act="quitarLogo" data-lado="${k}">Quitar</button>` : ''}</div></div>`).join('')}</div>
        <input type="file" id="in-logo" accept="image/*" hidden></div>
      <div class="stack"><div class="label">Así se ve el membrete</div><div class="preview-doc"><div class="doc">${WD.membrete()}${WD.piePagina()}</div></div></div>`;
    },
    after(v) {
      v.querySelector('#in-logo').addEventListener('change', async (ev) => {
        const f = ev.target.files[0]; if (!f) return;
        try { WD.state.escuela[ev.target.dataset.lado] = await WD.shrinkImage(f, 400, 0.9); WD.save(); WD.refrescar(); } catch (e) { WD.toast('No pude leer la imagen.'); }
      });
    },
  };

  /* ---------- ajustes ---------- */
  WD.act.tema = (el) => { WD.state.ajustes.tema = el.dataset.t; WD.save(); WD.refrescar(); };
  WD.act.mascota = (el) => { WD.state.ajustes.mascota = el.dataset.m; WD.save(); WD.refrescar(); setTimeout(() => WD.petAbrir(), 100); };
  WD.act.quitarGemini = async () => { if (!(await WD.confirmar('Desconectar Gemini', 'Las funciones con IA dejarán de funcionar hasta que lo vuelvas a conectar.', 'Desconectar', true))) return; WD.state.ajustes.geminiKey = ''; WD.state.ajustes.geminiModel = ''; WD.save({ clave: true }); WD.refrescar(); };
  WD.act.respaldo = async (el) => {
    el.disabled = true; el.innerHTML = '<span class="spinner"></span> Preparando…';
    try { const z = await WD.respaldoZip(); const e = WD.state.escuela; WD.download(z, `Web_Docente_${(e.grado || '').replace(/\W/g, '')}${e.grupo || ''}_${e.ciclo || ''}_${WD.iso(new Date())}.zip`); respaldoHecho = true; WD.toast('Respaldo descargado'); }
    catch (er) { WD.toast('No se pudo preparar el respaldo.'); }
    WD.refrescar();
  };
  WD.act.restaurar = () => { const i = document.getElementById('in-rest'); i.value = ''; i.click(); };
  WD.act.borrarTodo = async () => {
    if (!respaldoHecho) { WD.toast('Primero descarga el respaldo .zip.'); return; }
    const m = WD.modal(`<h2>Borrar todo para el nuevo ciclo</h2><p class="muted small">Se borran alumnos, asistencia, evaluaciones, planeaciones, incidencias y fotos. Se conservan tu nombre, los datos de la escuela, el horario y tus ajustes.</p><p class="small">Para confirmar escribe <b>BORRAR</b>:</p><input class="in" id="b-ok" autocomplete="off"><div class="row" style="justify-content:flex-end"><button class="btn" data-act="cerrarModal">Cancelar</button><button class="btn danger" id="b-go" disabled>Borrar todo</button></div>`);
    const inp = m.querySelector('#b-ok'), go = m.querySelector('#b-go');
    inp.addEventListener('input', () => { go.disabled = inp.value.trim().toUpperCase() !== 'BORRAR'; });
    go.onclick = async () => { await WD.borrarTodo(); respaldoHecho = false; WD.cerrarModal(); WD.ir('inicio'); WD.toast('Listo. Empieza tu nuevo ciclo.'); };
  };
  WD.act.googleSalir = () => { WD.google.cerrarSesion(); WD.refrescar(); };
  WD.views.ajustes = {
    titulo: 'Ajustes',
    render() {
      const a = WD.state.ajustes; const g = WD.google.estado;
      return `<div><h1>Ajustes</h1></div>
      <div class="grid g2">
        <div class="card stack"><h2>Tú</h2><label class="field"><span>Tu nombre (aparece en “Agenda Maestro”)</span><input class="in" data-bind="docente.nombre" data-rerender value="${esc(WD.state.docente.nombre)}"></label>
          <div class="label" style="margin-top:6px">Apariencia</div><div class="tabs">${[['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(([t, n]) => `<button class="${a.tema === t ? 'on' : ''}" data-act="tema" data-t="${t}">${n}</button>`).join('')}</div></div>
        <div class="card stack"><h2>Tu cuenta de Google</h2>
          ${g.modo === 'google' ? `<p class="small">Conectado como <b>${esc(g.usuario?.correo || '')}</b>. Todo se guarda en la carpeta “Web Docente” de tu Drive.</p><button class="btn" data-act="googleSalir" style="justify-self:start">Cerrar sesión</button>`
            : WD.google.configurado() ? `<p class="small muted">Entra con Google para guardar todo en tu Drive y enviar reportes desde tu Gmail.</p><button class="btn pri" data-act="entrarGoogle" style="justify-self:start">Entrar con Google</button>`
            : `<p class="small muted">Por ahora todo se guarda en este dispositivo. El guardado en Google Drive se activa cuando la app tenga su ID de Google (paso de instalación).</p>`}</div>
      </div>
      <div class="card stack"><div class="card-h" style="margin:0"><h2 class="grow">Tu mascota asesora</h2><span class="small muted">Cada una tiene su personalidad</span></div>
        <div class="pet-pick">${Object.entries(WD.MASCOTAS).map(([k, m]) => `<button class="${a.mascota === k ? 'on' : ''}" data-act="mascota" data-m="${k}" aria-pressed="${a.mascota === k}">${m.svg}<b>${esc(m.nombre)}</b><span class="tiny muted">${esc(m.lema)}</span></button>`).join('')}</div></div>
      <div class="card stack"><h2>Inteligencia artificial (tu Gemini)</h2>
        ${WD.ai.tieneClave() ? `<p class="small"><span class="pill ok">Conectado</span> &nbsp;Modelo: <span class="num">${esc(a.geminiModel || 'automático')}</span></p><div class="row"><button class="btn sm" data-act="conectarGemini">Cambiar clave</button><button class="btn sm ghost danger" data-act="quitarGemini">Desconectar</button></div>`
          : `<p class="small muted">Lee tus planeaciones, propone evaluaciones con foto, redacta reportes y responde en la mascota.</p><button class="btn pri" data-act="conectarGemini" style="justify-self:start">Conectar mi Gemini</button>`}
        <p class="tiny muted">Los nombres de tus alumnos nunca se envían a Gemini: la app los cambia por “Alumno 1, 2…” y los vuelve a poner al recibir la respuesta.</p></div>
      <div class="card stack"><h2>Respaldo y fin de ciclo</h2>
        <p class="small muted">Descarga todo en un archivo comprimido (.zip) con tus datos, un Excel de evaluación y asistencia, y las fotos. Después puedes borrar todo para empezar el nuevo ciclo.</p>
        <div class="row"><button class="btn" data-act="respaldo">${WD.icon('descargar')} 1. Descargar todo (.zip)</button><button class="btn danger" data-act="borrarTodo" ${respaldoHecho ? '' : 'disabled title="Primero descarga el respaldo"'}>2. Borrar todo</button><span style="flex:1"></span><button class="btn ghost sm" data-act="restaurar">Restaurar desde respaldo</button></div>
        <input type="file" id="in-rest" accept=".zip,.json" hidden></div>`;
    },
    after(v) {
      v.querySelector('#in-rest').addEventListener('change', async (ev) => {
        const f = ev.target.files[0]; if (!f) return;
        try {
          let json; if (/\.zip$/i.test(f.name)) { const z = await WD.unzip(await f.arrayBuffer()); const k = Object.keys(z).find((x) => x.endsWith('web-docente-datos.json')); if (!k) throw new Error(); json = JSON.parse(new TextDecoder().decode(z[k])); } else json = JSON.parse(await f.text());
          if (!json || !json.docente) throw new Error();
          if (!(await WD.confirmar('Restaurar respaldo', `Se reemplaza lo que hay ahora con el respaldo de <b>${esc(json.docente.nombre || '')}</b> (${(json.alumnos || []).length} alumnos).`, 'Restaurar', true))) return;
          const clave = WD.state.ajustes.geminiKey; WD.replaceState(json); if (!WD.state.ajustes.geminiKey) WD.state.ajustes.geminiKey = clave; WD.save(); WD.ir('inicio'); WD.toast('Respaldo restaurado');
        } catch (e) { WD.toast('Ese archivo no es un respaldo de Web Docente.'); }
      });
    },
  };
})(window.WD);
