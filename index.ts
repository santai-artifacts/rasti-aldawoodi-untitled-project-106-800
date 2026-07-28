import { Hono } from 'hono'

const app = new Hono()
const PUBLIC = `${import.meta.dir}/public`

let apodCache: { data: unknown; ts: number } | null = null

app.get('/api/apod', async (c) => {
  if (apodCache && Date.now() - apodCache.ts < 3_600_000) return c.json(apodCache.data)
  try {
    const r = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY')
    const data = await r.json()
    apodCache = { data, ts: Date.now() }
    return c.json(data)
  } catch {
    if (apodCache) return c.json(apodCache.data)
    return c.json({ error: 'Failed to fetch APOD' }, 500)
  }
})

app.get('/api/iss', async (c) => {
  // Primary: wheretheiss.at (HTTPS, includes real altitude + velocity)
  try {
    const r = await fetch('https://api.wheretheiss.at/v1/satellites/25544')
    const d = await r.json() as any
    if (d.latitude !== undefined) return c.json(d)
  } catch {}
  // Fallback: open-notify (normalize to same shape)
  try {
    const r = await fetch('http://api.open-notify.org/iss-now.json')
    const d = await r.json() as any
    return c.json({
      latitude: parseFloat(d.iss_position.latitude),
      longitude: parseFloat(d.iss_position.longitude),
      altitude: 408,
      velocity: 27600,
    })
  } catch {
    return c.json({ error: 'Connection failed' }, 500)
  }
})

app.get('/api/astronauts', async (c) => {
  try {
    const r = await fetch('http://api.open-notify.org/astros.json')
    return c.json(await r.json())
  } catch {
    return c.json({ error: 'Connection failed' }, 500)
  }
})

app.get('/', async (c) =>
  new Response(Bun.file(`${PUBLIC}/index.html`), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
)

export default { port: process.env.PORT || 3000, fetch: app.fetch }
