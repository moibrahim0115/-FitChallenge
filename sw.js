const CACHE_NAME = 'fitchallenge-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './favicon.png',
  // أضف أي ملفات CSS أو JS خارجية إذا قمت بفصلها محلياً
];

// التثبيت وعمل Cache للملفات الأساسية
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// تفعيل السيرفيس وركر وتنظيف الكاش القديم عند التحديث
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// استراتيجية جلب البيانات: تخديم من الكاش أولاً، ثم الشبكة
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // تحديث الكاش في الخلفية لضمان الحصول على أي تعديل جديد في المرة القادمة
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {/* تجاهل أخطاء الشبكة في الخلفية */});
        
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
