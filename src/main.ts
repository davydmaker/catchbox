import './style.css';
import { GAMES, getGameById } from './games.ts';
import { getPokedexEntries, getMultiPokedexEntries, getSpeciesData, type PokedexEntry } from './api.ts';
import { getCaptured, toggleCaptured } from './storage.ts';
import { createPokeballSvg } from './pokeball.ts';
import { initModal, updateModalGame, setModalEntries, openModal } from './modal.ts';
import { getSettings, saveSettings, getSpriteStyle, getSpriteUrlForEntry, SPRITE_STYLES, GENDER_MODES, LANGUAGES } from './settings.ts';
import { checkGenderSprites, hasFemaleSpriteCached } from './gender.ts';
import { t, getLang, setLang } from './i18n.ts';
import { initServiceWorker, cacheSpritesForDex, cleanOldSpriteCaches, onCacheProgress, onConnectivityChange } from './cache-manager.ts';
import { API_BATCH_SIZE, SCROLL_DEBOUNCE_MS, ENTRY_NUMBER_PAD, escapeHtml, extractGenderFromKey } from './constants.ts';
import { getShareUrl, parseShareHash, applySharePayload, countSharedPokemon } from './share.ts';

export interface DisplayEntry extends PokedexEntry {
  gender: string | null;
  isLegendary?: boolean;
  isMythical?: boolean;
}

declare global {
  interface Window {
    _boxScrollHandler?: EventListener;
  }
}

let currentGameId: string = getSettings().lastGame || GAMES[0].id;
let currentEntries: DisplayEntry[] = [];
let displayEntries: DisplayEntry[] = [];
let searchTerm: string = '';
let loadGeneration = 0;

const gameSelect = document.getElementById('game-select') as HTMLSelectElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const pokemonGrid = document.getElementById('pokemon-grid')!;
const loadingEl = document.getElementById('loading')!;
const progressText = document.getElementById('progress-text')!;
const progressPercent = document.getElementById('progress-percent')!;
const progressFill = document.getElementById('progress-fill') as HTMLElement;
const boxNav = document.getElementById('box-nav')!;
const boxNavSelect = document.getElementById('box-nav-select') as HTMLSelectElement;
const boxNavPrev = document.getElementById('box-nav-prev') as HTMLButtonElement;
const boxNavNext = document.getElementById('box-nav-next') as HTMLButtonElement;

function applyI18nToDOM(): void {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t((el as HTMLElement).dataset.i18n!);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    (el as HTMLElement).title = t((el as HTMLElement).dataset.i18nTitle!);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    (el as HTMLInputElement).placeholder = t((el as HTMLElement).dataset.i18nPlaceholder!);
  });
  document.documentElement.lang = getLang() === 'pt' ? 'pt-BR' : 'en';
}

function init(): void {
  checkImportOnLoad();
  applyI18nToDOM();
  populateGameSelect();
  gameSelect.value = currentGameId;
  initModal(currentGameId, onCaptureChangeFromModal);
  initSettings();
  initHeaderCollapse();
  initOffline();
  initServiceWorker();
  initFooterObserver();
  initShare();

  gameSelect.addEventListener('change', () => {
    currentGameId = gameSelect.value;
    const s = getSettings();
    s.lastGame = currentGameId;
    saveSettings(s);
    updateModalGame(currentGameId, displayEntries);
    loadPokedex();
  });

  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value.toLowerCase().trim();
    renderGrid();
  });

  loadPokedex();
}

