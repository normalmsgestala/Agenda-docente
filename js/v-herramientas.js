/* Web Docente · Herramientas de aula (pensadas para el proyector): temporizador, semáforo de ruido, alumno al azar y equipos */
(function (WD) {
  'use strict';
  const { esc } = WD;
  let tab = 'tiempo';

  /* ---------- sonido ---------- */
  let actx = null;
  function sonar(veces = 3) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      for (let k = 0; k < veces; k++) {
        const o = actx.createOscillator(), g = actx.createGain(); const t = actx.currentTime + k * 0.45;
        o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.4);
      }
    } catch (e) {}
  }

  /* ---------- proyector: pantalla limpia y grande ---------- */
  WD.act.proyector = () => { document.body.classList.toggle('proyector'); WD.refrescar(); };

  /* ---------- temporizador ---------- */
  const T = { total: 300, resta: 300, corriendo: false, fin: 0, int: null };
  const fmt = (s) => `${Math.floor(s / 60)}:${WD.pad(Math.floor(s % 60))}`;
  function pintarTiempo() {
    const el = document.getElementById('t-num'); if (!el) return;
    el.textContent = fmt(Math.ceil(T.resta));
    const r = document.getElementById('t-ring'); if (r) { const c = 2 * Math.PI * 120; r.style.strokeDasharray = c; r.style.strokeDashoffset = c * (1 - T.resta / T.total); }
    el.parentElement.classList.toggle('poco', T.resta <= 30 && T.resta > 0); el.parentElement.classList.toggle('fin', T.resta <= 0);
    const b = document.getElementById('t-play'); if (b) b.textContent = T.corriendo ? 'Pausa' : (T.resta < T.total && T.resta > 0 ? 'Continuar' : 'Iniciar');
  }
  function tick() {
    T.resta = Math.max(0, (T.fin - Date.now()) / 1000); pintarTiempo();
    if (T.resta <= 0) { clearInterval(T.int); T.corriendo = false; pintarTiempo(); sonar(4); }
  }
  WD.act.tPreset = (el) => { clearInterval(T.int); T.corriendo = false; T.total = T.resta = Number(el.dataset.s); WD.refrescar(); };
  WD.act.tPlay = () => {
    if (T.corriendo) { clearInterval(T.int); T.corriendo = false; T.resta = Math.max(0, (T.fin - Date.now()) / 1000); pintarTiempo(); return; }
    if (T.resta <= 0) T.resta = T.total;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume && actx.resume(); } catch (e) {}
    T.fin = Date.now() + T.resta * 1000; T.corriendo = true; clearInterval(T.int); T.int = setInterval(tick, 200); pintarTiempo();
  };
  WD.act.tReset = () => { clearInterval(T.int); T.corriendo = false; T.resta = T.total; pintarTiempo(); };
  WD.act.tMas = (el) => { const d = Number(el.dataset.s); if (T.corriendo) { T.fin += d * 1000; T.total = Math.max(T.total, (T.fin - Date.now()) / 1000); } else { T.resta = Math.max(10, T.resta + d); T.total = Math.max(T.total, T.resta); } pintarTiempo(); };

  /* ---------- semáforo de ruido ---------- */
  const R = { stream: null, raf: 0, sens: 50, nivel: 0, color: 'verde', manual: false, pico: 0 };
  function pararMic() { if (R.raf) cancelAnimationFrame(R.raf); R.raf = 0; if (R.stream) R.stream.getTracks().forEach((t) => t.stop()); R.stream = null; }
  window.addEventListener('hashchange', () => { pararMic(); clearInterval(T.int); T.corriendo = false; });
  function pintarSemaforo() {
    const box = document.getElementById('sem'); if (!box) return;
    ['verde', 'amarillo', 'rojo'].forEach((c) => box.querySelector('.luz.' + c).classList.toggle('on', R.color === c));
    const m = document.getElementById('sem-msg'); if (m) m.textContent = { verde: '¡Muy bien! Trabajamos en silencio', amarillo: 'Bajemos un poquito la voz', rojo: '¡Demasiado ruido! Pausa y silencio' }[R.color];
    const b = document.getElementById('sem-barra'); if (b) b.style.width = Math.min(100, R.nivel) + '%';
  }
  WD.act.semMic = async () => {
    if (R.stream) { pararMic(); WD.refrescar(); return; }
    try {
      R.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      actx = actx || new (window.AudioContext || window.webkitAudioContext)(); await actx.resume();
      const src = actx.createMediaStreamSource(R.stream); const an = actx.createAnalyser(); an.fftSize = 1024; src.connect(an);
      const buf = new Float32Array(an.fftSize); R.manual = false; let suave = 0, rojoDesde = 0;
      const loop = () => {
        an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        const rms = Math.sqrt(s / buf.length); const db = 20 * Math.log10(rms + 1e-8); // -100 … 0
        const nivel = Math.max(0, Math.min(100, (db + 70) * 1.6)); suave = suave * 0.85 + nivel * 0.15; R.nivel = suave;
        const umbralRojo = 100 - R.sens * 0.8, umbralAm = umbralRojo - 18;
        const antes = R.color; R.color = suave >= umbralRojo ? 'rojo' : suave >= umbralAm ? 'amarillo' : 'verde';
        if (R.color === 'rojo' && antes !== 'rojo' && Date.now() - rojoDesde > 4000) { rojoDesde = Date.now(); sonar(1); }
        pintarSemaforo(); R.raf = requestAnimationFrame(loop);
      };
      loop(); WD.refrescar();
    } catch (e) { WD.toast('No pude usar el micrófono. Permite el micrófono para esta página o usa el semáforo manual.', 4500); }
  };
  WD.act.semColor = (el) => { if (R.stream) pararMic(); R.manual = true; R.color = el.dataset.c; R.nivel = 0; pintarSemaforo(); };

  /* ---------- alumno al azar ---------- */
  const A = { usados: new Set(), sinRepetir: true, sinFaltas: true, actual: null };
  function candidatos() {
    const hoy = WD.state.asistencia[WD.iso(new Date())] || {};
    let als = WD.alumnosActivos(); if (A.sinFaltas) als = als.filter((a) => !['F', 'J'].includes(hoy[a.id]));
    return als;
  }
  WD.act.azar = (el) => {
    let pool = candidatos(); if (!pool.length) { WD.toast('No hay alumnos para elegir.'); return; }
    if (A.sinRepetir) { const libres = pool.filter((a) => !A.usados.has(a.id)); if (!libres.length) { A.usados.clear(); WD.toast('Ya pasaron todos. Empezamos de nuevo.'); } else pool = libres; }
    const box = document.getElementById('az-nombre'); const btn = el; btn.disabled = true; let k = 0; const vueltas = 16 + Math.floor(Math.random() * 6);
    const elegido = pool[Math.floor(Math.random() * pool.length)];
    const giro = () => {
      const x = k < vueltas ? pool[Math.floor(Math.random() * pool.length)] : elegido;
      if (box) { box.textContent = WD.nombreCompleto(x); box.classList.toggle('elegido', k >= vueltas); }
      if (k++ < vueltas) setTimeout(giro, 40 + k * 9); else { A.actual = elegido.id; A.usados.add(elegido.id); btn.disabled = false; sonar(1); const c = document.getElementById('az-cuenta'); if (c) c.textContent = `${A.usados.size} de ${candidatos().length} ya pasaron`; }
    };
    giro();
  };
  WD.act.azarOpt = (el) => { A[el.dataset.k] = !A[el.dataset.k]; if (el.dataset.k === 'sinRepetir' && !A.sinRepetir) A.usados.clear(); WD.refrescar(); };
  WD.act.azarReiniciar = () => { A.usados.clear(); A.actual = null; WD.refrescar(); };

  /* ---------- equipos ---------- */
  const Q = { modo: 'equipos', n: 5, equipos: [], sinFaltas: true };
  WD.act.eqHacer = () => {
    const hoy = WD.state.asistencia[WD.iso(new Date())] || {};
    let als = WD.alumnosActivos(); if (Q.sinFaltas) als = als.filter((a) => !['F', 'J'].includes(hoy[a.id]));
    if (als.length < 2) { WD.toast('Se necesitan al menos 2 alumnos.'); return; }
    const mez = als.slice(); for (let i = mez.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [mez[i], mez[j]] = [mez[j], mez[i]]; }
    const nEq = Q.modo === 'equipos' ? Math.max(2, Math.min(Q.n, mez.length)) : Math.max(1, Math.ceil(mez.length / Math.max(2, Q.n)));
    Q.equipos = Array.from({ length: nEq }, () => []); mez.forEach((a, i) => Q.equipos[i % nEq].push(a.id));
    sonar(1); WD.refrescar();
  };
  WD.act.eqModo = (el) => { Q.modo = el.dataset.m; WD.refrescar(); };
  WD.act.eqOpt = () => { Q.sinFaltas = !Q.sinFaltas; WD.refrescar(); };
  WD.act.eqImprimir = () => {
    const e = WD.state.escuela;
    WD.vistaDocumento('Equipos', `${WD.membrete()}<h2>EQUIPOS DE TRABAJO · ${esc(e.grado || '')} ${esc(e.grupo || '')}</h2><p style="text-align:center;margin:-6px 0 12px">${esc(WD.fechaLarga(WD.iso(new Date())))}</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${Q.equipos.map((eq, i) => `<div class="box"><div class="t">EQUIPO ${i + 1}</div>${eq.map((id) => `<div>${esc(WD.nombreCompleto(WD.alumno(id) || {}))}</div>`).join('')}</div>`).join('')}</div>`);
  };

  /* ---------- vista ---------- */
  WD.act.herrTab = (el) => { tab = el.dataset.t; if (tab !== 'ruido') pararMic(); WD.refrescar(); };
  WD.views.herramientas = {
    titulo: 'Herramientas de aula',
    render() {
      const pro = document.body.classList.contains('proyector');
      const head = `<div class="row"><div style="flex:1;min-width:0">${pro ? '' : '<h1>Herramientas de aula</h1><p class="muted">Para usar en el salón o en el proyector.</p>'}</div>
        <div class="tabs">${[['tiempo', 'Temporizador'], ['ruido', 'Semáforo de ruido'], ['azar', 'Alumno al azar'], ['equipos', 'Equipos']].map(([t, n]) => `<button class="${tab === t ? 'on' : ''}" data-act="herrTab" data-t="${t}">${n}</button>`).join('')}</div>
        <button class="btn ${pro ? 'pri' : ''}" data-act="proyector">${pro ? 'Salir del proyector' : 'Modo proyector'}</button></div>`;
      if (tab === 'tiempo') {
        const presets = [[60, '1 min'], [180, '3 min'], [300, '5 min'], [600, '10 min'], [900, '15 min'], [1200, '20 min'], [1800, '30 min']];
        return head + `<div class="card herr"><div class="row" style="justify-content:center">${presets.map(([s, n]) => `<button class="btn ${T.total === s ? 'pri' : ''}" data-act="tPreset" data-s="${s}">${n}</button>`).join('')}</div>
          <div class="reloj"><svg viewBox="0 0 260 260" aria-hidden="true"><circle cx="130" cy="130" r="120" fill="none" stroke="var(--line)" stroke-width="12"/><circle id="t-ring" cx="130" cy="130" r="120" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" transform="rotate(-90 130 130)"/></svg><div class="num" id="t-num" role="timer" aria-live="off">${fmt(Math.ceil(T.resta))}</div></div>
          <div class="row" style="justify-content:center"><button class="btn" data-act="tMas" data-s="-60">−1 min</button><button class="btn pri" id="t-play" data-act="tPlay" style="min-width:140px;justify-content:center;font-size:17px;padding:12px 20px">Iniciar</button><button class="btn" data-act="tReset">Reiniciar</button><button class="btn" data-act="tMas" data-s="60">+1 min</button></div>
          <p class="tiny muted" style="text-align:center">Suena al terminar. Se pone en amarillo en los últimos 30 segundos.</p></div>`;
      }
      if (tab === 'ruido') {
        return head + `<div class="card herr"><div class="sem-wrap"><div class="sem" id="sem"><span class="luz rojo" data-act="semColor" data-c="rojo"></span><span class="luz amarillo" data-act="semColor" data-c="amarillo"></span><span class="luz verde" data-act="semColor" data-c="verde"></span></div>
          <div class="stack" style="flex:1;min-width:240px"><h2 id="sem-msg"></h2>
            <div class="barra"><i id="sem-barra"></i></div>
            <button class="btn ${R.stream ? '' : 'pri'}" data-act="semMic" style="justify-self:start">${R.stream ? 'Apagar micrófono' : 'Escuchar el salón con el micrófono'}</button>
            <label class="field" style="max-width:320px"><span>Sensibilidad (más alto = se enoja más fácil)</span><input type="range" min="10" max="100" value="${R.sens}" id="sem-sens"></label>
            <p class="tiny muted">También puedes tocar una luz para cambiarla a mano. El sonido no se graba ni se guarda.</p></div></div></div>`;
      }
      if (tab === 'azar') {
        const n = candidatos().length;
        return head + `<div class="card herr" style="text-align:center"><div class="azar" id="az-nombre">${A.actual && WD.alumno(A.actual) ? esc(WD.nombreCompleto(WD.alumno(A.actual))) : (n ? '¿Quién sigue?' : 'Carga a tus alumnos en Mi grupo')}</div>
          <div class="row" style="justify-content:center"><button class="btn pri" data-act="azar" style="font-size:18px;padding:14px 26px" ${n ? '' : 'disabled'}>Elegir alumno</button><button class="btn" data-act="azarReiniciar">Reiniciar</button></div>
          <div class="row" style="justify-content:center"><label class="row small"><input type="checkbox" data-act="azarOpt" data-k="sinRepetir" ${A.sinRepetir ? 'checked' : ''}> No repetir hasta que pasen todos</label><label class="row small"><input type="checkbox" data-act="azarOpt" data-k="sinFaltas" ${A.sinFaltas ? 'checked' : ''}> Sin los que faltaron hoy</label></div>
          <p class="tiny muted" id="az-cuenta">${A.usados.size ? `${A.usados.size} de ${n} ya pasaron` : `${n} alumnos participan`}</p></div>`;
      }
      return head + `<div class="card herr"><div class="row" style="justify-content:center">
          <div class="tabs"><button class="${Q.modo === 'equipos' ? 'on' : ''}" data-act="eqModo" data-m="equipos">Número de equipos</button><button class="${Q.modo === 'integrantes' ? 'on' : ''}" data-act="eqModo" data-m="integrantes">Alumnos por equipo</button></div>
          <input class="in num" type="number" min="2" max="15" value="${Q.n}" id="eq-n" aria-label="Cantidad">
          <label class="row small"><input type="checkbox" data-act="eqOpt" ${Q.sinFaltas ? 'checked' : ''}> Sin los que faltaron hoy</label>
          <button class="btn pri" data-act="eqHacer">Hacer equipos</button>${Q.equipos.length ? `<button class="btn" data-act="eqImprimir">${WD.icon('imprimir')} Imprimir</button>` : ''}</div>
        ${Q.equipos.length ? `<div class="equipos">${Q.equipos.map((eq, i) => `<div class="equipo"><div class="label">Equipo ${i + 1}</div>${eq.map((id) => `<div>${esc(WD.nombreCompleto(WD.alumno(id) || {}))}</div>`).join('')}</div>`).join('')}</div>` : '<p class="small muted" style="text-align:center">Elige cuántos equipos o cuántos alumnos por equipo y toca “Hacer equipos”.</p>'}</div>`;
    },
    after(v) {
      pintarTiempo(); pintarSemaforo();
      v.querySelector('#sem-sens')?.addEventListener('input', (e) => { R.sens = Number(e.target.value); });
      v.querySelector('#eq-n')?.addEventListener('change', (e) => { Q.n = Math.max(2, Math.min(15, Number(e.target.value) || 2)); });
    },
  };
})(window.WD);
