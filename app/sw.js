// Service worker di GHISA: app shell in cache, funziona interamente offline.
// VERSION e ASSETS sono rigenerati da `npm run precache` a ogni modifica dei file.
const VERSION = '1f2b6c4baf';
const ASSETS = [
  './css/app.css',
  './fonts/barlow-400.woff2',
  './fonts/barlow-500.woff2',
  './fonts/barlow-600.woff2',
  './fonts/barlow-700.woff2',
  './fonts/big-shoulders-display.woff2',
  './fonts/martian-mono.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './icons/maskable-512.png',
  './index.html',
  './js/anim.js',
  './js/app.js',
  './js/data.js',
  './js/native.js',
  './js/nav.js',
  './js/store.js',
  './js/ui/gear.js',
  './js/ui/hold.js',
  './js/ui/ruler.js',
  './js/ui/sheet.js',
  './js/ui/timer.js',
  './js/util.js',
  './js/views/diary.js',
  './js/views/home.js',
  './js/views/max.js',
  './js/views/maxes.js',
  './js/views/onboarding.js',
  './js/views/rm.js',
  './js/views/settings.js',
  './js/views/summary.js',
  './js/views/test.js',
  './js/views/unlock.js',
  './js/views/workout.js',
  './manifest.webmanifest',
  './vendor/capacitor.js',
  './vendor/gsap/CustomBounce.min.js',
  './vendor/gsap/CustomEase.min.js',
  './vendor/gsap/Draggable.min.js',
  './vendor/gsap/DrawSVGPlugin.min.js',
  './vendor/gsap/Flip.min.js',
  './vendor/gsap/InertiaPlugin.min.js',
  './vendor/gsap/Observer.min.js',
  './vendor/gsap/Physics2DPlugin.min.js',
  './vendor/gsap/ScrambleTextPlugin.min.js',
  './vendor/gsap/SplitText.min.js',
  './vendor/gsap/gsap.min.js',
];

const CACHE = `ghisa-${VERSION}`;

self.addEventListener('install', (event) => {
  // cache: 'reload' salta la cache HTTP del server (GitHub Pages ne tiene una di 10 minuti).
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', ...ASSETS].map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ghisa-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.match('./').then((hit) => hit || fetch(request)));
    return;
  }
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    })),
  );
});
