import { z } from "zod";

const objectiveSchema = z.object({
  objective: z.string(),
  primaryMetric: z.string(),
  successCriteria: z.array(z.string()),
  reasoning: z.string(),
  assumptions: z.array(z.string()),
  confidenceNotes: z.array(z.string()),
});

const strategySchema = z.object({
  audience: z.string(),
  customerProblems: z.array(z.string()),
  valueProposition: z.string(),
  competitorsToReview: z.array(z.string()),
  contentPillars: z.array(z.string()),
  recommendedChannels: z.array(z.string()),
  primaryCTA: z.string(),
  strategicNotes: z.array(z.string()),
});

export type ObjectiveProposal = z.infer<typeof objectiveSchema>;
export type StrategyProposal = z.infer<typeof strategySchema>;

export type ObjectiveContext = {
  client: Record<string, unknown>;
  cycle: Record<string, unknown>;
  historicalCycles: unknown[];
  results: Record<string, unknown>;
  capacity: Record<string, unknown>;
};

export type StrategyContext = {
  client: Record<string, unknown>;
  cycle: Record<string, unknown>;
  brandHub: Record<string, unknown>;
  capacity: Record<string, unknown>;
  targetContentCount: number;
};

export type AIProvider = {
  generateObjective(context: ObjectiveContext): Promise<ObjectiveProposal>;
  generateStrategy(context: StrategyContext): Promise<StrategyProposal>;
};

export class AIProviderError extends Error {}

export function getAIConfig() {
  return {
    configured: Boolean(process.env.AI_GATEWAY_API_KEY?.trim()),
    model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
  };
}

async function generate<T>(
  schema: z.ZodType<T>,
  system: string,
  context: unknown,
): Promise<T> {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!apiKey) throw new AIProviderError("IA no configurada");

  const baseUrl = (process.env.AI_GATEWAY_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = getAIConfig().model;
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(context) },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new AIProviderError("No fue posible conectar con el proveedor de IA");
  }

  if (!response.ok) {
    throw new AIProviderError(`El proveedor de IA respondió con estado ${response.status}`);
  }

  try {
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Respuesta vacía");
    return schema.parse(JSON.parse(content));
  } catch {
    throw new AIProviderError("El proveedor de IA devolvió una respuesta estructurada inválida");
  }
}

export const aiProvider: AIProvider = {
  generateObjective: (context) =>
    generate(
      objectiveSchema,
      "Eres un Objective Builder de marketing. Responde en español y sólo con JSON válido con las claves objective (string), primaryMetric (string), successCriteria (array de strings), reasoning (string), assumptions (array de strings) y confidenceNotes (array de strings). No inventes metas numéricas. Si el histórico o la línea base son insuficientes, indica claramente que el primer ciclo debe construir una línea base y define criterios observables sin cifras inventadas. Distingue los datos observados de las suposiciones.",
      context,
    ),
  generateStrategy: (context) =>
    generate(
      strategySchema,
      "Eres un Marketing Orchestrator. Responde en español y sólo con JSON válido con las claves audience (string), customerProblems (array de strings), valueProposition (string), competitorsToReview (array de strings), contentPillars (array de strings), recommendedChannels (array de strings), primaryCTA (string) y strategicNotes (array de strings). Propón estrategia, no redactes piezas ni copies completos. Respeta estrictamente Brand Hub, capacidad y objetivo aprobado; diferencia datos de hipótesis.",
      context,
    ),
};