/* Web Docente · Planeación (subir y acomodar) y Horario (solo horas) */
(function (WD) {
  'use strict';
  const { esc } = WD;
  let leyendo = false, abierta = null;

  function crearActividades(planes) {
    planes.forEach((p) => p.sesiones.forEach((s) => { if ((s.criterios || []).length) WD.actividadDeSesion(s, p); }));
  }
  async function subir(file) {
    if (!WD.requiereIA()) return;
    leyendo = file.name; WD.refrescar();
    const t0 = Date.now(); const reloj = setInterval(() => { const el = document.getElementById('pl-seg'); if (el) el.textContent = Math.round((Date.now() - t0) / 1000) + ' s'; else if (!leyendo) clearInterval(reloj); }, 1000);
    try {
      const planes = await WD.ai.leerPlaneacion(file);
      leyendo = false; WD.refrescar();
      const total = planes.reduce((s, p) => s + p.sesiones.length, 0);
      const fechas = planes.flatMap((p) => p.sesiones.map((s) => s.fecha)).sort();
      const m = WD.modal(`<h2>Encontré ${planes.length} planeaci${planes.length === 1 ? 'ón' : 'ones'} con ${total} sesiones</h2>
        <p class="small muted">Del ${esc(WD.fechaLarga(fechas[0]))} al ${esc(WD.fechaLarga(fechas[fechas.length - 1]))}. Cada sesión se acomoda en su día y se crea su lista de evaluación.</p>
        <div class="tbl-wrap" style="max-height:320px;overflow:auto"><table class="tbl"><thead><tr><th>Fecha</th><th>Campo</th><th>Sesión</th><th class="r">Criterios</th></tr></thead><tbody>${planes.flatMap((p) => p.sesiones).sort((a, b) => a.fecha.localeCompare(b.fecha)).map((s) => `<tr><td class="num">${esc(s.fecha)}</td><td>${esc(WD.CAMPO_CORTO[s.campo])}</td><td style="white-space:normal">${esc(s.titulo || s.proyecto)}</td><td class="r">${(s.criterios || []).length}</td></tr>`).join('')}</tbody></table></div>
        <div class="row" style="justify-content:flex-end"><button class="btn" data-act="cerrarModal">Cancelar</button><button class="btn pri" id="pl-ok">Acomodar en mi agenda</button></div>`);
      m.querySelector('#pl-ok').onclick = () => { WD.state.planeaciones.push(...planes); crearActividades(planes); WD.save(); WD.cerrarModal(); WD.refrescar(); WD.toast('Planeación acomodada en tu agenda'); };
    } catch (e) { leyendo = false; WD.refrescar(); WD.toast(e.message, 5000); }
  }
  WD.act.subirPlan = () => { const i = document.getElementById('in-plan'); i.value = ''; i.click(); };
  WD.act.verPlan = (el) => { abierta = abierta === el.dataset.id ? null : el.dataset.id; WD.refrescar(); };
  WD.act.borrarPlan = async (el) => {
    if (!(await WD.confirmar('Quitar planeación', 'Se quitan sus sesiones de la agenda. Las calificaciones que ya capturaste se conservan en Evaluación.', 'Quitar', true))) return;
    WD.state.planeaciones = WD.state.planeaciones.filter((p) => p.id !== el.dataset.id); WD.save(); WD.refrescar();
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
        <div class="stack" style="justify-items:start">${leyendo ? `<div class="row"><span class="spinner"></span><span class="small">Leyendo “${esc(leyendo)}”… <b id="pl-seg">0 s</b></span></div>` : `<button class="btn pri" data-act="subirPlan">${WD.icon('subir')} Elegir archivo</button>`}
          ${ps.some((p) => p.ejemplo) ? '' : `<button class="btn ghost sm" data-act="planEjemplo">Ver un ejemplo en esta semana</button>`}</div>
        <input type="file" id="in-plan" accept=".pdf,.docx,application/pdf" hidden></div></div>
      ${ps.length ? `<div class="stack">${ps.map((p) => { const f = p.sesiones.map((s) => s.fecha).sort(); const porCampo = WD.CAMPOS.map((c) => [c, p.sesiones.filter((s) => s.campo === c).length]).filter((x) => x[1]); return `<div class="card">
          <div class="card-h"><div class="grow"><h3>${esc(p.nombre)} ${p.ejemplo ? '<span class="pill warn">ejemplo</span>' : ''}</h3><div class="small muted">${esc(p.periodo || '')} · ${p.sesiones.length} sesiones · ${f.length ? `${esc(f[0])} a ${esc(f[f.length - 1])}` : ''}</div></div>
            <div class="row">${porCampo.map(([c, n]) => `<span class="pill">${WD.CAMPO_CORTO[c]} ${n}</span>`).join('')}</div>
            <button class="btn sm" data-act="verPlan" data-id="${p.id}">${abierta === p.id ? 'Ocultar' : 'Ver sesiones'}</button><button class="btn sm ghost danger" data-act="borrarPlan" data-id="${p.id}">Quitar</button></div>
          ${abierta === p.id ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Campo</th><th>Sesión</th><th>Evalúa con</th><th class="r">Criterios</th></tr></thead><tbody>${p.sesiones.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map((s) => `<tr><td class="num">${esc(WD.fechaLarga(s.fecha))}</td><td>${WD.CAMPO_CORTO[s.campo]}</td><td style="white-space:normal"><button class="link" data-act="verSesion" data-id="${s.id}">${esc(s.titulo || s.proyecto)}</button></td><td>${s.instrumento === 'rubrica' ? 'Rúbrica' : 'Lista de cotejo'}</td><td class="r">${(s.criterios || []).length}</td></tr>`).join('')}</tbody></table></div>` : ''}
        </div>`; }).join('')}</div>`
      : `<div class="empty"><h3>Aún no hay planeaciones</h3><p class="small">Cuando subas una, tus clases aparecen en Inicio con su hora y su lista de evaluación.</p></div>`}`;
    },
    after(v) { v.querySelector('#in-plan')?.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) subir(f); }); },
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
