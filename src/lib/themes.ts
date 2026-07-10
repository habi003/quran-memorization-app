export interface Theme {
  id: string
  label: string
  swatch: string // solid color class for the picker swatch
  pageBg: string
  cardBg: string
  heading: string
  bodyText: string
  accentBg: string
  accentBgHover: string
  accentText: string
}

// A small curated set of complete light/dark + color-skin combinations,
// rather than a light/dark toggle crossed with every skin — keeps the
// picker simple and every option guaranteed to look good together.
export const THEMES: Theme[] = [
  {
    id: 'default-light',
    label: 'Light',
    swatch: 'bg-slate-100',
    pageBg: 'bg-slate-50',
    cardBg: 'bg-white',
    heading: 'text-slate-800',
    bodyText: 'text-slate-500',
    accentBg: 'bg-emerald-600',
    accentBgHover: 'hover:bg-emerald-700',
    accentText: 'text-emerald-700',
  },
  {
    id: 'default-dark',
    label: 'Dark',
    swatch: 'bg-slate-800',
    pageBg: 'bg-slate-900',
    cardBg: 'bg-slate-800',
    heading: 'text-slate-100',
    bodyText: 'text-slate-400',
    accentBg: 'bg-emerald-500',
    accentBgHover: 'hover:bg-emerald-400',
    accentText: 'text-emerald-400',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    swatch: 'bg-sky-400',
    pageBg: 'bg-sky-50',
    cardBg: 'bg-white',
    heading: 'text-sky-900',
    bodyText: 'text-sky-600',
    accentBg: 'bg-sky-600',
    accentBgHover: 'hover:bg-sky-700',
    accentText: 'text-sky-700',
  },
  {
    id: 'jungle',
    label: 'Jungle',
    swatch: 'bg-lime-500',
    pageBg: 'bg-lime-50',
    cardBg: 'bg-white',
    heading: 'text-green-900',
    bodyText: 'text-green-700',
    accentBg: 'bg-green-600',
    accentBgHover: 'hover:bg-green-700',
    accentText: 'text-green-700',
  },
  {
    id: 'space',
    label: 'Space',
    swatch: 'bg-indigo-600',
    pageBg: 'bg-indigo-950',
    cardBg: 'bg-indigo-900',
    heading: 'text-indigo-50',
    bodyText: 'text-indigo-300',
    accentBg: 'bg-purple-500',
    accentBgHover: 'hover:bg-purple-400',
    accentText: 'text-purple-300',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    swatch: 'bg-orange-400',
    pageBg: 'bg-orange-50',
    cardBg: 'bg-white',
    heading: 'text-orange-900',
    bodyText: 'text-orange-600',
    accentBg: 'bg-orange-500',
    accentBgHover: 'hover:bg-orange-600',
    accentText: 'text-orange-700',
  },
]

export const DEFAULT_THEME_ID = 'default-light'

export function getTheme(themeId: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === themeId) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!
}
