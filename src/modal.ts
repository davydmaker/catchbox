import {
  getPokemonData, getSpeciesData, getEvolutionChain, getEncounters, getSpriteUrl,
  type PokemonData, type PokemonSprites, type SpeciesData, type EvolutionChainLink,
  type EvolutionDetail, type LocationAreaEncounter
} from './api.ts';
import { getGameById } from './games.ts';
import { getCaptured, toggleCaptured } from './storage.ts';
import { createPokeballSvg } from './pokeball.ts';
import { getSpriteStyle, getSpriteUrlForEntry, type SpriteStyle } from './settings.ts';
import { t, getLang } from './i18n.ts';
import { TYPE_COLORS, STAT_COLORS, STAT_NAMES, STAT_MAX_VALUE, HEIGHT_DIVISOR, WEIGHT_DIVISOR, HATCH_STEP_MULTIPLIER, GENDER_RATE_MAX, ENTRY_NUMBER_PAD, escapeHtml, extractGenderFromKey } from './constants.ts';
import type { DisplayEntry } from './main.ts';

type CaptureChangeCallback = (captureKey: string, isCaptured: boolean) => void;

let currentGameId: string | null = null;
let currentEntries: DisplayEntry[] = [];
let onCaptureChange: CaptureChangeCallback | null = null;

