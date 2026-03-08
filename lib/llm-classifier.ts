import type { IncidentRiskLevel, IncidentType } from "@prisma/client";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const CLASSIFIER_MODEL = "google/gemini-2.0-flash-001";

export type Classification = {
  type: IncidentType;
  detected: boolean;
  riskLevel: IncidentRiskLevel;
  confidence: number;
  reasoning: string;
};

export type ClassificationResult = {
  classifications: Classification[];
  source: "llm" | "fallback";
};

type AnalysisPayload = {
  overallDescription: string;
  overallRiskLevel: string;
  constructionSafety: { summary: string; issues: string[]; recommendations: string[] };
  fireSafety: { summary: string; issues: string[]; recommendations: string[] };
  propertySecurity: { summary: string; issues: string[]; recommendations: string[] };
  peopleCount?: number;
  missingHardhats?: number;
  missingVests?: number;
};

const INCIDENT_TYPES: IncidentType[] = [
  "ppe_violation",
  "fall_risk",
  "restricted_zone_entry",
  "machinery_hazard",
  "near_miss",
  "smoking",
  "fire_detected",
  "smoke_detected",
];

const CLASSIFICATION_PROMPT = `You are a safety incident classifier. Given a safety analysis report from an edge AI camera, determine which incident types are present.

For EACH of the following incident types, decide if it is detected or not:
- ppe_violation: Missing hard hats, safety vests, or other PPE
- fall_risk: Height work without protection, unstable scaffolding, missing guardrails, ladder hazards
- restricted_zone_entry: Unauthorized persons, trespassing, breached perimeters
- machinery_hazard: Unsafe equipment operation, workers too close to heavy machinery
- near_miss: Close calls, narrowly avoided accidents
- smoking: Workers smoking in prohibited areas
- fire_detected: Active fire, flames, burning materials
- smoke_detected: Visible smoke, smoldering

CRITICAL RULES:
- "No fire hazards observed" means fire_detected is NOT detected. Pay attention to negations.
- "Fire extinguisher missing" is a safety concern but NOT an active fire - classify as near_miss, not fire_detected.
- Only classify fire_detected if there is an ACTIVE fire or flame.
- Only classify smoke_detected if there is VISIBLE smoke.
- Read the issues arrays carefully - they contain the specific problems found.
- If a category has empty issues and the summary says "no issues" or similar, that category is clear.
- Use the overallRiskLevel as a baseline but adjust per-incident based on severity described.

Respond with STRICT JSON (no markdown fences):
{
  "classifications": [
    { "type": "<incident_type>", "detected": true/false, "riskLevel": "low|medium|high|critical", "confidence": 0.0-1.0, "reasoning": "brief explanation" }
  ]
}

Include ALL 8 types in the response, even if not detected (set detected: false).`;

function getApiKey(): string | null {
  return process.env.OPENROUTER_API_KEY ?? null;
}

/**
 * Classify PPE violations directly from numeric fields (no LLM needed).
 */
function classifyPPE(analysis: AnalysisPayload): Classification {
  const missing = (analysis.missingHardhats ?? 0) + (analysis.missingVests ?? 0);
  if (missing > 0) {
    const level = mapOverallRisk(analysis.overallRiskLevel);
    return {
      type: "ppe_violation",
      detected: true,
      riskLevel: level === "low" ? "medium" : level,
      confidence: 1.0,
      reasoning: `${analysis.missingHardhats ?? 0} missing hardhats, ${analysis.missingVests ?? 0} missing vests out of ${analysis.peopleCount ?? 0} people`,
    };
  }
  return {
    type: "ppe_violation",
    detected: false,
    riskLevel: "low",
    confidence: 1.0,
    reasoning: "No PPE violations detected from numeric fields",
  };
}

function mapOverallRisk(level: string): IncidentRiskLevel {
  switch (level) {
    case "High": return "high";
    case "Medium": return "medium";
    case "Low": return "low";
    default: return "low";
  }
}

/**
 * Use LLM to classify natural language categories.
 * Returns classifications for all non-PPE incident types.
 */
