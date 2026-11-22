export const config = { maxDuration: 60 };

const MAX_QUERY_LENGTH = 1000;
const MAX_SOURCES = 12;
const MIN_RELEVANCE_SCORE = 0.30;

const sourceGroups = [
  {
    type: 'Qur’an evidence',
    domains: ['quran.com', 'quranenc.com'],
    limit: 6,
    query: (question, topic) =>
      `Qur'an verses specifically about the exact topic "${topic}". Find verses that directly address this topic, not other virtues or loosely associated subjects. User question: ${question}.`,
  },
  {
    type: 'Hadith evidence',
    domains: ['sunnah.com', 'dorar.net'],
    limit: 5,
    query: (question, topic) =>
      `Hadith narrations specifically about the exact topic "${topic}". The narration itself or its chapter heading must directly address this topic. Do not include narrations about other topics merely because they are generally related to Islam. Include exact collection and Hadith reference when available. User question: ${question}.`,
  },
  {
    type: 'Scholarly explanation',
    domains: [
      'islamweb.net',
      'islamqa.info',
      'islamqa.org',
      'seekersguidance.org',
      'yaqeeninstitute.org',
    ],
    limit: 1,
    query: (question, topic) =>
      `Islamic scholarly explanation specifically addressing "${topic}". Keep the explanation limited to this topic and exclude other subjects. User question: ${question}.`,
  },
];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can',
  'could', 'did', 'do', 'does', 'for', 'from', 'had', 'has', 'have', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'may', 'me', 'my', 'of', 'on',
  'or', 'our', 'please', 'should', 'so', 'that', 'the', 'their', 'them',
  'there', 'these', 'they', 'this', 'to', 'was', 'we', 'what', 'when',
  'where', 'which', 'who', 'why', 'will', 'with', 'would', 'you', 'your',
  'islam', 'islamic', 'quran', 'qur', 'an', 'hadith', 'evidence', 'explain',
  'meaning', 'according', 'tell', 'about', 'related', 'relevant', 'question',
  'directly', 'exact', 'topic', 'source', 'sources', 'reference', 'references',
  'verse', 'verses', 'ayah', 'ayat', 'mentioned', 'mentions', 'say', 'says',
  'said', 'talk', 'talks', 'give', 'show', 'find',
]);

function tokenize(value) {
  return [...new Set(
    String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(/\s+/)
      .map(word => word.trim())
      .filter(word => word.length > 2 && !STOP_WORDS.has(word))
  )];
}

// Use only the topic words the user actually asked about.
// Do not add fixed synonyms or adjacent concepts for any topic.
function getTopic(question) {
  const terms = tokenize(question);
  return { topic: terms.join(' ') || String(question).trim(), terms };
}

function calculateRelevance(topic, title, content, providerScore) {
  const terms = topic.terms || [];
  if (!terms.length) return 0;

  const titleTerms = new Set(tokenize(title));
  const contentTerms = new Set(tokenize(content));
  const matchedTerms = new Set([
    ...terms.filter(term => titleTerms.has(term)),
    ...terms.filter(term => contentTerms.has(term)),
  ]);

  // A high search-engine score alone is never enough. The page must explicitly
  // contain at least one of the user's requested topic words.
  if (matchedTerms.size === 0) return 0;

  const topicCoverage = matchedTerms.size / terms.length;
  const titleCoverage = terms.filter(term => titleTerms.has(term)).length / terms.length;
  const contentCoverage = terms.filter(term => contentTerms.has(term)).length / terms.length;

  return (topicCoverage * 0.55) + (titleCoverage * 0.20) +
    (contentCoverage * 0.20) + (Math.min(Math.max(providerScore, 0), 1) * 0.05);
}

