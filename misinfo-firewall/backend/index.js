require("dotenv").config();
const Groq = require("groq-sdk");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function checkFactAPI(query) {
  try {
    const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(query)}&key=${process.env.FACT_CHECK_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.claims || data.claims.length === 0) return [];
    return data.claims.slice(0, 3).map((claim) => ({
      text: claim.text,
      claimant: claim.claimant || "Unknown",
      rating: claim.claimReview?.[0]?.textualRating || "Unrated",
      url: claim.claimReview?.[0]?.url || "",
      publisher: claim.claimReview?.[0]?.publisher?.name || "Unknown",
    }));
  } catch (err) {
    console.error("Fact Check API error:", err.message);
    return [];
  }
}

async function analyzeWithGroq(message, factResults) {
  const factContext =
    factResults.length > 0
      ? `Related fact checks found:\n${factResults.map((f) => `- "${f.text}" rated as "${f.rating}" by ${f.publisher}`).join("\n")}`
      : "No related fact checks found in database.";

  const prompt = `You are a misinformation detection expert focused on content circulating in India via WhatsApp.

Analyze this message for misinformation:
"${message}"

${factContext}

Respond in this EXACT JSON format, nothing else:
{
  "verdict": "TRUE" or "FALSE" or "MISLEADING" or "UNVERIFIED",
  "confidence": a number 0-100,
  "summary": "2-3 sentence plain English explanation of your verdict",
  "red_flags": ["flag1", "flag2"],
  "advice": "One sentence on what the reader should do"
}`;

  // Collect streamed chunks into one string
  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 1,
    max_completion_tokens: 1024,
    top_p: 1,
    // reasoning_effort: "medium",
    stream: true,
    stop: null,
  });

  let raw = "";
  for await (const chunk of stream) {
    raw += chunk.choices[0]?.delta?.content || "";
  }

  const clean = raw.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(clean);
}

exports.checkMessage = async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const { message } = req.body;
  if (!message || message.trim().length < 10) {
    res.status(400).json({ error: "Message too short to fact-check" }); return;
  }
  if (message.length > 2000) {
    res.status(400).json({ error: "Message too long" }); return;
  }

  try {
    console.log("Checking:", message.substring(0, 80) + "...");
    // Run fact check first, then pass results to AI for better context
    const factResults = await checkFactAPI(message);
    const analysis = await analyzeWithGroq(message, factResults);

    res.status(200).json({
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      summary: analysis.summary,
      red_flags: analysis.red_flags || [],
      advice: analysis.advice,
      sources: factResults,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Analysis failed, please try again" });
  }
};