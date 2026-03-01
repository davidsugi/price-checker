/**
 * Fetches all Pokémon species English/Japanese names from PokeAPI (in batches)
 * and writes a "poc" section for .cursor/configuration.json.
 *
 * Resumes from progress file if the script failed or was stopped.
 * Requires Node 18+. Run: node scripts/fetch-pokemon-names.mjs
 *
 * Output: scripts/pokemon-poc-output.json
 * Progress: scripts/pokemon-poc-progress.json (deleted on success)
 */

const path = await import('path')
const fs = await import('fs')

const POKEMON_SPECIES_LIST = 'https://pokeapi.co/api/v2/pokemon-species?limit=2000'
const BATCH_SIZE = 15
const DELAY_BETWEEN_BATCHES_MS = 200

const scriptsDir = path.join(process.cwd(), 'scripts')
const PROGRESS_PATH = path.join(scriptsDir, 'pokemon-poc-progress.json')
const OUTPUT_PATH = path.join(scriptsDir, 'pokemon-poc-output.json')

function loadProgress() {
  try {
    const raw = fs.readFileSync(PROGRESS_PATH, 'utf8')
    const data = JSON.parse(raw)
    if (data && typeof data.poc === 'object' && typeof data.lastIndex === 'number') {
      return { poc: data.poc, lastIndex: data.lastIndex }
    }
  } catch {
    /* no progress file or invalid */
  }
  return null
}

function saveProgress(poc, lastIndex) {
  try {
    fs.mkdirSync(scriptsDir, { recursive: true })
    fs.writeFileSync(
      PROGRESS_PATH,
      JSON.stringify({ poc, lastIndex }, null, 2),
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

function getName(names, lang) {
  const entry = names.find((n) => n.language?.name === lang)
  return entry?.name ?? null
}

async function fetchOne(result) {
  const { url, name } = result
  try {
    const species = await fetchJson(url)
    const names = species.names || []
    const en = getName(names, 'en')
    const ja = getName(names, 'ja')
    if (en && ja) {
      return { key: en.toLowerCase().trim(), value: ja }
    }
  } catch (e) {
    console.error(`  Skip ${name}: ${e.message}`)
  }
  return null
}

async function main() {
  let { poc, lastIndex } = loadProgress() || { poc: {}, lastIndex: -1 }
  const startIndex = lastIndex + 1

  console.error('Fetching species list...')
  const list = await fetchJson(POKEMON_SPECIES_LIST)
  const results = list.results || []
  const total = results.length

  if (startIndex >= total) {
    console.error('Already complete. Writing final output...')
    const output = { poc }
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8')
    try {
      fs.unlinkSync(PROGRESS_PATH)
    } catch {}
    console.error(`Wrote ${Object.keys(poc).length} entries to ${OUTPUT_PATH}`)
    return
  }

  console.error(`Resuming from index ${startIndex} (${total - startIndex} left). Batch size ${BATCH_SIZE}.`)

  for (let i = startIndex; i < total; i += BATCH_SIZE) {
    const batch = results.slice(i, Math.min(i + BATCH_SIZE, total))
    const pairs = await Promise.all(batch.map((r) => fetchOne(r)))
    for (const p of pairs) {
      if (p) poc[p.key] = p.value
    }
    const newLastIndex = i + batch.length - 1
    saveProgress(poc, newLastIndex)
    console.error(`  ${newLastIndex + 1}/${total}`)
    if (newLastIndex + 1 < total) {
      await sleep(DELAY_BETWEEN_BATCHES_MS)
    }
  }

  const output = { poc }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8')
  try {
    fs.unlinkSync(PROGRESS_PATH)
  } catch {}
  console.error(`Done. Wrote ${Object.keys(poc).length} entries to ${OUTPUT_PATH}`)
  console.error('Merge the "poc" object into .cursor/configuration.json (or public/configuration.json).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