async function getRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  if (typeof req.on === 'function') {
    return new Promise(resolve => {
      let raw = '';
      let tooLarge = false;
      req.on('data', chunk => {
        if (tooLarge) return;
        raw += chunk;
        if (raw.length > 10000) { tooLarge = true; raw = ''; }
      });
      req.on('end', () => {
        try { resolve(!tooLarge && raw ? JSON.parse(raw) : {}); }
        catch { resolve({}); }
      });
      req.on('error', () => resolve({}));
    });
  }
  return {};
}

function getQuestion(body) {
  for (const value of [body?.query, body?.question, body?.text]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function isTrustedUrl(value, domains) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && domains.some(domain =>
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );
  } catch { return false; }
}

function getRetryAfter(response) {
  const values = [
    response.headers.get('retry-after'),
    response.headers.get('x-ratelimit-reset-requests'),
    response.headers.get('x-ratelimit-reset-tokens'),
  ].filter(Boolean);
  return values.find(value =>
    !/^(?:0+(?:\.0+)?)(?:\s*(?:ms|s|sec|seconds?))?$/i.test(value.trim())
  ) || values[0] || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const body = await getRequestBody(req);
    const query = getQuestion(body);
    if (query.length < 2 || query.length > MAX_QUERY_LENGTH) {
      return res.status(400).json({ error: `Enter a search question between 2 and ${MAX_QUERY_LENGTH} characters.` });
    }

    const topic = getTopic(query);
    if (!topic.terms.length) {
      return res.status(400).json({ error: 'Please enter the specific Islamic topic you want to research.' });
    }

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Web research is not configured on the server.' });

    const responses = await Promise.all(sourceGroups.map(group =>
      fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: group.query(query, topic.topic),
          search_depth: 'advanced',
          max_results: 8,
          include_domains: group.domains,
          include_domains_mode: 'restrict',
          include_answer: false,
          include_raw_content: false,
        }),
      })
    ));

    const candidates = [];
    for (let index = 0; index < responses.length; index++) {
      const response = responses[index];
      const group = sourceGroups[index];
      let data;
      try { data = await response.json(); }
      catch {
        return res.status(502).json({ error: 'The web research service returned an invalid response.' });
      }
      if (!response.ok) {
        const retryAfter = getRetryAfter(response);
        if (retryAfter) res.setHeader('Retry-After', retryAfter);
        return res.status(response.status === 429 ? 429 : 502).json({
          error: 'The web research service could not complete this search.',
          ...(retryAfter ? { retryAfter } : {}),
        });
      }

      for (const result of Array.isArray(data.results) ? data.results : []) {
        if (!result || typeof result.url !== 'string' || typeof result.content !== 'string' ||
            !isTrustedUrl(result.url, group.domains)) continue;

        const url = new URL(result.url);
        const title = typeof result.title === 'string' && result.title.trim()
          ? result.title.trim().slice(0, 250) : url.hostname;
        const content = result.content.slice(0, 5000);
        const providerScore = typeof result.score === 'number' ? result.score : 0;
        const relevance = calculateRelevance(topic, title, content, providerScore);
        if (relevance < MIN_RELEVANCE_SCORE) continue;

        candidates.push({ title, url: url.href, content, sourceType: group.type, score: relevance });
      }
    }

    const seenUrls = new Set();
    const uniqueCandidates = candidates.filter(source => {
      const normalizedUrl = new URL(source.url);
      normalizedUrl.hash = '';
      normalizedUrl.search = '';
      const key = normalizedUrl.href.replace(/\/$/, '');
      if (seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    });

    const results = [];
    for (const group of sourceGroups) {
      results.push(...uniqueCandidates
        .filter(source => source.sourceType === group.type)
        .sort((a, b) => b.score - a.score)
        .slice(0, group.limit));
    }

    const finalResults = results.slice(0, MAX_SOURCES).map(({ score, ...source }) => source);
    return res.status(200).json({ results: finalResults, total: finalResults.length });
  } catch (error) {
    console.error('Web search API error:', error);
    return res.status(502).json({ error: 'Could not reach the web research service. Please try again.' });
  }
}
