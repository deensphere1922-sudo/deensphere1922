
// api/news.js — Vercel Serverless Function
// Node.js 18+, zero external dependencies, ESM

const FEEDS = [
  {
    url: "https://aboutislam.net/category/muslim-news/feed/",
    source: "About Islam",
    cat: "Community",
  },
  {
    url: "https://ilmfeed.com/feed/",
    source: "IlmFeed",
    cat: "Community",
  },
  {
    url: "https://www.muslimnews.co.uk/feed/",
    source: "Muslim News",
    cat: "Community",
  },
  {
    url: "https://islamchannel.tv/feed/",
    source: "Islam Channel",
    cat: "World",
  },
];

// 1. HARD BLOCK: Reject articles containing these terms.
const BLOCK = [
  "anti islam",
  "anti-islam",
  "ex muslim",
  "ex-muslim",
  "exmuslim",
  "leaving islam",
  "left islam",
  "hate islam",
  "islamophobia",
  "porn",
  "nsfw",
  "xxx",
  "casino",
  "betting",
  "alcohol",
  "bollywood",
  "football",
  "soccer",
  "cricket",
  "nba",
  "nfl",
  "arsenal",
  "chelsea",
  "manchester",
  "trump",
  "election",
  "democrat",
  "republican",
  "anti-muslim",
  "anti muslim",
  "hate crime",
  "discrimination",
  "sentiment",
  "nationalism",
  "zionism",
  "zionist",
  "green party",
  "israel",
  "israeli",
  "parliament",
  "political",
  "war",
  "gaza",
  "conflict",
  "attack",
  "killed",
  "death",
  "banned",
  "protest",
];

// 2. STRICT ALLOW: Article must contain at least one term.
const ALLOW = [
  "islam",
  "islamic",
  "muslim",
  "muslims",
  "quran",
  "qur’an",
  "qur'an",
  "hadith",
  "sunnah",
  "prophet",
  "muhammad",
  "allah",
  "masjid",
  "mosque",
  "halal",
  "haram",
  "ramadan",
  "ramadhan",
  "eid",
  "hajj",
  "umrah",
  "zakat",
  "sadaqah",
  "shariah",
  "sharia",
  "fatwa",
  "sheikh",
  "imam",
  "hijab",
  "niqab",
  "jummah",
  "jumuah",
  "salah",
  "prayer",
  "dua",
  "ummah",
  "madrasa",
  "madrassa",
  "qibla",
  "kaaba",
  "makkah",
  "medina",
  "mufti menk",
  "zakir naik",
  "yaqeen",
  "converts",
  "reverts",
  "dawah",
  "madinah",
  "mecca",
  "pilgrims",
  "bangladesh",
  "india",
  "charity",
  "community",
  "festival",
  "celebration",
  "event",
];

// ---------- Keyword filtering ----------

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(text, term) {
  const escaped = escapeRegex(term).replace(/\s+/g, "\\s+");

  const regex = new RegExp(
    `(^|[^a-z0-9])${escaped}($|[^a-z0-9])`,
    "i"
  );

  return regex.test(text);
}

function isIslamic(text) {
  if (!text) return false;

  const value = String(text).toLowerCase();

  // Reject blocked terms first.
  if (BLOCK.some((word) => containsTerm(value, word))) {
    return false;
  }

  // Require at least one allowed term.
  return ALLOW.some((word) => containsTerm(value, word));
}

// ---------- XML helpers ----------

function decodeEntities(value) {
  if (!value) return "";

  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8211;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCodePoint(Number(code));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      try {
        return String.fromCodePoint(parseInt(code, 16));
      } catch {
        return "";
      }
    })
    .replace(/&amp;/g, "&");
}

