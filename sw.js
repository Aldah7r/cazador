// ============================================================
// SERVICE WORKER — Sistema del Cazador
// Maneja notificaciones en segundo plano
// ============================================================
const CACHE_NAME = 'cazador-v1';

// Schedule state stored in SW memory
let schedule = {
  timeTrain: '17:00',
  timeSummary: '21:00',
  dayPlan: []
};
let timerInterval = null;

// ── Install & activate
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
  startScheduleChecker();
});

// ── Receive messages from main app
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE') {
    schedule.timeTrain    = e.data.timeTrain    || '17:00';
    schedule.timeSummary  = e.data.timeSummary  || '21:00';
    schedule.dayPlan      = e.data.dayPlan      || [];
    startScheduleChecker();
  }
});

// ── Notification click → open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

// ── Schedule checker — runs every minute via setInterval inside SW
function startScheduleChecker() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(checkTime, 60000);
}

const firedToday = {};

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function checkTime() {
  const now    = new Date();
  const hhmm   = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const todayK = getTodayKey();
  const dow    = now.getDay();

  const DAY_LABELS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const dayLabel   = schedule.dayPlan[dow] || DAY_LABELS[dow];
  const dayIcons   = ['🌙','💪','🪢','💪','🪢','💪','🏃'];

  // Training reminder
  if (hhmm === schedule.timeTrain && !firedToday[todayK + '_t']) {
    firedToday[todayK + '_t'] = true;
    self.registration.showNotification('[ SISTEMA ] ¡A entrenar, Cazador!', {
      body: dayIcons[dow] + ' Hoy: ' + dayLabel + '\nRevisa tus misiones del día.',
      tag: 'cazador-train',
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      data: { url: './' }
    });
  }

  // Summary reminder
  if (hhmm === schedule.timeSummary && !firedToday[todayK + '_s']) {
    firedToday[todayK + '_s'] = true;
    self.registration.showNotification('[ SISTEMA ] Resumen del día', {
      body: '¿Completaste tus misiones de hoy?\nAbre la app para ver tu progreso.',
      tag: 'cazador-summary',
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [100, 50, 100],
      requireInteraction: false,
      data: { url: './' }
    });
  }

  // Clean old fired keys (keep only today)
  Object.keys(firedToday).forEach(k => {
    if (!k.startsWith(todayK)) delete firedToday[k];
  });
}
