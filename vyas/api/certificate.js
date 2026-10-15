// Vercel serverless function: AI certificate reader.
// Set AI_API_KEY in Vercel (Settings, Environment Variables). Do NOT use a VITE_ prefix.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const key = process.env.AI_API_KEY
  if (!key) return res.status(503).json({ error: 'AI key not set' })

  const body = req.body || {}
  const events = (Array.isArray(body.events) ? body.events : []).map((e) => String(e).slice(0, 80)).slice(0, 30)
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(String(body.image || ''))
  if (!m) return res.status(400).json({ error: 'image data URL required' })

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
              {
                type: 'text',
                text:
                  'This is a college event certificate. Reply with ONLY a JSON object: ' +
                  '{"eventName": string or null, "studentName": string or null, "matchedEvent": one of the list below or null}. ' +
                  'List: ' + JSON.stringify(events),
              },
            ],
          },
        ],
      }),
    })
    const data = await r.json()
    const text = data && data.content && data.content[0] && data.content[0].text
    if (!r.ok || !text) return res.status(502).json({ error: 'AI request failed' })
    const j = /\{[\s\S]*\}/.exec(text)
    const parsed = j ? JSON.parse(j[0]) : {}
    const matched = events.includes(parsed.matchedEvent) ? parsed.matchedEvent : null
    return res.status(200).json({ eventName: parsed.eventName || null, studentName: parsed.studentName || null, matchedEvent: matched })
  } catch (e) {
    return res.status(502).json({ error: 'AI request failed' })
  }
}
