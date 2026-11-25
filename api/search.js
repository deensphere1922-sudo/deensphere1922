export const config = { maxDuration: 60 };

const MAX_QUERY_LENGTH = 1000;
const MAX_SOURCES = 12;
const MIN_RELEVANCE_SCORE = 0.24;

// Search only primary English Qur'an/Hadith sources for English questions.
// quran.com and QuranEnc English routes are retained; Arabic-only Dorar is omitted.
const sourceGroups = [
  {
    type: 'Qur’an evidence',
    domains: ['quran.com', 'quranenc.com'],
    limit: 6,
    query: (question, topic) =>
      `English Qur'an translation in English only. ${topic === 'islam' ? "Find introductory Qur'an passages explaining what Islam is, the meaning of Islam, submission to Allah, and the message of Islam." : `Find Qur'an verses that directly discuss the exact topic "${topic}"; exclude merely associated subjects.`} Return English-language verse pages and English translation excerpts only. Never return Albanian or another language. User question: ${question}.`,
  },
  {
    type: 'Hadith evidence',
    domains: ['sunnah.com'],
    limit: 5,
    query: (question, topic) =>
      `English Hadith text from Sunnah.com. ${topic === 'islam' ? 'Find foundational narrations that explain what Islam is, the meaning of Islam, and its pillars.' : `Find narrations specifically and directly about the exact topic "${topic}"; exclude merely associated topics.`} Include collection and exact Hadith reference when the page provides them. User question: ${question}.`,
  },
  {
    type: 'Scholarly explanation',
    domains: ['islamweb.net', 'islamqa.info', 'islamqa.org', 'seekersguidance.org', 'yaqeeninstitute.org'],
    limit: 1,
    query: (question, topic) =>
      `English-language Islamic scholarly explanation. ${topic === 'islam' ? 'Provide a reliable introductory explanation of what Islam means, its core belief in the oneness of Allah, prophethood, worship, and five pillars.' : `Explain only the exact topic "${topic}"; do not include adjacent or loosely related subjects.`} User question: ${question}.`,
  },
];

const STOP_WORDS = new Set(`a an and are as at be been but by can could did do does for from had has have how i if in into is it its may me my of on or our please should so that the their them there these they this to was we what when where which who why will with would you your islamic quran qur an hadith evidence explain meaning mean means definition define describe according tell about related relevant question directly exact topic source sources reference references verse verses ayah ayat mentioned mentions say says said talk talks give show find all`.split(/\s+/));

const SPELLING_MAP = new Map([
  ['tahejjud', 'tahajjud'], ['tahajud', 'tahajjud'], ['tahajjudh', 'tahajjud'],
  ['tahajjad', 'tahajjud'], ['tahajjudh', 'tahajjud'], ['tahajjud', 'tahajjud'],
  ['isalm', 'islam'], ['islm', 'islam'], ['islaam', 'islam'],
  ['forgivness', 'forgiv'], ['forgivnesss', 'forgiv'], ['forgivng', 'forgiv'],
  ['routin', 'routine'], ['routne', 'routine'], ['routien', 'routine'],
  ['quraan', 'quran'], ['quraan', 'quran'], ['tawakul', 'tawakkul'], ['tawakkal', 'tawakkul'],
  ['salah', 'prayer'], ['salat', 'prayer'], ['namaz', 'prayer'],
  ['quraan', 'quran'], ['quraan', 'quran'], ['koran', 'quran'],
  ['ramzan', 'ramadan'], ['ramadhan', 'ramadan'],
  ['roza', 'fasting'], [' saum', 'fasting'],
  ['dua', 'dua'], ['duaa', 'dua'], ['dhikr', 'dhikr'], ['zikr', 'dhikr'],
  ['wudu', 'wudu'], ['wudhu', 'wudu'], ['ablution', 'wudu'],
  ['forgiveness', 'forgiv'], ['forgiven', 'forgiv'], ['forgiving', 'forgiv'], ['forgive', 'forgiv'],
  ['patience', 'patien'], ['patient', 'patien'], ['patients', 'patien'], ['sabr', 'patien'],
  ['repentance', 'repent'], ['repenting', 'repent'], ['tawbah', 'repent'], ['tawba', 'repent'],
  ['prayers', 'prayer'], ['charity', 'charit'], ['charities', 'charit'],
]);

