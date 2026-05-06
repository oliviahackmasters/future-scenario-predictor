import customScenarioHandler from "./custom-scenario-assessment.js";

function getBaseUrl(req) {
  const configured = process.env.PUBLIC_BASE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "";
  if (configured) return configured.startsWith("http") ? configured.replace(/\/$/, "") : `https://${configured.replace(/\/$/, "")}`;

  const host = req.headers?.host || "";
  const proto = req.headers?.["x-forwarded-proto"] || "https";
  return host ? `${proto}://${host}` : "";
}

function compactScenarioQuery(scenarios = []) {
  return Array.from(new Set(
    scenarios.flatMap((scenario) => [
      scenario?.name,
      scenario?.description,
      ...(Array.isArray(scenario?.signals) ? scenario.signals : [])
    ])
      .map((value) => String(value || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
  )).slice(0, 12).join(" OR ");
}

function hostnameFromUrl(raw = "") {
  try {
    const parsed = new URL(String(raw).startsWith("http") ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isTavilyOnlySource(source = {}) {
  const type = String(source.type || "").trim().toLowerCase();
  return ["web", "site", "domain", "tavily"].includes(type);
}

function tavilyBridgeSource({ baseUrl, domain, query, name, reliability = 70 }) {
  const topic = "custom";
  const params = new URLSearchParams({ topic, domain, q: query });
  return {
    id: `tavily-${domain}-${Math.abs(query.length)}`,
    name: name || `${domain} Web Search`,
    url: `${baseUrl}/api/tavily-rss?${params.toString()}`,
    reliability,
    enabled: true,
    type: "rss"
  };
}

function addTavilySourcesToBody(req) {
  if (!process.env.TAVILY_API_KEY || !req.body || typeof req.body !== "object") return;

  const baseUrl = getBaseUrl(req);
  if (!baseUrl) return;

  const scenarios = Array.isArray(req.body.scenarios) ? req.body.scenarios : [];
  const query = compactScenarioQuery(scenarios) || "future scenario signals";
  const suppliedSources = Array.isArray(req.body.sources) ? req.body.sources : [];

  const rssSources = suppliedSources.filter((source) => !isTavilyOnlySource(source));
  const customTavilySources = suppliedSources
    .filter(isTavilyOnlySource)
    .map((source) => {
      const domain = hostnameFromUrl(source?.url || source?.homepage || source?.domain || "");
      if (!domain || domain.includes("news.google.com")) return null;
      return tavilyBridgeSource({
        baseUrl,
        domain,
        query,
        name: source?.name ? `${source.name} Web Search` : undefined,
        reliability: Number(source?.reliability ?? source?.reliability_percent ?? 70)
      });
    })
    .filter(Boolean);

  const defaultDomains = [
    "reuters.com",
    "reddit.com",
    "substack.com"
  ];

  const defaultTavilySources = defaultDomains.map((domain) => tavilyBridgeSource({ baseUrl, domain, query }));
  const dedupedTavilySources = Array.from(new Map(
    [...defaultTavilySources, ...customTavilySources].map((source) => [source.url, source])
  ).values());

  req.body.sources = [
    ...rssSources,
    ...dedupedTavilySources
  ];
}

export default async function handler(req, res) {
  addTavilySourcesToBody(req);
  return customScenarioHandler(req, res);
}
