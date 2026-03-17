import { STORAGE_KEYS, extractGenderFromKey } from './constants.ts';
import { emit } from './events.ts';

const STORAGE_KEY = STORAGE_KEYS.progress;

interface StorageData {
  [gameId: string]: string[];
}

function getAll(): StorageData {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as StorageData;
  } catch {
    return {};
  }
}

function saveAll(data: StorageData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  emit('data-changed');
}

export function getCaptured(gameId: string): Set<string> {
  const data = getAll();
  return new Set((data[gameId] || []).map(String));
}

// Cross-mode: "25_male" matches if "25" exists; "25" matches if both "25_male"+"25_female" exist
function isCaptured(gameId: string, key: string): boolean {
  const captured = getCaptured(gameId);
  if (captured.has(key)) return true;

  const { baseId, gender } = extractGenderFromKey(key);
  if (gender) {
    return captured.has(baseId);
  }
  return captured.has(`${key}_male`) && captured.has(`${key}_female`);
}

export function toggleCaptured(gameId: string, key: string): boolean {
  const data = getAll();
  if (!data[gameId]) data[gameId] = [];

  const strKey = String(key);
  const currentlyCaptured = isCaptured(gameId, strKey);

  if (!currentlyCaptured) {
    if (!data[gameId].map(String).includes(strKey)) {
      data[gameId].push(strKey);
    }
    saveAll(data);
    return true;
  } else {
    const keysToRemove = [strKey];
    const { baseId, gender } = extractGenderFromKey(strKey);
    if (gender) {
      keysToRemove.push(baseId);
    } else {
      keysToRemove.push(`${strKey}_male`, `${strKey}_female`);
    }
    data[gameId] = data[gameId].filter(k => !keysToRemove.includes(String(k)));
    saveAll(data);
    return false;
  }
}
