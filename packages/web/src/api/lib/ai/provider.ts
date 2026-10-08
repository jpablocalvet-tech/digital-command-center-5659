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

export const researchBriefSchema = z.object({
  audienceInsights: z.array(
    z.object({
      insight: z.string(),
      basis: z.enum(["contexto_proporcionado", "hipotesis"]),
    }),
  ),
  problemsToValidate: z.array(
    z.object({
      problem: z.string(),
      whyItMatters: z.string(),
    }),
  ),
  openQuestions: z.array(z.string()),
  contentOpportunities: z.array(
    z.object({
      topic: z.string(),
      relevance: z.string(),
      relatedPillar: z.string(),
    }),
  ),
  claimsToVerify: z.array(
    z.object({
      claim: z.string(),
      evidenceNeeded: z.string(),
    }),
  ),
  researchNotes: z.array(z.string()),
  limitations: z.array(z.string()),
});

export const contentBatchSchema = z.object({
  items: z
    .array(
      z.object({
        type: z.enum(["Post", "Carrusel", "Reel"]),
        title: z.string(),
        objective: z.string(),
        pillar: z.string(),
        channel: z.enum([
          "Instagram",
          "Facebook",
          "Instagram/Facebook",
          "TikTok",
          "LinkedIn",
          "YouTube",
          "WhatsApp",
          "Google Business Profile",
          "Email",
          "Por confirmar",
        ]),
        hook: z.string(),
        body: z.string(),
        caption: z.string(),
        cta: z.string(),
        visualBrief: z.string(),
        sourceNotes: z.string(),
        realityReviewNotes: z.string(),
      }),
    )
    .min(1)
    .max(8)
    .refine((items) => items.filter((item) => item.type === "Reel").length <= 2, {
      message: "El lote no puede incluir más de dos Reels",
    }),
});

export type ObjectiveProposal = z.infer<typeof objectiveSchema>;
export type StrategyProposal = z.infer<typeof strategySchema>;
export type ResearchBrief = z.infer<typeof researchBriefSchema>;
export type ContentBatch = z.infer<typeof contentBatchSchema>;

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

export type ResearchContext = {
  client: Record<string, unknown>;
  cycle: Record<string, unknown>;
  objective: Record<string, unknown>;
  strategy: Record<string, unknown>;
  brandHub: Record<string, unknown>;
};

export type ContentBatchContext = {
  client: Record<string, unknown>;
  cycle: Record<string, unknown>;
  objective: Record<string, unknown>;
  strategy: Record<string, unknown>;
  brandHub: Record<string, unknown>;
  researchBrief: ResearchBrief & { id: number; humanNote: string };
  targetContentCount: number;
};

export type AIProvider = {
  generateObjective(context: ObjectiveContext): Promise<ObjectiveProposal>;
  generateStrategy(context: StrategyContext): Promise<StrategyProposal>;
  generateResearchBrief(context: ResearchContext): Promise<ResearchBrief>;
  generateContentBatch(context: ContentBatchContext): Promise<ContentBatch>;
};

export class AIProviderError extends Error {}

export function getAIConfig() {
  return {
    configured: Boolean(process.env.AI_GATEWAY_API_KEY?.trim()),
    model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
  };
}

const secretPattern =
  /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{12,}\b|\bBearer\s+\S+|[\w-]*(?:api[_ -]?key|token|password|secret|credential)[\w-]*\s*["']?\s*[:=]\s*["']?[^,"'\s}]+/i;

