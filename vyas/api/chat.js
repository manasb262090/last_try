// Vercel serverless function: AI assistant.
// Set AI_API_KEY in Vercel (Settings, Environment Variables). Do NOT use a VITE_ prefix.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const key = process.env.AI_API_KEY
  if (!key) return res.status(503).json({ error: 'AI key not set' })

  const body = req.body || {}
  const question = String(body.question || '').slice(0, 500)
  const context = String(body.context || '').slice(0, 6000)
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }))
  if (!question) return res.status(400).json({ error: 'question required' })

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 400,
        system:
          'You are the assistant inside a college ERP app. Answer briefly and simply, using only the data below. ' +
          'If the data does not contain the answer, say you do not have it. Never invent marks, dates or names.\n\nDATA:\n' + context,
        messages: [...history, { role: 'user', content: question }],
      }),
    })
    const data = await r.json()
    const answer = data && data.content && data.content[0] && data.content[0].text
    if (!r.ok || !answer) return res.status(502).json({ error: 'AI request failed' })
    return res.status(200).json({ answer })
  } catch (e) {
    return res.status(502).json({ error: 'AI request failed' })
  }
}
