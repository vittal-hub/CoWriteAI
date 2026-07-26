import "../config/loadEnv.js";
import asyncHandler from "express-async-handler";

const hasGemini = () => Boolean(process.env.GEMINI_API_KEY);
const hasOpenRouter = () => Boolean(process.env.OPENROUTER_API_KEY);

// Deterministic settings for a correction task, not creative writing.
const AI_TEMPERATURE = process.env.AI_TEMPERATURE ? parseFloat(process.env.AI_TEMPERATURE) : 0.2;
const OPENROUTER_MODEL = process.env.AI_MODEL || "openai/gpt-4o-mini";
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";
// AI_PROVIDER pins a single provider ("openrouter" | "gemini"); unset/"auto" keeps the
// existing openrouter -> gemini -> local-fallback cascade.
const AI_PROVIDER = (process.env.AI_PROVIDER || "auto").toLowerCase();

const SYSTEM_PROMPT =
  "You are a professional writing assistant that performs precise grammar and clarity " +
  "corrections. Output ONLY the corrected text itself. Never add commentary, explanations, " +
  "intro phrases, markdown, headings, quotes, or multiple options.";

// Anchored to the very start so a sentence that legitimately starts with one
// of these words (e.g. "Output the report by Friday...") is left untouched.
const WRAPPER_PREFIX_RE =
  /^(here'?s\s+(?:the\s+)?(?:rewrite|rewritten\s+text|corrected\s+text|revised\s+text)\s*[:\-]\s*|rewritten\s+text\s*[:\-]\s*|corrected\s+text\s*[:\-]\s*|revised\s+text\s*[:\-]\s*|rewrite\s*[:\-]\s*|output\s*[:\-]\s*)/i;

function cleanOutput(raw) {
  if (!raw) return "";
  let text = raw.trim();

  // Strip markdown code fences the model may wrap the answer in.
  text = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();

  // Strip a single leading wrapper label, if present (e.g. "Rewrite: ...").
  text = text.replace(WRAPPER_PREFIX_RE, "").trim();

  // Unwrap only if the entire response is symmetrically quote-wrapped.
  const quoteMatch = text.match(/^(["'`])([\s\S]*)\1$/);
  if (quoteMatch && quoteMatch[2].trim()) {
    text = quoteMatch[2].trim();
  }

  return text;
}

// ── Google Gemini API ────────────────────────────────────────────────────────
const callGemini = async (prompt, { temperature = AI_TEMPERATURE } = {}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = GEMINI_MODEL_NAME;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const generationConfig = {
    temperature,
    maxOutputTokens: 2048,
    topP: 0.9,
  };
  // Only the 2.5 model family accepts thinkingConfig; older models reject unknown fields.
  if (/2\.5/.test(model)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }],
        },
      ],
      generationConfig,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error ${response.status}: ${err?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") {
    console.warn("[ai] Gemini response hit maxOutputTokens — consider raising the limit.");
  }
  const rawContent = candidate?.content?.parts?.[0]?.text || "";
  return cleanOutput(rawContent);
};

// ── OpenRouter API ───────────────────────────────────────────────────────────
const callOpenRouter = async (prompt, { temperature = AI_TEMPERATURE } = {}) => {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
        "X-Title": "CoWriteAI",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 2048,
        temperature,
        // Disabled — reasoning tokens were eating the completion budget and
        // truncating the visible rewrite mid-sentence.
        reasoning: { enabled: false },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `OpenRouter API error ${response.status}: ${err?.error?.message || response.statusText}`,
    );
  }
  const data = await response.json();
  const choice = data.choices?.[0];
  if (choice?.finish_reason === "length") {
    console.warn(`[ai] OpenRouter (${data.model}) response hit max_tokens — consider raising the limit.`);
  }
  const rawContent = choice?.message?.content || "";
  return cleanOutput(rawContent);
};