function redactDiagnosticContent(content: string) {
  return content
    .replace(
      /("[\w-]*(?:api[_-]?key|token|password|secret|credential)[\w-]*"\s*:\s*")[^"]*(")/gi,
      "$1[REDACTED]$2",
    )
    .replace(
      /(\b[\w-]*(?:api[_-]?key|token|password|secret|credential)[\w-]*\b\s*[:=]\s*)["']?[^,"'\s}]+/gi,
      "$1[REDACTED]",
    )
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/\b(?:sk|pk|rk)-[A-Za-z0-9_-]{12,}\b/gi, "[REDACTED]");
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

  let payload: { choices?: { message?: { content?: string | null } }[] };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new AIProviderError("El proveedor de IA devolvió JSON inválido");
  }

  const content = payload.choices?.[0]?.message?.content;
  if (content === null || content === undefined) {
    throw new AIProviderError("El proveedor de IA devolvió JSON inválido");
  }

  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new AIProviderError("El proveedor de IA devolvió JSON inválido");
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    for (const issue of result.error.issues) {
      console.error("[AIProvider] Schema issue:", {
        path: issue.path.map(String).join(".") || "(root)",
        code: issue.code,
        message: issue.message,
      });
    }
    const paths = result.error.issues
      .map((issue) => issue.path.map(String).join(".") || "(root)")
      .join(", ");
    throw new AIProviderError(`La respuesta de IA no cumple el schema: ${paths}`);
  }

  return result.data;
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
  generateResearchBrief: (context) =>
    generate(
      researchBriefSchema,
      "Eres Research Agent. Responde en español y sólo con JSON válido con las claves audienceInsights (array de {insight, basis}), problemsToValidate (array de {problem, whyItMatters}), openQuestions (array de strings), contentOpportunities (array de {topic, relevance, relatedPillar}), claimsToVerify (array de {claim, evidenceNeeded}), researchNotes (array de strings) y limitations (array de strings). Trabaja exclusivamente con la información persistida que recibes. No tienes navegación web ni acceso a búsqueda externa: nunca afirmes haber buscado en Internet, revisado tendencias actuales, consultado fuentes externas, encontrado estadísticas, investigado competidores externamente ni verificado datos fuera del contexto. No inventes fuentes, URLs, estadísticas, competidores ni hechos externos. Distingue contexto proporcionado de hipótesis; toda afirmación no sustentada debe formularse como hipótesis, pregunta abierta o dato por verificar y añadir la evidencia necesaria a claimsToVerify. En audienceInsights, basis NO es una explicación ni una justificación: es únicamente una etiqueta de clasificación y debe contener EXACTAMENTE uno de estos dos strings: \"contexto_proporcionado\" o \"hipotesis\". Nunca debe contener frases, comentarios ni texto adicional. Si el insight deriva directamente de datos entregados en el contexto, usa \"contexto_proporcionado\". Si es una inferencia, posibilidad o supuesto, usa \"hipotesis\". Ejemplo válido: {\"audienceInsights\":[{\"insight\":\"La audiencia podría necesitar información práctica antes de decidir una visita.\",\"basis\":\"hipotesis\"},{\"insight\":\"El objetivo aprobado busca medir conversaciones atribuibles a redes sociales.\",\"basis\":\"contexto_proporcionado\"}]}. contentOpportunities sólo propone temas de investigación o contenido: no redactes posts, copies, captions, guiones ni piezas. Incluye en limitations las carencias relevantes del contexto y que no se realizó investigación externa.",
      context,
    ),
  generateContentBatch: (context) =>
    generate(
      contentBatchSchema,
      "Eres Content Agent. Crea BORRADORES editoriales; nunca los presentes como aprobados, verificados, diseñados ni programados. Responde en español y sólo con JSON válido con la clave items, un array de objetos con exactamente estas claves: type (\"Post\", \"Carrusel\" o \"Reel\"), title, objective, pillar, channel, hook, body, caption, cta, visualBrief, sourceNotes y realityReviewNotes (todas las demás son strings). channel debe ser exclusivamente una etiqueta de plataforma, exactamente una de estas: \"Instagram\", \"Facebook\", \"Instagram/Facebook\", \"TikTok\", \"LinkedIn\", \"YouTube\", \"WhatsApp\", \"Google Business Profile\", \"Email\" o \"Por confirmar\". Usa una plataforma sólo si el contexto persistido confirma que está activa o disponible; si no lo confirma, escribe exactamente \"Por confirmar\". Nunca pongas en channel explicaciones sobre actividad, mensajes, capacidad de atención o validaciones; cualquier condición o dato por confirmar debe anotarse en realityReviewNotes o sourceNotes. Genera exactamente targetContentCount piezas; el valor recibido ya está limitado a 1-8. Incluye como máximo 2 Reels; el resto pueden ser Post o Carrusel según estrategia y contexto. No incluyas Stories. Busca diversidad real de ángulos, no variaciones casi idénticas. Usa exclusivamente los datos persistidos incluidos en el contexto: cliente, objetivo aprobado, estrategia guardada, Brand Hub disponible y Research Brief aprobado. No tienes investigación web. No inventes precios, horarios, ubicación, promociones, estadísticas, testimonios, beneficios, características de productos, resultados, claims de marca ni datos de clientes. Si un dato no está confirmado, redacta sin afirmarlo como hecho e indica qué debe validarse en realityReviewNotes. Respeta las palabras permitidas/prohibidas, promesas autorizadas y restricciones del Brand Hub. Si el Brand Hub está incompleto, usa tono neutral y profesional, no inventes personalidad de marca e indica en sourceNotes o realityReviewNotes qué falta validar. Cada pieza debe relacionarse claramente con el objetivo del ciclo, un pilar estratégico y un insight, problema u oportunidad del Research Brief; usa el CTA del ciclo cuando aplique. sourceNotes debe identificar la oportunidad/insight del brief usada y sus límites; realityReviewNotes debe indicar datos pendientes de confirmar. No agregues hechos fuera del contexto.",
      context,
    ),
};