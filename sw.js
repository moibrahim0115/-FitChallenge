// sw.js — Network-first strategy for HTML, cache-first for assets
const CACHE = 'fitchallenge-v10'; // رقّم الـ version كل مرة تعدّل
const STATIC_ASSETS = [
  'manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2'
];

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

// Offline fallback page — HTML محفوظ كـ template literal منفصل لتجنب SyntaxError
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

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(STATIC_ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // HTML pages: Network-first (عشان دايماً تجيب أحدث نسخة)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request)
        .then(function(res) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          return res;
        })
        .catch(function() {
          return caches.match(e.request).then(function(cached) {
            if (cached) return cached;
            return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
          });
        })
    );
    return;
  }

  // Static assets: Cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        if (res && res.status === 200 && e.request.method === 'GET') {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      });
    })
  );
});

// Health Tips via SW push simulation
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SCHEDULE_TIPS') {
    self._tipsLang = e.data.lang || 'ar';
    self._tipsEnabled = true;
  }
  if (e.data && e.data.type === 'STOP_TIPS') {
    self._tipsEnabled = false;
  }
});

// Periodic Background Sync (للمتصفحات الداعمة)
self.addEventListener('periodicsync', function(e) {
  if (e.tag === 'health-tips') {
    e.waitUntil(sendHealthTip());
  }
});

function sendHealthTip() {
  var lang = self._tipsLang || 'ar';
  var list = tips[lang];
  var tip = list[Math.floor(Math.random() * list.length)];
  return self.registration.showNotification('FitChallenge 💪', {
    body: tip,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'fit-health-tip',
    vibrate: [100, 50, 100]
  });
}
