# Web Docente · Agenda Maestro

App web para el docente: semana con clases, asistencia, evaluación, planeación con IA, horario, incidencias con formatos oficiales y mascotas asesoras. No necesita instalar nada ni compilar: son archivos HTML, CSS y JavaScript.

## Dónde se guardan los datos
- **Sin configurar Google:** en el dispositivo (navegador).
- **Con Google configurado:** cada docente entra con su cuenta y todo se guarda en la carpeta **“Web Docente”** de *su* Google Drive. La clave de Gemini se guarda en una carpeta oculta de su Drive.
- La IA usa el Gemini de cada docente. Los nombres de los alumnos nunca se envían a Gemini.

## Publicar el vínculo (GitHub Pages, gratis)
1. Crea una cuenta en github.com.
2. Crea un repositorio nuevo, por ejemplo `web-docente`.
3. Sube todos los archivos de esta carpeta (botón “Add file › Upload files”).
4. En el repositorio: **Settings › Pages › Branch: main / (root) › Save**.
5. En un par de minutos el vínculo queda así: `https://TU-USUARIO.github.io/web-docente/`.

## Activar “Entrar con Google” (Drive y Gmail)
1. Entra a console.cloud.google.com y crea un proyecto llamado “Web Docente”.
2. **APIs y servicios › Biblioteca**: activa **Google Drive API** y **Gmail API**.
3. **Pantalla de consentimiento OAuth**: tipo “Externo”, nombre “Web Docente”, tu correo. En “Usuarios de prueba” agrega tu correo (hasta 100 personas mientras esté en prueba).
4. **Credenciales › Crear credenciales › ID de cliente OAuth › Aplicación web**.
   - Orígenes de JavaScript autorizados: `https://TU-USUARIO.github.io`
5. Copia el ID (termina en `.apps.googleusercontent.com`) y pégalo en `config.js`:
   ```js
   googleClientId: 'XXXXXXXX.apps.googleusercontent.com',
   ```
6. Sube el `config.js` actualizado a GitHub.

Para venderla a más de 100 docentes, Google pide verificar la app (pantalla de consentimiento › “Publicar app”).

## Archivos
- `index.html`, `app.css`: la página y el diseño (claro y oscuro).
- `js/util.js`: Excel, ZIP y guardado local sin librerías externas.
- `js/data.js`: datos, cálculos de evaluación y asistencia, respaldo.
- `js/ai.js`: conexión con Gemini (planeaciones, fotos, incidencias, mascota).
- `js/google.js`: inicio de sesión, Drive y Gmail.
- `js/ui.js`: menú, paneles, mascota asesora.
- `js/v-*.js`: cada sección.
- `sw.js`: permite abrir la app sin internet.
