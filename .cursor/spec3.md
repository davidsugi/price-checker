Perfect — below is your **complete full-stack specification** for the Express + React version.

This is written so you can hand it directly to Cursor and build cleanly without ambiguity.

---

# TCG Price Comparison Tool

## Full-Stack Specification (Express + React)

---

# 1️⃣ Objective

Build a small full-stack web app that:

* Accepts English card name
* Accepts card category
* Optionally accepts Japanese override
* Generates:

  * Yuyutei search link (Japanese)
  * PriceCharting search link (English)
* Stores overridden Japanese names permanently on server
* Maintains recent search history on frontend

No database.
Persistence via JSON file.
No external translation APIs.
No AI.

---

# 2️⃣ Architecture

```text
React (Frontend)
        ↓ HTTP (REST API)
Express (Backend)
        ↓
mapping.json (filesystem persistence)
```

---

# 3️⃣ Tech Stack

## Backend

* Node.js
* Express.js
* TypeScript
* fs (file persistence)
* cors

## Frontend

* React
* Vite
* TypeScript
* wanakana (fallback only)

---

# 4️⃣ Project Structure

```
tcg-price-tool/
│
├── server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   └── resolve.ts
│   │   ├── utils/
│   │   │   └── fileStore.ts
│   │   └── types.ts
│   ├── data/
│   │   └── mapping.json
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   └── utils.ts
│   └── package.json
│
└── package.json
```

---

# 5️⃣ Core Functional Requirements

---

# 5.1 Card Input

### Field

* Text input
* Required
* Trim whitespace
* Replace multiple spaces with single space

Normalization function:

```
trim
collapse multiple spaces
```

Do NOT lowercase automatically.

---

# 5.2 Card Type Dropdown

Allowed values:

| Label     | Value    |
| --------- | -------- |
| Pokemon   | pokemon  |
| Yu-Gi-Oh  | ygo      |
| Digimon   | digi     |
| One Piece | onepiece |
| Magic     | mtg      |

Default: pokemon

---

# 5.3 Japanese Override

Optional input.

Rules:

* If provided:

  * Backend must save it
  * It replaces existing mapping
* If empty:

  * Backend checks mapping
  * If exists → return it
  * If not → return null

Override always replaces full Japanese value.

No append mode.

---

# 6️⃣ Backend Specification

---

# 6.1 Data Storage

File:

```
server/data/mapping.json
```

Initial content:

```json
{
  "pokemon": {},
  "ygo": {},
  "digi": {},
  "onepiece": {},
  "mtg": {}
}
```

---

# 6.2 Type Definitions

```ts
type CardType = "pokemon" | "ygo" | "digi" | "onepiece" | "mtg"

type NameMapping = Record<
  CardType,
  Record<string, string>
>
```

---

# 6.3 API Endpoints

---

## GET /api/mapping

Returns full mapping object.

Response:

```json
{
  "pokemon": { ... },
  "ygo": { ... },
  ...
}
```

---

## POST /api/resolve

### Request Body

```json
{
  "cardName": "Charizard",
  "cardType": "pokemon",
  "override": "リザードン"
}
```

override can be empty string or undefined.

---

### Backend Resolution Logic

1. Normalize cardName
2. Load mapping.json
3. If override exists and not empty:

   * mapping[cardType][cardName] = override
   * Save file
   * Return { japanese: override }
4. Else if mapping exists:

   * Return mapped value
5. Else:

   * Return { japanese: null }

Backend does NOT perform wanakana conversion.

---

# 6.4 File Handling

Use synchronous file operations for simplicity.

fileStore.ts:

* readMapping()
* writeMapping(data)

Wrap in try/catch.
Prevent crash on corrupted JSON.

---

# 7️⃣ Frontend Specification

---

# 7.1 State

```
cardName
cardType
japaneseOverride
generatedYuyuteiLink
generatedPriceChartingLink
recentSearches
```

---

# 7.2 Resolve Flow

When user clicks Generate:

1. Normalize English name
2. Call POST /api/resolve
3. If response.japanese !== null:
   use it
4. Else:
   fallback using wanakana
5. Generate links
6. Save to recent history

---

# 7.3 Fallback Logic

Use:

```ts
wanakana.toKatakana(cardName)
```

Fallback result must NOT be sent to backend automatically.

Only override input triggers saving.

---

# 8️⃣ Link Generation Rules

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

Replace spaces with "+"

Example:

```
Mega Charizard
→ Mega+Charizard
```

Do NOT encode "+".

---

## Yuyutei

Format:

```
https://yuyu-tei.jp/sell/{category}/s/search?search_word={encodedJapanese}
```

Must use:

```
encodeURIComponent(japaneseText)
```

---

# 9️⃣ Recent Search History (Frontend Only)

Stored in localStorage:

Key:

```
tcg_recent_searches
```

Structure:

```ts
type RecentSearch = {
  cardName: string
  cardType: string
  japaneseText: string
  timestamp: number
}
```

Rules:

* Max 10 entries
* Newest first
* No duplicates (same cardName + cardType)
* Clicking history:

  * Autofill fields
  * Regenerate links

---

# 🔟 Error Handling

Frontend:

* Disable Generate if cardName empty
* Catch API errors
* Show simple error message

Backend:

* Handle invalid cardType
* Handle missing body
* Handle file read/write errors
* Always return JSON

---

# 1️⃣1️⃣ Non-Functional Requirements

* Clean minimal UI
* Responsive layout
* No styling library required
* No authentication
* No scraping
* No rate limiting needed

---

# 1️⃣2️⃣ Future Expansion Ready

This architecture allows easy upgrades:

* Replace JSON with SQLite
* Add mapping editor UI
* Add admin delete mapping endpoint
* Add AI translation endpoint
* Add search scraping logic

No structural rewrite required.

---

# 1️⃣3️⃣ Acceptance Criteria

✅ Override persists to JSON
✅ Restart server retains mapping
✅ No mapping → fallback works
✅ Links generate correctly
✅ No duplicate recent history
✅ Max 10 history entries
✅ No server crash on bad input
✅ Clean API structure

---

# 1️⃣4️⃣ Final Design Philosophy

* Backend = source of truth
* Frontend = UI + fallback logic
* Deterministic behavior
* No magic auto-translation
* Self-improving mapping system

---

If you want next, I can:

* Generate full backend code
* Generate full frontend code
* Or write a Cursor “build everything” master prompt
