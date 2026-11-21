export const config = { maxDuration: 60 };

const sourceGroups = [
  {
    type: 'Primary Qur’an and Hadith text',
    domains: ['quran.com', 'quranenc.com', 'sunnah.com', 'dorar.net'],
    query: query => `${query} Quran verse or Hadith direct textual evidence`
  },
  {
    type: 'Scholarly explanation',
    domains: ['islamweb.net', 'islamqa.info', 'islamqa.org', 'seekersguidance.org', 'yaqeeninstitute.org'],
    query: query => `${query} Islamic scholarly explanation with textual evidence`
  }
];

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
    const responses = await Promise.all(sourceGroups.map(group =>
      fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: group.query(query),
          search_depth: 'fast',
          max_results: 3,
          include_domains: group.domains,
          include_domains_mode: 'restrict',
          include_answer: false,
          include_raw_content: false
        })
      })
    ));

    const seenUrls = new Set();
    const results = [];
    for (let index = 0; index < responses.length; index++) {
      const response = responses[index];
      let data;
      try {
        data = await response.json();
      } catch (error) {
        console.error('Web research provider returned invalid JSON:', error);
        return res.status(502).json({ error: 'The web research service returned an invalid response.' });
      }
      if (!response.ok) {
        console.error('Web research provider returned an error:', response.status);
        const retryValues = [
          response.headers.get('retry-after'),
          response.headers.get('x-ratelimit-reset-requests'),
          response.headers.get('x-ratelimit-reset-tokens')
        ].filter(Boolean);
        const retryAfter = retryValues.find(value =>
          !/^(?:0+(?:\.0+)?)(?:\s*(?:ms|s|sec|seconds?))?$/i.test(value.trim())
        ) || retryValues[0] || null;
        if (retryAfter) res.setHeader('Retry-After', retryAfter);
        return res.status(response.status === 429 ? 429 : 502).json({
          error: 'The web research service could not complete this search.',
          ...(retryAfter ? { retryAfter } : {})
        });
      }

      const group = sourceGroups[index];
      for (const result of Array.isArray(data.results) ? data.results : []) {
        if (!result || typeof result.url !== 'string' || typeof result.content !== 'string') continue;
        try {
          const url = new URL(result.url);
          const trustedHost = group.domains.some(domain =>
            url.hostname === domain || url.hostname.endsWith(`.${domain}`)
          );
          if ((url.protocol !== 'https:' && url.protocol !== 'http:') ||
            !trustedHost || seenUrls.has(url.href)) continue;
          seenUrls.add(url.href);
          results.push({
            title: typeof result.title === 'string' ? result.title.slice(0, 250) : url.hostname,
            url: url.href,
            content: result.content.slice(0, 1800),
            sourceType: group.type
          });
        } catch {
          continue;
        }
      }
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Could not reach the web research provider:', error);
    return res.status(502).json({ error: 'Could not reach the web research service. Please try again.' });
  }
}
