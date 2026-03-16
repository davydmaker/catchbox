import { getSpriteStyle } from './settings.ts';
import { hasFemaleSpriteCached } from './gender.ts';

type ProgressCallback = (done: number, total: number, style?: string) => void;
type CompleteCallback = (style?: string) => void;

let onProgressCallback: ProgressCallback | null = null;
let onCompleteCallback: CompleteCallback | null = null;

export async function initServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;

  try {
    await navigator.serviceWorker.register('/sw.js');

    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
      if (!event.data || !event.data.type) return;
      const { type, done, total, style } = event.data;

      if (type === 'CACHE_PROGRESS' && onProgressCallback) {
        onProgressCallback(done, total, style);
      }
      if (type === 'CACHE_COMPLETE' && onCompleteCallback) {
        onCompleteCallback(style);
      }
    });
  } catch (err) {
    console.warn('SW registration failed:', err);
  }
}

export function cacheSpritesForDex(nationalIds: number[], genderMode: string): void {
  if (!navigator.serviceWorker?.controller) return;

  const style = getSpriteStyle();
  const urls: string[] = [];

  nationalIds.forEach(id => {
    urls.push(style.getUrl(id));
    if (style.getFemaleUrl && (genderMode === 'all' || (genderMode === 'dimorphic' && hasFemaleSpriteCached(id)))) {
      urls.push(style.getFemaleUrl(id));
    }
  });

  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_SPRITES',
    data: { urls, style: style.id },
  });
}

export function cleanOldSpriteCaches(activeStyleId: string): void {
  if (!navigator.serviceWorker?.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: 'CLEAR_ALL_SPRITE_CACHES_EXCEPT',
    data: { activeStyle: activeStyleId },
  });
}

export function onCacheProgress(progressFn: ProgressCallback, completeFn: CompleteCallback): void {
  onProgressCallback = progressFn;
  onCompleteCallback = completeFn;
}

export function onConnectivityChange(callback: (online: boolean) => void): void {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
  callback(navigator.onLine);
}
