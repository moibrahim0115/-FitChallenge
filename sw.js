// sw.js — Network-first strategy for HTML, cache-first for assets
const CACHE = 'fitchallenge-v3'; // رقّم الـ version كل مرة تعدّل
const STATIC_ASSETS = [
  'manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // HTML pages: Network-first (عشان دايماً تجيب أحدث نسخة)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets: Cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

// Health Tips via SW push simulation
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_TIPS') {
    // تخزين إعدادات الإشعارات
    self._tipsLang = e.data.lang || 'ar';
    self._tipsEnabled = true;
  }
  if (e.data && e.data.type === 'STOP_TIPS') {
    self._tipsEnabled = false;
  }
});

// Periodic Background Sync (للمتصفحات الداعمة)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'health-tips') {
    e.waitUntil(sendHealthTip());
  }
});

async function sendHealthTip() {
  
  const lang = self._tipsLang || 'ar';
  const list = tips[lang];
  const tip = list[Math.floor(Math.random() * list.length)];
  const reg = self.registration;
  await reg.showNotification('FitChallenge 💪', {
    body: tip,
    icon: '/-FitChallenge/icons/icon-192x192.png',
    badge: '/-FitChallenge/icons/icon-192x192.png',
    tag: 'fit-health-tip',
    vibrate: [100, 50, 100]
  });
}
