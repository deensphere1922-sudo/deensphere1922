// api/news.js — Vercel Serverless Function (Node 18+, zero deps, ESM)

const FEEDS = [
  // Changed About Islam URL to specifically pull ARTICLES only
  { url: 'https://aboutislam.net/category/muslim-news/feed/', source: 'About Islam', cat: 'Community' },
  { url: 'https://ilmfeed.com/feed/',                         source: 'IlmFeed',     cat: 'Community' },
  { url: 'https://www.muslimnews.co.uk/feed/',                source: 'Muslim News', cat: 'Community' },
  { url: 'https://islamchannel.tv/feed/',                     source: 'Islam Channel', cat: 'World' }
];

// 1. HARD BLOCK: If any of these words appear, the article is instantly deleted.
const BLOCK = [
  'anti islam', 'anti-islam', 'ex muslim', 'ex-muslim', 'exmuslim',
  'leaving islam', 'left islam', 'hate islam', 'islamophobia',
  'porn', 'nsfw', 'xxx', 'casino', 'betting', 'alcohol', 'bollywood',
  'football', 'soccer', 'cricket', 'nba', 'nfl', 'arsenal', 'chelsea',
  'manchester', 'trump', 'election', 'democrat', 'republican',
  'anti-muslim', 'anti muslim', 'hate crime', 'discrimination', 
  'sentiment', 'nationalism', 'zionism', 'zionist', 'green party', 
  'israel', 'israeli', 'parliament', 'political', 'war', 'gaza', 
  'conflict', 'attack', 'killed', 'death', 'banned', 'protest'
];

// 2. STRICT ALLOW: The article MUST contain at least one of these words to be shown.
const ALLOW = [
  'islam', 'islamic', 'muslim', 'muslims', 'quran', 'qur’an', "qur'an", 
  'hadith', 'sunnah', 'prophet', 'muhammad', 'allah', 'masjid', 'mosque',
  'halal', 'haram', 'ramadan', 'ramadhan', 'eid', 'hajj', 'umrah', 
  'zakat', 'sadaqah', 'shariah', 'sharia', 'fatwa', 'sheikh', 'imam',
  'hijab', 'niqab', 'jummah', 'jumuah', 'salah', 'prayer', 'dua',
  'ummah', 'madrasa', 'madrassa', 'qibla', 'kaaba', 'makkah', 'medina',
  'mufti menk', 'zakir naik', 'yaqeen', 'converts', 'reverts', 'dawah',
  'madinah', 'mecca', 'haram', 'pilgrims', 'bangladesh', 'india',
  'charity', 'community', 'festival', 'celebration', 'event'
];

function isIslamic(text) {
  if (!text) return false;
  const t = text.toLowerCase();

  // 1. If it has ANY bad word, reject immediately
  for (const b of BLOCK) {
    if (t.includes(b)) return false;
  }

  // 2. It MUST have at least one strictly Islamic word
  let hasIslamicWord = false;
  for (const a of ALLOW) {
    const regex = new RegExp(`\\b${a}\\b`, 'i');
    if (regex.test(t)) { hasIslamicWord = true; break; }
  }

  if (!hasIslamicWord) return false;

  return true;
}

// ---------- tiny XML helpers (no deps) ----------
function decodeEntities(s) {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#8217;/g, '’')
    .replace(/&#8211;/g, '–').replace(/&nbsp;/g, ' ');
}
function stripTags(s) {
  return decodeEntities((s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function firstTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : '';
}
function attrTag(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["'][^>]*>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : '';
}

function parseRss(xml, fallbackSource, fallbackCat) {
  const items = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const raw of blocks) {
    const chunk = raw.split(/<\/item>/i)[0];
    const title = stripTags(firstTag(chunk, 'title'));
    let link = stripTags(firstTag(chunk, 'link'));
    if (!link) link = attrTag(chunk, 'link', 'href');
    const pub = stripTags(firstTag(chunk, 'pubDate')) || stripTags(firstTag(chunk, 'published'));
    
    const rawDesc = firstTag(chunk, 'description') || firstTag(chunk, 'content:encoded');
    const desc = stripTags(rawDesc);

    let image = 
      attrTag(chunk, 'media:content', 'url') || 
      attrTag(chunk, 'media:thumbnail', 'url') || 
      attrTag(chunk, 'enclosure', 'url') || 
      null;

    if (!image && rawDesc) {
      const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) image = imgMatch[1];
    }

    if (!title || !link) continue;

    // FORCE ARTICLES ONLY: Block homepages, videos, categories, and channel links
    if (link.endsWith('.com/') || link.endsWith('.net/') || link.endsWith('.tv/') ||
        link.includes('/videos/') || link.includes('/video/') ||
        link.includes('/category/') || link.includes('/tag/') ||
        link.includes('/author/') || link.includes('/channel/') ||
        link.includes('/multimedia/')) {
      continue; 
    }

    // STRICT FILTER
    if (!isIslamic(title + ' ' + desc)) continue;

    let cat = fallbackCat;
    const t = (title + ' ' + desc).toLowerCase();
    
    // Smart Hajj Filter
    if (/\bhajj|umrah|arafat|pilgrimage|makkah|mecca|madinah|medina|kaaba|ihram|tawaf\b/.test(t)) {
      cat = 'Hajj';
    } 
    // Smart Ramadan Filter
    else if (/\bramadan|eid|fasting|fast|iftar|suhoor|sehri|moon sighting|holy month|ramadhan|laylatul qadr\b/.test(t)) {
      cat = 'Ramadan';
    } 
    // Community Filter
    else if (/\bcommunity|mosque|masjid|charity|school|youth|family\b/.test(t)) {
      cat = 'Community';
    }

    items.push({
      title,
      link,
      source: fallbackSource,
      cat,
      date: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      image: image,
      desc: desc.slice(0, 150) + (desc.length > 150 ? '...' : ''),
    });
  }
  return items;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const results = await Promise.allSettled(
      FEEDS.map(async (f) => {
        const r = await fetch(f.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        if (!r.ok) throw new Error(`${f.source} ${r.status}`);
        const xml = await r.text();
        return parseRss(xml, f.source, f.cat);
      })
    );

    let items = [];
    for (const r of results) if (r.status === 'fulfilled') items = items.concat(r.value);

    const seen = new Set();
    items = items
      .filter((it) => { if (seen.has(it.link)) return false; seen.add(it.link); return true; })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 30);

    return res.status(200).json({ items, fetchedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'News fetch failed', items: [] });
  }
}