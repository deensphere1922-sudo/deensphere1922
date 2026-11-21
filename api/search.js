
export const config = { maxDuration: 60 };

const MAX_QUERY_LENGTH = 1000;
const MAX_SOURCES = 5;

const sourceGroups = [
  {
    type: 'Qur’an evidence',
    domains: ['quran.com', 'quranenc.com'],
    limit: 2,
    query: question =>
      `${question} relevant Quran verses and explanations directly related to the exact question.`
  },
  {
    type: 'Hadith evidence',
    domains: ['sunnah.com', 'dorar.net'],
    limit: 2,
    query: question =>
      `${question} directly relevant Hadith narrations from authentic collections, including collection and reference number where available.`
  },
  {
    type: 'Scholarly explanation',
    domains: [
      'islamweb.net',
      'islamqa.info',
      'islamqa.org',
      'seekersguidance.org',
      'yaqeeninstitute.org'
    ],
    limit: 1,
    query: question =>
      `${question} focused Islamic scholarly explanation supported by relevant Quran and Hadith evidence.`
  }
];

// Support parsed JSON, JSON strings and raw request bodies.
async function getRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  if (typeof req.on === 'function') {
    return new Promise(resolve => {
      let raw = '';

      req.on('data', chunk => {
        raw += chunk;

        if (raw.length > 10000) {
          raw = '';
        }
      });

      req.on('end', () => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch {
          resolve({});
        }
      });

      req.on('error', () => resolve({}));
    });
  }

  return {};
}

function getQuestion(body) {
  const candidates = [
    body?.query,
    body?.question,
    body?.text
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function isTrustedUrl(value, domains) {
  try {
    const url = new URL(value);

    return (
      ['https:', 'http:'].includes(url.protocol) &&
      domains.some(domain =>
        url.hostname === domain ||
        url.hostname.endsWith(`.${domain}`)
      )
    );
  } catch {
    return false;
  }
}

function getRetryAfter(response) {
  const values = [
    response.headers.get('retry-after'),
    response.headers.get('x-ratelimit-reset-requests'),
    response.headers.get('x-ratelimit-reset-tokens')
  ].filter(Boolean);

  return (
    values.find(value =>
      !/^(?:0+(?:\.0+)?)(?:\s*(?:ms|s|sec|seconds?))?$/i.test(
        value.trim()
      )
    ) || values[0] || null
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed.'
    });
  }

  try {
    const body = await getRequestBody(req);
    const query = getQuestion(body);

    if (
      query.length < 2 ||
      query.length > MAX_QUERY_LENGTH
    ) {
      return res.status(400).json({
        error: `Enter a search question between 2 and ${MAX_QUERY_LENGTH} characters.`
      });
    }

    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: 'Web research is not configured on the server.'
      });
    }

    const responses = await Promise.all(
      sourceGroups.map(group =>
        fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            api_key: apiKey,
            query: group.query(query),
            search_depth: 'advanced',
            max_results: 4,
            include_domains: group.domains,
            include_domains_mode: 'restrict',
            include_answer: false,
            include_raw_content: false
          })
        })
      )
    );

    const candidates = [];

    for (let index = 0; index < responses.length; index++) {
      const response = responses[index];
      const group = sourceGroups[index];

      let data;

      try {
        data = await response.json();
      } catch {
        console.error('Invalid JSON from web research provider.');

        return res.status(502).json({
          error: 'The web research service returned an invalid response.'
        });
      }

      if (!response.ok) {
        console.error(
          'Web research provider error:',
          response.status
        );

        const retryAfter = getRetryAfter(response);

        if (retryAfter) {
          res.setHeader('Retry-After', retryAfter);
        }

        return res
          .status(response.status === 429 ? 429 : 502)
          .json({
            error: 'The web research service could not complete this search.',
            ...(retryAfter ? { retryAfter } : {})
          });
      }

      for (const result of Array.isArray(data.results)
        ? data.results
        : []) {
        if (
          !result ||
          typeof result.url !== 'string' ||
          typeof result.content !== 'string' ||
          !isTrustedUrl(result.url, group.domains)
        ) {
          continue;
        }

        const url = new URL(result.url);

        candidates.push({
          title:
            typeof result.title === 'string'
              ? result.title.slice(0, 250)
              : url.hostname,

          url: url.href,
          content: result.content.slice(0, 1800),
          sourceType: group.type,

          score:
            typeof result.score === 'number'
              ? result.score
              : 0
        });
      }
    }

    // Remove duplicate links.
    const seenUrls = new Set();

    const uniqueCandidates = candidates.filter(source => {
      if (seenUrls.has(source.url)) return false;

      seenUrls.add(source.url);
      return true;
    });

    // Select relevant sources from each category.
    const results = [];

    for (const group of sourceGroups) {
      const groupResults = uniqueCandidates
        .filter(source => source.sourceType === group.type)
        .sort((a, b) => b.score - a.score)
        .slice(0, group.limit);

      results.push(...groupResults);
    }

    // Strict maximum of five sources.
    const finalResults = results
      .slice(0, MAX_SOURCES)
      .map(({ score, ...source }) => source);

    return res.status(200).json({
      results: finalResults,
      total: finalResults.length
    });

  } catch (error) {
    console.error('Web search API error:', error);

    return res.status(502).json({
      error: 'Could not reach the web research service. Please try again.'
    });
  }
}
