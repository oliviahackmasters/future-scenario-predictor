import { getAssessmentHistoryDiagnostics } from "../lib/blob-store.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const topic = String(req.query.topic || "iran").trim().toLowerCase();
    const diagnostics = await getAssessmentHistoryDiagnostics(topic);
    return res.status(200).json({
      checked_at: new Date().toISOString(),
      ...diagnostics
    });
  } catch (error) {
    console.error("History debug failed:", error);
    return res.status(500).json({
      error: error.message || "History debug failed"
    });
  }
}
