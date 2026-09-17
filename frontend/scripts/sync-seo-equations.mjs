import { writeFile, rename } from 'node:fs/promises'
const origin = 'https://api.sciencebo.uk'
let next = `${origin}/api/equations/?locale=en`
const equations = []
const seen = new Set()
let expected
while (next) {
  const url = new URL(next)
  if (url.origin !== origin || url.pathname !== '/api/equations/' || seen.has(url.href) || seen.size >= 100) throw new Error('Unexpected catalog pagination')
  seen.add(url.href)
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' })
  if (!response.ok) throw new Error(`Catalog returned HTTP ${response.status}`)
  const data = await response.json()
  if (!Array.isArray(data.results) || !Number.isInteger(data.count)) throw new Error('Invalid catalog response')
  expected ??= data.count
  if (data.count !== expected) throw new Error('Catalog changed during pagination; retry')
  equations.push(...data.results)
  next = data.next
}
if (!equations.length || equations.length !== expected || new Set(equations.map(e => e.id)).size !== expected) throw new Error('Incomplete catalog; existing snapshot preserved')
for (const equation of equations) {
  if (!Number.isInteger(equation.id) || equation.id < 1 || typeof equation.title !== 'string' || !equation.title || typeof equation.description !== 'string') throw new Error('Invalid equation metadata')
}
const target = new URL('../src/seo/equations.json', import.meta.url)
const temporary = new URL('../src/seo/equations.json.tmp', import.meta.url)
await writeFile(temporary, JSON.stringify(equations, null, 2) + '\n')
await rename(temporary, target)
console.log(`SEO catalog refreshed: ${equations.length} public equations`)
