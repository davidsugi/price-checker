import { useState, useEffect, useRef, useMemo } from 'react'
import {
  type RecentSearch,
  type FullConfig,
  CARD_TYPE_OPTIONS,
  getCardTypeLabel,
  normalize,
  loadUserConfig,
  saveUserConfig,
  loadRecentSearches,
  saveRecentSearches,
  getJapaneseText,
  getEffectiveConfig,
  exportUserConfig,
  mergeImportedConfig,
  buildPriceChartingUrl,
  buildYuyuteiUrl,
  addRecentSearch,
  fetchCategoryConfig,
} from './utils'

function App() {
  const [cardName, setCardName] = useState('')
  const [cardType, setCardType] = useState<string>(CARD_TYPE_OPTIONS[0].value)
  const [japaneseOverride, setJapaneseOverride] = useState('')
  const [yuyuteiLink, setYuyuteiLink] = useState('')
  const [priceChartingLink, setPriceChartingLink] = useState('')
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])

  const [defaultConfig, setDefaultConfig] = useState<FullConfig>({})
  const [userConfig, setUserConfig] = useState<FullConfig>({})

  const [notInList, setNotInList] = useState(false)
  const [customKatakana, setCustomKatakana] = useState('')
  const [lastNormalized, setLastNormalized] = useState('')
  const [savedMessage, setSavedMessage] = useState(false)
  const [importMessage, setImportMessage] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const comboboxRef = useRef<HTMLDivElement>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const listRef = useRef<HTMLUListElement>(null)

  const cardNameOptions = useMemo(() => {
    const effective = getEffectiveConfig(defaultConfig, userConfig, cardType)
    return Object.keys(effective).sort()
  }, [defaultConfig, userConfig, cardType])

  const filteredOptions = useMemo(() => {
    const query = cardName.trim().toLowerCase()
    if (!query) return cardNameOptions.slice(0, 50)
    return cardNameOptions.filter((opt) => opt.includes(query))
  }, [cardName, cardNameOptions])

  useEffect(() => {
    setHighlightIndex(-1)
  }, [filteredOptions])

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setRecentSearches(loadRecentSearches())
    setUserConfig(loadUserConfig())
  }, [])

  useEffect(() => {
    if (defaultConfig[cardType]) return
    fetchCategoryConfig(cardType).then((data) => {
      setDefaultConfig((prev) => ({ ...prev, [cardType]: data }))
    })
  }, [cardType, defaultConfig])

  function handleGenerate(
    name: string = cardName,
    type: string = cardType,
    override: string = japaneseOverride,
  ) {
    const normalized = normalize(name)
    if (!normalized) return

    setSavedMessage(false)

    const effective = getEffectiveConfig(defaultConfig, userConfig, type)
    const result = getJapaneseText(normalized, override, effective)

    setNotInList(result.notInList)
    setCustomKatakana(result.japaneseText)
    setLastNormalized(normalized)

    const yUrl = buildYuyuteiUrl(type, result.japaneseText)
    const pcUrl = buildPriceChartingUrl(normalized)
    setYuyuteiLink(yUrl)
    setPriceChartingLink(pcUrl)

    const entry: RecentSearch = {
      cardName: normalized,
      cardType: type,
      japaneseText: result.japaneseText,
      timestamp: Date.now(),
    }
    const updated = addRecentSearch(recentSearches, entry)
    setRecentSearches(updated)
    saveRecentSearches(updated)
  }

  function handleSaveKatakana() {
    const trimmed = customKatakana.trim()
    if (!trimmed || !lastNormalized) return

    const updatedUserConfig: FullConfig = {
      ...userConfig,
      [cardType]: {
        ...(userConfig[cardType] ?? {}),
        [lastNormalized]: trimmed,
      },
    }
    setUserConfig(updatedUserConfig)
    saveUserConfig(updatedUserConfig)
    setNotInList(false)
    setSavedMessage(true)

    const yUrl = buildYuyuteiUrl(cardType, trimmed)
    setYuyuteiLink(yUrl)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result as string) as FullConfig
        const merged = mergeImportedConfig(userConfig, imported)
        setUserConfig(merged)
        saveUserConfig(merged)
        setImportMessage('Translations imported.')
      } catch {
        setImportMessage('Invalid JSON file.')
      }
      setTimeout(() => setImportMessage(''), 3000)
    }
    reader.readAsText(file)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleRecentClick(item: RecentSearch) {
    setCardName(item.cardName)
    setCardType(item.cardType)
    setJapaneseOverride(item.japaneseText)
    handleGenerate(item.cardName, item.cardType, item.japaneseText)
  }

  const isDisabled = cardName.trim() === ''

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">TCG Price Link Generator</h1>
          <div className="flex gap-2">
            <button
              onClick={() => exportUserConfig(userConfig)}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-800"
            >
              Export
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-800"
            >
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>
        {importMessage && (
          <p className={`text-sm ${importMessage.includes('Invalid') ? 'text-red-400' : 'text-green-400'}`}>
            {importMessage}
          </p>
        )}

        {/* Card Name */}
        <div className="space-y-1">
          <label htmlFor="cardName" className="text-sm text-neutral-400">
            Card Name
          </label>
          <div ref={comboboxRef} className="relative">
            <input
              id="cardName"
              type="text"
              role="combobox"
              aria-expanded={dropdownOpen}
              aria-autocomplete="list"
              aria-controls="cardName-listbox"
              autoComplete="off"
              placeholder="Search or enter card name (English)"
              value={cardName}
              onChange={(e) => {
                setCardName(e.target.value)
                setDropdownOpen(true)
              }}
              onFocus={() => setDropdownOpen(true)}
              onKeyDown={(e) => {
                if (!dropdownOpen) {
                  if (e.key === 'ArrowDown') {
                    setDropdownOpen(true)
                    e.preventDefault()
                  }
                  return
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setHighlightIndex((i) =>
                    i < filteredOptions.length - 1 ? i + 1 : i,
                  )
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setHighlightIndex((i) => (i > 0 ? i - 1 : -1))
                } else if (e.key === 'Enter' && highlightIndex >= 0) {
                  e.preventDefault()
                  setCardName(filteredOptions[highlightIndex])
                  setDropdownOpen(false)
                } else if (e.key === 'Escape') {
                  setDropdownOpen(false)
                }
              }}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            {dropdownOpen && filteredOptions.length > 0 && (
              <ul
                ref={listRef}
                id="cardName-listbox"
                role="listbox"
                className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-800 py-1 text-sm shadow-lg"
              >
                {filteredOptions.map((option, idx) => (
                  <li
                    key={option}
                    role="option"
                    aria-selected={idx === highlightIndex}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setCardName(option)
                      setDropdownOpen(false)
                    }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`cursor-pointer px-3 py-1.5 ${
                      idx === highlightIndex
                        ? 'bg-indigo-600 text-white'
                        : 'text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {option}
                  </li>
                ))}
              </ul>
            )}
          </div>
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

        {/* Not-in-list hint + save */}
        {notInList && (
          <div className="space-y-2 rounded-lg border border-amber-700/50 bg-amber-950/30 p-4 text-sm">
            <p className="text-amber-400">
              This name is not in the dictionary. You can save a custom katakana
              for next time.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customKatakana}
                onChange={(e) => setCustomKatakana(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSaveKatakana}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Save success */}
        {savedMessage && (
          <p className="text-sm text-green-400">Katakana saved.</p>
        )}
      </div>

      {/* Iframe Results — wider than the form */}
      {(yuyuteiLink || priceChartingLink) && (
        <div className="w-full max-w-5xl mt-6 flex flex-col min-[700px]:flex-row gap-4">
          {priceChartingLink && (
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-400">
                  PriceCharting
                </span>
                <a
                  href={priceChartingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:underline"
                >
                  Open in new tab
                </a>
              </div>
              <iframe
                src={priceChartingLink}
                title="PriceCharting search results"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                className="w-full h-[420px] rounded-lg border border-neutral-700 bg-neutral-800"
              />
            </div>
          )}
          {yuyuteiLink && (
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-400">
                  Yuyutei
                </span>
                <a
                  href={yuyuteiLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:underline"
                >
                  Open in new tab
                </a>
              </div>
              <iframe
                src={yuyuteiLink}
                title="Yuyutei search results"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                className="w-full h-[420px] rounded-lg border border-neutral-700 bg-neutral-800"
              />
            </div>
          )}
        </div>
      )}

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="w-full max-w-md mt-6 space-y-2">
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
  )
}

export default App
