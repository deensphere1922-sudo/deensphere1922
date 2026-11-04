importScripts('/push-service-worker.js');

const CACHE_VERSION = 'v12';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (e) {}
    await self.clients.claim();
  })());
});

// ============================================================
// LOCAL SCHEDULER — ONLY PINGS OPEN APP WINDOWS.
// The system notification itself is sent by /api/news-cron
// (server push). That is what makes it arrive on a locked phone.
// If the app is open, we ALSO show the in-app modal instantly.
// ============================================================

let _swState = {
  times: null,
  notif: {},
  birthday: null,
  locationLabel: '',
  lastFired: {},
  lastDay: '',
};

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SW_SYNC_PRAYER_TIMES') {
    _swState.times = data.times || null;
    _swState.notif = data.notif || {};
    _swState.birthday = data.birthday || null;
    _swState.locationLabel = data.locationLabel || '';
    _checkAll();
  }
});

function _toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function _pad(n) { return String(n).padStart(2, '0'); }
function _ymd(d) { return d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate()); }

async function _pingOpenClients(msg) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of clients) {
    try {
      const u = new URL(c.url);
      if (u.origin !== self.location.origin) continue;
      if (u.pathname.endsWith('.js')) continue;
      c.postMessage(msg);
    } catch (e) {}
  }
}

function _checkAll() {
  const now = new Date();
  const todayKey = _ymd(now);
  const hh = now.getHours();
  const mm = now.getMinutes();

  if (_swState.lastDay !== todayKey) {
    _swState.lastDay = todayKey;
    _swState.lastFired = {};
  }

  if (_swState.times) {
    for (const key of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      if (!_swState.notif[key]) continue;
      const t = _toDate(_swState.times[key]);
      if (!t) continue;
      const label = key.charAt(0).toUpperCase() + key.slice(1);

      // Prayer minute → play adhan in open app
      if (t.getHours() === hh && t.getMinutes() === mm) {
        const fireKey = todayKey + ':prayer-' + key;
        if (!_swState.lastFired[fireKey]) {
          _swState.lastFired[fireKey] = true;
          _pingOpenClients({ type: 'PLAY_ADHAN', prayer: key });
        }
      }

      // +30 min → show popup in open app
      const checkTime = new Date(t.getTime() + 30 * 60 * 1000);
      if (checkTime.getHours() === hh && checkTime.getMinutes() === mm) {
        const fireKey = todayKey + ':check-' + key;
        if (!_swState.lastFired[fireKey]) {
          _swState.lastFired[fireKey] = true;
          _pingOpenClients({
            type: 'SHOW_PRAYER_MODAL',
            prayer: key,
            title: label + ' Check',
            tag: 'check-' + key,
          });
        }
      }
    }
  }
}

let _swTimer = null;
function _scheduleNext() {
  if (_swTimer) clearTimeout(_swTimer);
  const msToNextMinute = 60000 - (Date.now() % 60000);
  _swTimer = setTimeout(() => {
    _checkAll();
    _scheduleNext();
  }, msToNextMinute);
}
_scheduleNext();

self.addEventListener('activate', () => _checkAll());
self.addEventListener('sync', () => _checkAll());
// self.addEventListener('push', () => _checkAll());