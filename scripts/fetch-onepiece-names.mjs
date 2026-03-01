/**
 * Fetches all One Piece characters from api.api-onepiece.com and builds an "opc"
 * section (English → Japanese) for .cursor/configuration.json.
 *
 * The API returns English names only; Japanese is derived via wanakana (romanized
 * → katakana). Results are best for already-romanized names (e.g. Nami, Zoro);
 * for English words (e.g. Monkey, Luffy) you may get mixed katakana. Merge with
 * your existing opc config so manual Japanese overrides are kept.
 *
 * Run from project root: node scripts/fetch-onepiece-names.mjs
 * Requires Node 18+ and project dependency "wanakana".
 *
 * Output: scripts/onepiece-opc-output.json
 */

const path = await import('path')
const fs = await import('fs')

const CHARACTERS_URL = 'https://api.api-onepiece.com/v2/characters/en'
const scriptsDir = path.join(process.cwd(), 'scripts')
const OUTPUT_PATH = path.join(scriptsDir, 'onepiece-opc-output.json')

function normalize(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*.*$/, '') // drop " / Le Clown" etc.
    .trim()
}

/** One Piece style: "monkey d luffy" → "monkey.d.luffy" */
function dotVariant(key) {
  return key.replace(/\s+d\s+/g, '.d.')
}

let toKatakanaFn = null
async function toJapanese(name) {
  if (!toKatakanaFn) {
    const w = await import('wanakana')
    toKatakanaFn = w.toKatakana
  }
  const n = name.trim().replace(/\s+/g, ' ')
  return toKatakanaFn(n) || n
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'price-card-fetch-onepiece/1.0' },
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function main() {
  console.error('Fetching One Piece characters...')
  const list = await fetchJson(CHARACTERS_URL)
  if (!Array.isArray(list)) {
    throw new Error('Expected array of characters')
  }

  const opc = {}
  for (const char of list) {
    const en = char.name?.trim()
    if (!en) continue
    const key = normalize(en)
    if (!key) continue
    const ja = await toJapanese(en)
    opc[key] = ja
    const dotted = dotVariant(key)
    if (dotted !== key) {
      opc[dotted] = ja
    }
  }

  const output = { opc }
  fs.mkdirSync(scriptsDir, { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8')
  console.error(`Done. ${Object.keys(opc).length} entries (incl. .d. variants).`)
  console.error(`Wrote ${OUTPUT_PATH}`)
  console.error('Merge the "opc" object into .cursor/configuration.json (and public/configuration.json).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
