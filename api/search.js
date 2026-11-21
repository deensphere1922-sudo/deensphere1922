// // // export default async function handler(req, res) {
// // //   if (req.method !== 'POST') {
// // //     return res.status(405).json({ error: 'Method not allowed' });
// // //   }

// // //   const { messages, systemPrompt, webContext } = req.body || {};
// // //   if (!Array.isArray(messages)) {
// // //     return res.status(400).json({ error: 'Missing messages' });
// // //   }

// // //   const GROQ_KEY = process.env.GROQ_API_KEY;
// // //   if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

// // //   try {
// // //     const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //         'Authorization': 'Bearer ' + GROQ_KEY
// // //       },
// // //       body: JSON.stringify({
// // //         model: 'openai/gpt-oss-120b',
// // //         temperature: 0.1,
// // //         max_tokens: 1000,
// // //         messages: [
// // //           { role: 'system', content: systemPrompt || '' },
// // //           { role: 'system', content: 'Web Research Results:\n' + (webContext || 'none') },
// // //           ...messages
// // //         ]
// // //       })
// // //     });
// // //     const data = await groqResp.json();
// // //     return res.status(200).json(data);
// // //   } catch (e) {
// // //     return res.status(500).json({ error: e.message });
// // //   }
// // // }

// // const ISLAMIC_SOURCE_DOMAINS = [
// //   'quran.com',
// //   'sunnah.com',
// //   'quran.ksu.edu.sa',
// //   'altafsir.com',
// //   'islamqa.info',
// //   'islamweb.net',
// //   'seekersguidance.org',
// //   'yaqeeninstitute.org',
// //   'dar-alifta.org',
// //   'aboutislam.net'
// // ];

// // const isIslamicSourceUrl = value => {
// //   try {
// //     const hostname = new URL(value).hostname.toLowerCase();
// //     return ISLAMIC_SOURCE_DOMAINS.some(domain =>
// //       hostname === domain || hostname.endsWith('.' + domain)
// //     );
// //   } catch {
// //     return false;
// //   }
// // };

// // export default async function handler(req, res) {
// //   if (req.method !== 'POST') {
// //     return res.status(405).json({ error: 'Method not allowed' });
// //   }

// //   const { query } = req.body || {};
// //   const mode = (req.body && req.body.mode) || 'web';
// //   if (typeof query !== 'string' || !query.trim()) {
// //     return res.status(400).json({ error: 'A search query is required' });
// //   }
// //   if (mode !== 'web' && mode !== 'deep') {
// //     return res.status(400).json({ error: 'Search mode must be web or deep' });
// //   }

// //   const tavilyKey = process.env.TAVILY_API_KEY;
// //   if (!tavilyKey) {
// //     return res.status(503).json({ error: 'TAVILY_API_KEY is required for live Islamic web search' });
// //   }

// //   try {
// //     const searchResponse = await fetch('https://api.tavily.com/search', {
// //       method: 'POST',
// //       headers: { 'Content-Type': 'application/json' },
// //       body: JSON.stringify({
// //         api_key: tavilyKey,
// //         query: query.trim().slice(0, 1000),
// //         search_depth: mode === 'deep' ? 'advanced' : 'basic',
// //         topic: 'general',
// //         max_results: mode === 'deep' ? 12 : 6,
// //         include_answer: false,
// //         include_raw_content: mode === 'deep',
// //         include_domains: ISLAMIC_SOURCE_DOMAINS
// //       })
// //     });
// //     const data = await searchResponse.json();
// //     if (!searchResponse.ok) {
// //       const message = typeof data.detail === 'string' ? data.detail
// //         : typeof data.message === 'string' ? data.message
// //           : 'The live search provider returned an error';
// //       return res.status(502).json({ error: message });
// //     }

// //     const results = Array.isArray(data.results) ? data.results.map(result => ({
// //       title: typeof result.title === 'string' ? result.title : '',
// //       url: typeof result.url === 'string' ? result.url : '',
// //       content: String(result.raw_content || result.content || '').slice(0, mode === 'deep' ? 3500 : 2200)
// //     })).filter(result => isIslamicSourceUrl(result.url) && result.content) : [];

// //     return res.status(200).json({ query: query.trim(), mode, results });
// //   } catch (error) {
// //     console.error('Islamic web search failed:', error);
// //     return res.status(500).json({ error: 'Live Islamic web search failed. Please try again.' });
// //   }
// // }

// const ISLAMIC_SOURCE_DOMAINS = [
//   'quran.com',
//   'sunnah.com',
//   'quran.ksu.edu.sa',
//   'altafsir.com',
//   'islamqa.info',
//   'islamweb.net',
//   'seekersguidance.org',
//   'yaqeeninstitute.org',
//   'dar-alifta.org',
//   'aboutislam.net'
// ];

