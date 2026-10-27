/* Web Docente · funciona sin internet: guarda la app en el dispositivo */
const CACHE = 'web-docente-v26';
const ARCHIVOS = ['./', 'index.html', 'app.css', 'config.js', 'icon.svg', 'manifest.webmanifest',
  'js/lib/qrcode.js', 'js/lib/jsQR.js', 'js/util.js', 'js/data.js', 'js/mascots.js', 'js/ai.js', 'js/google.js', 'js/ui.js', 'js/v-inicio.js', 'js/v-grupo.js', 'js/v-wizard.js',
  'js/v-asistencia.js', 'js/v-evaluacion.js', 'js/plan-docx.js', 'js/v-plan.js', 'js/v-incidencias.js', 'js/cal-sep.js', 'js/v-calendario.js', 'js/v-juntas.js', 'js/v-herramientas.js', 'js/v-tombola.js', 'js/v-idai.js', 'js/v-banco.js', 'js/v-banco-alumno.js', 'js/v-control.js', 'js/v-config.js', 'js/main.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Google y Gemini siempre en línea
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