function initShare(): void {
  const shareBtn = document.getElementById('share-btn')!;
  const shareOverlay = document.getElementById('share-overlay')!;
  const shareClose = document.getElementById('share-close')!;
  const shareUrlInput = document.getElementById('share-url') as HTMLInputElement;
  const shareCopyBtn = document.getElementById('share-copy')!;

  shareBtn.addEventListener('click', () => {
    const settingsOverlay = document.getElementById('settings-overlay')!;
    settingsOverlay.classList.add('hidden');
    shareOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    shareUrlInput.value = getShareUrl();
  });

  shareClose.addEventListener('click', () => {
    shareOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  });

  shareOverlay.addEventListener('click', (e) => {
    if (e.target === shareOverlay) {
      shareOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });

  shareCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(shareUrlInput.value).then(() => {
      shareCopyBtn.textContent = t('share.copied');
      shareCopyBtn.classList.add('copied');
      setTimeout(() => {
        shareCopyBtn.textContent = t('share.copy');
        shareCopyBtn.classList.remove('copied');
      }, 2000);
    });
  });

  shareUrlInput.addEventListener('click', () => {
    shareUrlInput.select();
  });
}

function checkImportOnLoad(): void {
  const payload = parseShareHash();
  if (!payload) return;

  const importOverlay = document.getElementById('import-overlay')!;
  const importStats = document.getElementById('import-stats')!;
  const importConfirm = document.getElementById('import-confirm')!;
  const importCancel = document.getElementById('import-cancel')!;

  const stats = countSharedPokemon(payload);
  importStats.textContent = t('share.import.stats')
    .replace('{games}', String(stats.games))
    .replace('{total}', String(stats.total));

  importOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  importConfirm.addEventListener('click', () => {
    applySharePayload(payload);
    importOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    window.location.reload();
  }, { once: true });

  importCancel.addEventListener('click', () => {
    importOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    window.location.hash = '';
  }, { once: true });

  importOverlay.addEventListener('click', (e) => {
    if (e.target === importOverlay) {
      importOverlay.classList.add('hidden');
      document.body.style.overflow = '';
      window.location.hash = '';
    }
  });
}

function initOffline(): void {
  const offlineBanner = document.getElementById('offline-banner')!;
  const downloadBar = document.getElementById('download-bar')!;
  const downloadFillEl = document.getElementById('download-fill') as HTMLElement;
  const downloadTextEl = document.getElementById('download-text')!;

  onConnectivityChange((online) => {
    offlineBanner.classList.toggle('hidden', online);
    if (online && displayEntries.length > 0) {
      renderGrid();
    }
  });

  onCacheProgress(
    (done, total) => {
      downloadBar.classList.remove('hidden');
      const pct = Math.round((done / total) * 100);
      downloadFillEl.style.width = `${pct}%`;
      downloadTextEl.textContent = `${t('offline.downloading')} ${done}/${total}`;
    },
    () => {
      downloadBar.classList.add('hidden');
      downloadFillEl.style.width = '0%';
    }
  );
}

function triggerSpriteCache(): void {
  if (!navigator.onLine) return;
  const ids = currentEntries.map(e => e.nationalId);
  const genderMode = getSettings().genderMode;
  cacheSpritesForDex(ids, genderMode);
}

function initHeaderCollapse(): void {
  const header = document.querySelector('.pokedex-header')!;
  const collapseBtn = document.getElementById('header-collapse')!;
  const expandBtn = document.getElementById('header-expand')!;

  collapseBtn.addEventListener('click', () => {
    header.classList.add('collapsed');
    expandBtn.classList.remove('hidden');
  });

  expandBtn.addEventListener('click', () => {
    header.classList.remove('collapsed');
    expandBtn.classList.add('hidden');
  });
}

function populateGameSelect(): void {
  gameSelect.innerHTML = '';
  let lastGen = 0;
  GAMES.forEach(game => {
    if (game.generation !== lastGen) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = `${t('game.generation')} ${game.generation}`;
      GAMES.filter(g => g.generation === game.generation).forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = `${g.name} (${g.region})`;
        optgroup.appendChild(opt);
      });
      gameSelect.appendChild(optgroup);
      lastGen = game.generation;
    }
  });
}

