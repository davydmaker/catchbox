import { getSpeciesData } from './api.ts';
import { STORAGE_KEYS, API_BATCH_SIZE } from './constants.ts';

const GENDER_CACHE_KEY = STORAGE_KEYS.genderCache;
const genderMap = new Map<number, boolean>();

function loadCache(): void {
  try {
    const data = JSON.parse(localStorage.getItem(GENDER_CACHE_KEY) || '{}') as Record<string, boolean>;
    if (data) {
      Object.entries(data).forEach(([k, v]) => genderMap.set(parseInt(k), v));
    }
  } catch { /* ignore */ }
}

function saveCache(): void {
  const obj: Record<number, boolean> = {};
  genderMap.forEach((v, k) => { obj[k] = v; });
  localStorage.setItem(GENDER_CACHE_KEY, JSON.stringify(obj));
}

loadCache();

export function hasFemaleSpriteCached(nationalId: number): boolean {
  return genderMap.get(nationalId) || false;
}

export async function checkGenderSprites(nationalIds: number[]): Promise<void> {
  const unchecked = nationalIds.filter(id => !genderMap.has(id));
  if (unchecked.length === 0) return;

  const batchSize = API_BATCH_SIZE;
  for (let i = 0; i < unchecked.length; i += batchSize) {
    const batch = unchecked.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          const species = await getSpeciesData(id);
          return { id, has: species.has_gender_differences === true };
        } catch {
          return { id, has: false };
        }
      })
    );
    results.forEach(({ id, has }) => genderMap.set(id, has));
  }

  saveCache();
}
