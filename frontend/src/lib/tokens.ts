// Colour pairs the site puts text on. Each value mirrors a variable in globals.css, and a unit
// test checks both that they match and that every pair meets WCAG AA (4.5:1).

export const TOKENS = {
  canvas: '#f7f6f1',
  surface: '#ffffff',
  surface2: '#efede6',
  ink: '#111111',
  ink2: '#3a3936',
  muted: '#64625b',
  night: '#141414',
  night2: '#262624',
  onNight: '#f7f6f1',
  onNightMuted: '#b5b2a8',
  signal: '#ffd23f',
  signalInk: '#6e5100',
  once: '#1b6a42',
  onceWash: '#e2f1e7',
  twice: '#1d4fb5',
  twiceWash: '#e6edfb',
  missed: '#b0261c',
  missedWash: '#fbe8e5',
  codeBg: '#141414',
  codeInk: '#eceae2',
  codeMuted: '#a9a69c',
  codeOnce: '#8fd3a8',
  codeMissed: '#f4a296',
  codeTwice: '#a9c1f7',
} as const

export type Token = keyof typeof TOKENS

export const TEXT_PAIRS: readonly [Token, Token][] = [
  ['ink', 'canvas'],
  ['ink2', 'canvas'],
  ['muted', 'canvas'],
  ['ink', 'surface'],
  ['muted', 'surface'],
  ['ink2', 'surface2'],
  ['muted', 'surface2'],
  ['canvas', 'ink'],
  ['ink', 'signal'],
  ['signalInk', 'canvas'],
  ['signalInk', 'surface'],
  ['once', 'onceWash'],
  ['once', 'surface'],
  ['twice', 'twiceWash'],
  ['twice', 'surface'],
  ['missed', 'missedWash'],
  ['missed', 'surface'],
  ['ink2', 'twiceWash'],
  ['ink2', 'missedWash'],
  ['onNight', 'night'],
  ['onNightMuted', 'night'],
  ['onNight', 'night2'],
  ['onNightMuted', 'night2'],
  ['signal', 'night'],
  ['codeInk', 'codeBg'],
  ['codeMuted', 'codeBg'],
  ['codeOnce', 'codeBg'],
  ['codeMissed', 'codeBg'],
  ['codeTwice', 'codeBg'],
]

function channel(hex: string, offset: number): number {
  const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5)
}

export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
