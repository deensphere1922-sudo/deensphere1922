
const ISLAMIC_SOURCE_DOMAINS = [
  'quran.com',
  'sunnah.com',
  'quran.ksu.edu.sa',
  'altafsir.com',
  'islamqa.info',
  'islamweb.net',
  'seekersguidance.org',
  'yaqeeninstitute.org',
  'dar-alifta.org',
  'aboutislam.net'
];

const APP_SOURCE_DOMAINS = [
  'play.google.com',
  'apps.apple.com'
];

function isAllowedSourceUrl(value, domains) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();

    return domains.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  const { query, mode = 'web' } = req.body || {};

  if (typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({
      error: 'A search query is required'
    });
  }

  if (!['web', 'deep'].includes(mode)) {
    return res.status(400).json({
      error: 'Search mode must be web or deep'
    });
  }

  const TAVILY_KEY = process.env.TAVILY_API_KEY;

  if (!TAVILY_KEY) {
    return res.status(503).json({
      error: 'TAVILY_API_KEY is missing.'
    });
  }

  const cleanQuery = query.trim().slice(0, 1000);

  // Allow official app stores for Islamic app searches.
  const isAppSearch =
    /\b(app|apps|application|applications|play store|app store)\b/i
      .test(cleanQuery);

  const allowedDomains = isAppSearch
    ? [...ISLAMIC_SOURCE_DOMAINS, ...APP_SOURCE_DOMAINS]
    : ISLAMIC_SOURCE_DOMAINS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const searchResponse = await fetch(
      'https://api.tavily.com/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          api_key: TAVILY_KEY,
          query: cleanQuery,
          search_depth: mode === 'deep'
            ? 'advanced'
            : 'basic',
          topic: 'general',
          max_results: mode === 'deep' ? 12 : 8,
          include_answer: false,
          include_raw_content: mode === 'deep',
          include_domains: allowedDomains
        })
      }
    );

    let data;

    try {
      data = await searchResponse.json();
    } catch {
      return res.status(502).json({
        error: 'Invalid response from the search provider.'
      });
    }

    if (!searchResponse.ok) {
      console.error('Tavily error:', data);

      return res.status(502).json({
        error:
          data?.detail ||
          data?.message ||
          'Islamic web search provider failed.'
      });
    }

    const results = Array.isArray(data.results)
      ? data.results
          .filter(result =>
            result &&
            typeof result.url === 'string' &&
            isAllowedSourceUrl(result.url, allowedDomains)
          )
          .map(result => ({
            title: typeof result.title === 'string'
              ? result.title
              : 'Untitled source',

            url: result.url,

            content: String(
              mode === 'deep'
                ? (result.raw_content || result.content || '')
                : (result.content || '')
            ).slice(0, mode === 'deep' ? 3500 : 2200)
          }))
          .filter(result => result.content.trim())
          .filter((result, index, array) =>
            array.findIndex(item => item.url === result.url) === index
          )
      : [];

    return res.status(200).json({
      query: cleanQuery,
      mode,
      total: results.length,
      results
    });

  } catch (error) {
    console.error('Islamic search failed:', error);

    return res.status(
      error.name === 'AbortError' ? 504 : 500
    ).json({
      error: error.name === 'AbortError'
        ? 'Search timed out. Please try again.'
        : 'Live Islamic web search failed. Please try again.'
    });

  } finally {
    clearTimeout(timeout);
  }
}
