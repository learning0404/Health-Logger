const CACHE_NAME = 'health-logger-v6';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

// ---- Caching ----
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// ---- Push Notification Reminders ----
let reminderConfig = null;
let checkInterval = null;
let lastFiredMinute = null;

self.addEventListener('message', e => {
  const data = e.data;
  if (data.type === 'update-reminders') {
    reminderConfig = {
      morningEnabled: data.reminders.morningEnabled,
      morningTime: data.reminders.morningTime,
      eveningEnabled: data.reminders.eveningEnabled,
      eveningTime: data.reminders.eveningTime,
      morningMsg: data.morningMsg,
      eveningMsg: data.eveningMsg,
      lang: data.lang,
    };
    startReminderCheck();
  }
  if (data.type === 'show-notification') {
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: 'health-test',
    });
  }
});

function startReminderCheck() {
  if (checkInterval) clearInterval(checkInterval);
  // Check every 30 seconds
  checkInterval = setInterval(checkReminders, 30000);
  checkReminders(); // immediate check
}

function checkReminders() {
  if (!reminderConfig) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;
  const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${hh}:${mm}`;

  // Don't fire the same minute twice
  if (minuteKey === lastFiredMinute) return;

  if (reminderConfig.morningEnabled && currentTime === reminderConfig.morningTime) {
    lastFiredMinute = minuteKey;
    showReminder('morning');
  }
  if (reminderConfig.eveningEnabled && currentTime === reminderConfig.eveningTime) {
    lastFiredMinute = minuteKey;
    showReminder('evening');
  }
}

function showReminder(type) {
  if (!reminderConfig) return;
  const title = 'Health Logger';
  const body = type === 'morning' ? reminderConfig.morningMsg : reminderConfig.eveningMsg;
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: `health-${type}`,
    data: { flow: type },
    requireInteraction: true,
  });
}

// ---- Notification click → open app to the right flow ----
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const flow = e.notification.data?.flow;

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.registration.scope)) {
          client.focus();
          if (flow) client.postMessage({ type: 'open-flow', flow });
          return;
        }
      }
      // Otherwise open new window
      return self.clients.openWindow('/').then(client => {
        // The new window will auto-detect morning/evening
      });
    })
  );
});
