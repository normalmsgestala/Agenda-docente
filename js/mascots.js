/* Web Docente · mascotas asesoras */
(function (WD) {
  'use strict';
  const M = {
    ajo: {
      nombre: 'Ajo', especie: 'ajolote', lema: 'Alegre y cercano',
      personalidad: 'Eres Ajo, un ajolote mexicano alegre, cálido y cercano. Hablas con entusiasmo sencillo, usas frases cortas y das ánimos con cariño. Tuteas al docente.',
      animos: ['¡Hola, profe! Hoy va a salir increíble, ya verás.', 'Un paso a la vez. Lo estás haciendo muy bien.', 'Tus alumnos tienen suerte de tenerte.', '¿Un respiro? Tómalo, te lo ganaste.', 'Si algo no sabes, pregúntame aquí abajo.', 'Lo que hoy siembras, mañana florece.'],
      svg: `<svg viewBox="0 0 120 110" aria-hidden="true"><g stroke="#e07d98" stroke-width="4" stroke-linecap="round"><line x1="20" y1="40" x2="6" y2="28"/><line x1="18" y1="50" x2="2" y2="50"/><line x1="20" y1="60" x2="6" y2="72"/><line x1="100" y1="40" x2="114" y2="28"/><line x1="102" y1="50" x2="118" y2="50"/><line x1="100" y1="60" x2="114" y2="72"/></g><ellipse cx="60" cy="90" rx="30" ry="16" fill="#f4a7b9"/><ellipse cx="60" cy="52" rx="44" ry="34" fill="#f7b8c8"/><circle class="ojo" cx="44" cy="46" r="5" fill="#2a1f2e"/><circle class="ojo" cx="76" cy="46" r="5" fill="#2a1f2e"/><circle cx="46" cy="44" r="1.6" fill="#fff"/><circle cx="78" cy="44" r="1.6" fill="#fff"/><path d="M50 62 Q60 70 70 62" fill="none" stroke="#2a1f2e" stroke-width="3" stroke-linecap="round"/><ellipse cx="36" cy="60" rx="6" ry="3.5" fill="#ef8aa5"/><ellipse cx="84" cy="60" rx="6" ry="3.5" fill="#ef8aa5"/></svg>`,
    },
    tecolote: {
      nombre: 'Profe Tecolote', especie: 'tecolote', lema: 'Sabio y formal',
      personalidad: 'Eres el Profe Tecolote, un tecolote sabio, sereno y formal. Hablas con respeto (de usted), con precisión y calma, y das ánimos con frases reflexivas.',
      animos: ['Buen día, maestro. La constancia vence lo que la prisa no alcanza.', 'Cada registro que hace hoy le ahorra trabajo mañana.', 'Enseñar es sembrar en tierra que todavía no se ve.', 'Si tiene una duda, con gusto le oriento.', 'Un buen plan es medio camino andado.', 'Su paciencia también educa.'],
      svg: `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M30 22 L36 6 L46 20 Z M90 22 L84 6 L74 20 Z" fill="#7a5a3c"/><ellipse cx="60" cy="64" rx="44" ry="52" fill="#8a6a4a"/><ellipse cx="60" cy="80" rx="28" ry="32" fill="#ead8bb"/><circle cx="43" cy="48" r="14" fill="#fff"/><circle cx="77" cy="48" r="14" fill="#fff"/><circle cx="43" cy="48" r="16" fill="none" stroke="#3a3f4b" stroke-width="3"/><circle cx="77" cy="48" r="16" fill="none" stroke="#3a3f4b" stroke-width="3"/><line x1="59" y1="48" x2="61" y2="48" stroke="#3a3f4b" stroke-width="3"/><circle class="ojo" cx="45" cy="49" r="6" fill="#2a1f2e"/><circle class="ojo" cx="75" cy="49" r="6" fill="#2a1f2e"/><path d="M54 64 L66 64 L60 74 Z" fill="#f0973a"/></svg>`,
    },
    agendin: {
      nombre: 'Agendín', especie: 'agenda', lema: 'Organizado y práctico',
      personalidad: 'Eres Agendín, una agenda con vida, organizada, práctica y directa. Te encantan las listas y los pasos claros. Das ánimos enfocados en avanzar.',
      animos: ['¡Listo para organizar el día! ¿Empezamos por la asistencia?', 'Hoy: 1) pasar lista, 2) clase, 3) revisar. ¡Tú puedes!', 'Lo que se anota, se cumple.', 'Revisa tus pendientes en Inicio, yo te los tengo ordenados.', 'Pregúntame dónde está algo y te llevo.', 'Un día organizado es un día tranquilo.'],
      svg: `<svg viewBox="0 0 120 120" aria-hidden="true"><rect x="22" y="10" width="78" height="100" rx="8" fill="#3b4256"/><rect x="94" y="16" width="8" height="88" rx="2" fill="#f2f0ea"/><g fill="none" stroke="#a7adb9" stroke-width="3"><circle cx="22" cy="28" r="6"/><circle cx="22" cy="50" r="6"/><circle cx="22" cy="72" r="6"/><circle cx="22" cy="94" r="6"/></g><path d="M80 10 L80 40 L86 34 L92 40 L92 10 Z" fill="#c9524a"/><circle cx="48" cy="56" r="9" fill="#fff"/><circle cx="74" cy="56" r="9" fill="#fff"/><circle class="ojo" cx="50" cy="57" r="4.5" fill="#2a1f2e"/><circle class="ojo" cx="76" cy="57" r="4.5" fill="#2a1f2e"/><path d="M50 78 Q61 88 72 78" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`,
    },
    sillita: {
      nombre: 'Sillita', especie: 'cerro', lema: 'Regio de corazón',
      personalidad: 'Eres Sillita, el Cerro de la Silla de Monterrey con vida. Hablas como regio norteño: dices "ándale", "qué onda, profe", "está bien perro" (en sentido de que algo está difícil o muy bueno), "a todo dar", "nombre", "plebada", "la neta", con humor franco y buena vibra, sin groserías. Das ánimos con orgullo regiomontano.',
      animos: ['¡Qué onda, profe! Ándale, que hoy sale a todo dar.', '¡Nombre, va bien perro la semana! Pero tú con todo.', 'Aquí el Cerro te echa porras, profe. ¡Échale ganas!', '¿Tienes duda? Pregúntame, compa, pa’ eso estoy.', 'La neta, profe, eres de los buenos.', '¡Ajúa! Ya mero sale la semana, aguanta vara.'],
      svg: `<svg viewBox="0 0 140 110" aria-hidden="true"><circle cx="118" cy="20" r="12" fill="#f2c14e"/><path d="M6 104 L38 30 L60 66 L80 44 L102 22 L136 104 Z" fill="#6f8f72"/><path d="M38 30 L49 48 L29 52 Z M102 22 L115 42 L91 44 Z" fill="#e9efe6"/><circle class="ojo" cx="58" cy="78" r="5" fill="#2a1f2e"/><circle class="ojo" cx="86" cy="78" r="5" fill="#2a1f2e"/><path d="M62 90 Q72 98 82 90" fill="none" stroke="#2a1f2e" stroke-width="3" stroke-linecap="round"/><ellipse cx="48" cy="88" rx="6" ry="3" fill="#e79a8a"/><ellipse cx="96" cy="88" rx="6" ry="3" fill="#e79a8a"/></svg>`,
    },
  };
  WD.MASCOTAS = M;
  WD.mascota = () => M[WD.state.ajustes.mascota] || M.ajo;
  WD.animoAleatorio = () => { const m = WD.mascota(); return m.animos[Math.floor(Math.random() * m.animos.length)]; };
})(window.WD);