// ── Fallback Rewrites ────────────────────────────────────────────────────────
function fallbackRewrite(text, tone) {
  const t = text.trim();
  if (!t) return t;

  let out = t;

  out = out
    .replace(/\bme and my teammates was\b/gi, "my teammates and I were")
    .replace(/\bme and my (\w+) was\b/gi, "my $1 and I were")
    .replace(/\bfrontend were\b/gi, "frontend was")
    .replace(/\bbackend have\b/gi, "backend had")
    .replace(/\bwe was\b/gi, "we were")
    .replace(/\bdoesn't worked\b/gi, "didn't work")
    .replace(/\bconnection string were\b/gi, "connection string was")
    .replace(/\beverythings\b/gi, "everything")
    .replace(/\bwe deploy\b/gi, "we deployed")
    .replace(/\bhow you are\b/gi, "how are you");

  if (tone === "concise") {
    out = out
      .replace(
        /\b(very|really|just|actually|basically|literally|simply|kind of|sort of|quite|rather|somewhat|fairly)\b\s*/gi,
        "",
      )
      .replace(/\b(in order to)\b/gi, "to")
      .replace(/\b(due to the fact that)\b/gi, "because")
      .replace(/\b(at this point in time)\b/gi, "now")
      .replace(/\b(for the purpose of)\b/gi, "for")
      .replace(/\b(despite the fact that)\b/gi, "although")
      .replace(/\s{2,}/g, " ")
      .trim();
  } else if (tone === "formal") {
    out = out
      .replace(/\bcan't\b/gi, "cannot")
      .replace(/\bdon't\b/gi, "do not")
      .replace(/\bwon't\b/gi, "will not")
      .replace(/\bisn't\b/gi, "is not")
      .replace(/\baren't\b/gi, "are not")
      .replace(/\bi'm\b/gi, "I am")
      .replace(/\bi'd\b/gi, "I would")
      .replace(/\bi'll\b/gi, "I will")
      .replace(/\bI think\b/gi, "It is suggested that")
      .replace(/\bI believe\b/gi, "It is believed that")
      .replace(/\bkind of\b/gi, "somewhat")
      .replace(/\bguys\b/gi, "individuals")
      .replace(/\bcool\b/gi, "excellent")
      .replace(/\bbad\b/gi, "suboptimal")
      .replace(/\bgreat\b/gi, "noteworthy")
      .replace(/\!/g, ".");
  } else if (tone === "friendly") {
    if (!/(hey|hi|hello|great|awesome|hope)\b/i.test(out)) {
      out = "Great progress — " + out.charAt(0).toLowerCase() + out.slice(1);
    }
  }

  out = out.charAt(0).toUpperCase() + out.slice(1);
  if (!/[.!?]$/.test(out)) out += ".";

  return out;
}

function fallbackAutocorrect(text) {
  return text
    .replace(/\bi\b/g, "I")
    .replace(/\bteh\b/gi, "the")
    .replace(/\brecieve\b/gi, "receive")
    .replace(/\bseperate\b/gi, "separate")
    .replace(/\boccured\b/gi, "occurred")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function normalizeForCompare(text) {
  return text.trim().toLowerCase().replace(/[.!?]+$/, "");
}

function isEchoResponse(original, rewritten) {
  if (!rewritten?.trim()) return true;
  const normOrig = normalizeForCompare(original);
  const normRewrite = normalizeForCompare(rewritten);
  return normRewrite === normOrig;
}

function buildRewritePrompt(text, toneGuide, instruction) {
  const customPart = instruction.trim()
    ? `\nAdditional instruction: ${instruction.trim()}`
    : "";

  return `Rewrite the text below according to these rules:
- Correct all grammar, spelling, punctuation, tense, and sentence-structure errors.
- Improve clarity and readability. Make it ${toneGuide}.
- Preserve the original meaning, facts, intent, and tone exactly — never invent, remove, or reinterpret information.
- Preserve the original paragraph breaks, line breaks, lists, and formatting.
- Keep the rewritten text approximately the same length as the original, unless the requested tone requires otherwise.
- Output ONLY the rewritten text, with nothing else.
- Do NOT add intro text such as "Here is the rewrite:".
- Do NOT include markdown headers, quotes, bullet points, or multiple options.${customPart}

Original text:
${text}`;
}

async function rewriteTextService(text, tone, instruction = "") {
  const toneGuide =
    {
      clarity: "clearer, grammatically correct, and easy to read",
      concise: "shorter and more concise",
      formal: "more professional and formal",
      friendly: "conversational and friendly",
    }[tone] || "clearer";

  const prompt = buildRewritePrompt(text, toneGuide, instruction);

  const tryOpenRouter = async () => {
    if (!hasOpenRouter()) return null;
    try {
      const rewritten = await callOpenRouter(prompt);
      if (!isEchoResponse(text, rewritten)) return { rewritten, source: "openrouter" };
    } catch (err) {
      console.warn("[ai] OpenRouter API failed:", err.message);
    }
    return null;
  };

  const tryGemini = async () => {
    if (!hasGemini()) return null;
    try {
      const rewritten = await callGemini(prompt);
      if (!isEchoResponse(text, rewritten)) return { rewritten, source: "gemini" };
    } catch (err) {
      console.warn("[ai] Gemini API failed:", err.message);
    }
    return null;
  };

  // AI_PROVIDER pins a single provider; "auto" (default) cascades openrouter -> gemini.
  if (AI_PROVIDER === "openrouter") {
    return (await tryOpenRouter()) || { rewritten: fallbackRewrite(text, tone), source: "fallback" };
  }
  if (AI_PROVIDER === "gemini") {
    return (await tryGemini()) || { rewritten: fallbackRewrite(text, tone), source: "fallback" };
  }

  return (
    (await tryOpenRouter()) ||
    (await tryGemini()) || { rewritten: fallbackRewrite(text, tone), source: "fallback" }
  );
}

// @route POST /api/ai/rewrite   { text, instruction?, tone? }
export const rewriteText = asyncHandler(async (req, res) => {
  const { text, instruction = "", tone = "clarity" } = req.body;
  if (!text || !text.trim()) {
    res.status(400);
    throw new Error("Text is required");
  }

  const result = await rewriteTextService(text, tone, instruction);
  res.json({
    success: true,
    original: text,
    rewritten: result.rewritten,
    source: result.source,
  });
});

// @route POST /api/ai/autocorrect   { text }   (used by voice dictation)
export const autocorrectText = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    res.status(400);
    throw new Error("Text is required");
  }

  const prompt = `Fix any spelling, grammar, and punctuation errors in the following transcribed speech. Return ONLY the corrected text with no explanation.\n\nText:\n${text}`;

  if (hasOpenRouter()) {
    try {
      const corrected = await callOpenRouter(prompt);
      return res.json({ success: true, original: text, corrected, source: "openrouter" });
    } catch (err) {
      console.warn("[ai] OpenRouter autocorrect failed:", err.message);
    }
  }

  if (hasGemini()) {
    try {
      const corrected = await callGemini(prompt);
      return res.json({ success: true, original: text, corrected, source: "gemini" });
    } catch (err) {
      console.warn("[ai] Gemini autocorrect failed:", err.message);
    }
  }

  const corrected = fallbackAutocorrect(text);
  res.json({ success: true, original: text, corrected, source: "fallback" });
});
