import Parser from "rss-parser";
import OpenAI from "openai";

const parser = new Parser();

const TOPICS = {
  iran: {
    label: "Iran",
    scenarios: [
      {
        name: "Chaos + Collapse",
        description: "Multi-state regional war and a dysfunctional government in Iran."
      },
      {
        name: "Shattered Diplomacy",
        description: "Post-Iran fragmentation and multiple weak political actors."
      },
      {
        name: "Burning Strait",
        description: "Full regional war with no major ideological change in Iran."
      },
      {
        name: "Cold Containment",
        description: "Managed escalation with minimal or no ground troops."
      }
    ],
    trackedSignals: [
      "oil prices",
      "troop deployment",
      "government stability",
      "diplomacy / ceasefire",
      "maritime disruption",
      "protests / elite fragmentation"
    ],
    sources: [
      {
        name: "BBC World",
        url: "http://feeds.bbci.co.uk/news/world/rss.xml"
      },
      {
        name: "BBC Middle East",
        url: "http://feeds.bbci.co.uk/news/world/middle_east/rss.xml"
      },
      {
        name: "Reuters World",
        url: "https://feeds.reuters.com/Reuters/worldNews"
      }
    ],
    keywordFilter: [
      "iran",
      "tehran",
      "strait of hormuz",
      "hormuz",
      "israel",
      "us military",
      "troops",
      "oil",
      "ceasefire",
      "sanctions"
    ]
  }
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getTopicConfig(topic) {
  return TOPICS[String(topic || "iran").toLowerCase()] || TOPICS.iran;
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.send(JSON.stringify(body));
}

function scoreAndSort(items) {
  return items
    .map((item) => {
      const haystack = `${item.title} ${item.contentSnippet} ${item.content}`.toLowerCase();
      let matches = 0;
      for (const keyword of item.keywords || []) {
        if (haystack.includes(keyword)) matches += 1;
      }
      return { ...item, _matches: matches };
    })
    .filter((item) => item._matches > 0)
    .sort((a, b) => b._matches - a._matches || (b.isoDate || "").localeCompare(a.isoDate || ""));
}

async function fetchRssItems(source, keywordFilter) {
  try {
    const feed = await parser.parseURL(source.url);
    const items = Array.isArray(feed.items) ? feed.items : [];

    return items.slice(0, 12).map((item) => ({
      source: source.name,
      url: item.link || source.url,
      title: normalizeWhitespace(item.title),
      contentSnippet: normalizeWhitespace(item.contentSnippet || item.summary || ""),
      content: normalizeWhitespace(item.content || item["content:encoded"] || item.summary || ""),
      isoDate: item.isoDate || item.pubDate || null,
      keywords: keywordFilter
    }));
  } catch (error) {
    console.error(`Failed to fetch ${source.name}:`, error.message);
    return [];
  }
}

async function collectTopicCoverage(topicConfig) {
  const itemGroups = await Promise.all(
    topicConfig.sources.map((source) => fetchRssItems(source, topicConfig.keywordFilter))
  );

  const filtered = scoreAndSort(itemGroups.flat()).slice(0, 15);

  return filtered.map((item) => ({
    source: item.source,
    url: item.url,
    title: item.title,
    published_at: item.isoDate,
    snippet: item.contentSnippet || item.content
  }));
}

function buildPrompt(topicConfig, articles) {
  return [
    "You are a geopolitical scenario analyst.",
    "",
    `Topic: ${topicConfig.label}`,
    "",
    "Tracked signals:",
    ...topicConfig.trackedSignals.map((signal) => `- ${signal}`),
    "",
    "Scenarios:",
    ...topicConfig.scenarios.map((scenario, index) => `${index + 1}. ${scenario.name} = ${scenario.description}`),
    "",
    "Tasks:",
    "1. Read the supplied source summaries.",
    "2. Extract only evidence relevant to the tracked signals.",
    "3. Score each scenario from 0 to 100 based on the signals.",
    "4. Normalize the scenario scores so the total equals 100.",
    "5. Give a concise summary of the current assessment.",
    "6. Do not invent facts. Distinguish evidence from inference.",
    "",
    "Return JSON matching the requested schema.",
    "",
    "Articles:",
    JSON.stringify(articles, null, 2)
  ].join("\n");
}

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string"
    },
    scenarios: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          score: { type: "number" },
          description: { type: "string" }
        },
        required: ["name", "score", "description"]
      }
    },
    signals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          reading: { type: "string" },
          direction: {
            type: "string",
            enum: ["escalatory", "neutral", "de-escalatory"]
          },
          confidence: {
            type: "string",
            enum: ["Low", "Medium", "High"]
          }
        },
        required: ["name", "reading", "direction", "confidence"]
      }
    }
  },
  required: ["summary", "scenarios", "signals"]
};

