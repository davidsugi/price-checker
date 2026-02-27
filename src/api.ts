export async function resolveCard(body: {
  cardName: string
  cardType: string
  override?: string
}): Promise<{ japanese: string | null }> {
  const res = await fetch('/api/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  return res.json()
}

export async function getMapping(): Promise<Record<string, Record<string, string>>> {
  const res = await fetch('/api/mapping')
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  return res.json()
}
