export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
  if (query.length < 2 || query.length > 500) {
    return res.status(400).json({ error: 'Enter a search question between 2 and 500 characters.' });
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Web research is not configured on the server.' });
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        max_results: 6,
        include_answer: false,
        include_raw_content: false
      })
    });
    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error('Web research provider returned invalid JSON:', error);
      return res.status(502).json({ error: 'The web research service returned an invalid response.' });
    }
    if (!response.ok) {
      console.error('Web research provider returned an error:', response.status);
      return res.status(502).json({ error: 'The web research service could not complete this search.' });
    }

    const seenUrls = new Set();
    const results = (Array.isArray(data.results) ? data.results : [])
      .filter(result => result && typeof result.url === 'string' && typeof result.content === 'string')
      .map(result => {
        try {
          const url = new URL(result.url);
          if ((url.protocol !== 'https:' && url.protocol !== 'http:') || seenUrls.has(url.href)) return null;
          seenUrls.add(url.href);
          return {
            title: typeof result.title === 'string' ? result.title.slice(0, 250) : url.hostname,
            url: url.href,
            content: result.content.slice(0, 1800)
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Could not reach the web research provider:', error);
    return res.status(502).json({ error: 'Could not reach the web research service. Please try again.' });
  }
}
