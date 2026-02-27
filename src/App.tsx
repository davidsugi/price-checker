import { useState, useEffect } from 'react'
import {
  type RecentSearch,
  CARD_TYPE_OPTIONS,
  getCardTypeLabel,
  normalize,
  loadCache,
  saveCache,
  loadRecentSearches,
  saveRecentSearches,
  getJapaneseText,
  buildPriceChartingUrl,
  buildYuyuteiUrl,
  addRecentSearch,
} from './utils'

function App() {
  const [cardName, setCardName] = useState('')
  const [cardType, setCardType] = useState(CARD_TYPE_OPTIONS[0].value)
  const [japaneseOverride, setJapaneseOverride] = useState('')
  const [yuyuteiLink, setYuyuteiLink] = useState('')
  const [priceChartingLink, setPriceChartingLink] = useState('')
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [translationCache, setTranslationCache] = useState<
    Record<string, string>
  >({})

  useEffect(() => {
    setRecentSearches(loadRecentSearches())
    setTranslationCache(loadCache())
  }, [])

  function handleGenerate(
    name: string = cardName,
    type: string = cardType,
    override: string = japaneseOverride,
  ) {
    const normalized = normalize(name)
    if (!normalized) return

    const { japaneseText, updatedCache } = getJapaneseText(
      normalized,
      override,
      translationCache,
    )

    setTranslationCache(updatedCache)
    saveCache(updatedCache)

    const yUrl = buildYuyuteiUrl(type, japaneseText)
    const pcUrl = buildPriceChartingUrl(normalized)
    setYuyuteiLink(yUrl)
    setPriceChartingLink(pcUrl)

    const entry: RecentSearch = {
      cardName: normalized,
      cardType: type,
      japaneseText,
      timestamp: Date.now(),
    }
    const updated = addRecentSearch(recentSearches, entry)
    setRecentSearches(updated)
    saveRecentSearches(updated)
  }

  function handleRecentClick(item: RecentSearch) {
    setCardName(item.cardName)
    setCardType(item.cardType)
    setJapaneseOverride(item.japaneseText)
    handleGenerate(item.cardName, item.cardType, item.japaneseText)
  }

  const isDisabled = cardName.trim() === ''

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">
          TCG Price Link Generator
        </h1>

        {/* Card Name */}
        <div className="space-y-1">
          <label htmlFor="cardName" className="text-sm text-neutral-400">
            Card Name
          </label>
          <input
            id="cardName"
            type="text"
            placeholder="Enter card name (English)"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>

        {/* Card Type */}
        <div className="space-y-1">
          <label htmlFor="cardType" className="text-sm text-neutral-400">
            Card Type
          </label>
          <select
            id="cardType"
            value={cardType}
            onChange={(e) => setCardType(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            {CARD_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Japanese Override */}
        <div className="space-y-1">
          <label
            htmlFor="japaneseOverride"
            className="text-sm text-neutral-400"
          >
            Japanese Override (optional)
          </label>
          <input
            id="japaneseOverride"
            type="text"
            placeholder="Leave empty for auto-conversion"
            value={japaneseOverride}
            onChange={(e) => setJapaneseOverride(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>

        {/* Generate */}
        <button
          disabled={isDisabled}
          onClick={() => handleGenerate()}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Generate
        </button>

        {/* Generated Links */}
        {(yuyuteiLink || priceChartingLink) && (
          <div className="space-y-3 rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-sm">
            {yuyuteiLink && (
              <div>
                <span className="font-semibold text-neutral-400">
                  Yuyutei:
                </span>
                <a
                  href={yuyuteiLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 break-all text-indigo-400 hover:underline"
                >
                  {yuyuteiLink}
                </a>
              </div>
            )}
            {priceChartingLink && (
              <div>
                <span className="font-semibold text-neutral-400">
                  PriceCharting:
                </span>
                <a
                  href={priceChartingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 break-all text-indigo-400 hover:underline"
                >
                  {priceChartingLink}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-neutral-400">
              Recent Searches
            </h2>
            <ul className="space-y-1">
              {recentSearches.map((item) => (
                <li key={`${item.cardName}-${item.cardType}`}>
                  <button
                    onClick={() => handleRecentClick(item)}
                    className="w-full rounded-md px-3 py-1.5 text-left text-sm text-neutral-300 transition hover:bg-neutral-800"
                  >
                    {item.cardName} ({getCardTypeLabel(item.cardType)})
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