async function classifyWithLLM(analysis: AnalysisPayload): Promise<Classification[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[LLM-Classifier] No OPENROUTER_API_KEY set, using fallback");
    return [];
  }

  const reportText = JSON.stringify({
    overallDescription: analysis.overallDescription,
    overallRiskLevel: analysis.overallRiskLevel,
    constructionSafety: analysis.constructionSafety,
    fireSafety: analysis.fireSafety,
    propertySecurity: analysis.propertySecurity,
    peopleCount: analysis.peopleCount,
  }, null, 2);

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://axon-vision-cmp.vercel.app",
      "X-Title": "Axon CMP Classifier",
    },
    body: JSON.stringify({
      model: CLASSIFIER_MODEL,
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: `Classify this safety report:\n\n${reportText}` },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    console.error(`[LLM-Classifier] API error ${response.status}: ${errText}`);
    return [];
  }

  const result = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = result.choices?.[0]?.message?.content;
  if (!text) return [];

  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned) as { classifications: Classification[] };
    return (parsed.classifications ?? []).filter(
      (c) => INCIDENT_TYPES.includes(c.type) && c.type !== "ppe_violation"
    );
  } catch (e) {
    console.error("[LLM-Classifier] Failed to parse response:", e);
    return [];
  }
}

// ---- Keyword fallback (improved) ----

const FALL_KEYWORDS = ["fall", "height", "scaffold", "ladder", "tripping", "slip", "guardrail", "harness"];
const FIRE_KEYWORDS = ["active fire", "flame", "burning", "blaze", "on fire", "engulfed"];
const SMOKE_KEYWORDS = ["visible smoke", "smoldering", "smoking area"];
const INTRUSION_KEYWORDS = ["intrusion", "unauthorized", "restricted", "trespass", "breached"];
const MACHINERY_KEYWORDS = ["machinery", "heavy equipment", "crane", "forklift", "excavator"];
const SMOKING_KEYWORDS = ["smoking", "cigarette", "tobacco"];

function issuesContain(issues: string[], keywords: string[]): boolean {
  const text = issues.join(" ").toLowerCase();
  return keywords.some((k) => text.includes(k));
}

function issuesNegate(issues: string[], summary: string): boolean {
  const combinedText = (summary + " " + issues.join(" ")).toLowerCase();
  const negations = ["no ", "not ", "none ", "clear", "no issues", "no hazard", "no concern", "all clear"];
  return negations.some((n) => combinedText.includes(n)) && issues.length === 0;
}

function fallbackClassify(analysis: AnalysisPayload): Classification[] {
  const results: Classification[] = [];
  const risk = mapOverallRisk(analysis.overallRiskLevel);

  const categories: Array<{
    type: IncidentType;
    keywords: string[];
    issues: string[];
    summary: string;
  }> = [
    { type: "fall_risk", keywords: FALL_KEYWORDS, issues: analysis.constructionSafety.issues, summary: analysis.constructionSafety.summary },
    { type: "fire_detected", keywords: FIRE_KEYWORDS, issues: analysis.fireSafety.issues, summary: analysis.fireSafety.summary },
    { type: "smoke_detected", keywords: SMOKE_KEYWORDS, issues: analysis.fireSafety.issues, summary: analysis.fireSafety.summary },
    { type: "restricted_zone_entry", keywords: INTRUSION_KEYWORDS, issues: analysis.propertySecurity.issues, summary: analysis.propertySecurity.summary },
    { type: "machinery_hazard", keywords: MACHINERY_KEYWORDS, issues: analysis.constructionSafety.issues, summary: analysis.constructionSafety.summary },
    { type: "smoking", keywords: SMOKING_KEYWORDS, issues: [...analysis.fireSafety.issues, ...analysis.propertySecurity.issues], summary: "" },
  ];

  for (const cat of categories) {
    const negated = issuesNegate(cat.issues, cat.summary);
    const detected = !negated && cat.issues.length > 0 && issuesContain(cat.issues, cat.keywords);
    results.push({
      type: cat.type,
      detected,
      riskLevel: detected ? risk : "low",
      confidence: detected ? 0.5 : 0.8,
      reasoning: detected ? `Keyword match in issues (fallback)` : "No keyword match or negated",
    });
  }

  return results;
}

/**
 * Hybrid classifier: numeric PPE + LLM for other categories.
 * Falls back to keyword matching if LLM is unavailable.
 */
export async function classifyAnalysis(analysis: AnalysisPayload): Promise<ClassificationResult> {
  const ppeResult = classifyPPE(analysis);

  let llmResults = await classifyWithLLM(analysis).catch((err) => {
    console.error("[LLM-Classifier] LLM call failed, using fallback:", err);
    return [] as Classification[];
  });

  let source: "llm" | "fallback" = "llm";

  if (llmResults.length === 0) {
    llmResults = fallbackClassify(analysis);
    source = "fallback";
  }

  const allClassifications = [ppeResult, ...llmResults];

  const seen = new Set<string>();
  const deduped: Classification[] = [];
  for (const c of allClassifications) {
    if (!seen.has(c.type)) {
      seen.add(c.type);
      deduped.push(c);
    }
  }

  return { classifications: deduped, source };
}
