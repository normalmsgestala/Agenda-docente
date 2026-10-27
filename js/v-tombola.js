/* Web Docente · Tómbola educativa (números, letras y cálculo mental por grado), con voz y modo proyector */
(function (WD) {
  'use strict';
  const { esc } = WD;
  const GRADOS = [
    { id: 'prim_1', label: '1º de Primaria', desc: 'Conteo básico (1 a 10) e identificación visual' },
    { id: 'prim_2', label: '2º de Primaria', desc: 'Números 1 a 32, sumas y restas mentales simples' },
    { id: 'prim_3', label: '3º de Primaria', desc: 'Sumas y restas mentales rápidas' },
    { id: 'prim_4', label: '4º de Primaria', desc: 'Sumas, restas y tablas de multiplicar (1 a 10)' },
    { id: 'prim_5', label: '5º de Primaria', desc: 'Multiplicaciones estratégicas y divisiones sencillas' },
    { id: 'prim_6', label: '6º de Primaria', desc: 'Cálculo mental integral: dobles, mitades y divisiones' },
    { id: 'sec_1', label: '1º de Secundaria', desc: 'Ecuaciones de primer grado simples (x + a = b)' },
    { id: 'sec_2', label: '2º de Secundaria', desc: 'Ecuaciones lineales (ax + b = c)' },
    { id: 'sec_3', label: '3º de Secundaria', desc: 'Incógnita en ambos lados y cuadrados' },
  ];
  const LETRAS = { A: ['Avión', 'A-vión'], B: ['Ballena', 'Ba-lle-na'], C: ['Conejo', 'Co-ne-jo'], D: ['Delfín', 'Del-fín'], E: ['Elote', 'E-lo-te'], F: ['Flor', 'Flor'], G: ['Gato', 'Ga-to'], H: ['Helado', 'He-la-do'], I: ['Isla', 'Is-la'], J: ['Jirafa', 'Ji-ra-fa'], K: ['Koala', 'Ko-a-la'], L: ['León', 'Le-ón'], M: ['Manzana', 'Man-za-na'], N: ['Nube', 'Nu-be'], 'Ñ': ['Ñandú', 'Ñan-dú'], O: ['Oso', 'O-so'], P: ['Perro', 'Pe-rro'], Q: ['Queso', 'Que-so'], R: ['Rana', 'Ra-na'], S: ['Sol', 'Sol'], T: ['Taco', 'Ta-co'], U: ['Uva', 'U-va'], V: ['Vaca', 'Va-ca'], W: ['Waffle', 'Wa-ffle'], X: ['Xilófono', 'Xi-ló-fo-no'], Y: ['Yoyó', 'Yo-yó'], Z: ['Zanahoria', 'Za-na-ho-ria'] };
  const NOMBRES = ['', 'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve', 'Diez', 'Once', 'Doce', 'Trece', 'Catorce', 'Quince', 'Dieciséis', 'Diecisiete', 'Dieciocho', 'Diecinueve', 'Veinte', 'Veintiuno', 'Veintidós', 'Veintitrés', 'Veinticuatro', 'Veinticinco', 'Veintiséis', 'Veintisiete', 'Veintiocho', 'Veintinueve', 'Treinta', 'Treinta y uno', 'Treinta y dos'];
  const MODOS = { numeros: 'Lotería numérica', letras: 'Abecedario', calculo: 'Desafío de cálculo' };
  const S = { grado: null, modo: null, pool: [], salieron: [], actual: null, op: '', respuesta: false, girando: false, voz: true };
  const rnd = (n) => Math.floor(Math.random() * n);
  const gradoDeEscuela = () => { const n = parseInt(WD.state.escuela.grado, 10); return n >= 1 && n <= 6 ? `prim_${n}` : 'prim_4'; };

  function hablar(t) {
    if (!S.voz || !window.speechSynthesis) return;
    speechSynthesis.cancel(); const m = new SpeechSynthesisUtterance(t); const vs = speechSynthesis.getVoices();
    const v = vs.find((x) => /es-MX/i.test(x.lang)) || vs.find((x) => /^es/i.test(x.lang)); if (v) m.voice = v;
    m.lang = 'es-MX'; m.pitch = 1.2; m.rate = 0.9; speechSynthesis.speak(m);
  }
  function operacion(t, g) {
    switch (g) {
      case 'prim_1': return `Identifica: ${t}`;
      case 'prim_2': { if (Math.random() > 0.5 && t > 1) { const p = rnd(t - 1) + 1; return `${p} + ${t - p}`; } const x = rnd(5) + 1; return `${t + x} − ${x}`; }
      case 'prim_3': { if (Math.random() > 0.5 && t > 1) { const p = rnd(t - 1) + 1; return `${p} + ${t - p}`; } const x = rnd(10) + 2; return `${t + x} − ${x}`; }
      case 'prim_4': {
        const c = ['suma', 'resta', 'mult'][rnd(3)];
        if (c === 'mult') { const d = []; for (let i = 1; i <= t; i++) if (t % i === 0 && i <= 10 && t / i <= 10) d.push(i); if (d.length) { const f = d[rnd(d.length)]; return `${f} × ${t / f}`; } }
        if (c === 'resta') { const x = rnd(15) + 5; return `${t + x} − ${x}`; }
        if (t > 1) { const p = rnd(t - 1) + 1; return `${p} + ${t - p}`; } return `${t + 3} − 3`;
      }
      case 'prim_5': {
        const c = ['suma', 'resta', 'mult', 'div'][rnd(4)];
        if (c === 'div') { const m = rnd(4) + 2; return `${t * m} ÷ ${m}`; }
        if (c === 'mult') { const b = Math.floor(t / 5) * 5, r = t - b; if (b > 0 && r > 0) return `(${b / 5} × 5) + ${r}`; if (t % 2 === 0) return `2 × ${t / 2}`; return `(3 × ${Math.floor(t / 3)}) + ${t % 3}`; }
        if (c === 'resta') { const x = rnd(20) + 10; return `${t + x} − ${x}`; }
        if (t > 1) { const p = rnd(t - 1) + 1; return `${p} + ${t - p}`; } return `${t * 4} ÷ 4`;
      }
      case 'prim_6': {
        const c = ['sumresta', 'mitad', 'doble', 'div'][rnd(4)];
        if (c === 'div') { const m = rnd(5) + 3; return `${t * m} ÷ ${m}`; }
        if (c === 'mitad') return `½ de ${t * 2}`;
        if (c === 'doble') { const h = Math.floor(t / 2); return t % 2 ? `(2 × ${h}) + 1` : `2 × ${h}`; }
        if (Math.random() > 0.5 && t > 1) { const p = rnd(t - 1) + 1; return `${p} + ${t - p}`; } const x = rnd(25) + 10; return `${t + x} − ${x}`;
      }
      case 'sec_1': { if (Math.random() > 0.5) { const a = rnd(15) + 1; return `x + ${a} = ${t + a}`; } const a = rnd(10) + 1; return `x − ${a} = ${t - a}`; }
      case 'sec_2': { const b = rnd(5) + 1; return `2x + ${b} = ${2 * t + b}`; }
      case 'sec_3': { if (Math.random() > 0.5) { const b = rnd(6) + 1; return `3x + ${b} = x + ${2 * t + b}`; } return `x² − ${t * t} = 0  (x > 0)`; }
      default: return String(t);
    }
  }
  function iniciar(modo) {
    S.modo = modo; const tam = S.grado === 'prim_1' && modo === 'numeros' ? 10 : 32;
    const lista = modo === 'letras' ? Object.keys(LETRAS) : Array.from({ length: tam }, (_, i) => i + 1);
    for (let i = lista.length - 1; i > 0; i--) { const j = rnd(i + 1); [lista[i], lista[j]] = [lista[j], lista[i]]; }
    S.pool = lista; S.salieron = []; S.actual = null; S.op = ''; S.respuesta = false;
    if (modo !== 'calculo') hablar(`¡Hola! Vamos a jugar ${MODOS[modo]}.`);
  }
  WD.act.tbGrado = (el) => { S.grado = el.value; };
  WD.act.tbModo = (el) => { S.grado = S.grado || gradoDeEscuela(); iniciar(el.dataset.m); WD.refrescar(); };
  WD.act.tbMenu = () => { S.modo = null; if (window.speechSynthesis) speechSynthesis.cancel(); WD.refrescar(); };
  WD.act.tbReiniciar = () => { iniciar(S.modo); WD.refrescar(); };
  WD.act.tbVoz = () => { S.voz = !S.voz; if (!S.voz && window.speechSynthesis) speechSynthesis.cancel(); WD.refrescar(); };
  WD.act.tbRespuesta = () => { S.respuesta = true; WD.refrescar(); hablar(`El resultado es ${S.actual}`); };
  WD.act.tbGirar = () => {
    if (S.girando || !S.pool.length) return;
    S.girando = true; S.respuesta = false; WD.refrescar();
    setTimeout(() => {
      const x = S.pool.pop(); S.salieron.push(x); S.actual = x; S.girando = false;
      if (S.modo === 'calculo') S.op = operacion(x, S.grado);
      else if (S.modo === 'letras') hablar(`La letra ${x}. De ${LETRAS[x][0]}. ${LETRAS[x][1].replace(/-/g, ', ')}.`);
      else hablar(`Es el número ${x}. ${NOMBRES[x] || x}.`);
      WD.refrescar();
    }, 650);
  };

  WD.views.tombola = {
    titulo: 'Tómbola',
    render() {
      const pro = document.body.classList.contains('proyector'); S.grado = S.grado || gradoDeEscuela();
      const g = GRADOS.find((x) => x.id === S.grado);
      if (!S.modo) return `<div class="row"><div style="flex:1;min-width:0"><h1>Tómbola</h1><p class="muted">Juego para el proyector: números, letras y cálculo mental según el grado.</p></div><button class="btn" data-act="proyector">${pro ? 'Salir del proyector' : 'Modo proyector'}</button></div>
        <div class="card stack"><label class="field" style="max-width:360px"><span>Grado</span><select class="in" id="tb-grado">${GRADOS.map((x) => `<option value="${x.id}" ${x.id === S.grado ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label><p class="small muted">${esc(g.desc)}</p></div>
        <div class="grid g3">${[['numeros', '1 2 3', S.grado === 'prim_1' ? 'Del 1 al 10' : 'Del 1 al 32'], ['letras', 'A B C', 'Letra, palabra y sílabas'], ['calculo', '+ − ×', 'Operaciones para resolver']].map(([m, ic, d]) => `<button class="card tb-modo" data-act="tbModo" data-m="${m}"><span class="tb-ic">${ic}</span><b>${MODOS[m]}</b><span class="small muted">${d}</span></button>`).join('')}</div>`;
      const total = S.modo === 'letras' ? Object.keys(LETRAS) : Array.from({ length: S.grado === 'prim_1' && S.modo === 'numeros' ? 10 : 32 }, (_, i) => i + 1);
      let centro = '';
      if (S.girando) centro = '<div class="tb-gira"><span class="spinner" style="width:46px;height:46px;border-width:4px"></span><p class="label" style="margin-top:14px">Sorteando…</p></div>';
      else if (S.actual === null) centro = '<p class="tb-vacio">Gira la tómbola</p>';
      else if (S.modo === 'calculo') centro = `<p class="label">${S.grado.startsWith('sec') ? 'Resuelve para x' : 'Calcula mentalmente'}</p><div class="tb-op">${esc(S.op)}</div>${S.respuesta ? `<div class="tb-resp"><b>${S.actual}</b><span>${esc(NOMBRES[S.actual] || '')}</span></div>` : '<button class="btn" data-act="tbRespuesta" style="font-size:17px;padding:12px 22px">Ver respuesta</button>'}`;
      else if (S.modo === 'letras') { const [pal, sil] = LETRAS[S.actual]; centro = `<div class="tb-num">${esc(S.actual)}</div><div class="tb-pal">${esc(pal)}</div><div class="row" style="justify-content:center">${sil.split('-').map((s) => `<span class="pill" style="font-size:16px;padding:4px 14px">${esc(s)}</span>`).join('')}</div>`; }
      else centro = `<div class="tb-num">${S.actual}</div><div class="tb-pal">${esc(NOMBRES[S.actual] || '')}</div>`;
      return `<div class="row"><button class="btn ghost" data-act="tbMenu">${WD.icon('izq')} Juegos</button><div style="flex:1;text-align:center"><b>${MODOS[S.modo]}</b> <span class="small muted">· ${esc(g.label)} · quedan ${S.pool.length}</span></div>
          <button class="btn sm" data-act="tbVoz">${S.voz ? 'Voz activada' : 'Voz apagada'}</button><button class="btn sm" data-act="tbReiniciar">Reiniciar</button><button class="btn sm ${pro ? 'pri' : ''}" data-act="proyector">${pro ? 'Salir del proyector' : 'Proyector'}</button></div>
        <div class="card tb-centro">${centro}</div>
        <div class="row" style="justify-content:center"><button class="btn pri tb-girar" data-act="tbGirar" ${S.girando || !S.pool.length ? 'disabled' : ''}>${S.pool.length ? '¡Girar!' : '¡Lotería!'}</button></div>
        <div class="tb-reg">${total.map((x) => `<span class="${S.salieron.includes(x) ? 'on' : ''}">${x}</span>`).join('')}</div>`;
    },
    after(v) { v.querySelector('#tb-grado')?.addEventListener('change', (e) => { S.grado = e.target.value; WD.refrescar(); }); if (window.speechSynthesis) speechSynthesis.getVoices(); },
  };
})(window.WD);
