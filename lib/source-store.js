import { kv } from "@vercel/kv";

const GLOBAL_SOURCES_KEY = "scenario:sources:global";

function normalizeTopic(topic) {
  return String(topic || "global").trim().toLowerCase();
}

function topicKey(topic) {
  return `scenario:sources:${normalizeTopic(topic)}`;
}

function assertKvConfigured() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error("Vercel KV is not configured. Missing KV_REST_API_URL or KV_REST_API_TOKEN.");
  }
}

function sanitizeSource(source = {}) {
  return {
    id: source.id || crypto.randomUUID(),
    name: String(source.name || "").trim(),
    url: String(source.url || "").trim(),
    type: String(source.type || "rss").trim().toLowerCase(),
    enabled: source.enabled !== false,
    homepage: String(source.homepage || "").trim(),
    confidence: Number(source.confidence || 0),
    discovered_by: String(source.discovered_by || "manual").trim(),
    validated_at: source.validated_at || null,
    created_at: source.created_at || new Date().toISOString()
  };
}

export async function getSavedSources(topic = "global") {
  assertKvConfigured();

  const [globalSources, topicSources] = await Promise.all([
    kv.get(GLOBAL_SOURCES_KEY),
    kv.get(topicKey(topic))
  ]);

  return {
    global: Array.isArray(globalSources) ? globalSources : [],
    topic: Array.isArray(topicSources) ? topicSources : []
  };
}

export async function getMergedSavedSources(topic = "global") {
  const { global, topic: topicSpecific } = await getSavedSources(topic);
  return [...global, ...topicSpecific];
}

export async function saveSource(source, topic = "global") {
  assertKvConfigured();

  const key = topicKey(topic);
  const current = (await kv.get(key)) || [];
  const nextItem = sanitizeSource(source);

  const next = [
    ...current.filter((item) => item.id !== nextItem.id),
    nextItem
  ];

  await kv.set(key, next);
  return next;
}

export async function deleteSource(id, topic = "global") {
  assertKvConfigured();

  const key = topicKey(topic);
  const current = (await kv.get(key)) || [];
  const next = current.filter((item) => item.id !== id);

  await kv.set(key, next);
  return next;
}

export async function updateSource(id, updates, topic = "global") {
  assertKvConfigured();

  const key = topicKey(topic);
  const current = (await kv.get(key)) || [];

  const next = current.map((item) =>
    item.id === id
      ? sanitizeSource({
          ...item,
          ...updates,
          id: item.id,
          created_at: item.created_at
        })
      : item
  );

  await kv.set(key, next);
  return next;
}