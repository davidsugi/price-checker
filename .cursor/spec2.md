# TCG Price Comparison – Cursor Agent Implementation Prompt (V3 – Self-Learning Mapping)

---

# 🎯 Objective

Build a minimal single-page web app that generates price comparison links for trading cards.

The app must:

* Take English card name input
* Take card type selection
* Optionally allow Japanese override
* Generate:

  * ✅ Yuyutei search link (Japanese)
  * ✅ PriceCharting search link (English)
* ✅ Store recent searches in localStorage
* ✅ Maintain a self-learning English → Japanese mapping dictionary
* ✅ Persist mapping locally

No scraping.
No backend.
No external APIs.
Frontend-only implementation.

---

# 🧱 Tech Stack

* React
* Vite
* TypeScript
* wanakana (fallback phonetic conversion only)
* No backend
* No AI
* No translation API

Install:

```bash
npm install wanakana
```

---

# 🧠 Core Design Philosophy

This app does NOT attempt full translation.

Instead:

1. First check local mapping dictionary.
2. If mapping exists → use it.
3. If not → fallback to wanakana phonetic conversion.
4. If user overrides → save override into mapping permanently.
5. Over time → tool becomes accurate for your workflow.

This creates a self-improving local database.

---

# 🖥 UI Layout

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
- Charizard (Pokemon)
- Dark Magician (Yu-Gi-Oh)

-----------------------------------

Yuyutei:
<generated link>

PriceCharting:
<generated link>
```

Minimal styling. Centered layout. Responsive.

---

# 📌 Functional Requirements

---

## 1️⃣ Card Name Input

* Required
* Type: text
* Placeholder: `"Enter card name (English)"`
* Normalize:

  * Trim spaces
  * Replace multiple spaces with single space

Normalization must be consistent everywhere.

---

## 2️⃣ Card Type Dropdown

| Label     | Value    |
| --------- | -------- |
| One Piece | onepiece |
| Magic     | mtg      |
| Yu-Gi-Oh  | ygo      |
| Digimon   | digi     |
| Pokemon   | pokemon  |

Default: first option.

---

## 3️⃣ Japanese Override (Optional)

Behavior:

* If empty:

  * Use mapping if exists
  * Else fallback to wanakana conversion
* If filled:

  * Use override value
  * Save into mapping (replace existing entry if exists)

Override always REPLACES full Japanese value.
No append mode.

---

# 🧠 English → Japanese Mapping System (CORE FEATURE)

---

## localStorage Key

```ts
tcg_name_mapping
```

---

## Data Structure

```ts
type NameMapping = Record<string, string>
```

Example:

```json
{
  "Charizard": "リザードン",
  "Dark Magician": "ブラック・マジシャン",
  "Omnimon": "オメガモン"
}
```

Key must use normalized English name.

---

## Mapping Resolution Order

When generating:

1. Normalize English name
2. If override exists:

   * Use override
   * Save into mapping
3. Else if mapping[englishName] exists:

   * Use mapped value
4. Else:

   * Convert using wanakana
   * DO NOT automatically save fallback into mapping
   * Only save if user confirms via override

This prevents polluting mapping with incorrect phonetics.

---

# 🔠 Fallback Conversion (wanakana)

Use only as temporary fallback.

```ts
wanakana.toKatakana(normalizedEnglish)
```

Never auto-save fallback result into mapping.

---

# 🔗 Link Generation

---

## PriceCharting

Base:

```
https://www.pricecharting.com/search-products
```

Query:

```
?q=<english_with_plus>&type=prices
```

Rules:

* Replace spaces with "+"
* Do NOT encode "+"
* Example:

```
Mega Charizard
→ Mega+Charizard
```

---

## Yuyutei

Pattern:

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
| pokemon   | pokemon     |

Japanese text must use:

```ts
encodeURIComponent(japaneseText)
```

---

# 🆕 Recent Search History (CORE FEATURE)

---

## localStorage Key

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

---

## Behavior Rules

* Save on Generate
* Max 10 items
* Newest first
* No duplicates (same cardName + cardType)
* Persist after reload
* Load on mount

---

## Clicking Recent Item

When clicked:

* Autofill:

  * cardName
  * cardType
  * japaneseOverride = japaneseText
* Regenerate links automatically

---

# ⚠️ Edge Case Handling

* Disable Generate if cardName empty
* Protect against corrupted localStorage JSON
* Use try/catch on parse
* Prevent blank override from saving
* Keep mapping keys normalized

---

# 📦 Required State

```ts
cardName: string
cardType: string
japaneseOverride: string
generatedYuyuteiLink: string
generatedPriceChartingLink: string
recentSearches: RecentSearch[]
nameMapping: NameMapping
```

---

# 🚀 Implementation Constraints

* Single file: `App.tsx`
* Functional component
* `useState`
* `useEffect`
* No global state manager
* No router
* No backend
* No AI
* No external translation

Keep architecture extremely simple and deterministic.

---

# 🧪 Acceptance Criteria

✅ Mapping dictionary persists
✅ Override updates mapping
✅ Fallback does NOT auto-save
✅ Links generate correctly
✅ History persists
✅ Max 10 history entries
✅ No duplicate history
✅ Clicking history regenerates
✅ Works after reload
✅ No console errors
