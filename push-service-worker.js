// /* ============================= PENDING PRAYER STORAGE ============================= */

// const PENDING_DB_NAME = 'deen-sphere-pending';
// const PENDING_DB_VERSION = 1;
// const PENDING_STORE = 'pending-prayers';

// function openPendingDB() {
//   return new Promise((resolve, reject) => {
//     const req = indexedDB.open(PENDING_DB_NAME, PENDING_DB_VERSION);
//     req.onupgradeneeded = () => {
//       const db = req.result;
//       if (!db.objectStoreNames.contains(PENDING_STORE)) {
//         db.createObjectStore(PENDING_STORE, { keyPath: 'id', autoIncrement: true });
//       }
//     };
//     req.onsuccess = () => resolve(req.result);
//     req.onerror = () => reject(req.error);
//   });
// }

// async function savePendingPrayer(prayer, tag) {
//   let db;
//   try {
//     db = await openPendingDB();
//     const tx = db.transaction(PENDING_STORE, 'readwrite');
//     tx.objectStore(PENDING_STORE).add({
//       prayer,
//       tag: tag || null,
//       createdAt: Date.now()
//     });
//     await new Promise((resolve, reject) => {
//       tx.oncomplete = resolve;
//       tx.onerror = () => reject(tx.error);
//       tx.onabort = () => reject(tx.error);
//     });
//   } catch (error) {
//     console.warn('[push] savePendingPrayer failed:', error);
//   } finally {
//     if (db) db.close();
//   }
// }

// /* ============================= PUSH RECEIVED ============================= */

// self.addEventListener('push', (event) => {
//   if (!event.data) return;

//   let data = {};
//   try {
//     data = event.data.json();
//   } catch (error) {
//     data = { title: 'Deen Sphere', body: event.data.text() };
//   }

//   const title = data.title || 'Deen Sphere';
//   const prayer = String(data.prayer || '').toLowerCase() || null;
//   const kind = data.kind || null;
//   const tag = data.tag || (prayer && kind ? `prayer-${kind}-${prayer}` : undefined);

//   const options = {
//     body: data.body || 'You have a new message.',
//     icon: '/Deensphere_app_icon.png',
//     badge: '/Deensphere_app_icon.png',
//     vibrate: [200, 100, 200],
//     tag: tag,
//     renotify: false,
//     data: {
//       url: data.url || `${self.location.origin}/`,
//       prayer,
//       kind,
//       tag: tag || null
//     }
//   };

//   event.waitUntil((async () => {
//     const clients = await self.clients.matchAll({
//       type: 'window',
//       includeUncontrolled: true
//     });

//     const appWindows = clients.filter((client) =>
//       client.url.startsWith(self.location.origin)
//     );
//     const hasAppWindow = appWindows.length > 0;

//     // Save pending check for cold-start recovery
//     if (kind === 'check' && prayer && !hasAppWindow) {
//       await savePendingPrayer(prayer, tag);
//     }

//     // ALWAYS show the system notification.
//     await self.registration.showNotification(title, options);

//     // If app is open, also ping it
//     for (const client of appWindows) {
//       if (prayer && kind === 'time') {
//         client.postMessage({ type: 'PLAY_ADHAN', prayer });
//       }
//       if (kind === 'check' && prayer) {
//         client.postMessage({
//           type: 'SHOW_PRAYER_MODAL',
//           prayer,
//           title,
//           tag: tag || null
//         });
//       }
//     }
//   })());
// });

// /* ============================= NOTIFICATION CLICKED ============================= */

// self.addEventListener('notificationclick', (event) => {
//   const notification = event.notification;
//   const data = notification.data || {};
//   notification.close();

//   const isCheck = data.kind === 'check' || /check/i.test(notification.title || '');
//   let prayer = String(data.prayer || '').trim().toLowerCase();

//   if (!prayer && notification.title) {
//     prayer = notification.title.replace(/^[^\w]*/, '').replace(/\s*Check\s*$/i, '').trim().toLowerCase();
//   }

//   event.waitUntil((async () => {
//     const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

//     for (const client of windows) {
//       const clientUrl = new URL(client.url);
//       if (clientUrl.origin !== self.location.origin) continue;
//       if (clientUrl.pathname.endsWith('.js')) continue;

