# CatchBox

**Gotta track 'em all!**

A visual Pokédex tracker for every game, generation, and box. Track your catches with game-accurate box layouts, multiple sprite styles, offline support, and detailed Pokémon data.

## Features

- **22 games supported** — From Red/Blue to Legends: Z-A, with correct regional Pokédex for each
- **Box layout** — 6x5 grid mirroring in-game box organization
- **Capture tracking** — Mark Pokémon as captured with progress saved locally
- **Multiple sprite styles** — Pixel, Official Artwork, Pokémon HOME, Showdown (animated), Dream World, Shiny
- **Gender modes** — Simple, By Form (dimorphic only), Complete (all genders)
- **Detailed Pokémon info** — Stats, types, abilities, evolution chain with conditions, gender rate, hatch steps, forms, level-up moves, encounter locations
- **Legendary/Mythical indicators** — Purple and gold borders on the grid
- **Offline support** — Service Worker caches sprites and API data for offline use
- **Share progress** — Generate a link to sync your progress across devices
- **i18n** — Portuguese and English
- **Responsive** — Desktop (6 columns) and mobile (3 columns portrait, 6 landscape)

## Tech Stack

- **TypeScript** + **Vite** (vanilla, no framework)
- **PokeAPI** for all Pokémon data
- **Service Worker** for offline caching
- **localStorage** for progress persistence

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build

```bash
npm run build
npm run preview
```

## Deploy

Works out of the box on Vercel, Netlify, or any static hosting. Just connect the repo and it auto-detects Vite.

## Disclaimer

CatchBox is an unofficial, fan-made project. Not affiliated with, endorsed, or sponsored by Nintendo, Game Freak, Creatures Inc., or The Pokémon Company. Pokémon and all related names are trademarks of their respective owners. Data provided by [PokeAPI](https://pokeapi.co/).

## License

[MIT](LICENSE)