// const isIslamicSourceUrl = value => {
//   try {
//     const hostname = new URL(value).hostname.toLowerCase();
//     return ISLAMIC_SOURCE_DOMAINS.some(domain =>
//       hostname === domain || hostname.endsWith('.' + domain)
//     );
//   } catch {
//     return false;
//   }
// };

// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   const { query } = req.body || {};
//   const mode = (req.body && req.body.mode) || 'web';
//   if (typeof query !== 'string' || !query.trim()) {
//     return res.status(400).json({ error: 'A search query is required' });
//   }
//   if (mode !== 'web' && mode !== 'deep') {
//     return res.status(400).json({ error: 'Search mode must be web or deep' });
//   }

//   const tavilyKey = process.env.TAVILY_API_KEY;
//   if (!tavilyKey) {
//     return res.status(503).json({ error: 'TAVILY_API_KEY is required for live Islamic web search' });
//   }

//   try {
//     const searchResponse = await fetch('https://api.tavily.com/search', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         api_key: tavilyKey,
//         query: query.trim().slice(0, 1000),
//         search_depth: mode === 'deep' ? 'advanced' : 'basic',
//         topic: 'general',
//         max_results: mode === 'deep' ? 12 : 6,
//         include_answer: false,
//         include_raw_content: mode === 'deep',
//         include_domains: ISLAMIC_SOURCE_DOMAINS
//       })
//     });
//     const data = await searchResponse.json();
//     if (!searchResponse.ok) {
//       const message = typeof data.detail === 'string' ? data.detail
//         : typeof data.message === 'string' ? data.message
//           : 'The live search provider returned an error';
//       const retryAfter = searchResponse.headers.get('retry-after');
//       if (retryAfter) res.setHeader('Retry-After', retryAfter);
//       return res.status(searchResponse.status === 429 ? 429 : 502).json({
//         error: message,
//         retryAfter: retryAfter || null
//       });
//     }

//     const results = Array.isArray(data.results) ? data.results.map(result => ({
//       title: typeof result.title === 'string' ? result.title : '',
//       url: typeof result.url === 'string' ? result.url : '',
//       content: String(result.raw_content || result.content || '').slice(0, mode === 'deep' ? 3500 : 2200)
//     })).filter(result => isIslamicSourceUrl(result.url) && result.content) : [];

//     return res.status(200).json({ query: query.trim(), mode, results });
//   } catch (error) {
//     console.error('Islamic web search failed:', error);
//     return res.status(500).json({ error: 'Live Islamic web search failed. Please try again.' });
//   }
// }

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

const isIslamicSourceUrl = value => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return ISLAMIC_SOURCE_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body || {};
  const mode = (req.body && req.body.mode) || 'web';
  if (typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'A search query is required' });
  }
  if (mode !== 'web' && mode !== 'deep') {
    return res.status(400).json({ error: 'Search mode must be web or deep' });
  }

  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) {
    return res.status(503).json({ error: 'TAVILY_API_KEY is required for live Islamic web search' });
  }

  try {
    const searchResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: query.trim().slice(0, 1000),
        search_depth: mode === 'deep' ? 'advanced' : 'basic',
        topic: 'general',
        max_results: mode === 'deep' ? 12 : 6,
        include_answer: false,
        include_raw_content: mode === 'deep',
        include_domains: ISLAMIC_SOURCE_DOMAINS
      })
    });
    const data = await searchResponse.json();
    if (!searchResponse.ok) {
      const message = typeof data.detail === 'string' ? data.detail
        : typeof data.message === 'string' ? data.message
          : 'The live search provider returned an error';
      const retryAfter = searchResponse.headers.get('retry-after');
      if (retryAfter) res.setHeader('Retry-After', retryAfter);
      return res.status(searchResponse.status === 429 ? 429 : 502).json({
        error: message,
        retryAfter: retryAfter || null
      });
    }

    const results = Array.isArray(data.results) ? data.results.map(result => ({
      title: typeof result.title === 'string' ? result.title : '',
      url: typeof result.url === 'string' ? result.url : '',
      content: String(result.raw_content || result.content || '').slice(0, mode === 'deep' ? 3500 : 2200)
    })).filter(result => isIslamicSourceUrl(result.url) && result.content) : [];

    return res.status(200).json({ query: query.trim(), mode, results });
  } catch (error) {
    console.error('Islamic web search failed:', error);
    return res.status(500).json({ error: 'Live Islamic web search failed. Please try again.' });
  }
}