function initSettings(): void {
  const settingsBtn = document.getElementById('settings-btn')!;
  const settingsOverlay = document.getElementById('settings-overlay')!;
  const settingsClose = document.getElementById('settings-close')!;

  settingsBtn.addEventListener('click', () => {
    settingsOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderSettingsContent();
  });

  settingsClose.addEventListener('click', () => {
    settingsOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  });

  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) {
      settingsOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });
}

function renderSettingsContent(): void {
  const settings = getSettings();
  const langContainer = document.getElementById('language-options')!;
  const spriteContainer = document.getElementById('sprite-style-options')!;
  const genderContainer = document.getElementById('gender-mode-options')!;

  langContainer.innerHTML = LANGUAGES.map(lang => `
    <label class="settings-option wide ${settings.lang === lang.id || (!settings.lang && lang.id === 'pt') ? 'active' : ''}">
      <input type="radio" name="language" value="${lang.id}" ${settings.lang === lang.id || (!settings.lang && lang.id === 'pt') ? 'checked' : ''} />
      <div class="option-text">
        <span class="option-name">${lang.name}</span>
      </div>
    </label>
  `).join('');

  langContainer.querySelectorAll('input[name="language"]').forEach(input => {
    input.addEventListener('change', () => {
      setLang((input as HTMLInputElement).value);
      applyI18nToDOM();
      populateGameSelect();
      gameSelect.value = currentGameId;
      renderSettingsContent();
      renderGrid();
    });
  });

  const isOffline = !navigator.onLine;
  spriteContainer.innerHTML = SPRITE_STYLES.map(style => `
    <label class="settings-option ${settings.spriteStyle === style.id ? 'active' : ''} ${isOffline && settings.spriteStyle !== style.id ? 'disabled' : ''}">
      <input type="radio" name="sprite-style" value="${style.id}" ${settings.spriteStyle === style.id ? 'checked' : ''} ${isOffline && settings.spriteStyle !== style.id ? 'disabled' : ''} />
      <div class="option-preview">
        <img src="${style.getUrl(25)}" alt="Preview" class="${style.pixelated ? 'pixelated' : ''}" />
      </div>
      <span class="option-name">${t(style.nameKey)}</span>
    </label>
  `).join('') + `<div class="settings-hint ${isOffline ? 'settings-hint-warning' : ''}">${isOffline ? t('settings.spriteStyleOffline') : t('settings.spriteStyleHint')}</div>`;

  spriteContainer.querySelectorAll('input[name="sprite-style"]').forEach(input => {
    input.addEventListener('change', () => {
      if (!navigator.onLine) return;
      const s = getSettings();
      s.spriteStyle = (input as HTMLInputElement).value;
      saveSettings(s);
      cleanOldSpriteCaches((input as HTMLInputElement).value);
      renderSettingsContent();
      renderGrid();
      triggerSpriteCache();
    });
  });

  genderContainer.innerHTML = GENDER_MODES.map(mode => `
    <label class="settings-option wide ${settings.genderMode === mode.id ? 'active' : ''}">
      <input type="radio" name="gender-mode" value="${mode.id}" ${settings.genderMode === mode.id ? 'checked' : ''} />
      <div class="option-text">
        <span class="option-name">${t(mode.nameKey)}</span>
        <span class="option-desc">${t(mode.descKey)}</span>
      </div>
    </label>
  `).join('');

  genderContainer.querySelectorAll('input[name="gender-mode"]').forEach(input => {
    input.addEventListener('change', () => {
      const s = getSettings();
      s.genderMode = (input as HTMLInputElement).value;
      saveSettings(s);
      renderSettingsContent();
      processEntries().then(() => renderGrid());
    });
  });
}

