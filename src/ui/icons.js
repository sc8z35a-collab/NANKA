// 手描き風 SVG アイコン (Agent C) — 明るい色のみ。stroke は文字色 #3B4A5A を薄めて使用
const S = (body, vb = '0 0 48 48') =>
  `<svg viewBox="${vb}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const ink = 'stroke="#3B4A5A" stroke-opacity=".55" stroke-width="2"';

export const ICONS = {
  lighthouse: S(`
    <path d="M24 5l5 5H19z" fill="#FF9F7A" ${ink}/>
    <rect x="18.5" y="10" width="11" height="7" rx="2" fill="#FFF6C9" ${ink}/>
    <path d="M24 13.5l-11-4M24 13.5l11-4" stroke="#FFD36E" stroke-width="2.4" opacity=".9"/>
    <path d="M19 17h10l2.6 25H16.4z" fill="#fff" ${ink}/>
    <path d="M18.6 22.5h10.8l.7 6.5H17.9zM17.4 34h13.2l.7 6.4H16.7z" fill="#FF9F7A"/>
    <path d="M10 43h28" ${ink}/>`),
  windmill: S(`
    <path d="M18 44l3-22h6l3 22z" fill="#FFF3DC" ${ink}/>
    <path d="M17 23l7-6 7 6z" fill="#FF9F7A" ${ink}/>
    <rect x="21.5" y="34" width="5" height="10" rx="2.5" fill="#8FB8FF"/>
    <g transform="translate(24 19)">
      <g class="spin">
        <path d="M0 0L-3 -15h6z" fill="#E8F6FF" ${ink}/>
        <path d="M0 0L15 -3v6z" fill="#E8F6FF" ${ink}/>
        <path d="M0 0L3 15h-6z" fill="#E8F6FF" ${ink}/>
        <path d="M0 0L-15 3v-6z" fill="#E8F6FF" ${ink}/>
        <circle r="2.6" fill="#FFD36E" ${ink}/>
      </g>
    </g>`),
  flower: S(`
    <path d="M24 44V27" stroke="#7FBF5A" stroke-width="3"/>
    <path d="M24 36c-6-1-9-5-9-8 5 0 8 3 9 8zM24 38c5-1 8-4 8-7-4 0-7 3-8 7z" fill="#9ED37A"/>
    <g transform="translate(24 18)">
      <circle cx="0" cy="-8" r="6" fill="#FFB3C7"/><circle cx="7.6" cy="-2.5" r="6" fill="#FFB3C7"/>
      <circle cx="4.7" cy="6.5" r="6" fill="#FFB3C7"/><circle cx="-4.7" cy="6.5" r="6" fill="#FFB3C7"/>
      <circle cx="-7.6" cy="-2.5" r="6" fill="#FFB3C7"/>
      <circle r="4.4" fill="#FFD36E" ${ink}/>
    </g>`),
  drop: S(`
    <path d="M10 8h28v6c0 4-4 5-8 5H18c-4 0-8-1-8-5z" fill="#9ED37A" ${ink}/>
    <path d="M17 18c0 10 3 12 3 26M24 18c0 10 0 14 0 26M31 18c0 10-3 12-3 26" stroke="#7FD3E8" stroke-width="3.2"/>
    <path d="M9 41a15 9 0 0 1 30 0" fill="none" stroke="#FFB3C7" stroke-width="2.2"/>
    <path d="M12.5 41a11.5 6.5 0 0 1 23 0" fill="none" stroke="#FFD36E" stroke-width="2.2"/>
    <path d="M16 41a8 4 0 0 1 16 0" fill="none" stroke="#8FB8FF" stroke-width="2.2"/>
    <ellipse cx="24" cy="43" rx="14" ry="3" fill="#fff" opacity=".9"/>`),
  balloon: S(`
    <path d="M24 4c-9 0-15 6.5-15 14.5C9 27 18 31 20.5 35h7C30 31 39 27 39 18.5 39 10.5 33 4 24 4z" fill="#FFD36E" ${ink}/>
    <path d="M24 4c-4 0-6.5 6.5-6.5 14.5S20 31 21.5 35M24 4c4 0 6.5 6.5 6.5 14.5S28 31 26.5 35" fill="#FF9F7A" opacity=".85"/>
    <path d="M24 4v31" stroke="#fff" stroke-width="2.4" opacity=".9"/>
    <path d="M21 35l-.5 4M27 35l.5 4" ${ink}/>
    <rect x="19" y="39" width="10" height="6" rx="2" fill="#F4E3B5" ${ink}/>`),
  close: S(`<path d="M15 15l18 18M33 15L15 33" stroke="#3B4A5A" stroke-opacity=".7" stroke-width="3.4"/>`),
  prev: S(`<path d="M29 13L18 24l11 11" fill="none" stroke="#3B4A5A" stroke-opacity=".7" stroke-width="3.4"/>`),
  next: S(`<path d="M19 13l11 11-11 11" fill="none" stroke="#3B4A5A" stroke-opacity=".7" stroke-width="3.4"/>`),
  home: S(`<path d="M10 23L24 11l14 12" fill="none" stroke="#3B4A5A" stroke-opacity=".7" stroke-width="3.2"/><path d="M14 21v15h20V21" fill="#fff" stroke="#3B4A5A" stroke-opacity=".7" stroke-width="3.2"/><rect x="21" y="27" width="6" height="9" rx="2" fill="#FFD36E"/>`),
  compass: S(`<circle cx="24" cy="24" r="19" fill="#fff" stroke="#3B4A5A" stroke-opacity=".25" stroke-width="2"/><path d="M24 7l5 17h-10z" fill="#FF9F7A"/><path d="M24 41l-5-17h10z" fill="#BFD7EA"/><circle cx="24" cy="24" r="2.6" fill="#fff" stroke="#3B4A5A" stroke-opacity=".5" stroke-width="1.5"/>`),
  drag: S(`<path d="M13 24a11 6 0 1 0 22 0" fill="none" stroke="#8FB8FF" stroke-width="2.6" stroke-dasharray="3 4"/><path d="M33 19l3 5-5.5 1" fill="none" stroke="#8FB8FF" stroke-width="2.6"/><path d="M22 34V18a2.6 2.6 0 0 1 5.2 0v9l5.6 1.2a3 3 0 0 1 2.3 3.3L34 40H23.5l-5.2-6.3a2.4 2.4 0 0 1 3.7-3z" fill="#fff" ${ink}/>`),
  pinch: S(`<path d="M10 10l7 7M10 10h6M10 10v6M38 38l-7-7M38 38h-6M38 38v-6" fill="none" stroke="#FF9F7A" stroke-width="2.6"/><path d="M21 34V20a2.6 2.6 0 0 1 5.2 0v8l5.6 1.2a3 3 0 0 1 2.3 3.3L33 41H22.5l-5.2-6.3a2.4 2.4 0 0 1 3.7-3z" fill="#fff" ${ink}/>`),
  tap: S(`<circle cx="24" cy="15" r="7" fill="none" stroke="#FFD36E" stroke-width="2.6"/><circle cx="24" cy="15" r="12" fill="none" stroke="#FFD36E" stroke-width="2" opacity=".5"/><path d="M21.4 36V16a2.6 2.6 0 0 1 5.2 0v9l5.6 1.2a3 3 0 0 1 2.3 3.3L33.4 42H22.9l-5.2-6.3a2.4 2.4 0 0 1 3.7-3z" fill="#fff" ${ink}/>`),
  star: S(`<path d="M24 6l5.3 11.6 12.7 1.4-9.5 8.6 2.7 12.5L24 33.8 12.8 40.1l2.7-12.5L6 19l12.7-1.4z" fill="#FFD36E" ${ink}/>`),
  check: S(`<path d="M13 25l7 7 15-16" fill="none" stroke="#fff" stroke-width="4.4"/>`),
  map: S(`<path d="M8 12l10-4 12 4 10-4v28l-10 4-12-4-10 4z" fill="#fff" ${ink}/><path d="M18 8v28M30 12v28" ${ink}/>`),
  sparkle: S(`<path d="M24 6c1.5 9 3 10.5 12 12-9 1.5-10.5 3-12 12-1.5-9-3-10.5-12-12 9-1.5 10.5-3 12-12z" fill="#FFD36E"/>`),
};
export const icon = (name) => ICONS[name] || ICONS.star;
