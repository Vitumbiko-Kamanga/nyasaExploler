import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
}));
app.use(express.json({ limit: "2mb" }));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const RECENT_MESSAGES = Number(process.env.MEMORY_RECENT_MESSAGES) || 10;
const SUMMARY_MAX_CHARS = Number(process.env.MEMORY_SUMMARY_CHARS) || 3000;
const RECENT_MAX_CHARS = Number(process.env.MEMORY_RECENT_CHARS) || 16000;

// Load the reusable Mthandizi skill at runtime so it actually guides Groq responses.
// Keep the skill file in the project deployment; a safe fallback prevents startup failure.
const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = path.resolve(SERVER_DIR, "../skills/mthandizi-malawi-expert/SKILL.md");
let MTHANDIZI_SKILL = "";
try {
  MTHANDIZI_SKILL = fs.readFileSync(SKILL_PATH, "utf8");
  console.log("Loaded Mthandizi skill:", SKILL_PATH);
} catch (error) {
  console.warn("Mthandizi skill file could not be loaded:", error.message);
}


const MALAWI_REFERENCE = `
TRUSTED BASIC GEOGRAPHY REFERENCE — MALAWI:
Malawi has 28 districts, grouped into three regions:

NORTHERN REGION (6):
Chitipa, Karonga, Likoma, Mzimba, Nkhata Bay, Rumphi.

CENTRAL REGION (9):
Dedza, Dowa, Kasungu, Lilongwe, Mchinji, Nkhotakota, Ntcheu, Ntchisi, Salima.

SOUTHERN REGION (13):
Balaka, Blantyre, Chikwawa, Chiradzulu, Machinga, Mangochi, Mulanje,
Mwanza, Neno, Nsanje, Phalombe, Thyolo, Zomba.

Important checks:
- Mulanje District is in the Southern Region.
- Mzimba District is in the Northern Region.
- Mulanje Mountain is in Mulanje District, Southern Region.
- Blantyre is in the Southern Region.
- Lilongwe is in the Central Region.
- Do not confuse a district with a region.
- If asked for all districts, provide all 28, not a sample.
- Do not invent extra districts or change the region assignments.
`;

const SYSTEM_PROMPT = `
${MTHANDIZI_SKILL}

APPLICATION-SPECIFIC RULE:
The skill instructions above are active guidance for this assistant. Follow them together
with the system rules and the trusted Malawi district reference below.

You are Mthandizi, an AI assistant designed to make information useful and relevant
to people in Malawi.

IDENTITY AND LOCAL RELEVANCE:
- Prioritise Malawi when the question concerns Malawi.
- Use locally understandable examples, including Malawi's education, agriculture,
  geography, economy, institutions and everyday life.
- Recognise MWK as the Malawian kwacha.
- Do not assume every question concerns Malawi.
- Use the trusted geography reference below for Malawi district questions.

ACCURACY:
- Answer the exact question asked.
- Never present a short sample as a complete list.
- Separate verified facts from estimates, assumptions and recommendations.
- Do not invent government policies, laws, statistics, prices, contacts or official procedures.
- If uncertain, say so clearly rather than guessing.
- Do not claim to have checked live records or websites unless a tool actually did so.
- For current information, explain that it needs verification from an authoritative source.
- The geography reference below is authoritative context for this application's basic district mapping.

CONVERSATION MEMORY:
- Use the supplied compressed memory and recent conversation together.
- Maintain the user's topic, intent, names, decisions, constraints and corrections across turns.
- The newest user instruction takes priority over older conflicting details.
- Do not ask the user to repeat information already available in memory.
- Do not invent missing conversation history.
- Do not expose or recite the memory unless the user asks.
- If a necessary detail is genuinely missing, ask one focused question.

LANGUAGE:
- If Chichewa is selected, use simple, natural Chichewa consistently.
- Avoid mixing English into Chichewa sentences unnecessarily.
- Keep proper names and unavoidable technical terms unchanged.
- If you are uncertain about a Chichewa translation, use a simpler expression rather than inventing words.
- Follow an explicit request to switch language.

FORMAT:
- Use clear Markdown.
- Use headings, bullets and tables when useful.
- For requested complete lists, include every item.
- Never output raw HTML.
- Be direct, respectful and appropriately concise.

${MALAWI_REFERENCE}
`;

