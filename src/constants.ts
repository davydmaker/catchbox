export const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
export const SPRITES_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

export const API_BATCH_SIZE = 15;
export const SPRITE_CACHE_BATCH_SIZE = 10;
export const SCROLL_DEBOUNCE_MS = 80;

export const STAT_MAX_VALUE = 255;
export const HEIGHT_DIVISOR = 10;
export const WEIGHT_DIVISOR = 10;
export const HATCH_STEP_MULTIPLIER = 256;
export const GENDER_RATE_MAX = 8;
export const ENTRY_NUMBER_PAD = 3;

export const DEFAULT_BOX_SIZE = 30;

export const STORAGE_KEYS = {
  settings: 'catchbox-settings',
  progress: 'catchbox-progress',
  genderCache: 'catchbox-gender-cache',
  syncMeta: 'catchbox-sync-meta',
} as const;

export const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
  steel: '#B7B7CE', fairy: '#D685AD',
};

export const STAT_COLORS: Record<string, string> = {
  hp: '#FF5959', attack: '#F5AC78', defense: '#FAE078',
  'special-attack': '#9DB7F5', 'special-defense': '#A7DB8D', speed: '#FA92B2',
};

export const STAT_NAMES: Record<string, string> = {
  hp: 'HP', attack: 'ATK', defense: 'DEF',
  'special-attack': 'SP.A', 'special-defense': 'SP.D', speed: 'SPD',
};

const htmlEscapes: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, ch => htmlEscapes[ch]);
}

export function extractGenderFromKey(key: string): { baseId: string; gender: string | null } {
  if (key.endsWith('_male')) return { baseId: key.slice(0, -5), gender: 'male' };
  if (key.endsWith('_female')) return { baseId: key.slice(0, -7), gender: 'female' };
  return { baseId: key, gender: null };
}
