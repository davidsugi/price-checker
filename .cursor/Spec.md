---

# TCG Price Comparison – Cursor Agent Implementation Prompt (V2)

---

# 🎯 Objective

Build a minimal single-page web app that generates price comparison links for trading cards.

The app must:

* Take English card name input
* Take card type selection
* Optionally allow Japanese override
* Auto-convert English → Katakana using **wanakana**
* Generate:

  * ✅ Yuyutei search link (Japanese)
  * ✅ PriceCharting search link (English)
* ✅ Store recent searches in localStorage
* ✅ Cache Katakana translations in localStorage

No scraping.
No backend.
Frontend-only implementation.

---

# 🧱 Tech Stack

* React
* Vite
* TypeScript
* wanakana (for Romaji → Katakana conversion)
* No backend
* No external API
* Keep dependencies minimal

Install:

```bash
npm install wanakana
```

---

# 🖥 UI Requirements

Single page layout.

```text
-----------------------------------
TCG Price Link Generator
-----------------------------------

[ Card Name Input              ]

[ Card Type Dropdown           ]

[ Japanese Override (optional) ]

[ Generate Button ]

-----------------------------------

Recent Searches
-----------------------------------
- Mega Charizard (Digimon)
- Monkey D Luffy (One Piece)

-----------------------------------

Yuyutei:
<generated link>

PriceCharting:
<generated link>
```

UI should be:

* Clean
* Centered
* Responsive
* Minimal styling

---

# 📌 Functional Requirements

---

## 1️⃣ Card Name Input

* Required
* Type: text
* Placeholder: `"Enter card name (English)"`
* Automatically:

  * Trim leading/trailing spaces
  * Replace multiple spaces with single space

---

## 2️⃣ Card Type Dropdown

Options:

| Label     | Value    |
| --------- | -------- |
| One Piece | onepiece |
| Magic     | mtg      |
| Yu-Gi-Oh  | ygo      |
| Digimon   | digi     |

Default selection: first option.

---

## 3️⃣ Japanese Override (Optional)

* If filled → use override value
* If empty → auto-convert English input to Katakana using wanakana
* Override must still be URL encoded

---

# 🔠 Translation Logic (WanaKana Only)

Library:

```ts
import wanakana from "wanakana"
```

Conversion rules:

1. Normalize English input:

   * Trim
   * Lowercase
   * Single-space normalize

2. Convert:

```ts
wanakana.toKatakana(normalizedInput)
```

3. Do NOT call any external translation API.

---

# 🧠 Translation Cache (CORE FEATURE)

Use localStorage key:

```ts
tcg_translation_cache
```

Structure:

```ts
{
  "Mega Charizard": "メガ チャリザード",
  "Omnimon": "オムニモン"
}
```

Behavior:

* Before converting:

  * Check cache
* If exists → use cached value
* If not:

  * Convert using wanakana
  * Store in cache

This reduces repeated conversion and improves performance.

---

# 🔗 Link Generation Rules

---

## PriceCharting

Base:

```
https://www.pricecharting.com/search-products
```

Query:

```
?q=<search_word_with_plus>&type=prices
```

Rules:

* Normalize English name
* Replace spaces with "+"
* Do NOT URL encode "+"
* Example:

```
Mega Charizard
→ Mega+Charizard
```

Final:

```
https://www.pricecharting.com/search-products?q=Mega+Charizard&type=prices
```

---

## Yuyutei

Base pattern:

```
https://yuyu-tei.jp/sell/{category}/s/search?search_word={encoded_japanese}
```

Category mapping:

| Card Type | URL Segment |
| --------- | ----------- |
| onepiece  | onepiece    |
| mtg       | mtg         |
| ygo       | ygo         |
| digi      | digi        |

Rules:

* Use override OR converted Katakana
* Must apply:

```ts
encodeURIComponent(japaneseText)
```

---

# 🆕 Recent Search History (CORE FEATURE)

Use localStorage key:

```ts
tcg_recent_searches
```

---

## Data Structure

```ts
type RecentSearch = {
  cardName: string
  cardType: string
  japaneseText: string
  timestamp: number
}
```

Stored as:

```ts
RecentSearch[]
```

---

## Behavior Rules

* Save search on Generate
* Maximum 10 entries
* Newest first
* If same cardName + cardType exists:

  * Remove old entry
  * Insert new one at top
* Persist after reload
* Load on component mount

---

## UI Behavior

Display format:

```
Mega Charizard (Digimon)
```

Clicking a recent item must:

* Autofill:

  * cardName
  * cardType
  * japaneseOverride = japaneseText
* Regenerate links automatically

---

# ⚠️ Edge Case Handling

* Disable Generate if cardName is empty
* Sanitize special characters
* Prevent empty override being saved as blank
* Prevent corrupted localStorage from crashing app
* Fail gracefully if JSON parse fails

---

# 📦 Required State

```ts
cardName: string
cardType: string
japaneseOverride: string
generatedYuyuteiLink: string
generatedPriceChartingLink: string
recentSearches: RecentSearch[]
translationCache: Record<string, string>
```

---

# 🚀 Implementation Rules

* Single file: `App.tsx`
* Functional component
* `useState`
* `useEffect` for:

  * Loading history
  * Loading cache
* No global state manager
* No context
* No Redux
* No Zustand
* No router

Keep architecture extremely simple.

---

# 🧪 Acceptance Criteria

✅ English input converts to Katakana using wanakana
✅ Override correctly replaces auto conversion
✅ PriceCharting link formats correctly
✅ Yuyutei link URL encodes correctly
✅ Translation cache works
✅ Recent history works
✅ Max 10 history items
✅ No duplicates
✅ Click history autofills + regenerates
✅ No console errors
✅ Works after reload

---

# ❌ Do Not

* No Google Translate
* No external APIs
* No backend
* No scraping
* No unnecessary libraries
* No overengineering
* No multi-page routing

---

# 🔮 Future Enhancements (Not V2)

* Add Surugaya
* Add Mercari
* Add rarity filter
* Add set code support
* Add dark mode
* Add copy-to-clipboard buttons
* Add auto-open links option

---

If you want next, I can:

* Refactor this into a **production-ready micro SaaS spec**
* Or generate the full `App.tsx` implementation
* Or help you design this as a collector dashboard tool 👀