function normalizeScenarioScores(output, scenariosFromConfig) {
  const byName = new Map(output.scenarios.map((item) => [item.name, item]));
  const merged = scenariosFromConfig.map((scenario) => {
    const found = byName.get(scenario.name);
    return {
      name: scenario.name,
      description: found?.description || scenario.description,
      score: Number(found?.score || 0)
    };
  });

  const rawTotal = merged.reduce((sum, item) => sum + item.score, 0);
  if (rawTotal <= 0) {
    const equalScore = Math.floor(100 / merged.length);
    return merged.map((item, index) => ({
      ...item,
      score: index === merged.length - 1 ? 100 - equalScore * (merged.length - 1) : equalScore
    }));
  }

  let running = 0;
  return merged.map((item, index) => {
    if (index === merged.length - 1) {
      return {
        ...item,
        score: Math.max(0, 100 - running)
      };
    }

    const normalized = Math.round((item.score / rawTotal) * 100);
    running += normalized;
    return {
      ...item,
      score: normalized
    };
  });
}

async function generateScenarioAssessment(topicConfig, articles) {
  if (!articles.length) {
    return {
      summary: "Not enough current source material was available to generate a live assessment.",
      scenarios: topicConfig.scenarios.map((scenario, index) => ({
        ...scenario,
        score: index === topicConfig.scenarios.length - 1 ? 25 : 25
      })),
      signals: topicConfig.trackedSignals.map((signal) => ({
        name: signal,
        reading: "No recent evidence available in current fetch.",
        direction: "neutral",
        confidence: "Low"
      }))
    };
  }

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4",
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: "Produce a concise geopolitical scenario assessment using only the supplied source material."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildPrompt(topicConfig, articles)
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "scenario_assessment",
        schema: responseSchema,
        strict: true
      }
    }
  });

  const parsed = JSON.parse(response.output_text);

  return {
    summary: parsed.summary,
    scenarios: normalizeScenarioScores(parsed, topicConfig.scenarios),
    signals: parsed.signals
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return json(res, 200, { ok: true });
  }

  if (req.method !== "GET") {
    return json(res, 405, { error: "method_not_allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(res, 500, {
      error: "missing_openai_api_key",
      message: "OPENAI_API_KEY is not set."
    });
  }

  try {
    const topicConfig = getTopicConfig(req.query.topic);
    const articles = await collectTopicCoverage(topicConfig);
    const assessment = await generateScenarioAssessment(topicConfig, articles);

    return json(res, 200, {
      topic: topicConfig.label,
      updated_at: new Date().toISOString(),
      summary: assessment.summary,
      scenarios: assessment.scenarios,
      signals: assessment.signals,
      sources: articles.map((article) => ({
        title: `${article.source}: ${article.title}`,
        url: article.url
      }))
    });
  } catch (error) {
    console.error("Scenario assessment failed:", error);
    return json(res, 500, {
      error: "scenario_assessment_failed",
      message: error.message
    });
  }
}
