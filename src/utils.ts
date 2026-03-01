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
const LS_DEFAULT_PREFIX = 'tcg_default_'
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

// --- Default translation cache (per-category) ---------------------------

export function loadCachedCategory(cardType: string): CategoryConfig | null {
  try {
    const raw = localStorage.getItem(LS_DEFAULT_PREFIX + cardType)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as CategoryConfig
    }
    return null
  } catch {
    return null
  }
}

export function saveCachedCategory(
  cardType: string,
  data: CategoryConfig,
): void {
  try {
    localStorage.setItem(LS_DEFAULT_PREFIX + cardType, JSON.stringify(data))
  } catch {
    /* quota exceeded or unavailable */
  }
}

export async function fetchCategoryConfig(
  cardType: string,
): Promise<CategoryConfig> {
  const cached = loadCachedCategory(cardType)
  if (cached) return cached

  try {
    const res = await fetch(`/translations/${cardType}.json`)
    if (!res.ok) return {}
    const data = (await res.json()) as CategoryConfig
    saveCachedCategory(cardType, data)
    return data
  } catch {
    return {}
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

/**
 * Applies common post-fixes to Wanakana katakana output. Wanakana often mangles
 * "d"/"r" clusters (e.g. dra → dラ), "th" (→ ス), and "l"/"r" (both map to ら-row).
 * Used only at runtime when auto-converting unknown tokens to katakana.
 */
export function fixWanakanaKatakana(katakana: string): string {
  if (!katakana || typeof katakana !== 'string') return katakana
  let s = katakana

  // d + ラ/リ/ル/レ/ロ → ドラ/ドリ/ドル/ドレ/ドロ
  s = s.replace(/d(ラ)/g, 'ド$1')
  s = s.replace(/d(リ)/g, 'ド$1')
  s = s.replace(/d(ル)/g, 'ド$1')
  s = s.replace(/d(レ)/g, 'ド$1')
  s = s.replace(/d(ロ)/g, 'ド$1')

  // th: デアth → デス, then any remaining th → ス
  s = s.replace(/アth/g, 'ス')
  s = s.replace(/th/g, 'ス')

  // ll → single ル, then remaining l → ル
  s = s.replace(/ll/g, 'ル')
  s = s.replace(/l/g, 'ル')

  // leftover r → ル
  s = s.replace(/r/g, 'ル')

  // g+レ → グレ, s+ク → スク
  s = s.replace(/g(レ)/g, 'グ$1')
  s = s.replace(/s(ク)/g, 'ス$1')

  // y after kana → イ
  s = s.replace(/([ァ-ヴ])y(?=[ァ-ヴ]|モン|$)/g, '$1イ')

  return s
}

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
    return fixWanakanaKatakana(toKatakana(token))
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
