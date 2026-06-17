/* ════════════════════════════════════════════════════════════
   Service Worker — FitChallenge PWA
   Version: 3.0.0 (2026-06-17) — Fixed font CORS + preserved health tips
   ════════════════════════════════════════════════════════════ */

const SW_VERSION = '3.0.0-2026-06-17';
const CACHE_NAME = 'fitcache-v3-' + SW_VERSION;
const OFFLINE_URL = './index.html';

// Assets محلية فقط (نفس origin) — بنخزّنهم offline
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

// نصائح صحية باللغتين (محفوظة من الـ sw.js الأصلي)
const tips = {
  ar: [
    'اشرب 8 أكواب ماء يومياً 💧',
    'نوّم 7-8 ساعات لتعافي أفضل 🌙',
    'خصص 5 دقائق للتمدد بعد التمرين 🧘',
    'وجبة بروتين بعد التمرين بساعة 🥩',
    'خطوة واحدة كل يوم أفضل من لا شيء 🚶',
    'الراحة جزء من التدريب، لا تتجاهلها 💤',
    'تتبع تقدمك يزيد الالتزام بنسبة 40% 📊'
  ],
  en: [
    'Drink 8 glasses of water daily 💧',
    'Sleep 7-8 hours for better recovery 🌙',
    'Spend 5 minutes stretching after workouts 🧘',
    'Eat a protein meal within an hour after training 🥩',
    'One step every day beats doing nothing 🚶',
    'Rest is part of training, don\'t skip it 💤',
    'Tracking your progress boosts consistency by 40% 📊'
  ]
};

// Offline fallback page (محفوظ من الـ sw.js الأصلي)
var OFFLINE_HTML = [
  '<!DOCTYPE html>',
  '<html lang="ar"><head><meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<style>',
  'body{background:#0A1510;color:#ECF7F3;font-family:sans-serif;text-align:center;padding:40px}',
  'h2{font-size:1.5rem;margin-bottom:12px}',
  'p{opacity:.8}',
  '</style></head>',
  '<body>',
  '<h2>&#128683; أنت غير متصل بالإنترنت</h2>',
  '<p>يرجى الاتصال بالشبكة للمتابعة.</p>',
  '</body></html>'
].join('');

// ════════════════════════════════════════════════════════════
// INSTALL: pre-cache local assets only
// ════════════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ════════════════════════════════════════════════════════════
// ACTIVATE: تنظيف الـ caches القديمة + claim العملاء فورًا
// ════════════════════════════════════════════════════════════
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ════════════════════════════════════════════════════════════
// FETCH: استراتيجية ذكية تفادي خطأ NS_ERROR_INTERCEPTION_FAILED
//   - GET + same-origin  → network-first مع fallback للـ cache
//   - GET + cross-origin → BYPASS (لا يستدعي respondWith على الإطلاق)
//                          هذا يصلح خطأ font CORS على fonts.gstatic.com
//   - non-GET             → BYPASS
// ════════════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // فقط GET requests نتعامل معها
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ── القاعدة الذهبية: أي طلب cross-origin (origin مختلف عن الـ SW)
  //    نتركه يمر مباشرة للمتصفح بدون تدخل من SW على الإطلاق.
  //    هذا يشمل: fonts.gstatic.com, fonts.googleapis.com, fonts.bunny.net,
  //              cdnjs.cloudflare.com, supabase.co, etc.
  //    *** ده بيصلح خطأ NS_ERROR_INTERCEPTION_FAILED على الـ fonts ***
  if (url.origin !== self.location.origin) {
    return; // ← لا تستدعي event.respondWith إطلاقًا
  }

  // ─ـ Navigation requests: network-first مع offline fallback
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone).catch(() => {}));
          return res;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            if (cached) return cached;
            return new Response(OFFLINE_HTML, {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          });
        })
    );
    return;
  }

  // ── Same-origin static assets: network-first مع cache fallback
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      })
  );
});

// ════════════════════════════════════════════════════════════
// MESSAGE: تحديث الـ SW من الـ main thread + health tips toggle
// (محفوظ من الـ sw.js الأصلي)
// ════════════════════════════════════════════════════════════
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'SCHEDULE_TIPS') {
    self._tipsLang = event.data.lang || 'ar';
    self._tipsEnabled = true;
  }
  if (event.data && event.data.type === 'STOP_TIPS') {
    self._tipsEnabled = false;
  }
});

// ════════════════════════════════════════════════════════════
// PERIODIC SYNC: تنبيهات صحية دورية (محفوظة من الـ sw.js الأصلي)
// ════════════════════════════════════════════════════════════
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'health-tips') {
    event.waitUntil(sendHealthTip());
  }
});

function sendHealthTip() {
  var lang = self._tipsLang || 'ar';
  var list = tips[lang] || tips.ar;
  var tip = list[Math.floor(Math.random() * list.length)];
  return self.registration.showNotification('FitChallenge 💪', {
    body: tip,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'fit-health-tip',
    vibrate: [100, 50, 100]
  });
}

// ════════════════════════════════════════════════════════════
// PUSH: إشعارات push (اختياري)
// ════════════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  let payload = { title: 'FitChallenge', body: 'إشعار جديد' };
  try {
    if (event.data) payload = event.data.json();
  } catch (e) { /* ignore */ }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: './icon-192.png',
      badge: './icon-192.png'
    })
  );
});

// ════════════════════════════════════════════════════════════
// NOTIFICATION CLICK: فتح التطبيق عند النقر على الإشعار
// ════════════════════════════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
