import { put, list } from "@vercel/blob";

function getTopicKey(topic) {
  return String(topic || "iran").toLowerCase().trim();
}

export function getLatestBlobPath(topic) {
  return `latest/${getTopicKey(topic)}.json`;
}

export function getHistoryBlobPath(topic) {
  return `history/${getTopicKey(topic)}.json`;
}

async function readJsonFromBlobUrl(url) {
  const headers = { Accept: "application/json" };

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    headers.Authorization = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch blob JSON (${response.status})`);
  }

  return await response.json();
}

async function findBlobByPath(pathname) {
  const result = await list({
    prefix: pathname,
    limit: 10
  });

  return Array.isArray(result?.blobs)
    ? result.blobs.find((item) => item.pathname === pathname)
    : null;
}

function containsFallbackTimeoutText(value) {
  const text = JSON.stringify(value || {}).toLowerCase();
  return text.includes("model request failed or timed out") ||
    text.includes("openai request timed out") ||
    text.includes("current reporting still points to sustained pressure") ||
    text.includes("fallback") && text.includes("timed out");
}

function hasDefaultFallbackScores(payload = {}) {
  const scores = Array.isArray(payload.scenario_scores)
    ? payload.scenario_scores
    : Array.isArray(payload.scenarios)
      ? payload.scenarios.map((scenario) => ({
          name: scenario.name,
          score: scenario.score
        }))
      : [];

  const byName = new Map(scores.map((item) => [
    String(item.name || item.scenario || "").toLowerCase(),
    Number(item.final_score ?? item.score ?? item.likelihood_percent ?? item.ai_score)
  ]));

  return Math.abs((byName.get("chaos + collapse") ?? -1) - 0.15) < 0.001 &&
    Math.abs((byName.get("shattered diplomacy") ?? -1) - 0.20) < 0.001 &&
    Math.abs((byName.get("burning strait") ?? -1) - 0.35) < 0.001 &&
    Math.abs((byName.get("cold containment") ?? -1) - 0.30) < 0.001;
}

function isFallbackAssessment(payload = {}) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.is_fallback === true || payload.fallback === true) return true;
  if (containsFallbackTimeoutText(payload)) return true;
  return hasDefaultFallbackScores(payload) && containsFallbackTimeoutText(payload);
}

function normaliseScenarioScore(item = {}) {
  if (!item || typeof item !== "object") return null;

  const name = String(item.name || item.scenario || "").trim();
  if (!name) return null;

  const rawScore = item.final_score ?? item.score ?? item.likelihood_percent ?? item.ai_score;
  const numericScore = Number(rawScore);
  if (!Number.isFinite(numericScore)) return null;

  const percentScore = numericScore <= 1 ? numericScore * 100 : numericScore;

  return {
    ...item,
    name,
    score: Math.max(0, Math.min(100, percentScore))
  };
}

function extractScenarioScores(entry = {}) {
  const candidates = [
    entry.scenario_scores,
    entry.scenarios,
    entry.calculation?.scenarios,
    entry.assessment?.scenario_scores,
    entry.assessment?.scenarios,
    entry.data?.scenario_scores,
    entry.data?.scenarios
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const normalised = candidate.map(normaliseScenarioScore).filter(Boolean);
    if (normalised.length) return normalised;
  }

  return [];
}

function normaliseHistoryEntry(entry = {}) {
  if (!entry || typeof entry !== "object") return null;

  const date = String(entry.date || entry.assessed_at || entry.updated_at || entry.created_at || "").slice(0, 10);
  if (!date) return null;

  const scenario_scores = extractScenarioScores(entry);
  if (!scenario_scores.length) return null;

  return {
    ...entry,
    date,
    scenario_scores
  };
}

export async function loadLatestAssessment(topic) {
  try {
    const pathname = getLatestBlobPath(topic);
    const blob = await findBlobByPath(pathname);

    if (!blob?.url) return null;

    return await readJsonFromBlobUrl(blob.url);
  } catch (error) {
    console.error("Failed to load latest assessment from Blob:", error.message);
    return null;
  }
}

export async function saveLatestAssessment(topic, payload) {
  if (isFallbackAssessment(payload)) {
    console.warn("Skipping latest assessment save because payload appears to be timeout/fallback output.");
    return payload;
  }

  const pathname = getLatestBlobPath(topic);

  await put(
    pathname,
    JSON.stringify(payload, null, 2),
    {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json"
    }
  );

  return payload;
}

export async function loadRawAssessmentHistory(topic) {
  try {
    const pathname = getHistoryBlobPath(topic);
    const blob = await findBlobByPath(pathname);

    if (!blob?.url) return [];

    const history = await readJsonFromBlobUrl(blob.url);
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error("Failed to load raw assessment history from Blob:", error.message);
    return [];
  }
}

export async function loadAssessmentHistory(topic) {
  try {
    const history = await loadRawAssessmentHistory(topic);

    return history
      .map(normaliseHistoryEntry)
      .filter(Boolean)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  } catch (error) {
    console.error("Failed to load assessment history from Blob:", error.message);
    return [];
  }
}

export async function getAssessmentHistoryDiagnostics(topic) {
  const raw = await loadRawAssessmentHistory(topic);
  const normalised = raw.map((entry, index) => ({
    index,
    raw_keys: entry && typeof entry === "object" ? Object.keys(entry) : [],
    raw_date: entry?.date || entry?.assessed_at || entry?.updated_at || entry?.created_at || null,
    normalised: normaliseHistoryEntry(entry)
  }));

  return {
    topic: getTopicKey(topic),
    raw_count: raw.length,
    loaded_count: normalised.filter((item) => item.normalised).length,
    dropped: normalised
      .filter((item) => !item.normalised)
      .map((item) => ({
        index: item.index,
        raw_date: item.raw_date,
        raw_keys: item.raw_keys,
        reason: "Could not derive date plus scenario_scores/scenarios/calculation.scenarios"
      })),
    loaded: normalised
      .filter((item) => item.normalised)
      .map((item) => ({
        index: item.index,
        date: item.normalised.date,
        scenario_count: item.normalised.scenario_scores.length,
        scenario_names: item.normalised.scenario_scores.map((score) => score.name)
      }))
  };
}

export async function saveAssessmentHistory(topic, entry) {
  const pathname = getHistoryBlobPath(topic);
  const existing = await loadAssessmentHistory(topic);

  if (isFallbackAssessment(entry)) {
    console.warn("Skipping history save because entry appears to be timeout/fallback output.");
    return existing;
  }

  const normalisedEntry = normaliseHistoryEntry({
    ...entry,
    date: entry.date || new Date().toISOString().slice(0, 10),
    updated_at: entry.updated_at || new Date().toISOString()
  });

  if (!normalisedEntry) {
    console.warn("Skipping history save because entry could not be normalised.");
    return existing;
  }

  const existingIndex = existing.findIndex((item) => item.date === normalisedEntry.date);

  if (existingIndex >= 0) {
    existing[existingIndex] = {
      ...existing[existingIndex],
      ...normalisedEntry
    };
  } else {
    existing.push(normalisedEntry);
  }

  existing.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  await put(
    pathname,
    JSON.stringify(existing, null, 2),
    {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json"
    }
  );

  return existing;
}
