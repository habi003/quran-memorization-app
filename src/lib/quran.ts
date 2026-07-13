import type { ApiReciter, ApiSurahMeta, Ayah, SurahContent } from '../types/database'

// Cached client-side only (localStorage) — text/metadata, never audio bytes.
// Not the PWA offline cache (that's a service worker, milestone 8).
// v2: SurahContent gained englishNameTranslation — bumped so kids/devices
// with a v1 cache don't keep serving stale objects missing that field.
const CACHE_PREFIX = 'qma:quran:v2:'

function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function setCached<T>(key: string, value: T): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full/unavailable — fine to skip caching, next load just refetches.
  }
}

export function buildAudioUrl(edition: string, globalAyahNumber: number, bitrate = 128): string {
  return `https://cdn.islamic.network/quran/audio/${bitrate}/${edition}/${globalAyahNumber}.mp3`
}

export async function fetchSurahList(): Promise<ApiSurahMeta[]> {
  const cached = getCached<ApiSurahMeta[]>('surahList')
  if (cached?.length) return cached

  const res = await fetch('https://api.alquran.cloud/v1/surah')
  if (!res.ok) throw new Error('Could not load the surah list.')
  const json = await res.json()
  const list = json.data as ApiSurahMeta[]
  setCached('surahList', list)
  return list
}

export async function fetchReciters(): Promise<ApiReciter[]> {
  const cached = getCached<ApiReciter[]>('reciters')
  if (cached?.length) return cached

  const res = await fetch('https://api.alquran.cloud/v1/edition/format/audio')
  if (!res.ok) throw new Error('Could not load the reciter list.')
  const json = await res.json()
  const list = json.data as ApiReciter[]
  setCached('reciters', list)
  return list
}

interface ApiAyah {
  number: number
  numberInSurah: number
  text: string
  audio?: string
}

interface ApiSurahEdition {
  name: string
  englishName: string
  englishNameTranslation: string
  numberOfAyahs: number
  ayahs: ApiAyah[]
}

export async function fetchSurah(surahNumber: number, reciterEdition: string): Promise<SurahContent> {
  const cacheKey = `surah:${surahNumber}:${reciterEdition}`
  const cached = getCached<SurahContent>(cacheKey)
  if (cached) return cached

  const editions = `quran-uthmani,en.transliteration,${reciterEdition}`
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/editions/${editions}`)
  if (!res.ok) throw new Error('Could not load this surah.')
  const json = await res.json()
  const [uthmani, translit, audio] = json.data as ApiSurahEdition[]

  const ayahs: Ayah[] = uthmani.ayahs.map((a, i) => ({
    numberInSurah: a.numberInSurah,
    number: a.number,
    arabic: a.text,
    transliteration: translit.ayahs[i]?.text ?? '',
    // Prefer the bundled audio field (spec §3); fall back to the CDN pattern
    // if a given reciter edition's response ever omits it.
    audioUrl: audio.ayahs[i]?.audio || buildAudioUrl(reciterEdition, a.number),
  }))

  const content: SurahContent = {
    number: surahNumber,
    name: uthmani.name,
    englishName: uthmani.englishName,
    englishNameTranslation: uthmani.englishNameTranslation,
    numberOfAyahs: uthmani.numberOfAyahs,
    ayahs,
  }
  setCached(cacheKey, content)
  return content
}
