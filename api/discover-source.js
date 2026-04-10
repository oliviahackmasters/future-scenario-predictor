import { findCatalogSourceByName } from "../lib/source-catalog.js";
import {
  discoverFeedFromWebsite,
  validateKnownFeed
} from "../lib/feed-discovery.js";

function getAllowedOrigin(req) {
  const requestOrigin = req.headers.origin || "";
  const configured = String(process.env.ALLOWED_ORIGIN || "").trim();

  if (!configured) return "*";
  if (configured === "*") return "*";
  if (requestOrigin && requestOrigin === configured) return configured;

  return configured;
}

function setCors(req, res) {
  const origin = getAllowedOrigin(req);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(req, res, status, body) {
  setCors(req, res);
  res.status(status).setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(body));
}

function parseBody(req) {
  if (typeof req.body === "object" && req.body !== null) return req.body;
  try {
    return JSON.parse(req.body || "{}");
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return json(req, res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return json(req, res, 405, { error: "method_not_allowed" });
  }

  try {
    const body = parseBody(req);
    const topic = String(req.query.topic || body.topic || "iran").trim();
    const name = String(body.name || "").trim();
    const website = String(body.website || "").trim();
    const url = String(body.url || "").trim();

    // Handle custom source: name + url provided directly
    if (name && url) {
      const validated = await validateKnownFeed(url);
      if (!validated.ok) {
        return json(req, res, 422, {
          ok: false,
          error: "custom_feed_invalid",
          message: `The provided URL is not a valid RSS feed: ${validated.error}`
        });
      }

      return json(req, res, 200, {
        ok: true,
        method: "custom",
        topic,
        source: {
          name,
          url: validated.source.feedUrl,
          type: "rss",
          enabled: true,
          homepage: "",
          confidence: 0.9,
          discovered_by: "custom",
          validated_at: new Date().toISOString()
        },
        validation: {
          feed_title: validated.source.feedTitle,
          item_count: validated.source.itemCount
        }
      });
    }

    // Handle direct RSS URL (website field used as RSS URL)
    if (website && (website.includes('rss') || website.includes('feed') || website.includes('.xml') || website.includes('feeds.'))) {
      const validated = await validateKnownFeed(website);
      if (!validated.ok) {
        return json(req, res, 422, {
          ok: false,
          error: "direct_feed_invalid",
          message: `The provided RSS URL is not a valid feed: ${validated.error}`
        });
      }

      return json(req, res, 200, {
        ok: true,
        method: "direct_rss",
        topic,
        source: {
          name: name || validated.source.feedTitle || website,
          url: validated.source.feedUrl,
          type: "rss",
          enabled: true,
          homepage: "",
          confidence: 0.9,
          discovered_by: "direct_rss",
          validated_at: new Date().toISOString()
        },
        validation: {
          feed_title: validated.source.feedTitle,
          item_count: validated.source.itemCount
        }
      });
    }

    // Fallback: try to validate website as direct RSS URL if it looks like a URL
    if (website && (website.startsWith('http://') || website.startsWith('https://'))) {
      const validated = await validateKnownFeed(website);
      if (validated.ok) {
        return json(req, res, 200, {
          ok: true,
          method: "direct_url",
          topic,
          source: {
            name: name || validated.source.feedTitle || website,
            url: validated.source.feedUrl,
            type: "rss",
            enabled: true,
            homepage: "",
            confidence: 0.8,
            discovered_by: "direct_url",
            validated_at: new Date().toISOString()
          },
          validation: {
            feed_title: validated.source.feedTitle,
            item_count: validated.source.itemCount
          }
        });
      } else {
        // If validation failed, provide detailed error
        return json(req, res, 422, {
          ok: false,
          error: "url_validation_failed",
          message: `Could not validate the provided URL as an RSS feed. Error: ${validated.error || 'Unknown error'}. Please check the URL and try again.`
        });
      }
    }

    const matched = name ? findCatalogSourceByName(name) : null;

    if (matched) {
  const validated = await validateKnownFeed(matched.feedUrl);

  if (validated.ok) {
    return json(req, res, 200, {
      ok: true,
      method: "catalog",
      topic,
      source: {
        name: matched.name,
        url: validated.source.feedUrl,
        type: "rss",
        enabled: true,
        homepage: matched.homepage || "",
        confidence: 1,
        discovered_by: "catalog",
        validated_at: new Date().toISOString()
      },
      validation: {
        feed_title: validated.source.feedTitle,
        item_count: validated.source.itemCount
      }
    });
  }

  if (website) {
    const discovered = await discoverFeedFromWebsite(website);

    if (discovered.ok) {
      return json(req, res, 200, {
        ok: true,
        method: discovered.source.method,
        topic,
        source: {
          name: matched.name,
          url: discovered.source.feedUrl,
          type: "rss",
          enabled: true,
          homepage: discovered.source.homepage,
          confidence: 0.85,
          discovered_by: discovered.source.method,
          validated_at: new Date().toISOString()
        },
        validation: {
          feed_title: discovered.source.feedTitle,
          item_count: discovered.source.itemCount
        }
      });
    }
  }

  return json(req, res, 422, {
    ok: false,
    error: "catalog_feed_invalid",
    message: "Known source matched, but the stored feed is no longer valid. Try adding the website URL."
  });
}

    if (website) {
      const discovered = await discoverFeedFromWebsite(website);

      if (!discovered.ok) {
        return json(req, res, 422, {
          ok: false,
          error: "feed_discovery_failed",
          message: discovered.message
        });
      }

      return json(req, res, 200, {
        ok: true,
        method: discovered.source.method,
        topic,
        source: {
          name: name || discovered.source.feedTitle || website,
          url: discovered.source.feedUrl,
          type: "rss",
          enabled: true,
          homepage: discovered.source.homepage,
          confidence: 0.85,
          discovered_by: discovered.source.method,
          validated_at: new Date().toISOString()
        },
        validation: {
          feed_title: discovered.source.feedTitle,
          item_count: discovered.source.itemCount
        }
      });
    }

    return json(req, res, 422, {
      ok: false,
      error: "not_found",
      message: "Could not find that source by name. Try providing both a name and a valid RSS feed URL, or a website URL to discover feeds from."
    });
  } catch (error) {
    return json(req, res, 500, {
      ok: false,
      error: "discover_source_failed",
      message: error.message
    });
  }
}