/* Web Docente · Calendario escolar SEP 2026–2027 (Nuevo León) precargado. Cada docente puede editarlo. */
(function (WD) {
  'use strict';
  const E = (tipo, inicio, titulo, fin) => ({ tipo, inicio, fin: fin || inicio, titulo });
  WD.CAL_PRESETS = {
    'sep-2026-2027-nl': {
      nombre: 'Calendario escolar SEP 2026–2027 · Nuevo León',
      trimestres: [['2026-08-31', '2026-11-13'], ['2026-11-16', '2027-03-05'], ['2027-03-08', '2027-07-09']],
      valores: { 8: 'Respeto', 9: 'Lealtad', 10: 'Paciencia', 11: 'Justicia', 12: 'Generosidad', 1: 'Honestidad', 2: 'Amor y amistad', 3: 'Confianza', 4: 'Empatía', 5: 'Responsabilidad', 6: 'Humildad', 7: 'Dignidad' },
      eventos: [
        E('cte_intensiva', '2026-08-24', 'CTE fase intensiva', '2026-08-28'),
        E('inicio', '2026-08-31', 'Inicio de clases'),
        E('sin_clases', '2026-09-16', 'Día de la Independencia · sin clases'),
        E('cte', '2026-09-25', 'Consejo Técnico Escolar · 1ª sesión ordinaria'),
        E('cte', '2026-10-30', 'Consejo Técnico Escolar · 2ª sesión ordinaria'),
        E('sin_clases', '2026-11-02', 'Día de Muertos · sin clases'),
        E('registro', '2026-11-13', 'Registro de calificaciones · 1er trimestre'),
        E('sin_clases', '2026-11-16', 'Aniversario de la Revolución (puente)'),
        E('comunicacion', '2026-11-23', 'Registro y comunicación de resultados', '2026-11-26'),
        E('cte', '2026-11-27', 'Consejo Técnico Escolar · 3ª sesión ordinaria'),
        E('vacaciones', '2026-12-21', 'Vacaciones de invierno', '2027-01-05'),
        E('sin_clases', '2027-01-06', 'Suspensión de labores · Día de Reyes'),
        E('cte', '2027-01-29', 'Consejo Técnico Escolar · 4ª sesión ordinaria'),
        E('sin_clases', '2027-02-01', 'Día de la Constitución (puente)'),
        E('preinscripcion', '2027-02-08', 'Preinscripciones 2027–2028', '2027-02-12'),
        E('cte', '2027-02-26', 'Consejo Técnico Escolar · 5ª sesión ordinaria'),
        E('registro', '2027-03-05', 'Registro de calificaciones · 2º trimestre'),
        E('sin_clases', '2027-03-15', 'Natalicio de Benito Juárez (puente)'),
        E('comunicacion', '2027-03-16', 'Registro y comunicación de resultados', '2027-03-19'),
        E('vacaciones', '2027-03-22', 'Vacaciones de primavera', '2027-04-02'),
        E('cte', '2027-04-30', 'Consejo Técnico Escolar · 6ª sesión ordinaria'),
        E('cte', '2027-05-28', 'Consejo Técnico Escolar · 7ª sesión ordinaria'),
        E('cte', '2027-06-25', 'Consejo Técnico Escolar · 8ª sesión ordinaria'),
        E('registro', '2027-07-02', 'Registro de calificaciones · 3er trimestre'),
        E('comunicacion', '2027-07-08', 'Registro y comunicación de resultados'),
        E('inicio', '2027-07-09', 'Fin de clases · cierre del ciclo escolar'),
        ...[['2026-09-13', 'Gesta heroica de los Niños Héroes'], ['2026-09-15', 'Grito de Independencia'], ['2026-09-19', 'Día Nacional de Protección Civil'], ['2026-09-20', 'Fundación de Monterrey (1596)'], ['2026-09-27', 'Consumación de la Independencia'], ['2026-09-30', 'Natalicio de José María Morelos'],
          ['2026-10-12', 'Día de la Nación Pluricultural'], ['2026-10-16', 'Día Mundial de la Alimentación'], ['2026-10-24', 'Día de las Naciones Unidas'], ['2026-11-20', 'Revolución Mexicana · Día Universal del Niño'], ['2026-11-25', 'Día Internacional de la Eliminación de la Violencia contra la Mujer'],
          ['2026-12-03', 'Día Internacional de las Personas con Discapacidad'], ['2026-12-10', 'Día de los Derechos Humanos'], ['2026-12-12', 'Día de la Virgen de Guadalupe'], ['2027-01-30', 'Día Escolar de la No Violencia y la Paz'], ['2027-02-05', 'Promulgación de la Constitución de 1917'],
          ['2027-02-14', 'Día del Amor y la Amistad'], ['2027-02-19', 'Día del Ejército Mexicano'], ['2027-02-21', 'Día Internacional de la Lengua Materna'], ['2027-02-24', 'Día de la Bandera'], ['2027-03-08', 'Día Internacional de la Mujer'], ['2027-03-18', 'Expropiación petrolera (1938)'],
          ['2027-03-21', 'Natalicio de Benito Juárez · Inicio de la primavera'], ['2027-03-22', 'Día Mundial del Agua'], ['2027-04-02', 'Día Internacional del Libro Infantil'], ['2027-04-22', 'Día de la Tierra'], ['2027-04-23', 'Día Mundial del Libro'], ['2027-04-30', 'Día del Niño y la Niña'],
          ['2027-05-05', 'Batalla de Puebla (1862)'], ['2027-05-10', 'Día de las Madres'], ['2027-05-15', 'Día del Maestro'], ['2027-05-31', 'Día Mundial sin Tabaco'], ['2027-06-08', 'Día Mundial de los Océanos'], ['2027-06-20', 'Día del Padre']].map(([f, t]) => E('efemeride', f, t)),
      ],
    },
  };
  WD.TIPOS_EVENTO = {
    inicio: { nombre: 'Inicio / fin de clases', clase: 'acc', sinClase: false },
    cte_intensiva: { nombre: 'CTE fase intensiva', clase: 'acc', sinClase: true },
    cte: { nombre: 'CTE sesión ordinaria', clase: 'acc', sinClase: true },
    sin_clases: { nombre: 'Sin clases', clase: 'bad', sinClase: true },
    vacaciones: { nombre: 'Vacaciones', clase: 'warn', sinClase: true },
    registro: { nombre: 'Registro de calificaciones', clase: 'ok', sinClase: false },
    comunicacion: { nombre: 'Comunicación de resultados', clase: 'ok', sinClase: false },
    preinscripcion: { nombre: 'Preinscripciones', clase: '', sinClase: false },
    personal: { nombre: 'Mi evento (junta, entrega…)', clase: 'acc', sinClase: false },
    efemeride: { nombre: 'Día conmemorativo', clase: '', sinClase: false },
  };
})(window.WD);
