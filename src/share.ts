import { STORAGE_KEYS } from './constants.ts';

interface SharePayload {
  p: Record<string, string[]>;
  s: Record<string, string>;
}

export function exportProgress(): string {
  const progress = JSON.parse(localStorage.getItem(STORAGE_KEYS.progress) || '{}');
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}');
  const payload: SharePayload = { p: progress, s: settings };
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
}

export function getShareUrl(): string {
  const encoded = exportProgress();
  return `${window.location.origin}${window.location.pathname}#sync=${encoded}`;
}

export function parseShareHash(): SharePayload | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#sync=')) return null;

  try {
    const encoded = hash.slice(6);
    const json = decodeURIComponent(escape(atob(encoded)));
    const payload = JSON.parse(json) as SharePayload;
    if (!payload.p || typeof payload.p !== 'object' || Array.isArray(payload.p)) return null;
    for (const val of Object.values(payload.p)) {
      if (!Array.isArray(val)) return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function applySharePayload(payload: SharePayload): void {
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(payload.p));
  if (payload.s && typeof payload.s === 'object') {
    const currentSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}');
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ...currentSettings, ...payload.s }));
  }
  window.location.hash = '';
}

export function countSharedPokemon(payload: SharePayload): { games: number; total: number } {
  const games = Object.keys(payload.p).length;
  const total = Object.values(payload.p).reduce((sum, arr) => sum + arr.length, 0);
  return { games, total };
}
