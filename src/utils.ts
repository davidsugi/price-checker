import { toKatakana } from 'wanakana'

export type RecentSearch = {
  cardName: string
  cardType: string
  japaneseText: string
  timestamp: number
}

export type CategoryConfig = Record<string, string>
export type FullConfig = Record<string, CategoryConfig>

export type TranslationResult = {
  japaneseText: string
  notInList: boolean
}

export const CARD_TYPE_OPTIONS = [
  { label: 'One Piece', value: 'opc' },
  { label: 'Magic', value: 'mtg' },
  { label: 'Yu-Gi-Oh', value: 'ygo' },
  { label: 'Digimon', value: 'digi' },
  { label: 'Pokemon', value: 'poc' },
] as const

export type CardTypeValue = (typeof CARD_TYPE_OPTIONS)[number]['value']

const LS_USER_CONFIG_KEY = 'tcg_config_user'
const LS_RECENT_KEY = 'tcg_recent_searches'
const MAX_RECENT = 10

export function getCardTypeLabel(value: string): string {
  return CARD_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function normalize(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toLowerCase()
}

// --- localStorage helpers ------------------------------------------------

export function loadUserConfig(): FullConfig {
  try {
    const raw = localStorage.getItem(LS_USER_CONFIG_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as FullConfig
    }
    return {}
  } catch {
    return {}
  }
}

export function saveUserConfig(config: FullConfig): void {
  try {
    localStorage.setItem(LS_USER_CONFIG_KEY, JSON.stringify(config))
  } catch {
    /* quota exceeded or unavailable */
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

// --- Config merge --------------------------------------------------------

export function getEffectiveConfig(
  defaultConfig: FullConfig,
  userConfig: FullConfig,
  cardType: string,
): CategoryConfig {
  return {
    ...(defaultConfig[cardType] ?? {}),
    ...(userConfig[cardType] ?? {}),
  }
}

// --- Export / Import -----------------------------------------------------

export function exportUserConfig(config: FullConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tcg-translations.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function mergeImportedConfig(
  existing: FullConfig,
  imported: FullConfig,
): FullConfig {
  const merged = { ...existing }
  for (const category of Object.keys(imported)) {
    merged[category] = {
      ...(merged[category] ?? {}),
      ...imported[category],
    }
  }
  return merged
}

// --- Translation ---------------------------------------------------------

export function getJapaneseText(
  normalizedName: string,
  override: string,
  effectiveConfig: CategoryConfig,
): TranslationResult {
  const trimmedOverride = override.trim()
  if (trimmedOverride) {
    return { japaneseText: trimmedOverride, notInList: false }
  }

  if (effectiveConfig[normalizedName]) {
    return { japaneseText: effectiveConfig[normalizedName], notInList: false }
  }

  const tokens = normalizedName.split(/\s+/)
  let anyMissing = false
  const parts = tokens.map((token) => {
    if (effectiveConfig[token]) {
      return effectiveConfig[token]
    }
    anyMissing = true
    return toKatakana(token)
  })

  return { japaneseText: parts.join(''), notInList: anyMissing }
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