const COMMON_ISLAMIC_TERMS = [
  'tahajjud', 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'salah', 'prayer',
  'quran', 'hadith', 'sunnah', 'tawheed', 'tawhid', 'tawakkul', 'sabr',
  'patience', 'forgiveness', 'tawbah', 'repentance', 'zakat', 'sawm',
  'fasting', 'hajj', 'umrah', 'dua', 'dhikr', 'wudu', 'ghusl', 'jannah',
  'jahannam', 'angels', 'prophets', 'islam', 'routine'
];

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

function normalizeWord(word) {
  const w = String(word || '').toLowerCase();
  if (SPELLING_MAP.has(w)) return SPELLING_MAP.get(w);
  if (w.length >= 5) {
    const match = COMMON_ISLAMIC_TERMS
      .map(term => ({ term, distance: levenshtein(w, term) }))
      .filter(item => item.distance <= (w.length >= 8 ? 2 : 1))
      .sort((a, b) => a.distance - b.distance)[0];
    if (match) return SPELLING_MAP.get(match.term) || match.term;
  }
  if (w === 'sabr') return 'patien';
  return w;
}

function tokenize(value) {
  return [...new Set(String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
    .map(normalizeWord))];
}

function getTopic(question) {
  const originalWords = String(question || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  let terms = tokenize(question);
  // A broad question such as "Islam" is valid; do not reject it because it
  // is not a narrow subtopic. If only instruction words remain, preserve the
  // meaningful original words rather than returning a validation error.
  if (!terms.length) {
    terms = [...new Set(originalWords.map(normalizeWord).filter(word => word.length > 2))];
  }
  // Treat broad Islam/Qur'an/Hadith questions as valid general searches.
  // If the user typed a misspelling, normalizeWord corrects it before this check.
  const meaningful = terms.filter(word => !['routine', 'daily', 'schedule', 'plan'].includes(word));
  const broad = meaningful.length === 1 && ['islam', 'quran', 'hadith'].includes(meaningful[0]);
  const topic = broad ? meaningful[0] : (terms.join(' ') || String(question).trim());
  return { topic, terms: broad ? meaningful : terms, broad };
}

function calculateRelevance(topic, title, content, providerScore) {
  const terms = topic.terms || [];
  if (!terms.length) return Math.max(0, Math.min(providerScore, 1));
  const titleTerms = new Set(tokenize(title));
  const contentTerms = new Set(tokenize(content));
  const matched = terms.filter(term => titleTerms.has(term) || contentTerms.has(term));
  if (!matched.length) return topic.broad ? Math.min(Math.max(providerScore, 0), 1) * 0.60 : 0;
  const coverage = new Set(matched).size / terms.length;
  const titleCoverage = terms.filter(term => titleTerms.has(term)).length / terms.length;
  const contentCoverage = terms.filter(term => contentTerms.has(term)).length / terms.length;
  // Lexical topic evidence dominates the search provider's score.
  return coverage * 0.60 + titleCoverage * 0.15 + contentCoverage * 0.20 + Math.min(Math.max(providerScore, 0), 1) * 0.05;
}

const ALBANIAN_MARKERS = /\b(është|eshte|dhe|nga|për|per|kush|kur|ku|nuk|që|qe|më|me|ata|ato|ju|shumë|shume|zoti|mëshirë|mesh ire|falë|fale|besojnë|besojne|jetën|jeten|thoni|thuaju)\b/i;
const NON_ENGLISH_URL_MARKERS = /\/(?:sq|al|ar|ur|tr|id|fr|de|es|ru|bn|ms)(?:\/|$)/i;
const ENGLISH_URL_MARKERS = /\/(?:en|english)(?:\/|$)/i;

function looksEnglish(text) {
  const value = String(text || '').trim();
  if (!value) return false;

  const letters = value.match(/\p{L}/gu) || [];
  if (!letters.length) return false;

  const nonLatin = value.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0400-\u04FF]/g) || [];
  // Permit a short Arabic quotation alongside an English translation, but
  // reject excerpts that are predominantly Arabic/Urdu/Cyrillic.
  if (nonLatin.length / letters.length > 0.45) return false;

  const common = (value.toLowerCase().match(/\b(the|and|of|to|is|in|you|your|he|who|for|with|his|them|those|will|not|what|from|that|this|are|one|god|allah|lord|islam|submission|faith|believe|believers|quran|qur'an|messenger|forgive|forgiveness|patience|patient)\b/g) || []).length;
  return common >= 1 || letters.length >= 30;
}

function isEnglishQuranUrl(url) {
  // Quran.com verse URLs often use canonical paths without an /en/ segment.
  // Accept canonical URLs, but reject explicit non-English language routes.
  return !NON_ENGLISH_URL_MARKERS.test(url.pathname);
}

async function getRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  if (typeof req.on === 'function') return new Promise(resolve => {
    let raw = '', tooLarge = false;
    req.on('data', chunk => { if (tooLarge) return; raw += chunk; if (raw.length > 10000) { tooLarge = true; raw = ''; } });
    req.on('end', () => { try { resolve(!tooLarge && raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
  return {};
}

function getQuestion(body) {
  for (const value of [body?.query, body?.question, body?.text])
    if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

function isTrustedUrl(value, domains) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch { return false; }
}

function getRetryAfter(response) {
  const values = [response.headers.get('retry-after'), response.headers.get('x-ratelimit-reset-requests'), response.headers.get('x-ratelimit-reset-tokens')].filter(Boolean);
  return values.find(value => !/^(?:0+(?:\.0+)?)(?:\s*(?:ms|s|sec|seconds?))?$/i.test(value.trim())) || values[0] || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const body = await getRequestBody(req);
    const query = getQuestion(body);
    if (query.length < 2 || query.length > MAX_QUERY_LENGTH)
      return res.status(400).json({ error: `Enter a search question between 2 and ${MAX_QUERY_LENGTH} characters.` });

    const topic = getTopic(query);

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Web research is not configured on the server.' });

    const responses = await Promise.all(sourceGroups.map(group => fetch('https://api.tavily.com/search', {
      method: 'POST',
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${apiKey}`
},      body: JSON.stringify({
        query: group.query(query, topic.topic),
        search_depth: 'advanced',
        max_results: 8,
        include_domains: group.domains,
        include_answer: false,
        include_raw_content: false,
      }),
    })));

    const candidates = [];
    for (let index = 0; index < responses.length; index++) {
      const response = responses[index];
      const group = sourceGroups[index];
      let data;
      try { data = await response.json(); }
      catch { return res.status(502).json({ error: 'The web research service returned an invalid response.' }); }
      if (!response.ok) {
        console.error('Tavily API error:', {
  status: response.status,
  details: data
});
        const retryAfter = getRetryAfter(response);
        if (retryAfter) res.setHeader('Retry-After', retryAfter);
        return res.status(response.status === 429 ? 429 : 502).json({ error: 'The web research service could not complete this search.', ...(retryAfter ? { retryAfter } : {}) });
      }

      for (const result of Array.isArray(data.results) ? data.results : []) {
        if (!result || typeof result.url !== 'string' || typeof result.content !== 'string' || !isTrustedUrl(result.url, group.domains)) continue;
        const url = new URL(result.url);
        const title = typeof result.title === 'string' && result.title.trim() ? result.title.trim().slice(0, 250) : url.hostname;
        const content = result.content.slice(0, 5000);
        if (group.type === 'Qur’an evidence' && !isEnglishQuranUrl(url)) continue;
        if (!looksEnglish(`${title} ${content}`)) continue;
        const providerScore = typeof result.score === 'number' ? result.score : 0;
        const relevance = calculateRelevance(topic, title, content, providerScore);
        if (relevance < MIN_RELEVANCE_SCORE) continue;
        candidates.push({ title, url: url.href, content, sourceType: group.type, score: relevance });
      }
    }

    const seen = new Set();
    const unique = candidates.filter(source => {
      const url = new URL(source.url); url.hash = ''; url.search = '';
      const key = url.href.replace(/\/$/, '');
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });

    const results = [];
    for (const group of sourceGroups) {
      results.push(...unique.filter(source => source.sourceType === group.type).sort((a, b) => b.score - a.score).slice(0, group.limit));
    }
    const finalResults = results.slice(0, MAX_SOURCES).map(({ score, ...source }) => source);
    return res.status(200).json({ results: finalResults, total: finalResults.length });
  } catch (error) {
    console.error('Web search API error:', error);
    return res.status(502).json({ error: 'Could not reach the web research service. Please try again.' });
  }
}