async function loadPokedex(): Promise<void> {
  const thisGeneration = ++loadGeneration;
  loadingEl.classList.remove('hidden');
  pokemonGrid.classList.add('hidden');

  try {
    const game = getGameById(currentGameId);
    let rawEntries: PokedexEntry[];
    if (game.extraPokedexes) {
      rawEntries = await getMultiPokedexEntries([game.pokedex, ...game.extraPokedexes]);
    } else {
      rawEntries = await getPokedexEntries(game.pokedex);
    }
    // Discard result if user already switched to another game
    if (thisGeneration !== loadGeneration) return;
    currentEntries = rawEntries.map(e => ({ ...e, gender: null }));
    await processEntries();
    if (thisGeneration !== loadGeneration) return;
    renderGrid();
    triggerSpriteCache();
    enrichEntriesWithSpecies().then(() => {
      if (thisGeneration !== loadGeneration) return;
      displayEntries.forEach(de => {
        const src = currentEntries.find(ce => ce.nationalId === de.nationalId);
        if (src) { de.isLegendary = src.isLegendary; de.isMythical = src.isMythical; }
      });
      document.querySelectorAll('.pokemon-card').forEach(card => {
        const nid = parseInt((card as HTMLElement).dataset.nationalId!);
        const entry = currentEntries.find(e => e.nationalId === nid);
        if (entry?.isLegendary) card.classList.add('legendary');
        if (entry?.isMythical) card.classList.add('mythical');
      });
    });
  } catch {
    pokemonGrid.innerHTML = `<div class="no-results"><div class="no-results-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div><p>${t('error.loading')}</p></div>`;
    pokemonGrid.classList.remove('hidden');
  }

  loadingEl.classList.add('hidden');
}

async function enrichEntriesWithSpecies(): Promise<void> {
  const batchSize = API_BATCH_SIZE;
  for (let i = 0; i < currentEntries.length; i += batchSize) {
    const batch = currentEntries.slice(i, i + batchSize);
    await Promise.all(batch.map(async (entry) => {
      try {
        const species = await getSpeciesData(entry.nationalId);
        entry.isLegendary = species.is_legendary === true;
        entry.isMythical = species.is_mythical === true;
      } catch {
        entry.isLegendary = false;
        entry.isMythical = false;
      }
    }));
  }
}

async function processEntries(): Promise<void> {
  const genderMode = getSettings().genderMode;

  if (genderMode === 'single') {
    displayEntries = currentEntries.map(e => ({ ...e, gender: null }));
  } else if (genderMode === 'dimorphic') {
    const ids = currentEntries.map(e => e.nationalId);
    await checkGenderSprites(ids);

    displayEntries = [];
    currentEntries.forEach(e => {
      if (hasFemaleSpriteCached(e.nationalId)) {
        displayEntries.push({ ...e, gender: 'male' });
        displayEntries.push({ ...e, gender: 'female' });
      } else {
        displayEntries.push({ ...e, gender: null });
      }
    });
  } else if (genderMode === 'all') {
    displayEntries = [];
    currentEntries.forEach(e => {
      displayEntries.push({ ...e, gender: 'male' });
      displayEntries.push({ ...e, gender: 'female' });
    });
  }

  if (genderMode !== 'single') {
    displayEntries.forEach((e, i) => { e.entryNumber = i + 1; });
  }

  setModalEntries(displayEntries);
  updateModalGame(currentGameId, displayEntries);
}

function captureKey(entry: DisplayEntry): string {
  if (entry.gender) return `${entry.nationalId}_${entry.gender}`;
  return `${entry.nationalId}`;
}

// Cross-mode check: single key '25' matches if both '25_male' and '25_female' exist
function isEntryCaptured(capturedSet: Set<string>, key: string): boolean {
  if (capturedSet.has(key)) return true;
  const { baseId, gender } = extractGenderFromKey(key);
  if (gender) {
    return capturedSet.has(baseId);
  }
  return capturedSet.has(`${key}_male`) && capturedSet.has(`${key}_female`);
}

