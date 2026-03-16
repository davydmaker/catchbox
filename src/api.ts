interface NamedResource {
  name: string;
  url: string;
}

interface PokedexApiEntry {
  entry_number: number;
  pokemon_species: NamedResource;
}

interface PokedexApiResponse {
  pokemon_entries: PokedexApiEntry[];
}

export interface PokedexEntry {
  entryNumber: number;
  name: string;
  speciesUrl: string;
  nationalId: number;
}

export interface PokemonSprites {
  front_default: string | null;
  front_female: string | null;
  front_shiny: string | null;
  front_shiny_female: string | null;
  other?: {
    'official-artwork'?: { front_default: string | null };
    home?: { front_default: string | null; front_female: string | null };
    showdown?: { front_default: string | null; front_female: string | null };
    dream_world?: { front_default: string | null };
  };
}

interface PokemonStat {
  base_stat: number;
  stat: NamedResource;
}

interface PokemonType {
  type: NamedResource;
}

interface PokemonAbility {
  ability: NamedResource;
  is_hidden: boolean;
}

interface MoveVersionGroupDetail {
  level_learned_at: number;
  move_learn_method: NamedResource;
  version_group: NamedResource;
}

interface PokemonMove {
  move: NamedResource;
  version_group_details: MoveVersionGroupDetail[];
}

interface GameIndex {
  version: NamedResource;
}

export interface PokemonData {
  name: string;
  height: number;
  weight: number;
  base_experience: number | null;
  is_default: boolean;
  sprites: PokemonSprites;
  stats: PokemonStat[];
  types: PokemonType[];
  abilities: PokemonAbility[];
  moves: PokemonMove[];
  species: NamedResource;
  game_indices: GameIndex[];
}

interface FlavorTextEntry {
  flavor_text: string;
  language: NamedResource;
}

interface Genus {
  genus: string;
  language: NamedResource;
}

interface Variety {
  is_default: boolean;
  pokemon: NamedResource;
}

export interface SpeciesData {
  name: string;
  is_legendary: boolean;
  is_mythical: boolean;
  has_gender_differences: boolean;
  capture_rate: number;
  base_happiness: number | null;
  gender_rate: number;
  hatch_counter: number | null;
  growth_rate: NamedResource | null;
  egg_groups: NamedResource[];
  generation: NamedResource | null;
  evolution_chain: { url: string } | null;
  flavor_text_entries: FlavorTextEntry[];
  genera: Genus[];
  varieties: Variety[];
}

export interface EvolutionDetail {
  min_level: number | null;
  min_happiness: number | null;
  time_of_day: string;
  trigger: NamedResource | null;
  item: NamedResource | null;
  held_item: NamedResource | null;
  known_move: NamedResource | null;
  known_move_type: NamedResource | null;
  location: NamedResource | null;
  needs_overworld_rain: boolean;
  turn_upside_down: boolean;
  trade_species: NamedResource | null;
  relative_physical_stats: number | null;
}

export interface EvolutionChainLink {
  species: NamedResource;
  evolution_details: EvolutionDetail[];
  evolves_to: EvolutionChainLink[];
}

interface EvolutionChainData {
  chain: EvolutionChainLink;
}

interface EncounterDetail {
  chance: number;
  min_level: number;
  max_level: number;
  method: NamedResource;
}

interface VersionEncounterDetail {
  version: NamedResource;
  encounter_details: EncounterDetail[];
}

export interface LocationAreaEncounter {
  location_area: NamedResource;
  version_details: VersionEncounterDetail[];
}

import { POKEAPI_BASE_URL, SPRITES_BASE_URL } from './constants.ts';
const cache = new Map<string, unknown>();

async function fetchWithCache<T>(url: string): Promise<T> {
  if (cache.has(url)) return cache.get(url) as T;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  const data: T = await res.json();
  cache.set(url, data);
  return data;
}

export async function getPokedexEntries(pokedexName: string): Promise<PokedexEntry[]> {
  const data = await fetchWithCache<PokedexApiResponse>(`${POKEAPI_BASE_URL}/pokedex/${pokedexName}`);
  return data.pokemon_entries.map(entry => ({
    entryNumber: entry.entry_number,
    name: entry.pokemon_species.name,
    speciesUrl: entry.pokemon_species.url,
    nationalId: parseInt(entry.pokemon_species.url.split('/').filter(Boolean).pop()!),
  })).sort((a, b) => a.entryNumber - b.entryNumber);
}

export async function getMultiPokedexEntries(pokedexNames: string[]): Promise<PokedexEntry[]> {
  const allEntries: PokedexEntry[] = [];
  let offset = 0;
  for (const name of pokedexNames) {
    const entries = await getPokedexEntries(name);
    entries.forEach(e => {
      allEntries.push({ ...e, entryNumber: e.entryNumber + offset });
    });
    offset += entries.length;
  }
  return allEntries;
}

export async function getPokemonData(nameOrId: string | number): Promise<PokemonData> {
  return fetchWithCache<PokemonData>(`${POKEAPI_BASE_URL}/pokemon/${nameOrId}`);
}

export async function getSpeciesData(nameOrId: string | number): Promise<SpeciesData> {
  return fetchWithCache<SpeciesData>(`${POKEAPI_BASE_URL}/pokemon-species/${nameOrId}`);
}

export async function getEvolutionChain(url: string): Promise<EvolutionChainData> {
  return fetchWithCache<EvolutionChainData>(url);
}

export async function getEncounters(nameOrId: string | number): Promise<LocationAreaEncounter[]> {
  return fetchWithCache<LocationAreaEncounter[]>(`${POKEAPI_BASE_URL}/pokemon/${nameOrId}/encounters`);
}

export function getSpriteUrl(nationalId: number): string {
  return `${SPRITES_BASE_URL}/${nationalId}.png`;
}
