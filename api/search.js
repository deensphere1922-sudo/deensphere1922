
export const config = { maxDuration: 60 };

const MAX_SOURCES = 5;

const sourceGroups = [
  {
    type: 'Qur’an evidence',
    domains: ['quran.com', 'quranenc.com'],
    limit: 2,
    query: question =>
      `${question} relevant Quran verses and their meaning. Only return Quran passages directly related to this exact question.`
  },
  {
    type: 'Hadith evidence',
    domains: ['sunnah.com', 'dorar.net'],
    limit: 2,
    query: question =>
      `${question} relevant Hadith from authentic Hadith collections. Find directly related narrations with collection and reference details where available.`
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
      `${question} Islamic scholarly explanation. Focus only on this exact subject and support the explanation with relevant Quran or Hadith evidence.`
  }
];

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
      error: 'Method not allowed'
    });
  }

  const query =
    typeof req.body?.query === 'string'
      ? req.body.query.trim()
      : '';

  if (query.length < 2 || query.length > 500) {
    return res.status(400).json({
      error: 'Enter a search question between 2 and 500 characters.'
    });
  }

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'Web research is not configured on the server.'
    });
  }

  try {
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
      } catch (error) {
        console.error(
          'Web research provider returned invalid JSON:',
          error
        );

        return res.status(502).json({
          error: 'The web research service returned an invalid response.'
        });
      }

      if (!response.ok) {
        console.error(
          'Web research provider returned an error:',
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

        candidates.push({
          title:
            typeof result.title === 'string'
              ? result.title.slice(0, 250)
              : new URL(result.url).hostname,

          url: new URL(result.url).href,

          content: result.content.slice(0, 1800),

          sourceType: group.type,

          score:
            typeof result.score === 'number'
              ? result.score
              : 0
        });
      }
    }

    // Remove duplicate URLs.
    const seenUrls = new Set();

    const uniqueCandidates = candidates.filter(source => {
      if (seenUrls.has(source.url)) {
        return false;
      }

      seenUrls.add(source.url);
      return true;
    });

    // Sort each category by Tavily relevance score.
    const groupedResults = sourceGroups.map(group => ({
      ...group,
      results: uniqueCandidates
        .filter(source => source.sourceType === group.type)
        .sort((a, b) => b.score - a.score)
    }));

    const selected = [];
    const selectedUrls = new Set();

    // First, select the best results from each category.
    for (const group of groupedResults) {
      const relevant = group.results.slice(0, group.limit);

      for (const source of relevant) {
        if (
          selected.length < MAX_SOURCES &&
          !selectedUrls.has(source.url)
        ) {
          selected.push(source);
          selectedUrls.add(source.url);
        }
      }
    }

    // Fill remaining places with the best available results.
    // Never exceed five sources.
    const remaining = uniqueCandidates
      .filter(source => !selectedUrls.has(source.url))
      .sort((a, b) => b.score - a.score);

    for (const source of remaining) {
      if (selected.length >= MAX_SOURCES) break;

      selected.push(source);
      selectedUrls.add(source.url);
    }

    // Do not expose internal ranking scores to the frontend.
    const results = selected.map(
      ({ score, ...source }) => source
    );

    return res.status(200).json({
      results,
      total: results.length
    });

  } catch (error) {
    console.error(
      'Could not reach the web research provider:',
      error
    );

    return res.status(502).json({
      error: 'Could not reach the web research service. Please try again.'
    });
  }
}
