/**
 * Builds a Yu-Gi-Oh "ygo" section (English → Japanese card names) using
 * YGOOrganization's card name indices. Two requests: en and ja name→id maps,
 * then we match by Konami ID to get en→ja pairs.
 *
 * Run from project root: node scripts/fetch-yugioh-names.mjs
 * Requires Node 18+.
 *
 * Output: scripts/yugioh-ygo-output.json
 * Merge the "ygo" object into .cursor/configuration.json (and public/configuration.json).
 *
 * API: https://db.ygorganization.com/about/api — please cache locally; avoid re-fetching.
 */

const path = await import('path')
const fs = await import('fs')

const NAME_INDEX_EN = 'https://db.ygorganization.com/data/idx/card/name/en'
const NAME_INDEX_JA = 'https://db.ygorganization.com/data/idx/card/name/ja'

const scriptsDir = path.join(process.cwd(), 'scripts')
const OUTPUT_PATH = path.join(scriptsDir, 'yugioh-ygo-output.json')
const REQUEST_DELAY_MS = 3000
const FETCH_TIMEOUT_MS = 120000

function normalize(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function fetchJson(url) {
  const controller = new AbortController()
  const to = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'price-card-fetch-yugioh/1.0 (local script)' },
    })
    clearTimeout(to)
    if (!res.ok) throw new Error(`${res.status} ${url}`)
    return res.json()
  } catch (e) {
    clearTimeout(to)
    throw e
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  console.error('Fetching English name index...')
  const enMap = await fetchJson(NAME_INDEX_EN)
  console.error('Fetching Japanese name index (may take a minute)...')
  await sleep(REQUEST_DELAY_MS)
  let jaMap
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      jaMap = await fetchJson(NAME_INDEX_JA)
      break
    } catch (e) {
      if (attempt < 3) {
        console.error(`  Attempt ${attempt} failed, retrying in 5s...`)
        await sleep(5000)
      } else {
        throw e
      }
    }
  }

  // id -> Japanese name (first occurrence wins if id appears under multiple names)
  const idToJa = {}
  for (const [jaName, ids] of Object.entries(jaMap)) {
    if (!Array.isArray(ids)) continue
    const ja = jaName.trim()
    for (const id of ids) {
      if (id != null && idToJa[id] === undefined) {
        idToJa[id] = ja
      }
    }
  }

  const ygo = {}
  let matched = 0
  for (const [enName, ids] of Object.entries(enMap)) {
    if (!Array.isArray(ids)) continue
    const key = normalize(enName)
    if (!key) continue
    for (const id of ids) {
      if (id != null && idToJa[id]) {
        ygo[key] = idToJa[id]
        matched += 1
        break
      }
    }
  }

  const output = { ygo }
  fs.mkdirSync(scriptsDir, { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8')
  console.error(`Done. ${Object.keys(ygo).length} unique English keys → Japanese. ${matched} pairs from ${Object.keys(enMap).length} EN names.`)
  console.error(`Wrote ${OUTPUT_PATH}`)
  console.error('Merge the "ygo" object into .cursor/configuration.json (or public/configuration.json).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
