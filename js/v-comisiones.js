/* Web Docente · Comisiones y cumpleaños: comisiones del aula por mes (rotar, repartir, enlazar con Banco Estala)
   y cumpleaños del grupo (por mes, aviso en Inicio y felicitación en el proyector). */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DEF = ['Jefe(a) de grupo', 'Subjefe(a)', 'Biblioteca de aula', 'Orden y limpieza', 'Puntualidad y asistencia', 'Material', 'Mediadores de paz', 'Cuidado del agua y las plantas', 'Escolta / honores'];

  function K() {
    const s = WD.state; if (!s.comisiones) s.comisiones = {};
    const k = s.comisiones;
    if (!k.lista) k.lista = DEF.map((nombre) => ({ id: WD.uid(), nombre, sueldo: 10 }));
    k.meses = k.meses || {}; if (k.banco === undefined) k.banco = true;
    return k;
  }
  const mesKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const mesNombre = (k) => { const [y, m] = k.split('-').map(Number); return `${MES[m - 1]} ${y}`; };
  const mesMover = (k, n) => { const [y, m] = k.split('-').map(Number); return mesKey(new Date(y, m - 1 + n, 1)); };
  let mes = mesKey(), tab = 'comisiones';
  const asign = (k = mes) => (K().meses[k] = K().meses[k] || {});
  const alumno = (id) => WD.state.alumnos.find((a) => a.id === id);
  const corto = (a) => [a.nombres, a.paterno].filter(Boolean).join(' ');

  /* ---------- cumpleaños ---------- */
  function nacio(a) {
    const s = String(a.nacimiento || '').trim(); let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return { y: +m[1], m: +m[2], d: +m[3] };
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/); if (m) return { y: +m[3] < 100 ? 2000 + +m[3] : +m[3], m: +m[2], d: +m[1] };
    return null;
  }
  WD.cumplesDe = (fecha) => { const m = +fecha.slice(5, 7), d = +fecha.slice(8, 10); return WD.alumnosActivos().filter((a) => { const n = nacio(a); return n && n.m === m && n.d === d; }); };
  const edad = (a, y) => { const n = nacio(a); return n ? y - n.y : null; };

  WD.act.cumpleFiesta = (el) => {
    const a = alumno(el.dataset.al); if (!a) return; const mz = WD.mascota(); const n = edad(a, new Date().getFullYear());
    const o = document.createElement('div'); o.id = 'expo'; o.className = 'cumple';
    o.innerHTML = `<div class="ex-pag" data-act="cumpleCerrar" style="justify-items:center;text-align:center">
      <div class="cumple-m">${mz.svg}</div><div class="ex-k">${esc(WD.state.escuela.grado ? `${String(WD.state.escuela.grado).replace(/°+$/, '')}° ${WD.state.escuela.grupo || ''}` : 'Tu grupo')} te desea</div>
      <h1 class="ex-h" style="font-size:clamp(48px,8vw,120px)">¡Feliz cumpleaños, ${esc(a.nombres?.split(/\s+/)[0] || corto(a))}!</h1>
      ${n && n > 3 && n < 20 ? `<p class="ex-big" style="color:var(--accent)">¡${n} años!</p>` : ''}<p class="ex-p muted">Toca la pantalla para cerrar</p></div>`;
    document.body.appendChild(o); document.body.classList.add('expo-on');
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (_) {}
  };
  WD.act.cumpleCerrar = () => { document.getElementById('expo')?.remove(); document.body.classList.remove('expo-on'); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (_) {} };

  /* ---------- enlace con Banco Estala: puesto y sueldo del mes actual ---------- */
  function sincronizarBanco() {
    const k = K(); const b = WD.state.banco; if (!k.banco || !b || !b.cuentas) return;
    const a = asign(mesKey()); const por = {};
    k.lista.forEach((c) => (a[c.id] || []).forEach((id) => { (por[id] = por[id] || []).push(c); }));
    Object.entries(b.cuentas).forEach(([id, cta]) => {
      const cs = por[id];
      if (cs) { cta.puesto = cs.map((c) => c.nombre).join(', '); cta.sueldo = cs.reduce((t, c) => t + (Number(c.sueldo) || 0), 0); cta.deComision = true; }
      else if (cta.deComision) { cta.puesto = ''; cta.sueldo = 0; cta.deComision = false; }
    });
  }
  if (WD.onSave) WD.onSave(() => { if (WD.state.comisiones) sincronizarBanco(); });
  const guardar = () => { sincronizarBanco(); WD.save(); WD.refrescar(); };

  /* ---------- acciones de comisiones ---------- */
  WD.act.kMes = (el) => { mes = mesMover(mes, Number(el.dataset.n)); WD.refrescar(); };
  WD.act.kTab = (el) => { tab = el.dataset.t; WD.refrescar(); };
  WD.act.kAsignar = (el) => {
    const c = K().lista.find((x) => x.id === el.dataset.id); const sel = new Set(asign()[c.id] || []); const als = WD.alumnosActivos();
    const ocupados = new Set(Object.entries(asign()).filter(([cid]) => cid !== c.id).flatMap(([, ids]) => ids));
    const pintar = (box) => { box.querySelector('#k-als').innerHTML = als.map((a) => `<button type="button" class="dg-it ${sel.has(a.id) ? 'on' : ''}" data-id="${a.id}">${esc(corto(a))}${ocupados.has(a.id) ? ' ·' : ''}</button>`).join(''); };
    WD.abrirDrawer(c.nombre, `<p class="small muted" style="margin:0">Elige quiénes tienen esta comisión en ${esc(mesNombre(mes))}. El punto indica que ya tiene otra comisión.</p><div class="dg-its" id="k-als"></div><button class="btn pri" id="k-ok" style="justify-self:start">Listo</button>`, (box) => {
      pintar(box);
      box.querySelector('#k-als').addEventListener('click', (e) => { const t = e.target.closest('[data-id]'); if (!t) return; sel.has(t.dataset.id) ? sel.delete(t.dataset.id) : sel.add(t.dataset.id); pintar(box); });
      box.querySelector('#k-ok').onclick = () => { asign()[c.id] = [...sel]; WD.cerrarDrawer(); guardar(); };
    });
  };
  WD.act.kCopiar = () => { const prev = K().meses[mesMover(mes, -1)]; if (!prev) { WD.toast('El mes anterior no tiene comisiones.'); return; } K().meses[mes] = JSON.parse(JSON.stringify(prev)); guardar(); WD.toast('Copiadas del mes anterior'); };
  // Rotar: cada quien pasa a la siguiente comisión de la lista
  WD.act.kRotar = () => {
    const k = K(); const prev = k.meses[mesMover(mes, -1)] || asign(); const n = k.lista.length; const nuevo = {};
    k.lista.forEach((c, i) => { nuevo[k.lista[(i + 1) % n].id] = [...(prev[c.id] || [])]; });
    k.meses[mes] = nuevo; guardar(); WD.toast('Comisiones rotadas');
  };
  // Repartir: todo el grupo queda en alguna comisión, al azar
  WD.act.kRepartir = async () => {
    if (Object.values(asign()).some((x) => x.length) && !(await WD.confirmar('Repartir al azar', `Se reemplazan las comisiones de ${esc(mesNombre(mes))}.`, 'Repartir'))) return;
    const k = K(); const ids = WD.alumnosActivos().map((a) => a.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const nuevo = {}; k.lista.forEach((c) => { nuevo[c.id] = []; }); ids.forEach((id, i) => nuevo[k.lista[i % k.lista.length].id].push(id));
    k.meses[mes] = nuevo; guardar();
  };
  WD.act.kLimpiar = async () => { if (!(await WD.confirmar('Vaciar el mes', `Se quitan todas las comisiones de ${esc(mesNombre(mes))}.`, 'Vaciar', true))) return; K().meses[mes] = {}; guardar(); };
  WD.act.kEditar = () => {
    const k = K();
    WD.abrirDrawer('Comisiones del grupo', `${k.lista.map((c, i) => `<div class="row"><input class="in" style="flex:1" data-bind="comisiones.lista.${i}.nombre" value="${esc(c.nombre)}"><label class="row small" style="gap:6px"><span class="muted">Sueldo</span><input class="in" type="number" min="0" style="width:80px" data-bind="comisiones.lista.${i}.sueldo" value="${c.sueldo ?? 0}"></label><button class="btn sm ghost danger" data-act="kQuitar" data-id="${c.id}" aria-label="Quitar">×</button></div>`).join('')}
      <button class="btn" data-act="kAgregar" style="justify-self:start">${WD.icon('mas')} Agregar comisión</button>
      <label class="row" style="gap:10px"><input type="checkbox" data-bind="comisiones.banco" ${k.banco ? 'checked' : ''}><span>Poner la comisión como puesto en Banco Estala y pagarle ese sueldo semanal</span></label>`);
  };
  WD.act.kAgregar = () => { K().lista.push({ id: WD.uid(), nombre: 'Nueva comisión', sueldo: 10 }); WD.save(); WD.act.kEditar(); WD.refrescar(); };
  WD.act.kQuitar = (el) => { const k = K(); k.lista = k.lista.filter((c) => c.id !== el.dataset.id); Object.values(k.meses).forEach((m) => delete m[el.dataset.id]); sincronizarBanco(); WD.save(); WD.act.kEditar(); WD.refrescar(); };
  WD.act.kProyectar = () => {
    const k = K(); const a = asign();
    const o = document.createElement('div'); o.id = 'expo';
    o.innerHTML = `<div class="ex-pag" data-act="cumpleCerrar"><div class="ex-k">Comisiones de ${esc(mesNombre(mes))}</div>
      <div class="k-proy">${k.lista.map((c) => `<div><b>${esc(c.nombre)}</b><span>${(a[c.id] || []).map((id) => alumno(id)).filter(Boolean).map((x) => esc(corto(x))).join(', ') || '—'}</span></div>`).join('')}</div>
      <p class="ex-p muted" style="font-size:16px">Toca la pantalla para cerrar</p></div>`;
    document.body.appendChild(o); document.body.classList.add('expo-on');
  };
  WD.act.kImprimir = () => {
    const k = K(); const a = asign(); const als = WD.alumnosActivos();
    const orden = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7];
    const cumple = orden.map((m) => { const xs = als.map((x) => ({ x, n: nacio(x) })).filter((o) => o.n && o.n.m === m + 1).sort((p, q) => p.n.d - q.n.d); return `<td style="vertical-align:top;width:25%"><b>${MES[m][0].toUpperCase() + MES[m].slice(1)}</b><br>${xs.map((o) => `${o.n.d} · ${esc(corto(o.x))}`).join('<br>') || '<span style="color:#999">—</span>'}</td>`; });
    WD.vistaDocumento('Comisiones y cumpleaños', `${WD.membrete()}<h2>CUMPLEAÑOS DEL GRUPO</h2>
      <table><tbody>${[0, 4, 8].map((i) => `<tr>${cumple.slice(i, i + 4).join('')}</tr>`).join('')}</tbody></table>
      <h2 style="margin-top:22px">COMISIONES · ${esc(mesNombre(mes).toUpperCase())}</h2>
      <table><thead><tr><th>Comisión</th><th>Responsables</th></tr></thead><tbody>${k.lista.map((c) => `<tr><td>${esc(c.nombre)}</td><td>${(a[c.id] || []).map((id) => alumno(id)).filter(Boolean).map((x) => esc(WD.nombreCompleto(x))).join(', ')}</td></tr>`).join('')}</tbody></table>${WD.piePagina()}`);
  };

  /* ---------- vista ---------- */
  WD.views.comisiones = {
    titulo: 'Comisiones y cumpleaños',
    render() {
      const k = K(); const a = asign(); const als = WD.alumnosActivos(); const hoy = WD.iso(new Date());
      const tabs = `<div class="tabs">${[['comisiones', 'Comisiones'], ['cumples', 'Cumpleaños']].map(([t, n]) => `<button class="${tab === t ? 'on' : ''}" data-act="kTab" data-t="${t}">${n}</button>`).join('')}</div>`;
      let cuerpo;
      if (!als.length) cuerpo = '<p class="small muted">Carga a tus alumnos en Mi grupo.</p>';
      else if (tab === 'comisiones') {
        const sin = als.filter((x) => !Object.values(a).some((ids) => ids.includes(x.id)));
        cuerpo = `<div class="row"><button class="btn sm ghost" data-act="kMes" data-n="-1" aria-label="Mes anterior">${WD.icon('izq')}</button><b style="min-width:150px;text-align:center;text-transform:capitalize">${esc(mesNombre(mes))}</b><button class="btn sm ghost" data-act="kMes" data-n="1" aria-label="Mes siguiente">${WD.icon('der')}</button>
            <span style="flex:1"></span><button class="btn sm" data-act="kCopiar">Copiar del mes anterior</button><button class="btn sm" data-act="kRotar">Rotar</button><button class="btn sm" data-act="kRepartir">Repartir al azar</button><button class="btn sm ghost" data-act="kLimpiar">Vaciar</button></div>
          <div class="k-grid">${k.lista.map((c) => `<button class="card k-c" data-act="kAsignar" data-id="${c.id}"><div class="row"><b style="flex:1;text-align:left">${esc(c.nombre)}</b>${k.banco && WD.state.banco && c.sueldo ? `<span class="tiny muted">${esc(WD.state.banco.ajustes?.simbolo || 'EB$')} ${c.sueldo}</span>` : ''}</div>
            <div class="k-m">${(a[c.id] || []).map((id) => alumno(id)).filter(Boolean).map((x) => `<span class="pill">${esc(corto(x))}</span>`).join('') || '<span class="small faint">Toca para asignar</span>'}</div></button>`).join('')}</div>
          ${sin.length ? `<p class="small muted">Sin comisión este mes (${sin.length}): ${sin.map((x) => esc(corto(x))).join(', ')}</p>` : '<p class="small muted">Todo el grupo tiene comisión este mes.</p>'}
          ${k.banco && WD.state.banco ? '<p class="tiny muted">Las comisiones del mes actual se ponen como puesto en Banco Estala y «Pagar sueldos» les paga su sueldo.</p>' : ''}`;
      } else {
        const orden = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7]; const mesHoy = new Date().getMonth();
        const sinFecha = als.filter((x) => !nacio(x));
        cuerpo = `${(() => { const hoyC = WD.cumplesDe(hoy); return hoyC.length ? `<div class="card row"><span class="pill acc">Hoy cumple</span><span style="flex:1">${hoyC.map((x) => esc(corto(x))).join(', ')}</span>${hoyC.map((x) => `<button class="btn sm pri" data-act="cumpleFiesta" data-al="${x.id}">Felicitar a ${esc(x.nombres?.split(/\s+/)[0] || '')}</button>`).join('')}</div>` : ''; })()}
          <div class="k-meses">${orden.map((m) => { const xs = als.map((x) => ({ x, n: nacio(x) })).filter((o) => o.n && o.n.m === m + 1).sort((p, q) => p.n.d - q.n.d);
            return `<div class="card ${m === mesHoy ? 'k-hoy' : ''}"><div class="label" style="text-transform:capitalize">${MES[m]}</div>${xs.length ? xs.map((o) => `<button class="link k-cu" data-act="cumpleFiesta" data-al="${o.x.id}"><b>${o.n.d}</b> ${esc(corto(o.x))}</button>`).join('') : '<span class="small faint">—</span>'}</div>`; }).join('')}</div>
          ${sinFecha.length ? `<p class="small muted">Sin fecha de nacimiento (${sinFecha.length}): ${sinFecha.map((x) => `<a href="#grupo">${esc(corto(x))}</a>`).join(', ')}. Agrégala en su ficha de Mi grupo o en el Excel.</p>` : ''}
          <p class="tiny muted">Toca un nombre para felicitarlo en el proyector. Los cumpleaños también aparecen en la semana de Inicio.</p>`;
      }
      return `<div class="row"><div style="flex:1;min-width:0"><h1>Comisiones y cumpleaños</h1><p class="muted">Responsables del aula cada mes y los cumpleaños del grupo.</p></div>
          ${tab === 'comisiones' ? `<button class="btn" data-act="kEditar">Editar comisiones</button><button class="btn" data-act="kProyectar">${WD.icon('proyector')} Proyectar</button>` : ''}<button class="btn" data-act="kImprimir">${WD.icon('imprimir')} Imprimir</button></div>
        ${tabs}${cuerpo}`;
    },
  };
})(window.WD);
