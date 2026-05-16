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

  const prompt = `You are a misinformation detection expert focused on content circulating in India via WhatsApp. The message may be in any language including Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi, Bengali, or English. Auto-detect the language, fully understand the message in that language, and always return your analysis in English regardless of the input language.
When analysing claims, suggest credible sources that are RELEVANT to the specific topic. For Indian economy/policy use RBI, PIB, PTI. For health use WHO, AIIMS, CDC. For science use peer-reviewed journals. For general viral claims use Snopes, AltNews, or Boom Live. Do NOT suggest financial or government sources for personal or social claims.
Analyze this message for misinformation:
"${message}"

${factContext}

Respond in this EXACT JSON format, nothing else:
{
  "verdict": "TRUE" or "FALSE" or "MISLEADING" or "UNVERIFIED",
  "confidence": a number 0-100,
  "summary": "4-5 sentence detailed explanation covering what the claim says, what evidence exists, what official sources indicate, and why the verdict was given",
  "red_flags": ["flag1", "flag2"],
  "advice": "4-5 detailed sentences on what the reader should do. If misleading, explain what is actually true. If false, state the correct information and suggest safety measures for handling fake messages. If true or unverified, suggest relevant topics to study further.",
  "credible_sources": [
    { "name": "Source name e.g. WHO, RBI, PIB Fact Check", "url": "https://actual-url.org" },
    { "name": "Another source", "url": "https://actual-url.org" }
  ]
}`;

  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 1,
    max_completion_tokens: 1024,
    top_p: 1,
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
    const factResults = await checkFactAPI(message);
    const analysis = await analyzeWithGroq(message, factResults);

    res.status(200).json({
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      summary: analysis.summary,
      red_flags: analysis.red_flags || [],
      advice: analysis.advice,
      credible_sources: analysis.credible_sources || [],
      sources: factResults,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Analysis failed, please try again" });
  }
};