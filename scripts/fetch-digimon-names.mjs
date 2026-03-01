/**
 * Fetches all Digimon (English names) from digi-api.com and builds a "digi" section
 * for .cursor/configuration.json. Japanese is derived via wanakana (romanized → katakana);
 * the API does not provide Japanese names. Merge with your existing config to keep
 * any manual Japanese overrides.
 *
 * Resumes from progress file if the script failed or was stopped.
 * Requires Node 18+. Run from project root: node scripts/fetch-digimon-names.mjs
 *
 * Output: scripts/digimon-digi-output.json
 * Progress: scripts/digimon-digi-progress.json (deleted on success)
 */

const path = await import('path')
const fs = await import('fs')

const DIGI_API_BASE = 'https://digi-api.com/api/v1/digimon'
const PAGE_SIZE = 100
const DELAY_BETWEEN_PAGES_MS = 150

const scriptsDir = path.join(process.cwd(), 'scripts')
const PROGRESS_PATH = path.join(scriptsDir, 'digimon-digi-progress.json')
const OUTPUT_PATH = path.join(scriptsDir, 'digimon-digi-output.json')

function loadProgress() {
  try {
    const raw = fs.readFileSync(PROGRESS_PATH, 'utf8')
    const data = JSON.parse(raw)
    if (data && typeof data.digi === 'object' && typeof data.lastPageIndex === 'number') {
      return { digi: data.digi, lastPageIndex: data.lastPageIndex }
    }
  } catch {
    /* no progress file or invalid */
  }
  return null
}

function saveProgress(digi, lastPageIndex) {
  try {
    fs.mkdirSync(scriptsDir, { recursive: true })
    fs.writeFileSync(
      PROGRESS_PATH,
      JSON.stringify({ digi, lastPageIndex }, null, 2),
      'utf8',
    )
  } catch (e) {
    console.error('Failed to save progress:', e.message)
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

/** Romanized name → katakana (Digi-API has no Japanese; many names are romanized Japanese). */
let toKatakanaFn = null

/**
 * Applies Digimon-specific corrections to Wanakana output.
 * Wanakana often fails on: "d"/"r" clusters (e.g. "dra" → dラ), "th" (→ ス), and "l"/"r" (both → ら-row).
 */
function applyDigimonKatakanaFixes(katakana) {
  if (!katakana || typeof katakana !== 'string') return katakana
  let s = katakana

  // 1) "d" + ラ/リ/ル/レ/ロ → ドラ/ドリ/ドル/ドレ/ドロ (e.g. Seadramon → セアドラモン, not セアdラモン)
  s = s.replace(/d(ラ)/g, 'ド$1')
  s = s.replace(/d(リ)/g, 'ド$1')
  s = s.replace(/d(ル)/g, 'ド$1')
  s = s.replace(/d(レ)/g, 'ド$1')
  s = s.replace(/d(ロ)/g, 'ド$1')

  // 2) "th" clusters: デアth → デス (Deathmon), then any remaining "th" → ス
  s = s.replace(/アth/g, 'ス')
  s = s.replace(/th/g, 'ス')

  // 3) "ll" → single ル first (e.g. skull → スクル), then remaining "l" → ル
  s = s.replace(/ll/g, 'ル')
  s = s.replace(/l/g, 'ル')

  // 4) Leftover Latin "r" → ル (e.g. minotaurmon → ミノタウルモン)
  s = s.replace(/r/g, 'ル')

  // 5) Common mixed clusters: "g" + レ → グレ (greymon), "s" + ク → スク (skull)
  s = s.replace(/g(レ)/g, 'グ$1')
  s = s.replace(/s(ク)/g, 'ス$1')

  // 6) Trailing or isolated "y" after kana → イ (e.g. greymon グレyモン → グレイモン)
  s = s.replace(/([ァ-ヴ])y(?=[ァ-ヴ]|モン|$)/g, '$1イ')

  return s
}

/** Known Japanese names for entries Wanakana mangles (e.g. drops leading "le"). */
const DIGIMON_JA_OVERRIDES = {
  leomon: 'レオモン',
}

async function toJapanese(name) {
  const normalized = name.trim().replace(/\s+/g, ' ')
  const key = normalized.toLowerCase()
  if (DIGIMON_JA_OVERRIDES[key]) {
    return DIGIMON_JA_OVERRIDES[key]
  }
  if (!toKatakanaFn) {
    const w = await import('wanakana')
    toKatakanaFn = w.toKatakana
  }
  const raw = toKatakanaFn(normalized) || normalized
  return applyDigimonKatakanaFixes(raw)
}

async function main() {
  let { digi, lastPageIndex } = loadProgress() || { digi: {}, lastPageIndex: -1 }
  const startPage = lastPageIndex + 1

  console.error('Fetching first page to get total count...')
  const first = await fetchJson(
    `${DIGI_API_BASE}?pageSize=${PAGE_SIZE}&page=0`,
  )
  const totalElements = first.pageable?.totalElements ?? 0
  const totalPages = first.pageable?.totalPages ?? 0

  if (totalPages === 0) {
    console.error('No data from API.')
    process.exit(1)
  }

  if (startPage >= totalPages) {
    console.error('Already complete. Writing final output...')
    const output = { digi }
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8')
    try {
      fs.unlinkSync(PROGRESS_PATH)
    } catch {}
    console.error(`Wrote ${Object.keys(digi).length} entries to ${OUTPUT_PATH}`)
    console.error('Merge the "digi" object into .cursor/configuration.json. Japanese is romanized→katakana; override with real names if needed.')
    return
  }

  console.error(`Total ${totalElements} Digimon across ${totalPages} pages. Resuming from page ${startPage}.`)

  for (let page = startPage; page < totalPages; page++) {
    const url = `${DIGI_API_BASE}?pageSize=${PAGE_SIZE}&page=${page}`
    const data = await fetchJson(url)
    const content = data.content || []
    for (const item of content) {
      const en = item.name?.trim()
      if (!en) continue
      const key = en.toLowerCase().replace(/\s+/g, ' ')
      if (key && !digi[key]) {
        digi[key] = await toJapanese(en)
      }
    }
    saveProgress(digi, page)
    console.error(`  Page ${page + 1}/${totalPages} (${Object.keys(digi).length} entries)`)
    if (page + 1 < totalPages) {
      await sleep(DELAY_BETWEEN_PAGES_MS)
    }
  }

  const output = { digi }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8')
  try {
    fs.unlinkSync(PROGRESS_PATH)
  } catch {
    console.error('Failed to delete progress file:', PROGRESS_PATH)
  }
  console.error(`Done. Wrote ${Object.keys(digi).length} entries to ${OUTPUT_PATH}`)
  console.error('Merge the "digi" object into .cursor/configuration.json (or public/configuration.json).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