function stripTags(value) {
  return decodeEntities(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(xml, tag) {
  const safeTag = escapeRegex(tag);

  const regex = new RegExp(
    `<${safeTag}\\b[^>]*>([\\s\\S]*?)<\\/${safeTag}\\s*>`,
    "i"
  );

  const match = xml.match(regex);

  return match ? match[1].trim() : "";
}

function attrTag(xml, tag, attribute) {
  const safeTag = escapeRegex(tag);
  const safeAttribute = escapeRegex(attribute);

  const tagRegex = new RegExp(
    `<${safeTag}\\b([^>]*)>`,
    "i"
  );

  const tagMatch = xml.match(tagRegex);

  if (!tagMatch) return "";

  const attributeRegex = new RegExp(
    `(?:^|\\s)${safeAttribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    "i"
  );

  const attributeMatch = tagMatch[1].match(attributeRegex);

  return attributeMatch
    ? decodeEntities(attributeMatch[1] ?? attributeMatch[2] ?? "")
    : "";
}

// ---------- RSS and Atom link handling ----------

function getArticleLink(block) {
  // First, try Atom links.
  const linkTags = [
    ...block.matchAll(/<link\b([^>]*)\/?>/gi),
  ];

  for (const match of linkTags) {
    const attributes = match[1];

    const hrefMatch = attributes.match(
      /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i
    );

    if (!hrefMatch) continue;

    const relMatch = attributes.match(
      /\brel\s*=\s*(?:"([^"]*)"|'([^']*)')/i
    );

    const relation = relMatch
      ? relMatch[1] || relMatch[2]
      : "alternate";

    if (relation === "alternate") {
      return decodeEntities(
        hrefMatch[1] ?? hrefMatch[2] ?? ""
      ).trim();
    }
  }

  // Otherwise, use the RSS link text.
  return stripTags(firstTag(block, "link"));
}

// ---------- Image handling ----------

function getImage(block, rawDescription) {
  const image =
    attrTag(block, "media:content", "url") ||
    attrTag(block, "media:thumbnail", "url") ||
    attrTag(block, "enclosure", "url");

  if (image) return image;

  const description = rawDescription || "";

  const imageMatch = description.match(
    /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i
  );

  if (imageMatch) {
    return decodeEntities(imageMatch[1]);
  }

  return null;
}

// ---------- Article URL validation ----------

function isArticleLink(link) {
  try {
    const url = new URL(link);

    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }

    const path = url.pathname.toLowerCase();

    // Reject homepage links.
    if (!path || path === "/") {
      return false;
    }

    const blockedPaths = [
      "/videos/",
      "/video/",
      "/category/",
      "/tag/",
      "/author/",
      "/channel/",
      "/multimedia/",
    ];

    if (
      blockedPaths.some((blockedPath) =>
        path.includes(blockedPath)
      )
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ---------- Category detection ----------

function getCategory(text, fallbackCat) {
  const value = text.toLowerCase();

  if (
    /\b(hajj|umrah|arafat|pilgrimage|makkah|mecca|madinah|madina|medina|kaaba|ihram|tawaf)\b/.test(value)
  ) {
    return "Hajj";
  }

  if (
    /\b(ramadan|ramadhan|eid|fasting|iftar|suhoor|sehri|moon sighting|holy month|laylatul qadr)\b/.test(value)
  ) {
    return "Ramadan";
  }

  if (
    /\b(community|mosque|masjid|charity|school|youth|family)\b/.test(value)
  ) {
    return "Community";
  }

  return fallbackCat;
}

// ---------- RSS and Atom parsing ----------

function parseRss(xml, fallbackSource, fallbackCat) {
  const items = [];

  // Supports RSS <item> and Atom <entry>.
  const rssBlocks =
    xml.match(/<item\b[^>]*>[\s\S]*?<\/item\s*>/gi) || [];

  const atomBlocks =
    xml.match(/<entry\b[^>]*>[\s\S]*?<\/entry\s*>/gi) || [];

  const blocks = [...rssBlocks, ...atomBlocks];

  for (const block of blocks) {
    try {
      const title = stripTags(
        firstTag(block, "title")
      );

      const link = getArticleLink(block);

      const rawDescription =
        firstTag(block, "content:encoded") ||
        firstTag(block, "description") ||
        firstTag(block, "summary") ||
        firstTag(block, "content");

      const desc = stripTags(rawDescription);

      const pub =
        stripTags(firstTag(block, "pubDate")) ||
        stripTags(firstTag(block, "published")) ||
        stripTags(firstTag(block, "updated"));

      if (!title || !link) continue;

      // Reject invalid, homepage and category URLs.
      if (!isArticleLink(link)) continue;

      // Apply strict Islamic keyword filtering.
      if (!isIslamic(`${title} ${desc}`)) continue;

      // Validate publication date.
      const parsedDate = pub ? new Date(pub) : null;

      const validDate =
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toISOString()
          : null;

      const image = getImage(block, rawDescription);

      const category = getCategory(
        `${title} ${desc}`,
        fallbackCat
      );

      items.push({
        id: link,
        title,
        link,
        source: fallbackSource,
        cat: category,
        date: validDate,
        image,
        desc:
          desc.length > 150
            ? `${desc.slice(0, 150)}...`
            : desc,
      });
    } catch (error) {
      console.error(
        `Article parsing error (${fallbackSource}):`,
        error.message
      );
    }
  }

  return items;
}

// ---------- Main Vercel handler ----------

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
      items: [],
    });
  }

  // Cache for approximately one minute.
  res.setHeader(
    "Cache-Control",
    "s-maxage=60, stale-while-revalidate=120"
  );

  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const controller = new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        10000
      );

      try {
        const response = await fetch(feed.url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; DeenSphere/1.0)",
            Accept:
              "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
          },
        });

        if (!response.ok) {
          throw new Error(
            `${feed.source} returned HTTP ${response.status}`
          );
        }

        const xml = await response.text();

        if (!xml || !xml.trim()) {
          throw new Error(
            `${feed.source} returned an empty feed`
          );
        }

        return {
          source: feed.source,
          items: parseRss(
            xml,
            feed.source,
            feed.cat
          ),
        };
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  const allItems = [];
  const errors = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      allItems.push(...result.value.items);
    } else {
      errors.push({
        source: FEEDS[index].source,
        error:
          result.reason?.message || "Feed fetch failed",
      });

      console.error(
        `News feed error (${FEEDS[index].source}):`,
        result.reason
      );
    }
  });

  // Remove duplicate article URLs.
  const seen = new Set();

  const uniqueItems = allItems.filter((item) => {
    try {
      const normalizedLink = new URL(item.link).href
        .replace(/\/+$/, "")
        .toLowerCase();

      if (seen.has(normalizedLink)) {
        return false;
      }

      seen.add(normalizedLink);
      return true;
    } catch {
      return false;
    }
  });

  // Sort by publication date, newest first.
  uniqueItems.sort((a, b) => {
    const dateA = a.date
      ? new Date(a.date).getTime()
      : 0;

    const dateB = b.date
      ? new Date(b.date).getTime()
      : 0;

    return dateB - dateA;
  });

  // Return a maximum of 30 articles.
  const items = uniqueItems.slice(0, 30);

  return res.status(200).json({
    items,
    fetchedAt: new Date().toISOString(),
    errors,
  });
}