function normaliseMessages(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter(m => m && ["user", "assistant"].includes(m.role)
      && typeof m.content === "string" && m.content.trim())
    .slice(-60)
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, 7000) }));
}

async function compressMemory(previousMemory, olderMessages) {
  if (!olderMessages.length) return String(previousMemory || "").slice(0, SUMMARY_MAX_CHARS);

  const olderText = olderMessages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n")
    .slice(-22000);

  const prompt = `
Update the user's conversation memory for future turns.
Combine the EXISTING MEMORY with the OLDER CONVERSATION.
Retain only useful facts: ongoing goals, project requirements, decisions,
corrections, preferences, constraints, named entities and unresolved tasks.
Preserve exact names and numbers. Do not invent information.
Remove repetition and obsolete details. If two statements conflict, retain the
newer correction. Do not answer the conversation. Output memory only.
Maximum ${SUMMARY_MAX_CHARS} characters.

EXISTING MEMORY:
${String(previousMemory || "(none)").slice(0, SUMMARY_MAX_CHARS)}

OLDER CONVERSATION:
${olderText}
`;

  const result = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "You are a careful conversation-memory compression component. Output factual memory only." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    max_completion_tokens: 650
  });

  const summary = result.choices?.[0]?.message?.content;
  return (typeof summary === "string" ? summary.trim() : String(previousMemory || ""))
    .slice(0, SUMMARY_MAX_CHARS);
}

function selectRecentMessages(messages) {
  const selected = [];
  let chars = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (selected.length >= RECENT_MESSAGES) break;
    if (chars + message.content.length > RECENT_MAX_CHARS && selected.length > 0) continue;
    selected.unshift(message);
    chars += message.content.length;
  }
  return selected;
}

app.get("/", (_req, res) => {
  res.json({
    name: "Mthandizi API",
    status: "running",
    model: MODEL,
    memory: "rolling summary + bounded recent conversation"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.GROQ_API_KEY),
    model: MODEL,
    memoryEnabled: true
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        error: "Groq API key is missing. Add it to server/.env and restart the server."
      });
    }

    const {
      messages: rawMessages,
      language = "en",
      memorySummary: previousMemory = ""
    } = req.body ?? {};

    const messages = normaliseMessages(rawMessages);
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return res.status(400).json({ error: "A user message is required." });
    }

    const olderMessages = messages.slice(0, Math.max(0, messages.length - RECENT_MESSAGES));
    const recentMessages = selectRecentMessages(messages);

    let memorySummary = String(previousMemory || "").slice(0, SUMMARY_MAX_CHARS);
    if (olderMessages.length) {
      try {
        memorySummary = await compressMemory(memorySummary, olderMessages);
      } catch (memoryError) {
        console.error("Memory compression failed:", memoryError.message);
        // Continue with existing memory and recent messages if the summary call fails.
      }
    }

    const languageInstruction = language === "ny"
      ? "Respond in simple, natural Chichewa. Avoid unnecessary English mixing."
      : "Respond in clear English unless the user explicitly requests another language.";

    const contextMessage = `
SELECTED LANGUAGE:
${languageInstruction}

COMPRESSED CONVERSATION MEMORY:
${memorySummary || "(No older conversation memory yet.)"}

Use this memory only where relevant. Newer conversation messages take priority.
`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n${contextMessage}` },
        ...recentMessages
      ],
      temperature: 0.2,
      max_completion_tokens: 1100
    });

    const reply = completion.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({ error: "Groq returned an empty response. Please try again." });
    }

    return res.json({
      reply: reply.trim(),
      memorySummary,
      context: {
        recentMessages: recentMessages.length,
        memoryCharacters: memorySummary.length
      }
    });
  } catch (error) {
    console.error("Mthandizi API error:", error.message);
    const status = error.status === 401 ? 502 : 500;
    return res.status(status).json({
      error: process.env.NODE_ENV === "development"
        ? `Mthandizi request failed: ${error.message}`
        : "I couldn't process that request. Check the Groq API key, model and internet connection."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Mthandizi server running at http://localhost:${PORT}`);
  console.log(`Groq model: ${MODEL}`);
  console.log("Rolling conversation memory is enabled.");
});
