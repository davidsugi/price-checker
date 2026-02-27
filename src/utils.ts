import { toKatakana } from 'wanakana'

export type RecentSearch = {
  cardName: string
  cardType: string
  japaneseText: string
  timestamp: number
}

export const CARD_TYPE_OPTIONS = [
  { label: 'One Piece', value: 'opc' },
  { label: 'Magic', value: 'mtg' },
  { label: 'Yu-Gi-Oh', value: 'ygo' },
  { label: 'Digimon', value: 'digi' },
] as const

export type CardTypeValue = (typeof CARD_TYPE_OPTIONS)[number]['value']

const LS_CACHE_KEY = 'tcg_translation_cache'
const LS_RECENT_KEY = 'tcg_recent_searches'
const MAX_RECENT = 10

export function getCardTypeLabel(value: string): string {
  return CARD_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function normalize(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toLowerCase()
}

// --- localStorage helpers ------------------------------------------------

export function loadCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
    return {}
  } catch {
    return {}
  }
}

export function saveCache(cache: Record<string, string>): void {
  try {
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* quota exceeded or unavailable – silently ignore */
  }
}

export function loadRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(LS_RECENT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as RecentSearch[]
    return []
  } catch {
    return []
  }
}

export function saveRecentSearches(items: RecentSearch[]): void {
  try {
    localStorage.setItem(LS_RECENT_KEY, JSON.stringify(items))
  } catch {
    /* silently ignore */
  }
}

// --- Translation ---------------------------------------------------------

export function getJapaneseText(
  normalizedName: string,
  override: string,
  cache: Record<string, string>,
): { japaneseText: string; updatedCache: Record<string, string> } {
  const trimmedOverride = override.trim()
  if (trimmedOverride) {
    return { japaneseText: trimmedOverride, updatedCache: cache }
  }

  if (cache[normalizedName]) {
    return { japaneseText: cache[normalizedName], updatedCache: cache }
  }

  const converted = toKatakana(normalizedName)
  const updatedCache = { ...cache, [normalizedName]: converted }
  return { japaneseText: converted, updatedCache }
}

// --- Link builders -------------------------------------------------------

export function buildPriceChartingUrl(normalizedName: string): string {
  const query = normalizedName.replace(/ /g, '+')
  return `https://www.pricecharting.com/search-products?q=${query}&type=prices`
}

export function buildYuyuteiUrl(
  cardType: string,
  japaneseText: string,
): string {
  const encoded = encodeURIComponent(japaneseText)
  return `https://yuyu-tei.jp/sell/${cardType}/s/search?search_word=${encoded}`
}

// --- Recent search management --------------------------------------------

export function addRecentSearch(
  list: RecentSearch[],
  entry: RecentSearch,
): RecentSearch[] {
  const filtered = list.filter(
    (s) => !(s.cardName === entry.cardName && s.cardType === entry.cardType),
  )
  return [entry, ...filtered].slice(0, MAX_RECENT)
}