export function initModal(gameId: string, captureCallback: CaptureChangeCallback): void {
  currentGameId = gameId;
  onCaptureChange = captureCallback;

  const overlay = document.getElementById('modal-overlay')!;
  const closeBtn = document.getElementById('modal-close')!;

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

export function updateModalGame(gameId: string, entries: DisplayEntry[]): void {
  currentGameId = gameId;
  currentEntries = entries || [];
}

export function setModalEntries(entries: DisplayEntry[]): void {
  currentEntries = entries || [];
}

function findMatchingEntry(nationalId: number, gender: string | null): DisplayEntry | undefined {
  if (gender) {
    const exact = currentEntries.find(e => e.nationalId === nationalId && e.gender === gender);
    if (exact) return exact;
  }

  return currentEntries.find(e => e.nationalId === nationalId);
}

function isInCurrentDex(nationalId: number): boolean {
  return currentEntries.some(e => e.nationalId === nationalId);
}

function captureKeyFor(nationalId: number, gender: string | null): string {
  const entry = findMatchingEntry(nationalId, gender);
  if (entry && entry.gender) return `${nationalId}_${entry.gender}`;
  return `${nationalId}`;
}

function isEntryCaptured(capturedSet: Set<string>, key: string): boolean {
  if (capturedSet.has(key)) return true;
  const { baseId, gender: genderPart } = extractGenderFromKey(key);
  if (genderPart) {
    return capturedSet.has(baseId);
  } else {
    return capturedSet.has(`${key}_male`) && capturedSet.has(`${key}_female`);
  }
}

function closeModal(): void {
  document.getElementById('modal-overlay')!.classList.add('hidden');
  document.body.style.overflow = '';
}

function getFlavorText(species: SpeciesData): string {
  const lang = getLang();
  if (lang === 'en') {
    const entry = species.flavor_text_entries.find(e => e.language.name === 'en');
    return entry ? entry.flavor_text.replace(/\f|\n/g, ' ') : '';
  }
  // For Portuguese: try 'pt' first (PokeAPI doesn't always have it), fallback to 'en'
  const ptEntry = species.flavor_text_entries.find(e => e.language.name === 'pt');
  if (ptEntry) return ptEntry.flavor_text.replace(/\f|\n/g, ' ');
  const enEntry = species.flavor_text_entries.find(e => e.language.name === 'en');
  return enEntry ? enEntry.flavor_text.replace(/\f|\n/g, ' ') : '';
}

function getGenus(species: SpeciesData): string {
  const lang = getLang();
  if (lang === 'en') {
    const entry = species.genera.find(g => g.language.name === 'en');
    return entry ? entry.genus : '';
  }
  const ptEntry = species.genera.find(g => g.language.name === 'pt');
  if (ptEntry) return ptEntry.genus;
  const enEntry = species.genera.find(g => g.language.name === 'en');
  return enEntry ? enEntry.genus : '';
}

export async function openModal(nationalId: number, entryNumber: number, gender: string | null): Promise<void> {
  const overlay = document.getElementById('modal-overlay')!;
  const body = document.getElementById('modal-body')!;

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;padding:80px;">
      <div class="pokeball-loader">
        <div class="pokeball-top"></div>
        <div class="pokeball-center"></div>
        <div class="pokeball-bottom"></div>
      </div>
    </div>
  `;

  try {
    const pokemon = await getPokemonData(nationalId);
    // Forms like 10206 point to base species 143 via pokemon.species.url
    const speciesId = pokemon.species.url.split('/').filter(Boolean).pop()!;
    const species = await getSpeciesData(speciesId);

    let evoChain = null;
    if (species.evolution_chain?.url) {
      try {
        evoChain = await getEvolutionChain(species.evolution_chain.url);
      } catch { /* ignore */ }
    }

    renderModalContent(body, pokemon, species, evoChain ? evoChain.chain : null, nationalId, entryNumber, gender);
  } catch {
    body.innerHTML = `<div style="padding:40px;text-align:center;color:#fff;">${t('modal.error')}</div>`;
  }
}

function renderModalContent(
  container: HTMLElement,
  pokemon: PokemonData,
  species: SpeciesData,
  evoChain: EvolutionChainLink | null,
  nationalId: number,
  entryNumber: number,
  gender: string | null,
): void {
  const captured = getCaptured(currentGameId!);
  const belongsToDex = isInCurrentDex(nationalId);
  const key = captureKeyFor(nationalId, gender);
  const isCaptured = isEntryCaptured(captured, key);
  const spriteStyle = getSpriteStyle();

  const hasFemale = pokemon.sprites.front_female !== null;
  const useGender = (gender === 'female' && hasFemale) ? 'female' : null;
  const hasSprite = checkSpriteExists(pokemon.sprites, spriteStyle.id, useGender);
  const artworkUrl = hasSprite ? getSpriteUrlForEntry(nationalId, useGender, spriteStyle) : null;

  const flavorText = getFlavorText(species);

  const genus = getGenus(species);

  const genderLabel = gender === 'male' ? ' \u2642' : gender === 'female' ? ' \u2640' : '';

  const typesHtml = pokemon.types.map(tp =>
    `<span class="type-badge" style="background:${TYPE_COLORS[tp.type.name] || '#888'}">${escapeHtml(tp.type.name)}</span>`
  ).join('');

  const statsHtml = pokemon.stats.map(s => {
    const pct = Math.min(100, (s.base_stat / STAT_MAX_VALUE) * 100);
    const color = STAT_COLORS[s.stat.name] || '#888';
    return `
      <div class="stat-row">
        <span class="stat-name">${STAT_NAMES[s.stat.name] || escapeHtml(s.stat.name)}</span>
        <div class="stat-bar-bg">
          <div class="stat-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="stat-value">${s.base_stat}</span>
      </div>
    `;
  }).join('');

  const totalStats = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);

  const abilitiesHtml = pokemon.abilities
    .filter(a => !a.is_hidden)
    .map(a => `<span class="ability-badge">${escapeHtml(a.ability.name.replace(/-/g, ' '))}</span>`)
    .join('');

  let evoHtml = '';
  if (evoChain) {
    const evoTreeHtml = renderEvolutionTree(evoChain);
    if (evoTreeHtml) {
      evoHtml = `
        <div class="modal-section">
          <h3 class="modal-section-title">${t('modal.evolution')}</h3>
          ${evoTreeHtml}
        </div>
      `;
    }
  }

  container.innerHTML = `
    <div class="modal-pokemon-header">
      <div class="modal-artwork">
        ${hasSprite ? `
          <img src="${artworkUrl}" alt="${escapeHtml(pokemon.name)}" class="${isCaptured ? '' : 'uncaptured'} ${spriteStyle.pixelated ? 'pixelated' : ''}" />
        ` : `
          <div class="modal-artwork-placeholder" style="display:flex">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="8" x2="16" y2="16"/><line x1="16" y1="8" x2="8" y2="16"/></svg>
            <span>${t('offline.noSprite')}</span>
          </div>
        `}
      </div>
      <h2 class="modal-pokemon-name">${escapeHtml(pokemon.name)}${genderLabel}</h2>
      <p class="modal-pokemon-id">#${String(entryNumber).padStart(ENTRY_NUMBER_PAD, '0')} &middot; ${escapeHtml(genus)}</p>
      <div class="modal-types">${typesHtml}</div>
    </div>

    <div class="modal-body-content">
      <div class="modal-section">
        <p class="flavor-text">${escapeHtml(flavorText)}</p>
      </div>

      <div class="modal-section">
        <h3 class="modal-section-title">${t('modal.stats')}</h3>
        ${statsHtml}
        <div class="stat-row" style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">
          <span class="stat-name" style="font-weight:800;">Total</span>
          <div style="flex:1"></div>
          <span class="stat-value" style="font-weight:800;">${totalStats}</span>
        </div>
      </div>

      <div class="modal-section">
        <h3 class="modal-section-title">${t('modal.info')}</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">${t('info.height')}</div>
            <div class="info-value">${(pokemon.height / HEIGHT_DIVISOR).toFixed(1)} m</div>
          </div>
          <div class="info-item">
            <div class="info-label">${t('info.weight')}</div>
            <div class="info-value">${(pokemon.weight / WEIGHT_DIVISOR).toFixed(1)} kg</div>
          </div>
          <div class="info-item">
            <div class="info-label">${t('info.baseExp')}</div>
            <div class="info-value">${pokemon.base_experience || '\u2014'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${t('info.captureRate')}</div>
            <div class="info-value">${species.capture_rate}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${t('info.happiness')}</div>
            <div class="info-value">${species.base_happiness ?? '\u2014'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${t('info.growthRate')}</div>
            <div class="info-value">${species.growth_rate?.name ? escapeHtml(species.growth_rate.name.replace('-', ' ')) : '\u2014'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${t('info.eggGroup')}</div>
            <div class="info-value">${species.egg_groups?.length ? escapeHtml(species.egg_groups.map(g => g.name).join(', ')) : '\u2014'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${t('info.generation')}</div>
            <div class="info-value">${species.generation?.name ? escapeHtml(species.generation.name.replace('generation-', '').toUpperCase()) : '\u2014'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${t('info.hatchSteps')}</div>
            <div class="info-value">${species.hatch_counter ? (species.hatch_counter * HATCH_STEP_MULTIPLIER).toLocaleString() : '\u2014'}</div>
          </div>
          <div class="info-item full-width">
            <div class="info-label">${t('info.genderRate')}</div>
            <div class="info-value">${renderGenderRate(species.gender_rate)}</div>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <h3 class="modal-section-title">${t('modal.abilities')}</h3>
        <div class="abilities-list">${abilitiesHtml}</div>
      </div>

      ${renderMovesSection(pokemon, currentGameId!)}

      ${evoHtml}

      ${renderFormsSection(species)}

      <div class="modal-section">
        <h3 class="modal-section-title toggle-header" id="encounters-toggle">
          ${t('modal.encounters')}
          <span class="toggle-icon">&#9654;</span>
        </h3>
        <div class="toggle-content hidden" id="encounters-content">
          <p style="color:rgba(255,255,255,0.4);font-size:0.8rem;">${t('modal.encounters.loading')}</p>
        </div>
      </div>

      ${belongsToDex ? `
        <button class="modal-capture-btn ${isCaptured ? 'captured' : ''}" id="modal-capture-toggle">
          ${createPokeballSvg()}
          <span>${isCaptured ? t('modal.captured') : t('modal.markCapture')}</span>
        </button>
      ` : `
        <div class="modal-not-in-dex">
          ${pokemon.is_default === false ? t('modal.formNotInDex') : t('modal.notInDex')}
        </div>
      `}
    </div>
  `;

  const captureBtn = document.getElementById('modal-capture-toggle');
  if (captureBtn) {
    captureBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowCaptured = toggleCaptured(currentGameId!, key);
      captureBtn.classList.toggle('captured', nowCaptured);
      captureBtn.querySelector('span')!.textContent = nowCaptured ? t('modal.captured') : t('modal.markCapture');

      const artImg = container.querySelector('.modal-artwork img') as HTMLImageElement | null;
      if (artImg) artImg.classList.toggle('uncaptured', !nowCaptured);

      if (onCaptureChange) onCaptureChange(key, nowCaptured);
    });
  }

  container.querySelectorAll('.evo-pokemon').forEach(el => {
    el.addEventListener('click', () => {
      const evoId = parseInt((el as HTMLElement).dataset.id!);
      openModal(evoId, evoId, gender);
    });
  });

  if (species.varieties && species.varieties.length > 1) {
    loadFormsAsync(container, species, nationalId, entryNumber, spriteStyle);
  }

  container.querySelectorAll('.toggle-header[data-toggle]').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = (header as HTMLElement).dataset.toggle!;
      const content = document.getElementById(targetId);
      if (content) {
        const isOpen = !content.classList.contains('hidden');
        content.classList.toggle('hidden');
        header.querySelector('.toggle-icon')!.innerHTML = isOpen ? '&#9654;' : '&#9660;';
      }
    });
  });

  const encountersToggle = document.getElementById('encounters-toggle');
  const encountersContent = document.getElementById('encounters-content');
  let encountersLoaded = false;

  if (encountersToggle && encountersContent) {
    encountersToggle.addEventListener('click', async () => {
      const isOpen = !encountersContent.classList.contains('hidden');
      encountersContent.classList.toggle('hidden');
      encountersToggle.querySelector('.toggle-icon')!.innerHTML = isOpen ? '&#9654;' : '&#9660;';

      if (!encountersLoaded) {
        encountersLoaded = true;
        try {
          const encounters = await getEncounters(nationalId);
          const game = getGameById(currentGameId!);
          const gameVersions = game.versions || [];
          renderEncountersContent(encountersContent, encounters, gameVersions);
        } catch {
          encountersContent.innerHTML = `<p style="color:rgba(255,255,255,0.4);font-size:0.8rem;">${t('modal.encounters.notAvailable')}</p>`;
        }
      }
    });
  }
}

function renderGenderRate(rate: number): string {
  if (rate === -1) return t('info.genderless');
  const femalePct = (rate / GENDER_RATE_MAX) * 100;
  const malePct = 100 - femalePct;
  return `<div class="gender-rate-bar">
    <div class="gender-rate-male" style="width:${malePct}%"><span>\u2642 ${malePct}%</span></div>
    <div class="gender-rate-female" style="width:${femalePct}%"><span>\u2640 ${femalePct}%</span></div>
  </div>`;
}

function checkSpriteExists(sprites: PokemonSprites, styleId: string, gender: string | null): boolean {
  switch (styleId) {
    case 'default': return (gender === 'female' ? sprites.front_female : sprites.front_default) !== null;
    case 'shiny': return (gender === 'female' ? sprites.front_shiny_female : sprites.front_shiny) !== null;
    case 'official-artwork': return sprites.other?.['official-artwork']?.front_default !== null;
    case 'home': return (gender === 'female' ? sprites.other?.home?.front_female : sprites.other?.home?.front_default) !== null;
    case 'showdown': return (gender === 'female' ? sprites.other?.showdown?.front_female : sprites.other?.showdown?.front_default) !== null;
    case 'dream-world': return sprites.other?.dream_world?.front_default !== null;
    default: return sprites.front_default !== null;
  }
}

async function loadFormsAsync(
  container: HTMLElement,
  species: SpeciesData,
  currentId: number,
  entryNumber: number,
  spriteStyle: SpriteStyle,
): Promise<void> {
  const formsGrid = container.querySelector('#forms-grid') as HTMLElement | null;
  if (!formsGrid) return;

  const game = getGameById(currentGameId!);
  const gameVersions = game?.versions || [];
  const noSpriteLabel = t('offline.noSpriteShort');

  const formsData = await Promise.all(
    species.varieties.map(async (v) => {
      const formId = parseInt(v.pokemon.url.split('/').filter(Boolean).pop()!);
      try {
        const pokemonData = await getPokemonData(formId);
        const hasSprite = checkSpriteExists(pokemonData.sprites, spriteStyle.id, null);
        const formVersions = pokemonData.game_indices.map(g => g.version.name);
        // Default form follows the base species availability; alternate forms need explicit game match
        const availableInGame = v.is_default
          ? true
          : formVersions.length > 0 && formVersions.some(fv => gameVersions.includes(fv));
        return { formId, v, hasSprite, availableInGame, spriteUrl: hasSprite ? spriteStyle.getUrl(formId) : null };
      } catch {
        return { formId, v, hasSprite: false, availableInGame: false, spriteUrl: null };
      }
    })
  );

  formsGrid.innerHTML = formsData.map(({ formId, v, hasSprite, availableInGame, spriteUrl }) => {
    const rawName = v.pokemon.name;
    const displayName = rawName.includes('-') ? rawName.split('-').slice(1).join(' ') : rawName;
    const isCurrent = formId === currentId;
    const unavailableClass = !availableInGame ? ' form-unavailable' : '';
    return `<div class="form-pokemon${isCurrent ? ' current-form' : ''}${unavailableClass}" data-id="${formId}">
      <div class="form-sprite-wrap">
        ${hasSprite
          ? `<img class="evo-sprite" src="${spriteUrl}" alt="${escapeHtml(displayName)}" loading="lazy" />`
          : `<div class="sprite-placeholder" style="display:flex"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="8" x2="16" y2="16"/><line x1="16" y1="8" x2="8" y2="16"/></svg><span>${noSpriteLabel}</span></div>`
        }
      </div>
      <span class="evo-name">${v.is_default ? escapeHtml(species.name) : escapeHtml(displayName)}</span>
    </div>`;
  }).join('');

  formsGrid.querySelectorAll('.form-pokemon').forEach(el => {
    el.addEventListener('click', () => {
      const formId = parseInt((el as HTMLElement).dataset.id!);
      if (formId !== currentId) openModal(formId, entryNumber, null);
    });
  });
}

function renderFormsSection(species: SpeciesData): string {
  if (!species.varieties || species.varieties.length <= 1) return '';
  return `<div class="modal-section" id="forms-section">
    <h3 class="modal-section-title">${t('modal.forms')}</h3>
    <div class="forms-grid" id="forms-grid"><p style="color:rgba(255,255,255,0.4);font-size:0.8rem;">${t('modal.encounters.loading')}</p></div>
  </div>`;
}

function renderMovesSection(pokemon: PokemonData, gameId: string): string {
  const game = getGameById(gameId);
  if (!game || !game.versionGroup) return '';

  const levelUpMoves: { name: string; level: number }[] = [];
  pokemon.moves.forEach(m => {
    m.version_group_details.forEach(d => {
      if (d.version_group.name === game.versionGroup && d.move_learn_method.name === 'level-up') {
        levelUpMoves.push({ name: m.move.name, level: d.level_learned_at });
      }
    });
  });

  if (levelUpMoves.length === 0) {
    return `<div class="modal-section">
      <h3 class="modal-section-title toggle-header" data-toggle="moves-content">
        ${t('modal.moves')} <span class="toggle-icon">&#9654;</span>
      </h3>
      <div class="toggle-content hidden" id="moves-content">
        <p style="color:rgba(255,255,255,0.4);font-size:0.8rem;">${t('modal.moves.notAvailable')}</p>
      </div>
    </div>`;
  }

  levelUpMoves.sort((a, b) => a.level - b.level);

  const rows = levelUpMoves.map(m =>
    `<tr><td class="move-level">${m.level || '\u2014'}</td><td class="move-name">${escapeHtml(m.name.replace(/-/g, ' '))}</td></tr>`
  ).join('');

  return `<div class="modal-section">
    <h3 class="modal-section-title toggle-header" data-toggle="moves-content">
      ${t('modal.moves')} <span class="move-count">(${levelUpMoves.length})</span>
      <span class="toggle-icon">&#9654;</span>
    </h3>
    <div class="toggle-content hidden" id="moves-content">
      <table class="moves-table">
        <thead><tr><th>${t('modal.moves.level')}</th><th>${t('modal.moves.name')}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

interface EncounterFiltered {
  location: string;
  version: string;
  method: string;
  chance: number;
  minLevel: number;
  maxLevel: number;
}

function renderEncountersContent(container: HTMLElement, encounters: LocationAreaEncounter[], gameVersions: string[]): void {
  const filtered: EncounterFiltered[] = [];
  encounters.forEach(loc => {
    loc.version_details.forEach(vd => {
      if (gameVersions.includes(vd.version.name)) {
        vd.encounter_details.forEach(ed => {
          filtered.push({
            location: escapeHtml(loc.location_area.name.replace(/-/g, ' ')),
            version: vd.version.name,
            method: ed.method.name,
            chance: ed.chance,
            minLevel: ed.min_level,
            maxLevel: ed.max_level,
          });
        });
      }
    });
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p style="color:rgba(255,255,255,0.4);font-size:0.8rem;">${t('modal.encounters.notAvailable')}</p>`;
    return;
  }

  const byLocation: Record<string, EncounterFiltered[]> = {};
  filtered.forEach(e => {
    if (!byLocation[e.location]) byLocation[e.location] = [];
    byLocation[e.location].push(e);
  });

  const html = Object.entries(byLocation).map(([loc, encs]) => {
    const best = encs.reduce((a, b) => a.chance > b.chance ? a : b);
    const methodKey = `modal.encounters.method.${best.method}`;
    const methodName = t(methodKey) !== methodKey ? t(methodKey) : escapeHtml(best.method.replace(/-/g, ' '));
    const levelRange = best.minLevel === best.maxLevel
      ? `${t('modal.encounters.level')}${best.minLevel}`
      : `${t('modal.encounters.level')}${best.minLevel}-${best.maxLevel}`;
    const totalChance = encs.reduce((sum, e) => sum + e.chance, 0);
    return `<div class="encounter-item">
      <span class="encounter-location">${loc}</span>
      <span class="encounter-details">${methodName} \u00b7 ${levelRange} \u00b7 ${totalChance}% ${t('modal.encounters.chance')}</span>
    </div>`;
  }).join('');

  container.innerHTML = html;
}

function getEvoConditionLabel(detail: EvolutionDetail | undefined): string {
  if (!detail) return '';
  const parts: string[] = [];

  if (detail.min_level) {
    parts.push(`${t('evo.level')}${detail.min_level}`);
  }

  if (detail.trigger?.name === 'use-item' && detail.item) {
    parts.push(`${t('evo.item')} ${escapeHtml(detail.item.name.replace(/-/g, ' '))}`);
  }

  if (detail.trigger?.name === 'trade') {
    if (detail.held_item) {
      parts.push(`${t('evo.tradeWith')} ${escapeHtml(detail.held_item.name.replace(/-/g, ' '))}`);
    } else if (detail.trade_species) {
      parts.push(`${t('evo.tradeWith')} ${escapeHtml(detail.trade_species.name)}`);
    } else {
      parts.push(t('evo.trade'));
    }
  }

  if (detail.min_happiness) {
    if (detail.time_of_day === 'day') {
      parts.push(t('evo.happinessDay'));
    } else if (detail.time_of_day === 'night') {
      parts.push(t('evo.happinessNight'));
    } else {
      parts.push(t('evo.happiness'));
    }
  } else if (detail.time_of_day === 'day') {
    parts.push(t('evo.day'));
  } else if (detail.time_of_day === 'night') {
    parts.push(t('evo.night'));
  }

  if (detail.held_item && detail.trigger?.name !== 'trade') {
    parts.push(`${t('evo.heldItem')} ${escapeHtml(detail.held_item.name.replace(/-/g, ' '))}`);
  }

  if (detail.known_move) {
    parts.push(`${t('evo.knowMove')}: ${escapeHtml(detail.known_move.name.replace(/-/g, ' '))}`);
  }

  if (detail.known_move_type) {
    parts.push(`${t('evo.knowMoveType')}: ${escapeHtml(detail.known_move_type.name)}`);
  }

  if (detail.location) {
    parts.push(`${t('evo.location')}`);
  }

  if (detail.needs_overworld_rain) {
    parts.push(t('evo.rain'));
  }

  if (detail.turn_upside_down) {
    parts.push(t('evo.upsideDown'));
  }

  if (detail.relative_physical_stats === 1) parts.push(t('evo.atkGtDef'));
  if (detail.relative_physical_stats === -1) parts.push(t('evo.atkLtDef'));
  if (detail.relative_physical_stats === 0) parts.push(t('evo.atkEqDef'));

  if (parts.length === 0 && detail.trigger?.name) {
    parts.push(t('evo.other'));
  }

  return parts.join(', ');
}

interface EvoStep {
  name: string;
  id: number;
  condition: string;
}

function renderEvolutionTree(chain: EvolutionChainLink): string {
  if (chain.evolves_to.length === 0) return '';

  function nodeId(node: EvolutionChainLink): number {
    return parseInt(node.species.url.split('/').filter(Boolean).pop()!);
  }

  function renderPokemonNode(name: string, id: number): string {
    return `<div class="evo-pokemon" data-id="${id}">
      <img class="evo-sprite" src="${getSpriteUrl(id)}" alt="${escapeHtml(name)}" loading="lazy" />
      <span class="evo-name">${escapeHtml(name)}</span>
    </div>`;
  }

  function renderArrow(conditionLabel: string): string {
    return `<div class="evo-arrow-block">
      <span class="evo-arrow">&#9654;</span>
      ${conditionLabel ? `<span class="evo-condition">${conditionLabel}</span>` : ''}
    </div>`;
  }

  function hasBranching(node: EvolutionChainLink): boolean {
    if (node.evolves_to.length > 1) return true;
    return node.evolves_to.some(e => hasBranching(e));
  }

  function collectPaths(node: EvolutionChainLink, currentPath: EvoStep[]): EvoStep[][] {
    const id = nodeId(node);
    const condition = getEvoConditionLabel(node.evolution_details?.[0]);
    const step: EvoStep = { name: node.species.name, id, condition };
    const path = [...currentPath, step];

    if (node.evolves_to.length === 0) return [path];

    const paths: EvoStep[][] = [];
    for (const child of node.evolves_to) {
      paths.push(...collectPaths(child, path));
    }
    return paths;
  }

  if (hasBranching(chain)) {
    const baseId_ = nodeId(chain);
    const paths = collectPaths(chain, []);

    const branchesHtml = paths.map(path => {
      const steps = path.slice(1);
      const stepsHtml = steps.map(step =>
        `${renderArrow(step.condition)}${renderPokemonNode(step.name, step.id)}`
      ).join('');

      return `<div class="evo-branch-row">${stepsHtml}</div>`;
    }).join('');

    return `<div class="evo-tree">
      <div class="evo-tree-base">
        ${renderPokemonNode(chain.species.name, baseId_)}
      </div>
      <div class="evo-branches">${branchesHtml}</div>
    </div>`;
  } else {
    let html = renderPokemonNode(chain.species.name, nodeId(chain));
    let node = chain;
    while (node.evolves_to.length === 1) {
      const next = node.evolves_to[0];
      const condition = getEvoConditionLabel(next.evolution_details?.[0]);
      html += renderArrow(condition) + renderPokemonNode(next.species.name, nodeId(next));
      node = next;
    }
    return `<div class="evo-linear">${html}</div>`;
  }
}
