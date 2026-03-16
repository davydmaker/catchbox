const APP_CACHE = 'pokedex-app-v1';
const API_CACHE = 'pokedex-api-v1';
const SPRITE_CACHE_PREFIX = 'pokedex-sprites-';

const APP_SHELL = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.includes('/@') || url.pathname.includes('__vite') || url.searchParams.has('t')) {
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname.startsWith('/assets/')) {
      event.respondWith(
        caches.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(APP_CACHE).then(cache => cache.put(event.request, clone));
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      );
    }
    return;
  }

  if (url.hostname === 'pokeapi.co') {
    event.respondWith(
      caches.open(API_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  if (url.hostname === 'raw.githubusercontent.com' && url.pathname.includes('sprites')) {
    const spriteCacheName = getSpriteCache(url.pathname);

    event.respondWith(
      caches.open(spriteCacheName).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            // Cache both successful and 404 responses to avoid repeated requests
            cache.put(event.request, response.clone());
            return response;
          }).catch(() => {
            return new Response(OFFLINE_SVG, {
              headers: { 'Content-Type': 'image/svg+xml' },
            });
          });
        })
      )
    );
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

function getSpriteCache(pathname) {
  if (pathname.includes('/official-artwork/')) return SPRITE_CACHE_PREFIX + 'official-artwork';
  if (pathname.includes('/other/home/')) return SPRITE_CACHE_PREFIX + 'home';
  if (pathname.includes('/other/showdown/')) return SPRITE_CACHE_PREFIX + 'showdown';
  if (pathname.includes('/other/dream-world/')) return SPRITE_CACHE_PREFIX + 'dream-world';
  if (pathname.includes('/shiny/')) return SPRITE_CACHE_PREFIX + 'shiny';
  return SPRITE_CACHE_PREFIX + 'default';
}

const OFFLINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect width="96" height="96" fill="#1e293b" rx="8"/>
  <path d="M48 28c-6 0-11 3-14 7l4 4c2-3 6-5 10-5s8 2 10 5l4-4c-3-4-8-7-14-7z" fill="#475569"/>
  <path d="M48 38c-4 0-7 2-9 4l4 4c1-1 3-2 5-2s4 1 5 2l4-4c-2-2-5-4-9-4z" fill="#475569"/>
  <circle cx="48" cy="52" r="3" fill="#475569"/>
  <line x1="28" y1="24" x2="68" y2="72" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
  <text x="48" y="78" text-anchor="middle" fill="#475569" font-size="8" font-family="sans-serif">Offline</text>
</svg>`;

self.addEventListener('message', async (event) => {
  if (!event.data || !event.data.type) return;
  const { type, data } = event.data;

  if (type === 'CLEAR_SPRITE_CACHE') {
    const cacheName = SPRITE_CACHE_PREFIX + data.style;
    await caches.delete(cacheName);
    event.source.postMessage({ type: 'CACHE_CLEARED', style: data.style });
  }

  if (type === 'CLEAR_ALL_SPRITE_CACHES_EXCEPT') {
    const keepCache = SPRITE_CACHE_PREFIX + data.activeStyle;
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith(SPRITE_CACHE_PREFIX) && k !== keepCache)
        .map(k => caches.delete(k))
    );
    event.source.postMessage({ type: 'CACHES_CLEANED' });
  }

  if (type === 'CACHE_SPRITES') {
    const cacheName = SPRITE_CACHE_PREFIX + data.style;
    const cache = await caches.open(cacheName);
    let done = 0;
    const total = data.urls.length;

    for (let i = 0; i < data.urls.length; i += 10) {
      const batch = data.urls.slice(i, i + 10);
      await Promise.all(
        batch.map(async (url) => {
          try {
            const existing = await cache.match(url);
            if (!existing) {
              const response = await fetch(url);
              if (response.ok) await cache.put(url, response);
            }
            done++;
          } catch {
            done++;
          }
        })
      );
      event.source.postMessage({
        type: 'CACHE_PROGRESS',
        done,
        total,
        style: data.style,
      });
    }

    event.source.postMessage({ type: 'CACHE_COMPLETE', style: data.style });
  }

  if (type === 'GET_CACHE_STATS') {
    const keys = await caches.keys();
    const stats = {};
    for (const key of keys) {
      if (key.startsWith(SPRITE_CACHE_PREFIX)) {
        const cache = await caches.open(key);
        const entries = await cache.keys();
        stats[key.replace(SPRITE_CACHE_PREFIX, '')] = entries.length;
      }
    }
    event.source.postMessage({ type: 'CACHE_STATS', stats });
  }
});
