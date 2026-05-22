const CACHE_NAME = 'matrix-app-cache-v2';

// الملفات الأساسية التي يجب تخزينها مسبقاً
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './login.html',   // احذف هذا السطر لو كنت تطبق الكود على مشروع FitChallenge
  './favicon.png'   // تأكد أن الملف موجود فعلياً في المجلد بنفس الاسم
];

// 1. مرحلة التثبيت: التخزين المسبق المرن
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('Pre-caching core assets...');
      // استخدام حلقة تكرارية لضمان عدم انهيار الكاش بالكامل إذا فُقد ملف واحد
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`PWA Warning: Could not cache asset [${asset}]. Check if the path is correct.`, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. مرحلة التفعيل: تنظيف الكاش القديم
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. مرحلة جلب البيانات: استراتيجية Stale-While-Revalidate الذكية
self.addEventListener('fetch', (e) => {
  // تجاهل الطلبات التي لا تدعم بروتوكول http/https (مثل إضافات المتصفح)
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // إذا كان الملف موجوداً في الكاش، قم بتقديمه فوراً لسرعة فائقة
      // وفي نفس الوقت، قم بتحديثه من الشبكة في الخلفية لضمان التحديث القادم
      const networkFetch = fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // فشلت الشبكة (المستخدم أوفلاين تماماً)
        console.log('Running in offline mode for:', e.request.url);
      });

      return cachedResponse || networkFetch;
    })
  );
});
