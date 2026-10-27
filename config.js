/* Configuración de Web Docente.
   googleClientId: pega aquí el "ID de cliente OAuth" de tu proyecto de Google Cloud
   (termina en .apps.googleusercontent.com). Mientras esté vacío, la app guarda solo en el dispositivo.
   googleApiKey: clave de API de Google (solo Drive API, restringida a este sitio). Sirve para que los
   alumnos vean su saldo del banco desde su celular sin iniciar sesión. */
window.WD = window.WD || {};
window.WD.CONFIG = {
  googleClientId: '174034297930-f5lvb5g1d58d5e3fg6rup5bnkp1gp10i.apps.googleusercontent.com',
  googleApiKey: 'AIzaSyDUoYdOFOutUNkgoXGOSdvbxbEstdx1toI',
};
window.WD.VERSION = '26';
