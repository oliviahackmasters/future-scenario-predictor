// source-catalog.js
// Curated list of known-good sources with their RSS feed URLs.
// Sources in this catalog can be added by users via name lookup.
// NOTE: No sources are permanently blocked here — blocking decisions
// belong to the user, not the system. isBlockedOrBrokenSource() in
// scenario-assessment.js should only block sources with NO valid feed URL.

export const SOURCE_CATALOG = [
  // ── Global / Western ──────────────────────────────────────────────────────
  {
    name: "BBC World",
    aliases: ["bbc world", "bbc news world", "bbc"],
    homepage: "https://www.bbc.com/news/world",
    feedUrl: "http://feeds.bbci.co.uk/news/world/rss.xml",
    topics: ["general", "geopolitics", "defence", "health"]
  },
  {
    name: "BBC Middle East",
    aliases: ["bbc middle east", "bbc mideast"],
    homepage: "https://www.bbc.com/news/world/middle_east",
    feedUrl: "http://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    topics: ["iran", "geopolitics"]
  },
  {
    name: "Reuters World",
    aliases: ["reuters", "reuters world", "reuters news"],
    homepage: "https://www.reuters.com/world/",
    feedUrl: "https://feeds.reuters.com/reuters/worldNews",
    // Reuters RSS can be unreliable from server-side — use NewsAPI as fallback
    fallbackNewsApiSource: "reuters.com",
    topics: ["general", "geopolitics", "defence", "health", "energy"]
  },
  {
    name: "Reuters Business",
    aliases: ["reuters business", "reuters finance"],
    homepage: "https://www.reuters.com/business/",
    feedUrl: "https://feeds.reuters.com/reuters/businessNews",
    fallbackNewsApiSource: "reuters.com",
    topics: ["energy", "general"]
  },
  {
    name: "CNN World",
    aliases: ["cnn", "cnn world", "cnn news"],
    homepage: "https://edition.cnn.com/world",
    feedUrl: "http://rss.cnn.com/rss/edition_world.rss",
    fallbackNewsApiSource: "cnn.com",
    topics: ["general", "geopolitics", "defence", "health"]
  },
  {
    name: "CNN Middle East",
    aliases: ["cnn middle east", "cnn mideast"],
    homepage: "https://edition.cnn.com/middle-east",
    feedUrl: "http://rss.cnn.com/rss/cnn_mideast.rss",
    fallbackNewsApiSource: "cnn.com",
    topics: ["iran", "geopolitics"]
  },
  {
    name: "AP News",
    aliases: ["ap", "ap news", "associated press"],
    homepage: "https://apnews.com/",
    feedUrl: "https://rsshub.app/apnews/topics/apf-topnews",
    fallbackNewsApiSource: "apnews.com",
    topics: ["general", "geopolitics", "health", "defence"]
  },
  {
    name: "The Guardian World",
    aliases: ["guardian world", "the guardian world", "guardian"],
    homepage: "https://www.theguardian.com/world",
    feedUrl: "https://www.theguardian.com/world/rss",
    topics: ["general", "geopolitics", "health", "defence"]
  },
  {
    name: "Financial Times News Feed",
    aliases: ["ft news feed", "financial times news feed"],
    homepage: "https://www.ft.com/news-feed",
    feedUrl: "https://www.ft.com/news-feed?format=rss",
    topics: ["general", "energy"]
  },
  {
    name: "Financial Times Energy",
    aliases: ["ft energy", "financial times energy", "energy feed"],
    homepage: "https://www.ft.com/energy",
    feedUrl: "https://www.ft.com/energy?format=rss",
    topics: ["energy", "iran", "geopolitics"]
  },
  {
    name: "Financial Times Oil",
    aliases: ["ft oil", "financial times oil"],
    homepage: "https://www.ft.com/oil",
    feedUrl: "https://www.ft.com/oil?format=rss",
    topics: ["energy", "iran"]
  },
  {
    name: "Financial Times Iran",
    aliases: ["ft iran", "financial times iran"],
    homepage: "https://www.ft.com/iran",
    feedUrl: "https://www.ft.com/iran?format=rss",
    topics: ["iran"]
  },
  {
    name: "Al Jazeera",
    aliases: ["al jazeera", "aljazeera"],
    homepage: "https://www.aljazeera.com/",
    feedUrl: "https://www.aljazeera.com/xml/rss/all.xml",
    topics: ["iran", "geopolitics", "general"]
  },
  {
    name: "Deutsche Welle",
    aliases: ["dw", "deutsche welle", "dw world"],
    homepage: "https://www.dw.com/en/top-stories/s-9097",
    feedUrl: "https://rss.dw.com/rdf/rss-en-all",
    topics: ["general", "geopolitics"]
  },
  {
    name: "France 24 English",
    aliases: ["france 24", "france24"],
    homepage: "https://www.france24.com/en/",
    feedUrl: "https://www.france24.com/en/rss",
    topics: ["general", "geopolitics"]
  },

  // ── Regional / Middle East ─────────────────────────────────────────────────
  {
    name: "Tehran Times",
    aliases: ["tehran times", "tehran times rss"],
    homepage: "https://www.tehrantimes.com/",
    feedUrl: "https://www.tehrantimes.com/rss",
    topics: ["iran"]
  },
  {
    name: "Tehran Times Politics",
    aliases: ["tehran times politics", "iran politics"],
    homepage: "https://www.tehrantimes.com/",
    feedUrl: "https://www.tehrantimes.com/rss/tp/698",
    topics: ["iran"]
  },
  {
    name: "Mehr News English",
    aliases: ["mehr news", "mehr english", "mehr rss"],
    homepage: "https://en.mehrnews.com/",
    feedUrl: "https://en.mehrnews.com/rss",
    // Known to be unreliable — will attempt but expect failures
    topics: ["iran"]
  },
  {
    name: "Middle East Eye",
    aliases: ["middle east eye", "mee"],
    homepage: "https://www.middleeasteye.net/",
    feedUrl: "https://www.middleeasteye.net/rss",
    topics: ["iran", "geopolitics"]
  },
  {
    name: "Arab News",
    aliases: ["arab news"],
    homepage: "https://www.arabnews.com/",
    feedUrl: "https://www.arabnews.com/rss.xml",
    topics: ["iran", "geopolitics"]
  },

  // ── Defence / Security ─────────────────────────────────────────────────────
  {
    name: "Defense News",
    aliases: ["defense news", "defence news"],
    homepage: "https://www.defensenews.com/",
    feedUrl: "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml",
    topics: ["defence"]
  },
  {
    name: "Jane's Defence",
    aliases: ["janes", "jane's defence", "janes defence"],
    homepage: "https://www.janes.com/",
    feedUrl: "https://www.janes.com/feeds/news",
    topics: ["defence"]
  },
  {
    name: "War on the Rocks",
    aliases: ["war on the rocks", "wotr"],
    homepage: "https://warontherocks.com/",
    feedUrl: "https://warontherocks.com/feed/",
    topics: ["defence", "geopolitics"]
  },
  {
    name: "Breaking Defense",
    aliases: ["breaking defense", "breaking defence"],
    homepage: "https://breakingdefense.com/",
    feedUrl: "https://breakingdefense.com/feed/",
    topics: ["defence"]
  },

  // ── Health ─────────────────────────────────────────────────────────────────
  {
    name: "WHO News",
    aliases: ["who", "world health organization", "who news"],
    homepage: "https://www.who.int/news",
    feedUrl: "https://www.who.int/rss-feeds/news-english.xml",
    topics: ["health"]
  },
  {
    name: "STAT News",
    aliases: ["stat news", "statnews"],
    homepage: "https://www.statnews.com/",
    feedUrl: "https://www.statnews.com/feed/",
    topics: ["health"]
  },
  {
    name: "Health Affairs",
    aliases: ["health affairs"],
    homepage: "https://www.healthaffairs.org/",
    feedUrl: "https://www.healthaffairs.org/action/showFeed?type=etoc&feed=rss&jc=hlthaff",
    topics: ["health"]
  },

  // ── Energy ─────────────────────────────────────────────────────────────────
  {
    name: "Oilprice.com",
    aliases: ["oilprice", "oil price news"],
    homepage: "https://oilprice.com/",
    feedUrl: "https://oilprice.com/rss/main",
    topics: ["energy"]
  },
  {
    name: "S&P Global Commodity Insights",
    aliases: ["platts", "s&p global energy", "sp global energy"],
    homepage: "https://www.spglobal.com/commodityinsights/en/market-insights/latest-news/oil",
    feedUrl: "https://www.spglobal.com/commodityinsights/en/rss-feed/oil",
    topics: ["energy"]
  },

  // ── Google News ────────────────────────────────────────────────────────────
  {
    name: "Google News – Iran",
    aliases: ["google news iran", "iran google news"],
    homepage: "https://news.google.com/search?q=iran",
    feedUrl: "https://news.google.com/rss/search?q=iran&hl=en-US&gl=US&ceid=US:en",
    topics: ["iran"]
  },
  {
    name: "Google News – Iran War",
    aliases: ["google news iran war", "iran war google news"],
    homepage: "https://news.google.com/search?q=iran+war",
    feedUrl: "https://news.google.com/rss/search?q=iran+war&hl=en-GB&gl=GB&ceid=GB:en",
    topics: ["iran"]
  }
];

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function findCatalogSourceByName(name) {
  const target = normalize(name);
  if (!target) return null;

  for (const item of SOURCE_CATALOG) {
    if (normalize(item.name) === target) return item;
    if ((item.aliases || []).some((alias) => normalize(alias) === target)) return item;
  }

  return null;
}

/**
 * Returns catalog sources relevant to a given topic slug.
 * topic: "iran" | "defence" | "health" | "energy" | "geopolitics" | "general"
 */
export function getCatalogSourcesForTopic(topic) {
  const t = normalize(topic || "general");
  return SOURCE_CATALOG.filter(
    (item) =>
      !item.topics ||
      item.topics.includes(t) ||
      item.topics.includes("general")
  );
}
