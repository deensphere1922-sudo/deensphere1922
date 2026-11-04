export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, systemPrompt, webContext } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing messages' });
  }

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

  try {
    const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        temperature: 0.1,
        max_tokens: 1000,
        messages: [
          { role: 'system', content: systemPrompt || '' },
          { role: 'system', content: 'Web Research Results:\n' + (webContext || 'none') },
          ...messages
        ]
      })
    });
    const data = await groqResp.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}