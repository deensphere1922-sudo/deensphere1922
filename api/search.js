export const config = { maxDuration: 60 };

const tavilyEndpoint = 'https://api.tavily.com/search';

const parseProviderRetryMs = value => {
  const raw = String(value).trim();
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const parts = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*(milliseconds?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)/gi)];
  if (parts.length &&
    parts.map(part => part[0].replace(/\s+/g, '')).join('').toLowerCase() === raw.replace(/\s+/g, '').toLowerCase()) {
    return parts.reduce((total, part) => {
      const unit = part[2].toLowerCase();
      const factor = /^(?:ms|millisecond)/.test(unit) ? 1
        : /^(?:s|sec)/.test(unit) ? 1000
          : /^(?:m|min)/.test(unit) ? 60000
            : 3600000;
      return total + Number(part[1]) * factor;
    }, 0);
  }
  const retryAt = Date.parse(raw);
  return Number.isFinite(retryAt) ? retryAt - Date.now() : null;
};

const getRetryAfter = response => {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) return retryAfter;
  return [
    response.headers.get('x-ratelimit-reset-requests'),
    response.headers.get('x-ratelimit-reset-tokens')
  ].filter(Boolean).sort((a, b) => (parseProviderRetryMs(b) || 0) - (parseProviderRetryMs(a) || 0))[0] || null;
};

const errorMessage = data =>
  typeof data.error === 'string'
    ? data.error
    : data.error?.message || data.message || 'Web search provider request failed.';

async function searchTavily(query, apiKey) {
  const response = await fetch(tavilyEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      topic: 'general',
      search_depth: 'advanced',
      max_results: 10,
      include_answer: false,
      include_raw_content: false
    })
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  return { response, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, mode } = req.body || {};
  if (typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'A search query is required.' });
  }
  if (mode !== 'web') {
    return res.status(400).json({ error: 'Search mode must be "web".' });
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Web search is not configured. Set TAVILY_API_KEY in the deployment environment.'
    });
  }

  const normalizedQuery = query.trim().slice(0, 1000);
  const queries = [
    normalizedQuery,
    `${normalizedQuery} Qur'an Hadith scholarly Islamic sources`
  ];

  try {
    const searches = await Promise.allSettled(
      queries.map(searchQuery => searchTavily(searchQuery, apiKey))
    );
    const responses = searches
      .filter(search => search.status === 'fulfilled' && search.value.response.ok)
      .map(search => search.value);
    if (!responses.length) {
      const failedResponse = searches.find(search =>
        search.status === 'fulfilled' && search.value.response.status === 429
      )?.value || searches.find(search => search.status === 'fulfilled')?.value;
      if (failedResponse) {
        const retryAfter = getRetryAfter(failedResponse.response);
        if (retryAfter) res.setHeader('Retry-After', retryAfter);
        return res.status(failedResponse.response.status).json({
          error: errorMessage(failedResponse.data),
          retryAfter: retryAfter || null
        });
      }
      return res.status(502).json({ error: 'Could not reach the web search provider. Please try again.' });
    }

    const seenUrls = new Set();
    const seenDomains = new Set();
    const results = responses
      .flatMap(({ data }) => Array.isArray(data.results) ? data.results : [])
      .filter(result => result && typeof result === 'object')
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
      .filter(result => {
        if (typeof result.url !== 'string' || typeof result.content !== 'string') return false;
        try {
          const url = new URL(result.url);
          if (url.protocol !== 'https:') return false;
          const normalizedUrl = `${url.origin}${url.pathname}`.replace(/\/+$/, '');
          const domain = url.hostname.toLowerCase().replace(/^www\./, '');
          if (seenUrls.has(normalizedUrl) || seenDomains.has(domain)) return false;
          seenUrls.add(normalizedUrl);
          seenDomains.add(domain);
          result.url = url.toString();
          return true;
        } catch {
          return false;
        }
      })
      .slice(0, 15)
      .map(result => ({
        title: typeof result.title === 'string' && result.title.trim()
          ? result.title.trim()
          : result.url,
        url: result.url,
        content: result.content.trim().slice(0, 2800)
      }))
      .filter(result => result.content);

    const incompleteSearch = searches.some(search =>
      search.status === 'rejected' || (search.status === 'fulfilled' && !search.value.response.ok)
    );
    return res.status(200).json({
      results,
      ...(incompleteSearch ? { warning: 'Some research searches failed, so the results may be incomplete.' } : {})
    });
  } catch (error) {
    console.error('Web search request failed:', error);
    return res.status(502).json({ error: 'Could not reach the web search provider. Please try again.' });
  }
}
