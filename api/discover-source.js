import OpenAI from "openai";
import Parser from "rss-parser";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "future-scenario-plotter/0.1"
  }
});

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

function stripCodeFences(text) {
  return String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  try {
    return new URL(value).toString();
  } catch {
    return "";
  }
}

async function validateRssFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    const items = Array.isArray(feed.items) ? feed.items : [];
    return {
      ok: true,
      url,
      title: feed.title || "",
      item_count: items.length
    };
  } catch (error) {
    return {
      ok: false,
      url,
      item_count: 0,
      error: error.message
    };
  }
}

async function validateCandidate(candidate) {
  const normalizedUrl = normalizeUrl(candidate.feed_url);
  const normalizedHomepage = normalizeUrl(candidate.homepage);

  if (!normalizedUrl) {
    return {
      ok: false,
      reason: "Candidate feed URL is missing or invalid."
    };
  }

  const rssCheck = await validateRssFeed(normalizedUrl);
  if (!rssCheck.ok) {
    return {
      ok: false,
      reason: `Feed validation failed: ${rssCheck.error || "unknown error"}`,
      feed_check: rssCheck
    };
  }

  return {
    ok: true,
    source: {
      name: candidate.name,
      url: normalizedUrl,
      type: "rss",
      enabled: true,
      homepage: normalizedHomepage,
      confidence: Number(candidate.confidence || 0),
      discovered_by: "openai_web_search",
      validated_at: new Date().toISOString()
    },
    validation: {
      looks_like_feed: true,
      item_count: rssCheck.item_count,
      feed_title: rssCheck.title || ""
    }
  };
}

async function discoverSourceWithOpenAI({ name, topic }) {
  const response = await openai.responses.create({
    model: "gpt-5",
    tools: [{ type: "web_search" }],
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You identify official RSS or Atom feeds for named news or analysis sources. " +
              "Return only the best candidate. Prefer official publisher-owned feeds. " +
              "Do not return article URLs. Do not return social pages. Prefer RSS/Atom feeds."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              `Find the official RSS or Atom feed for this source.\n` +
              `Source name: ${name}\n` +
              `Topic context: ${topic || "global"}\n\n` +
              `Return a single best candidate.`
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "discovered_source",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            homepage: { type: "string" },
            feed_url: { type: "string" },
            type: { type: "string", enum: ["rss"] },
            confidence: { type: "number" },
            rationale: { type: "string" }
          },
          required: ["name", "homepage", "feed_url", "type", "confidence", "rationale"]
        }
      }
    }
  });

  const raw = stripCodeFences(response.output_text);
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return json(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "method_not_allowed" });
  }

  try {
    const body = parseBody(req);
    const name = String(body.name || "").trim();
    const topic = String(body.topic || req.query.topic || "iran").trim();

    if (!name) {
      return json(res, 400, {
        error: "missing_name",
        message: "source name is required"
      });
    }

    const candidate = await discoverSourceWithOpenAI({ name, topic });
    const validated = await validateCandidate(candidate);

    if (!validated.ok) {
      return json(res, 422, {
        ok: false,
        error: "source_discovery_failed",
        candidate,
        validation: validated
      });
    }

    return json(res, 200, {
      ok: true,
      candidate,
      source: validated.source,
      validation: validated.validation
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: "discover_source_failed",
      message: error.message
    });
  }
}