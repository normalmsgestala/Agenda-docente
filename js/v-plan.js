/* Web Docente · Planeación (subir y acomodar) y Horario (solo horas) */
(function (WD) {
  'use strict';
  const { esc } = WD;
  let leyendo = false, abierta = null;

  function crearActividades(planes) {
    planes.forEach((p) => p.sesiones.forEach((s) => { if ((s.criterios || []).length) WD.actividadDeSesion(s, p); }));
  }
  // Lectura en segundo plano: se puede seguir usando la app; la mascota avisa al terminar
  const ESTADO_TXT = { leyendo: '…', ok: '✓', vacio: '—', error: '✕' };
  function pintarAvance() {
    const box = document.getElementById('pl-avance'); if (!box || !leyendo) return;
    box.innerHTML = WD.CAMPOS.map((c) => { const st = leyendo.avance[c] || 'leyendo'; return `<span class="pill ${st === 'ok' ? 'ok' : st === 'error' ? 'bad' : ''}">${st === 'leyendo' ? '<span class="spinner" style="width:10px;height:10px"></span>' : ESTADO_TXT[st]} ${WD.CAMPO_CORTO[c]}</span>`; }).join('');
    const seg = document.getElementById('pl-seg'); if (seg) seg.textContent = Math.round((Date.now() - leyendo.t0) / 1000) + ' s';
  }
  async function subir(file) {
    // Word con el formato de tablas por sesión: se lee directo, al instante y sin IA
    if (/\.docx$/i.test(file.name)) {
      try {
        const planes = await WD.leerPlaneacionDocx(file);
        if (planes && planes.length) {
          WD.state.planeaciones.push(...planes); crearActividades(planes); WD.save(); WD.refrescar();
          const n = planes.reduce((k, p) => k + p.sesiones.length, 0);
          const porCampo = WD.CAMPOS.map((c) => `${WD.CAMPO_CORTO[c]} ${planes[0].sesiones.filter((s) => s.campo === c).length}`).join(', ');
          WD.petDecir(`¡Listo! Leí tu Word al instante: ${n} sesiones (${porCampo}), con inicio, desarrollo, cierre y su instrumento de evaluación.`, 'inicio');
          return;
        }
      } catch (e) { console.warn('No se pudo leer el Word directo', e); }
    }
    if (!WD.requiereIA()) return;
    if (leyendo) { WD.toast('Ya estoy leyendo una planeación. Espera a que termine.'); return; }
    leyendo = { nombre: file.name, t0: Date.now(), avance: {} }; WD.refrescar();
    WD.toast('Estoy leyendo tu planeación. Puedes seguir usando la app, yo te aviso.', 4000);
    const reloj = setInterval(pintarAvance, 1000);
    try {
      const { planes, doc, errores } = await WD.ai.leerPlaneacion(file, (campo, st) => { leyendo.avance[campo] = st; pintarAvance(); });
      const docId = WD.uid(); await WD.kv.set('plandoc:' + docId, doc);
      planes.forEach((p) => { p.docId = docId; });
      WD.state.planeaciones.push(...planes); crearActividades(planes); WD.save();
      const total = planes.reduce((k, p) => k + p.sesiones.length, 0); const seg = Math.round((Date.now() - leyendo.t0) / 1000);
      leyendo = false; clearInterval(reloj);
      if (['planeacion', 'inicio', 'horario'].includes(WD.ruta())) WD.refrescar();
      const faltan = errores.length ? ` No pude leer ${errores.map((c) => WD.CAMPO_CORTO[c]).join(', ')}; vuelve a subir el archivo para intentarlo.` : '';
      WD.petDecir(`¡Listo! Acomodé ${total} sesiones de “${file.name}” en tu agenda en ${seg} segundos.${faltan} Toca una clase en Inicio para ver su detalle.`, 'inicio');
    } catch (e) { leyendo = false; clearInterval(reloj); WD.refrescar(); WD.petDecir('No pude leer la planeación. ' + e.message); }
  }
  WD.act.subirPlan = () => { const i = document.getElementById('in-plan'); i.value = ''; i.click(); };
  WD.act.verPlan = (el) => { abierta = abierta === el.dataset.id ? null : el.dataset.id; WD.refrescar(); };
  WD.act.borrarPlan = async (el) => {
    if (!(await WD.confirmar('Quitar planeación', 'Se quitan sus sesiones de la agenda. Las calificaciones que ya capturaste se conservan en Evaluación.', 'Quitar', true))) return;
    const p = WD.state.planeaciones.find((x) => x.id === el.dataset.id);
    WD.state.planeaciones = WD.state.planeaciones.filter((x) => x.id !== el.dataset.id);
    if (p && p.docId && !WD.state.planeaciones.some((x) => x.docId === p.docId)) WD.kv.del('plandoc:' + p.docId);
    WD.save(); WD.refrescar();
  };
  WD.act.planEjemplo = () => {
    const lun = WD.lunesDe(new Date()); const d = (k) => WD.iso(WD.addDays(lun, k));
    const S = (k, campo, titulo, proyecto, fase, crit) => ({ id: WD.uid(), numero: k + 1, fecha: d(k), campo, titulo, proyecto, faseProyecto: fase, paginas: '', pda: 'C1 (P1)', inicio: '- Recuperar saberes previos con preguntas.\n- Presentar el propósito de la sesión.', desarrollo: '- Trabajar el apartado del libro en equipos.\n- Registrar en la libreta lo aprendido.', cierre: '- Compartir en plenaria.\n- Acuerdos para la siguiente sesión.', recursos: 'Libro de proyectos, libreta', evidencias: 'Registro en libreta', instrumento: k % 2 ? 'rubrica' : 'cotejo', criterios: crit, ajustes: '' });
    const p = { id: WD.uid(), nombre: 'Planeación de ejemplo', periodo: 'Semana actual', archivo: 'ejemplo', subida: Date.now(), ejemplo: true, sesiones: [
      S(0, 'Lenguajes', 'Identificamos carteles y avisos de la comunidad', 'Carteles que cuidan', 'Identificamos', ['Identifica la función de un cartel', 'Reconoce sus partes', 'Participa en el diálogo']),
      S(0, 'Saberes y pensamiento científico', 'Medimos y comparamos estaturas', 'Mi cuerpo crece', 'Indagamos', ['Mide con unidades convencionales', 'Registra datos en tabla']),
      S(1, 'Ética, naturaleza y sociedades', 'Límites corporales y espacio personal', 'Mi burbuja', 'Planificamos', ['Reconoce sus límites', 'Respeta el espacio de otros', 'Expresa cómo se siente']),
      S(2, 'De lo humano y lo comunitario', 'Juegos cooperativos en el patio', 'Jugamos juntos', 'Vivimos la experiencia', ['Colabora con su equipo', 'Respeta reglas del juego']),
      S(3, 'Lenguajes', 'Diseñamos nuestro cartel', 'Carteles que cuidan', 'Diseñamos', ['Propone ideas para el cartel', 'Escribe un mensaje claro', 'Usa imágenes de apoyo']),
      S(4, 'Saberes y pensamiento científico', 'Presentamos resultados', 'Mi cuerpo crece', 'Comunicamos', ['Explica sus resultados', 'Usa la tabla como apoyo']),
    ] };
    WD.state.planeaciones.push(p); crearActividades([p]); WD.save(); WD.refrescar(); WD.toast('Ejemplo cargado en esta semana. Puedes quitarlo cuando quieras.');
  };

  WD.views.planeacion = {
    titulo: 'Planeación',
    render() {
      const ps = WD.state.planeaciones.slice().sort((a, b) => (a.sesiones[0]?.fecha || '').localeCompare(b.sesiones[0]?.fecha || ''));
      return `<div class="row"><div style="flex:1;min-width:0"><h1>Planeación</h1><p class="muted">Sube tu planeación tal cual la haces. La IA la lee, acomoda cada sesión en su día y arma qué se evalúa.</p></div></div>
      <div class="card"><div class="row" style="gap:16px;align-items:flex-start">
        <div style="flex:1;min-width:240px" class="stack"><h2>Subir planeación</h2><p class="small muted">PDF o Word. Puede ser una sola (una quincena) o varias juntas (todo el trimestre o el ciclo).</p>
          ${WD.ai.tieneClave() ? '' : '<p class="note small">Para leer planeaciones se usa tu Gemini. Se conecta una sola vez.</p>'}</div>
        <div class="stack" style="justify-items:start">${leyendo ? `<div class="stack" style="gap:6px"><div class="row"><span class="small">Leyendo “${esc(leyendo.nombre)}” · <b id="pl-seg">${Math.round((Date.now() - leyendo.t0) / 1000)} s</b></span></div><div class="row" id="pl-avance"></div><span class="tiny muted">Puedes seguir usando la app; te aviso al terminar.</span></div>` : `<button class="btn pri" data-act="subirPlan">${WD.icon('subir')} Elegir archivo</button>`}
          ${ps.some((p) => p.ejemplo) || leyendo ? '' : `<button class="btn ghost sm" data-act="planEjemplo">Ver un ejemplo en esta semana</button>`}</div>
        <input type="file" id="in-plan" accept=".pdf,.docx,application/pdf" hidden></div></div>
      ${ps.length ? `<div class="stack">${ps.map((p) => { const f = p.sesiones.map((s) => s.fecha).sort(); const porCampo = WD.CAMPOS.map((c) => [c, p.sesiones.filter((s) => s.campo === c).length]).filter((x) => x[1]); return `<div class="card">
          <div class="card-h"><div class="grow"><h3>${esc(p.nombre)} ${p.ejemplo ? '<span class="pill warn">ejemplo</span>' : ''}</h3><div class="small muted">${esc(p.periodo || '')} · ${p.sesiones.length} sesiones · ${f.length ? `${esc(f[0])} a ${esc(f[f.length - 1])}` : ''}</div></div>
            <div class="row">${porCampo.map(([c, n]) => `<span class="pill">${WD.CAMPO_CORTO[c]} ${n}</span>`).join('')}</div>
            <button class="btn sm" data-act="verPlan" data-id="${p.id}">${abierta === p.id ? 'Ocultar' : 'Ver sesiones'}</button><button class="btn sm ghost danger" data-act="borrarPlan" data-id="${p.id}">Quitar</button></div>
          ${abierta === p.id ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Campo</th><th>Sesión</th><th>Evalúa con</th><th class="r">Criterios</th></tr></thead><tbody>${p.sesiones.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map((s) => `<tr><td class="num">${esc(WD.fechaLarga(s.fecha))}</td><td>${WD.CAMPO_CORTO[s.campo]}</td><td style="white-space:normal"><button class="link" data-act="verSesion" data-id="${s.id}">${esc(s.titulo || s.proyecto)}</button></td><td>${s.instrumento === 'rubrica' ? 'Rúbrica' : 'Lista de cotejo'}</td><td class="r">${(s.criterios || []).length}</td></tr>`).join('')}</tbody></table></div>` : ''}
        </div>`; }).join('')}</div>`
      : `<div class="empty"><h3>Aún no hay planeaciones</h3><p class="small">Cuando subas una, tus clases aparecen en Inicio con su hora y su lista de evaluación.</p></div>`}`;
    },
    after(v) { v.querySelector('#in-plan')?.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) subir(f); }); pintarAvance(); },
  };

  /* ---------- horario ---------- */
  WD.act.bloqueMas = () => { const bs = WD.state.horario.bloques; const ult = bs[bs.length - 1]; bs.push({ id: WD.uid(), inicio: ult ? ult.fin : '08:00', fin: '', tipo: 'clase' }); WD.save(); WD.refrescar(); };
  WD.act.bloqueMenos = (el) => { WD.state.horario.bloques = WD.state.horario.bloques.filter((b) => b.id !== el.dataset.id); WD.save(); WD.refrescar(); };
  WD.act.turnoPreset = (el) => {
    const mk = (pares) => pares.map(([i, f, t]) => ({ id: WD.uid(), inicio: i, fin: f, tipo: t || 'clase' }));
    WD.state.horario.bloques = el.dataset.t === 'v'
      ? mk([['13:00', '13:50'], ['13:50', '14:40'], ['14:40', '15:30'], ['15:30', '16:00', 'recreo'], ['16:00', '16:50'], ['16:50', '17:40'], ['17:40', '18:00', 'otro']])
      : mk([['08:00', '08:50'], ['08:50', '09:40'], ['09:40', '10:30'], ['10:30', '11:00', 'recreo'], ['11:00', '11:50'], ['11:50', '12:40'], ['12:40', '13:00', 'otro']]);
    WD.state.escuela.turno = el.dataset.t === 'v' ? 'Vespertino' : 'Matutino'; WD.save(); WD.refrescar();
  };
  WD.views.horario = {
    titulo: 'Horario',
    render() {
      const bs = WD.state.horario.bloques; const lun = WD.lunesDe(new Date());
      const dias = [0, 1, 2, 3, 4].map((k) => WD.addDays(lun, k));
      const clases = bs.filter((b) => b.tipo === 'clase');
      const ses = dias.map((d) => WD.sesionesDe(WD.iso(d)).sort((a, b) => WD.CAMPOS.indexOf(a.campo) - WD.CAMPOS.indexOf(b.campo)));
      return `<div class="row"><div style="flex:1;min-width:0"><h1>Horario</h1><p class="muted">Solo pon las horas. Qué clase va cada día lo toma de tu planeación.</p></div>
        <button class="btn sm" data-act="turnoPreset" data-t="m">Usar turno matutino</button><button class="btn sm" data-act="turnoPreset" data-t="v">Usar turno vespertino</button></div>
      <div class="grid g-side">
        <div class="card"><h2 style="margin-bottom:12px">Bloques del día</h2><div class="stack">
          ${bs.map((b, i) => `<div class="row" style="flex-wrap:nowrap"><input class="in" type="time" style="max-width:120px" data-bind="horario.bloques.${i}.inicio" data-rerender value="${b.inicio}" aria-label="Inicio"><span class="faint">a</span><input class="in" type="time" style="max-width:120px" data-bind="horario.bloques.${i}.fin" data-rerender value="${b.fin}" aria-label="Fin">
            <select class="in" style="max-width:110px" data-bind="horario.bloques.${i}.tipo" data-rerender aria-label="Tipo"><option value="clase" ${b.tipo === 'clase' ? 'selected' : ''}>Clase</option><option value="recreo" ${b.tipo === 'recreo' ? 'selected' : ''}>Recreo</option><option value="otro" ${b.tipo === 'otro' ? 'selected' : ''}>Otro</option></select>
            <button class="x" data-act="bloqueMenos" data-id="${b.id}" aria-label="Quitar bloque">×</button></div>`).join('')}
          <button class="btn sm" data-act="bloqueMas" style="justify-self:start">${WD.icon('mas')} Agregar bloque</button></div></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Hora</th>${dias.map((d) => `<th>${WD.DIAS[d.getDay()]} ${d.getDate()}</th>`).join('')}</tr></thead><tbody>
          ${bs.map((b) => { const k = clases.indexOf(b); return `<tr><td class="num">${esc(b.inicio)}–${esc(b.fin)}</td>${dias.map((_, j) => b.tipo === 'recreo' ? '<td class="faint">Recreo</td>' : b.tipo !== 'clase' ? '<td class="faint">—</td>' : `<td style="white-space:normal">${ses[j][k] ? `<button class="link" data-act="verSesion" data-id="${ses[j][k].id}">${esc(WD.CAMPO_CORTO[ses[j][k].campo])}</button>` : '<span class="faint">·</span>'}</td>`).join('')}</tr>`; }).join('')}
        </tbody></table></div></div>
      ${WD.state.planeaciones.length ? '' : '<p class="small muted">Esta semana aún no tiene planeación; cuando la subas, el cuadro se llena solo.</p>'}`;
    },
  };
})(window.WD);
