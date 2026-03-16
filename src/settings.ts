import { STORAGE_KEYS, SPRITES_BASE_URL } from './constants.ts';

const SETTINGS_KEY = STORAGE_KEYS.settings;

export interface Settings {
  spriteStyle: string;
  genderMode: string;
  lang: string;
  lastGame: string;
}

interface Language {
  id: string;
  name: string;
}

export interface SpriteStyle {
  id: string;
  nameKey: string;
  getUrl: (id: number) => string;
  getFemaleUrl: ((id: number) => string) | null;
  pixelated: boolean;
}

interface GenderMode {
  id: string;
  nameKey: string;
  descKey: string;
}

const DEFAULTS: Settings = {
  spriteStyle: 'default',
  genderMode: 'single',
  lang: 'pt',
  lastGame: 'red-blue',
};

export const LANGUAGES: Language[] = [
  { id: 'pt', name: 'Portugu\u00eas' },
  { id: 'en', name: 'English' },
];

export const SPRITE_STYLES: SpriteStyle[] = [
  {
    id: 'default',
    nameKey: 'sprite.default',
    getUrl: (id) => `${SPRITES_BASE_URL}/${id}.png`,
    getFemaleUrl: (id) => `${SPRITES_BASE_URL}/female/${id}.png`,
    pixelated: true,
  },
  {
    id: 'official-artwork',
    nameKey: 'sprite.officialArtwork',
    getUrl: (id) => `${SPRITES_BASE_URL}/other/official-artwork/${id}.png`,
    getFemaleUrl: null,
    pixelated: false,
  },
  {
    id: 'home',
    nameKey: 'sprite.home',
    getUrl: (id) => `${SPRITES_BASE_URL}/other/home/${id}.png`,
    getFemaleUrl: (id) => `${SPRITES_BASE_URL}/other/home/female/${id}.png`,
    pixelated: false,
  },
  {
    id: 'showdown',
    nameKey: 'sprite.showdown',
    getUrl: (id) => `${SPRITES_BASE_URL}/other/showdown/${id}.gif`,
    getFemaleUrl: (id) => `${SPRITES_BASE_URL}/other/showdown/female/${id}.gif`,
    pixelated: true,
  },
  {
    id: 'dream-world',
    nameKey: 'sprite.dreamWorld',
    getUrl: (id) => `${SPRITES_BASE_URL}/other/dream-world/${id}.svg`,
    getFemaleUrl: null,
    pixelated: false,
  },
  {
    id: 'shiny',
    nameKey: 'sprite.shiny',
    getUrl: (id) => `${SPRITES_BASE_URL}/shiny/${id}.png`,
    getFemaleUrl: (id) => `${SPRITES_BASE_URL}/shiny/female/${id}.png`,
    pixelated: true,
  },
];

export const GENDER_MODES: GenderMode[] = [
  { id: 'single', nameKey: 'gender.single', descKey: 'gender.singleDesc' },
  { id: 'dimorphic', nameKey: 'gender.dimorphic', descKey: 'gender.dimorphicDesc' },
  { id: 'all', nameKey: 'gender.all', descKey: 'gender.allDesc' },
];

export function getSettings(): Settings {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as Partial<Settings>;
    return { ...DEFAULTS, ...stored };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getSpriteStyle(): SpriteStyle {
  const settings = getSettings();
  return SPRITE_STYLES.find(s => s.id === settings.spriteStyle) || SPRITE_STYLES[0];
}

export function getSpriteUrlForEntry(nationalId: number, gender: string | null, style?: SpriteStyle): string {
  if (!style) style = getSpriteStyle();
  if (gender === 'female' && style.getFemaleUrl) {
    return style.getFemaleUrl(nationalId);
  }
  return style.getUrl(nationalId);
}