//       if (isCheck) {
//         client.postMessage({ type: 'STOP_ADHAN' });
//         client.postMessage({
//           type: 'SHOW_PRAYER_MODAL',
//           prayer: prayer || 'fajr',
//           title: notification.title || '',
//           tag: data.tag || null
//         });
//       } else {
//         client.postMessage({ type: 'STOP_ADHAN' });
//       }

//       await client.focus();
//       return;
//     }

//     const targetUrl = new URL('/', self.location.origin);
//     try {
//       await self.clients.openWindow(targetUrl.href);
//     } catch (e) {
//       try { await self.clients.openWindow(targetUrl.href); } catch (_) {}
//     }
//   })());
// });

/* ============================= PENDING PRAYER STORAGE ============================= */

const PENDING_DB_NAME = 'deen-sphere-pending';
const PENDING_DB_VERSION = 1;
const PENDING_STORE = 'pending-prayers';

function openPendingDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PENDING_DB_NAME, PENDING_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function savePendingPrayer(prayer, tag) {
  let db;
  try {
    db = await openPendingDB();
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    tx.objectStore(PENDING_STORE).add({
      prayer,
      tag: tag || null,
      createdAt: Date.now()
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[push] savePendingPrayer failed:', error);
  } finally {
    if (db) db.close();
  }
}

/* ============================= PUSH RECEIVED ============================= */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (error) {
    data = { title: 'Deen Sphere', body: event.data.text() };
  }

  const title = data.title || 'Deen Sphere';
  const prayer = String(data.prayer || '').toLowerCase() || null;
  const kind = data.kind || null;
  const tag = data.tag || (prayer && kind ? `prayer-${kind}-${prayer}` : undefined);

  const options = {
    body: data.body || 'You have a new message.',
    icon: '/Deensphere_app_icon.png',
    badge: '/Deensphere_app_icon.png',
    vibrate: [200, 100, 200],
    tag: tag,
    renotify: false,
    data: {
      url: data.url || `${self.location.origin}/`,
      prayer,
      kind,
      tag: tag || null
    }
  };

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    const appWindows = clients.filter((client) =>
      client.url.startsWith(self.location.origin)
    );
    const hasAppWindow = appWindows.length > 0;

    if (kind === 'check' && prayer && !hasAppWindow) {
      await savePendingPrayer(prayer, tag);
    }

    // ========================================================
    // 00-SECOND EXACT TIMER LOGIC
    // ========================================================
    if (data.targetTime) {
      const now = Date.now();
      const delay = data.targetTime - now;

      if (delay > 0) {
        // Wait until exactly 00 seconds
        await new Promise((resolve) => {
          setTimeout(() => {
            self.registration.showNotification(title, options).then(resolve);
          }, delay);
        });
      } else {
        // Late, show immediately
        await self.registration.showNotification(title, options);
      }
    } else {
      // News / Instant fallback
      await self.registration.showNotification(title, options);
    }

    for (const client of appWindows) {
      if (prayer && kind === 'time') {
        client.postMessage({ type: 'PLAY_ADHAN', prayer });
      }
      if (kind === 'check' && prayer) {
        client.postMessage({
          type: 'SHOW_PRAYER_MODAL',
          prayer,
          title,
          tag: tag || null
        });
      }
    }
  })());
});

/* ============================= NOTIFICATION CLICKED ============================= */

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  notification.close();

  const isCheck = data.kind === 'check' || /check/i.test(notification.title || '');
  let prayer = String(data.prayer || '').trim().toLowerCase();

  if (!prayer && notification.title) {
    prayer = notification.title.replace(/^[^\w]*/, '').replace(/\s*Check\s*$/i, '').trim().toLowerCase();
  }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of windows) {
      const clientUrl = new URL(client.url);
      if (clientUrl.origin !== self.location.origin) continue;
      if (clientUrl.pathname.endsWith('.js')) continue;

      if (isCheck) {
        client.postMessage({ type: 'STOP_ADHAN' });
        client.postMessage({
          type: 'SHOW_PRAYER_MODAL',
          prayer: prayer || 'fajr',
          title: notification.title || '',
          tag: data.tag || null
        });
      } else {
        client.postMessage({ type: 'STOP_ADHAN' });
      }

      await client.focus();
      return;
    }

    const targetUrl = new URL('/', self.location.origin);
    try {
      await self.clients.openWindow(targetUrl.href);
    } catch (e) {
      try { await self.clients.openWindow(targetUrl.href); } catch (_) {}
    }
  })());
});