function renderGrid(): void {
  pokemonGrid.innerHTML = '';
  pokemonGrid.classList.remove('hidden');

  const game = getGameById(currentGameId);
  const captured = getCaptured(currentGameId);
  const boxSize = game.boxSize;
  const spriteStyle = getSpriteStyle();

  let entries = displayEntries;
  if (searchTerm) {
    entries = entries.filter(e =>
      e.name.includes(searchTerm) ||
      String(e.entryNumber).includes(searchTerm) ||
      String(e.nationalId).includes(searchTerm)
    );
  }

  if (entries.length === 0) {
    pokemonGrid.innerHTML = `<div class="no-results"><div class="no-results-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div><p>${t('noResults.text')}</p></div>`;
    const totalCapturedNoResults = displayEntries.filter(e => isEntryCaptured(captured, captureKey(e))).length;
    updateProgress(totalCapturedNoResults, displayEntries.length);
    boxNav.classList.add('hidden');
    return;
  }

  const boxes: DisplayEntry[][] = [];
  for (let i = 0; i < entries.length; i += boxSize) {
    boxes.push(entries.slice(i, i + boxSize));
  }

  boxes.forEach((boxEntries, boxIdx) => {
    const section = document.createElement('div');
    section.className = 'box-section';

    const firstNum = boxEntries[0].entryNumber;
    const lastNum = boxEntries[boxEntries.length - 1].entryNumber;
    const boxCapturedCount = boxEntries.filter(e => isEntryCaptured(captured, captureKey(e))).length;

    section.innerHTML = `
      <div class="box-header">
        <span class="box-title">${t('box.title')} ${boxIdx + 1}</span>
        <span class="box-count">#${String(firstNum).padStart(ENTRY_NUMBER_PAD, '0')} - #${String(lastNum).padStart(ENTRY_NUMBER_PAD, '0')} \u00b7 ${boxCapturedCount}/${boxEntries.length}</span>
      </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'box-grid';

    boxEntries.forEach(entry => {
      const key = captureKey(entry);
      const isCaptured = isEntryCaptured(captured, key);
      const card = document.createElement('div');
      card.className = `pokemon-card${isCaptured ? ' captured' : ''}${entry.isLegendary ? ' legendary' : ''}${entry.isMythical ? ' mythical' : ''}`;
      card.dataset.captureKey = key;
      card.dataset.nationalId = String(entry.nationalId);
      card.dataset.entryNumber = String(entry.entryNumber);
      if (entry.gender) card.dataset.gender = entry.gender;

      // Only use female sprite URL if the pokemon actually has dimorphism
      const hasDimorphism = hasFemaleSpriteCached(entry.nationalId);
      const useFemaleSpriteGender = (entry.gender === 'female' && hasDimorphism) ? 'female' : null;
      const spriteUrl = getSpriteUrlForEntry(entry.nationalId, useFemaleSpriteGender, spriteStyle);

      const genderMode = getSettings().genderMode;
      const showGenderToggle = genderMode === 'single' && hasDimorphism;
      const showGenderIndicator = genderMode !== 'single' && entry.gender;

      card.innerHTML = `
        ${showGenderToggle ? `
          <button class="gender-btn" data-viewing="male" title="${t('gender.toggle')}">
            <svg viewBox="0 0 24 24" fill="currentColor" class="gender-icon male">
              <path d="M16 2v2h3.586l-4.293 4.293A5.969 5.969 0 0 0 12 7c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6a5.969 5.969 0 0 0-1.293-3.707L21 5.414V9h2V2h-7zM12 17c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z"/>
            </svg>
          </button>
        ` : ''}
        ${showGenderIndicator ? `
          <span class="gender-indicator ${entry.gender}">
            ${entry.gender === 'male' ? '\u2642' : '\u2640'}
          </span>
        ` : ''}
        <button class="capture-btn" title="${isCaptured ? t('capture.remove') : t('capture.mark')}">
          ${createPokeballSvg()}
        </button>
        <div class="card-number">#${String(entry.entryNumber).padStart(ENTRY_NUMBER_PAD, '0')}</div>
        <div class="card-sprite-container">
          <img class="card-sprite ${spriteStyle.pixelated ? 'pixelated' : 'smooth'}" src="${spriteUrl}" alt="${escapeHtml(entry.name)}" loading="lazy" />
        </div>
        <div class="card-name">${escapeHtml(entry.name)}</div>
      `;

      const genderBtn = card.querySelector('.gender-btn') as HTMLElement | null;
      if (genderBtn) {
        genderBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const current = genderBtn.dataset.viewing!;
          const next = current === 'male' ? 'female' : 'male';
          genderBtn.dataset.viewing = next;

          const icon = genderBtn.querySelector('.gender-icon')!;
          if (next === 'female') {
            icon.classList.remove('male');
            icon.classList.add('female');
            icon.innerHTML = '<path d="M12 2C8.686 2 6 4.686 6 8c0 2.837 1.98 5.21 4.625 5.824V16H8v2h2.625v2h2.75v-2H16v-2h-2.625v-2.176C16.02 13.21 18 10.837 18 8c0-3.314-2.686-6-6-6zm0 10c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z"/>';
          } else {
            icon.classList.remove('female');
            icon.classList.add('male');
            icon.innerHTML = '<path d="M16 2v2h3.586l-4.293 4.293A5.969 5.969 0 0 0 12 7c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6a5.969 5.969 0 0 0-1.293-3.707L21 5.414V9h2V2h-7zM12 17c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z"/>';
          }

          const img = card.querySelector('.card-sprite') as HTMLImageElement;
          const newUrl = getSpriteUrlForEntry(entry.nationalId, next === 'female' ? 'female' : null, spriteStyle);
          img.src = newUrl;
        });
      }

      const spriteImg = card.querySelector('.card-sprite') as HTMLImageElement;
      spriteImg.addEventListener('error', () => {
        spriteImg.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.className = 'sprite-placeholder';
        const label = navigator.onLine ? t('offline.noSpriteShort') : t('offline.needsInternet');
        placeholder.innerHTML = navigator.onLine
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="8" x2="16" y2="16"/><line x1="16" y1="8" x2="8" y2="16"/></svg><span>${label}</span>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg><span>${label}</span>`;
        spriteImg.parentElement!.appendChild(placeholder);
      }, { once: true });

      const captureBtn = card.querySelector('.capture-btn') as HTMLElement;
      captureBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nowCaptured = toggleCaptured(currentGameId, key);
        card.classList.toggle('captured', nowCaptured);
        captureBtn.title = nowCaptured ? t('capture.remove') : t('capture.mark');
        updateProgressFromDOM();
      });

      card.addEventListener('click', () => {
        openModal(entry.nationalId, entry.entryNumber, entry.gender);
      });

      grid.appendChild(card);
    });

    section.appendChild(grid);
    pokemonGrid.appendChild(section);
  });

  const totalCaptured = displayEntries.filter(e => isEntryCaptured(captured, captureKey(e))).length;
  updateProgress(totalCaptured, displayEntries.length);
  updateBoxNav(boxes.length);
}

