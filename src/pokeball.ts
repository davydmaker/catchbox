export function createPokeballSvg(className: string = 'pokeball-icon'): string {
  return `<svg class="${className}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#fff" stroke="#333" stroke-width="4"/>
    <path d="M 2 50 A 48 48 0 0 1 98 50 Z" fill="#EE1515" stroke="#333" stroke-width="4"/>
    <rect x="2" y="47" width="96" height="6" fill="#333"/>
    <circle cx="50" cy="50" r="14" fill="#fff" stroke="#333" stroke-width="4"/>
    <circle cx="50" cy="50" r="7" fill="#fff" stroke="#333" stroke-width="3"/>
  </svg>`;
}