function updateBoxNav(totalBoxes: number): void {
  if (totalBoxes <= 1) {
    boxNav.classList.add('hidden');
    return;
  }

  boxNav.classList.remove('hidden');
  boxNavSelect.innerHTML = '';

  for (let i = 0; i < totalBoxes; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${t('box.title')} ${i + 1} ${t('box.of')} ${totalBoxes}`;
    boxNavSelect.appendChild(opt);
  }

  const updateActiveBox = (): void => {
    const sections = document.querySelectorAll('.box-section');
    const headerHeight = (document.querySelector('.pokedex-header') as HTMLElement | null)?.offsetHeight || 0;
    let closestIdx = 0;
    let closestDist = Infinity;

    sections.forEach((section, idx) => {
      const rect = section.getBoundingClientRect();
      const dist = Math.abs(rect.top - headerHeight);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    boxNavSelect.value = String(closestIdx);
    boxNavPrev.disabled = closestIdx === 0;
    boxNavNext.disabled = closestIdx === totalBoxes - 1;
  };

  let scrollTimer: ReturnType<typeof setTimeout>;
  const onScroll = (): void => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateActiveBox, SCROLL_DEBOUNCE_MS);
  };
  if (window._boxScrollHandler) {
    window.removeEventListener('scroll', window._boxScrollHandler);
  }
  window._boxScrollHandler = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true });

  boxNavSelect.onchange = () => {
    scrollToBox(parseInt(boxNavSelect.value));
  };

  boxNavPrev.onclick = () => {
    const current = parseInt(boxNavSelect.value);
    if (current > 0) scrollToBox(current - 1);
  };

  boxNavNext.onclick = () => {
    const current = parseInt(boxNavSelect.value);
    if (current < totalBoxes - 1) scrollToBox(current + 1);
  };

  updateActiveBox();
}

function scrollToBox(index: number): void {
  const sections = document.querySelectorAll('.box-section');
  if (sections[index]) {
    const headerHeight = (document.querySelector('.pokedex-header') as HTMLElement | null)?.offsetHeight || 0;
    const top = sections[index].getBoundingClientRect().top + window.scrollY - headerHeight - 10;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

function initFooterObserver(): void {
  const footer = document.querySelector('.site-footer') as HTMLElement | null;
  if (!footer) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        boxNav.classList.add('above-footer');
        const footerRect = footer.getBoundingClientRect();
        (boxNav as HTMLElement).style.bottom = `${window.innerHeight - footerRect.top + 8}px`;
      } else {
        boxNav.classList.remove('above-footer');
        (boxNav as HTMLElement).style.bottom = '';
      }
    });
  }, { threshold: 0 });

  observer.observe(footer);

  window.addEventListener('scroll', () => {
    if (boxNav.classList.contains('above-footer')) {
      const footerRect = footer.getBoundingClientRect();
      if (footerRect.top < window.innerHeight) {
        (boxNav as HTMLElement).style.bottom = `${window.innerHeight - footerRect.top + 8}px`;
      } else {
        boxNav.classList.remove('above-footer');
        (boxNav as HTMLElement).style.bottom = '';
      }
    }
  }, { passive: true });
}

function updateProgress(capturedCount: number, total: number): void {
  const pct = total > 0 ? Math.round((capturedCount / total) * 100) : 0;
  progressText.textContent = `${capturedCount} / ${total}`;
  progressPercent.textContent = `${pct}%`;
  progressFill.style.width = `${pct}%`;
}

function updateProgressFromDOM(): void {
  const captured = getCaptured(currentGameId);
  const totalCaptured = displayEntries.filter(e => isEntryCaptured(captured, captureKey(e))).length;
  updateProgress(totalCaptured, displayEntries.length);

  document.querySelectorAll('.box-section').forEach(section => {
    const cards = section.querySelectorAll('.pokemon-card');
    const boxCaptured = section.querySelectorAll('.pokemon-card.captured').length;
    const countEl = section.querySelector('.box-count');
    if (countEl) {
      const firstCard = cards[0] as HTMLElement | undefined;
      const lastCard = cards[cards.length - 1] as HTMLElement | undefined;
      const first = firstCard?.dataset.entryNumber || '?';
      const last = lastCard?.dataset.entryNumber || '?';
      countEl.textContent = `#${String(first).padStart(ENTRY_NUMBER_PAD, '0')} - #${String(last).padStart(ENTRY_NUMBER_PAD, '0')} \u00b7 ${boxCaptured}/${cards.length}`;
    }
  });
}

function onCaptureChangeFromModal(captureKeyVal: string, isCaptured: boolean): void {
  const card = pokemonGrid.querySelector(`.pokemon-card[data-capture-key="${captureKeyVal}"]`);
  if (card) {
    card.classList.toggle('captured', isCaptured);
  }
  updateProgressFromDOM();
}

init();
