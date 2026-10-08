import { z } from "zod";
import { asc, desc, eq, and } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import { finishAIExecution, startAIExecution } from "../lib/ai/executions";
import {
  AIProviderError,
  aiProvider,
  researchBriefSchema,
  type BrandReviewContext,
  type RealityReviewContext,
} from "../lib/ai/provider";

const stages = [
  "idea",
  "research",
  "copy",
  "diseno",
  "quality",
  "aprobacion",
  "programado",
  "publicado",
] as const;

const decisions = ["aprobar", "cambios", "rechazar", "reality_check"] as const;
const existingContentMessage =
  "Este ciclo ya tiene piezas de contenido. Revísalas en Producción antes de generar un nuevo lote.";
const approvalQualityGateMessage =
  "Completa Brand Guardian y Reality Checker antes de aprobar.";

class ContentBatchAlreadyExistsError extends Error {}
const realityReviewMarker = "\n\nReality Checker (revisión más reciente):\n";

async function loadItem(id: number) {
  const [item] = await db.select().from(schema.contentItems).where(eq(schema.contentItems.id, id));
  if (!item) throw new ORPCError("NOT_FOUND", { message: "Contenido no encontrado" });
  return item;
}

async function generateContentBatch(clientId: number, cycleId: number) {
  const [[client], [cycle]] = await Promise.all([
    db.select().from(schema.clients).where(eq(schema.clients.id, clientId)),
    db
      .select()
      .from(schema.contentCycles)
      .where(
        and(
          eq(schema.contentCycles.clientId, clientId),
          eq(schema.contentCycles.id, cycleId),
        ),
      ),
  ]);
  if (!client || !cycle) {
    throw new ORPCError("NOT_FOUND", { message: "Cliente o ciclo no encontrado" });
  }

  const [existingItems] = await db
    .select({ id: schema.contentItems.id })
    .from(schema.contentItems)
    .where(
      and(
        eq(schema.contentItems.clientId, clientId),
        eq(schema.contentItems.cycleId, cycleId),
      ),
    )
    .limit(1);
  if (existingItems) {
    throw new ORPCError("BAD_REQUEST", {
      message: existingContentMessage,
    });
  }

  if (cycle.objectiveStatus !== "aprobado" || !cycle.objective.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Aprueba el objetivo del ciclo antes de generar contenidos",
    });
  }

  const [strategy] = await db
    .select()
    .from(schema.strategies)
    .where(
      and(
        eq(schema.strategies.clientId, clientId),
        eq(schema.strategies.cycleId, cycleId),
      ),
    );
  if (!strategy || !strategy.audience.trim() || !strategy.problems.trim() || !strategy.pillars.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Guarda la estrategia del ciclo con audiencia, problemas y pilares antes de generar contenidos",
    });
  }

  const [latestBrief] = await db
    .select()
    .from(schema.researchBriefs)
    .where(
      and(
        eq(schema.researchBriefs.clientId, clientId),
        eq(schema.researchBriefs.cycleId, cycleId),
      ),
    )
    .orderBy(desc(schema.researchBriefs.createdAt), desc(schema.researchBriefs.id))
    .limit(1);
  if (!latestBrief) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Genera un Research Brief para este ciclo antes de crear contenidos",
    });
  }
  if (latestBrief.reviewStatus !== "aprobado") {
    throw new ORPCError("BAD_REQUEST", {
      message: "El Research Brief más reciente debe estar aprobado antes de generar contenidos",
    });
  }

  let brief: z.infer<typeof researchBriefSchema>;
  try {
    brief = researchBriefSchema.parse(JSON.parse(latestBrief.briefJson));
  } catch {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "El Research Brief aprobado no tiene un formato válido",
    });
  }

  const targetContentCount = Math.max(1, Math.min(cycle.targetContentCount, 8));
  const execution = await startAIExecution({
    clientId,
    cycleId,
    agent: "Content Agent",
    action: "generateContentBatch",
    metadata: {
      researchBriefId: latestBrief.id,
      targetContentCount,
      strategyUpdatedAt: strategy.updatedAt.toISOString(),
    },
  });

  let batch;
  try {
    batch = await aiProvider.generateContentBatch({
      client: {
        name: client.name,
        businessType: client.type,
        service: client.service,
        generalObjective: client.objective,
        learning: client.learning,
      },
      cycle: {
        name: cycle.name,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        businessGoal: cycle.businessGoal,
        targetContentCount,
      },
      objective: {
        objective: cycle.objective,
        primaryMetric: cycle.primaryMetric,
        baseline: cycle.baseline,
        successCriteria: cycle.target,
        rationale: cycle.objectiveRationale,
      },
      strategy: {
        audience: strategy.audience,
        problems: strategy.problems,
        valueProposition: strategy.valueProp,
        competitorsToReview: strategy.competitors,
        contentPillars: strategy.pillars,
        channels: strategy.channels,
        primaryCTA: strategy.mainCta,
      },
      brandHub: {
        voice: client.brandVoice,
        pillars: client.brandPillars,
        colors: client.brandColors,
        notes: client.brandNotes,
        useWords: client.brandUseWords,
        avoidWords: client.brandAvoidWords,
        allowedPromises: client.allowedPromises,
        communicationRestrictions: client.communicationRestrictions,
      },
      researchBrief: { id: latestBrief.id, ...brief, humanNote: latestBrief.humanNote },
      targetContentCount,
    });
    if (batch.items.length !== targetContentCount) {
      throw new AIProviderError(
        `Content Agent debe devolver exactamente ${targetContentCount} piezas`,
      );
    }
  } catch (error) {
    const message =
      error instanceof AIProviderError
        ? error.message
        : "No fue posible generar el lote de contenidos";
    await finishAIExecution(execution.id, "error", message);
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
  }

  try {
    const savedItems = await db.transaction(async (tx) => {
      const [existingItem] = await tx
        .select({ id: schema.contentItems.id })
        .from(schema.contentItems)
        .where(
          and(
            eq(schema.contentItems.clientId, clientId),
            eq(schema.contentItems.cycleId, cycleId),
          ),
        )
        .limit(1);
      if (existingItem) throw new ContentBatchAlreadyExistsError();

      const insertedItems = await tx
        .insert(schema.contentItems)
        .values(
          batch.items.map((item) => ({
            clientId,
            cycleId,
            type: item.type,
            title: item.title,
            objective: item.objective,
            cta: item.cta,
            pillar: item.pillar,
            channel: item.channel,
            hook: item.hook,
            body: item.body,
            caption: item.caption,
            visualBrief: item.visualBrief,
            sourceNotes: item.sourceNotes,
            realityReviewNotes: item.realityReviewNotes,
            stage: "copy",
            approvalState: "pendiente",
            brandStatus: "Pendiente",
            realityStatus: "Pendiente",
          })),
        )
        .returning({ id: schema.contentItems.id });
      if (insertedItems.length !== targetContentCount) {
        throw new Error("No se guardaron todas las piezas del lote");
      }
      await tx
        .update(schema.aiExecutions)
        .set({ status: "completado", errorMessage: "", completedAt: new Date() })
        .where(eq(schema.aiExecutions.id, execution.id));
      return insertedItems;
    });
    return { clientId, cycleId, createdCount: savedItems.length };
  } catch (error) {
    const alreadyExists = error instanceof ContentBatchAlreadyExistsError;
    const message = alreadyExists
      ? existingContentMessage
      : "No fue posible guardar el lote; no se guardó ninguna pieza.";
    await finishAIExecution(execution.id, "error", message);
    if (alreadyExists) {
      throw new ORPCError("BAD_REQUEST", { message });
    }
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
  }
}

async function loadQualityReviewContext(
  clientId: number,
  cycleId: number,
  needsBrief: false,
): Promise<{ items: typeof schema.contentItems.$inferSelect[]; context: BrandReviewContext }>;
async function loadQualityReviewContext(
  clientId: number,
  cycleId: number,
  needsBrief: true,
): Promise<{ items: typeof schema.contentItems.$inferSelect[]; context: RealityReviewContext }>;
async function loadQualityReviewContext(
  clientId: number,
  cycleId: number,
  needsBrief: boolean,
) {
  const [[client], [cycle], [strategy], items] = await Promise.all([
    db.select().from(schema.clients).where(eq(schema.clients.id, clientId)),
    db
      .select()
      .from(schema.contentCycles)
      .where(
        and(
          eq(schema.contentCycles.clientId, clientId),
          eq(schema.contentCycles.id, cycleId),
        ),
      ),
    db
      .select()
      .from(schema.strategies)
      .where(
        and(
          eq(schema.strategies.clientId, clientId),
          eq(schema.strategies.cycleId, cycleId),
        ),
      ),
    db
      .select()
      .from(schema.contentItems)
      .where(
        and(
          eq(schema.contentItems.clientId, clientId),
          eq(schema.contentItems.cycleId, cycleId),
        ),
      )
      .orderBy(asc(schema.contentItems.id)),
  ]);

  if (!client || !cycle) {
    throw new ORPCError("NOT_FOUND", { message: "Cliente o ciclo no encontrado" });
  }
  if (cycle.objectiveStatus !== "aprobado" || !cycle.objective.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Aprueba el objetivo del ciclo antes de ejecutar las revisiones",
    });
  }
  if (!strategy) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Guarda la estrategia del ciclo antes de ejecutar las revisiones",
    });
  }
  if (items.length === 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Este ciclo todavía no tiene piezas de contenido para revisar",
    });
  }

  const commonContext = {
    client: {
      name: client.name,
      businessType: client.type,
      service: client.service,
      generalObjective: client.objective,
      learning: client.learning,
    },
    cycle: {
      name: cycle.name,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      businessGoal: cycle.businessGoal,
      objective: cycle.objective,
    },
    objective: {
      objective: cycle.objective,
      primaryMetric: cycle.primaryMetric,
      baseline: cycle.baseline,
      successCriteria: cycle.target,
      rationale: cycle.objectiveRationale,
    },
    strategy: {
      audience: strategy.audience,
      problems: strategy.problems,
      valueProposition: strategy.valueProp,
      contentPillars: strategy.pillars,
      channels: strategy.channels,
      primaryCTA: strategy.mainCta,
    },
    brandHub: {
      voice: client.brandVoice,
      pillars: client.brandPillars,
      colors: client.brandColors,
      notes: client.brandNotes,
      useWords: client.brandUseWords,
      avoidWords: client.brandAvoidWords,
      allowedPromises: client.allowedPromises,
      communicationRestrictions: client.communicationRestrictions,
    },
  };
  const brandItems = items.map((item) => ({
    contentId: item.id,
    type: item.type,
    title: item.title,
    objective: item.objective,
    pillar: item.pillar,
    channel: item.channel,
    hook: item.hook,
    body: item.body,
    caption: item.caption,
    cta: item.cta,
    visualBrief: item.visualBrief,
  }));

  if (!needsBrief) {
    return {
      items,
      context: { ...commonContext, items: brandItems },
    };
  }

  const [latestBrief] = await db
    .select()
    .from(schema.researchBriefs)
    .where(
      and(
        eq(schema.researchBriefs.clientId, clientId),
        eq(schema.researchBriefs.cycleId, cycleId),
      ),
    )
    .orderBy(desc(schema.researchBriefs.createdAt), desc(schema.researchBriefs.id))
    .limit(1);
  if (!latestBrief || latestBrief.reviewStatus !== "aprobado") {
    throw new ORPCError("BAD_REQUEST", {
      message: "El Research Brief más reciente del ciclo debe estar aprobado para verificar afirmaciones",
    });
  }

  let brief: z.infer<typeof researchBriefSchema>;
  try {
    brief = researchBriefSchema.parse(JSON.parse(latestBrief.briefJson));
  } catch {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "El Research Brief aprobado no tiene un formato válido",
    });
  }

  return {
    items,
    context: {
      ...commonContext,
      researchBrief: { id: latestBrief.id, ...brief, humanNote: latestBrief.humanNote },
      items: items.map((item) => ({
        contentId: item.id,
        type: item.type,
        title: item.title,
        objective: item.objective,
        pillar: item.pillar,
        channel: item.channel,
        hook: item.hook,
        body: item.body,
        caption: item.caption,
        cta: item.cta,
        visualBrief: item.visualBrief,
        sourceNotes: item.sourceNotes,
        realityReviewNotes: item.realityReviewNotes,
      })),
    },
  };
}

function assertReviewIdsMatch(
  expectedItems: { id: number }[],
  returnedItems: { contentId: number }[],
) {
  const expectedIds = new Set(expectedItems.map((item) => item.id));
  const returnedIds = returnedItems.map((item) => item.contentId);
  if (
    returnedIds.length !== expectedIds.size ||
    new Set(returnedIds).size !== returnedIds.length ||
    returnedIds.some((id) => !expectedIds.has(id))
  ) {
    throw new AIProviderError(
      "La respuesta del agente debe incluir exactamente una revisión por pieza del ciclo",
    );
  }
}

function preserveEarlierRealityNotes(previousNotes: string, reviewNotes: string) {
  const markerIndex = previousNotes.indexOf(realityReviewMarker);
  const earlierNotes = (markerIndex < 0 ? previousNotes : previousNotes.slice(0, markerIndex)).trim();
  return [earlierNotes, `${realityReviewMarker.trim()}\n${reviewNotes}`]
    .filter(Boolean)
    .join("\n\n");
}

async function reviewContentBatch(
  clientId: number,
  cycleId: number,
  agent: "Brand Guardian" | "Reality Checker",
) {
  const needsBrief = agent === "Reality Checker";
  const { context, items } = await loadQualityReviewContext(clientId, cycleId, needsBrief);
  const action = needsBrief ? "reviewRealityBatch" : "reviewBrandBatch";
  const execution = await startAIExecution({ clientId, cycleId, agent, action });

  let reviews;
  try {
    reviews = needsBrief
      ? await aiProvider.reviewRealityBatch(context)
      : await aiProvider.reviewBrandBatch(context);
    assertReviewIdsMatch(items, reviews.items);
    if (
      !needsBrief &&
      !Object.values(context.brandHub).some(
        (value) => typeof value === "string" && value.trim().length > 0,
      )
    ) {
      reviews = {
        items: reviews.items.map((review) => ({
          ...review,
          status: "En revisión",
          notes: [
            "Brand Hub vacío; no es posible confirmar compatibilidad de marca con la información persistida.",
            review.notes,
          ]
            .filter(Boolean)
            .join("\n\n"),
        })),
      };
    }
  } catch (error) {
    const message =
      error instanceof AIProviderError
        ? error.message
        : `No fue posible completar la revisión de ${agent}`;
    await finishAIExecution(execution.id, "error", message);
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
  }

  try {
    await db.transaction(async (tx) => {
      for (const review of reviews.items) {
        const original = items.find((item) => item.id === review.contentId)!;
        const values = needsBrief
          ? {
              realityStatus: review.status,
              realityReviewNotes: preserveEarlierRealityNotes(
                original.realityReviewNotes,
                review.notes,
              ),
              updatedAt: new Date(),
            }
          : {
              brandStatus: review.status,
              brandReviewNotes: review.notes,
              updatedAt: new Date(),
            };
        const [updated] = await tx
          .update(schema.contentItems)
          .set(values)
          .where(
            and(
              eq(schema.contentItems.id, review.contentId),
              eq(schema.contentItems.clientId, clientId),
              eq(schema.contentItems.cycleId, cycleId),
            ),
          )
          .returning({ id: schema.contentItems.id });
        if (!updated) {
          throw new Error("Una pieza del ciclo dejó de estar disponible durante la revisión");
        }
      }

      await tx
        .update(schema.aiExecutions)
        .set({ status: "completado", errorMessage: "", completedAt: new Date() })
        .where(eq(schema.aiExecutions.id, execution.id));
    });
  } catch {
    const message = `No fue posible guardar todas las revisiones de ${agent}; los cambios se revirtieron.`;
    await finishAIExecution(execution.id, "error", message);
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
  }

  return {
    clientId,
    cycleId,
    approvedCount: needsBrief
      ? 0
      : reviews.items.filter((item) => item.status === "Aprobado").length,
    needsReviewCount: needsBrief
      ? 0
      : reviews.items.filter((item) => item.status === "En revisión").length,
    verifiedCount: needsBrief
      ? reviews.items.filter((item) => item.status === "Verificado").length
      : 0,
    needsConfirmationCount: needsBrief
      ? reviews.items.filter((item) => item.status === "Dato por confirmar").length
      : 0,
  };
}

export const content = {
  list: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(({ input }) =>
      db
        .select()
        .from(schema.contentItems)
        .where(
          and(
            eq(schema.contentItems.clientId, input.clientId),
            eq(schema.contentItems.cycleId, input.cycleId),
          ),
        )
        .orderBy(asc(schema.contentItems.id)),
    ),

  generateBatch: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(({ input }) => generateContentBatch(input.clientId, input.cycleId)),

  reviewBrandBatch: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(({ input }) => reviewContentBatch(input.clientId, input.cycleId, "Brand Guardian")),

  reviewRealityBatch: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(({ input }) => reviewContentBatch(input.clientId, input.cycleId, "Reality Checker")),

  detail: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const item = await loadItem(input.id);
    const events = await db
      .select()
      .from(schema.approvalEvents)
      .where(eq(schema.approvalEvents.contentId, item.id))
      .orderBy(asc(schema.approvalEvents.createdAt), asc(schema.approvalEvents.id));
    return { item, events };
  }),

  updateDetails: base
    .input(
      z.object({
        id: z.number(),
        type: z.string(),
        title: z.string(),
        objective: z.string(),
        cta: z.string(),
        pillar: z.string(),
        channel: z.string(),
        hook: z.string(),
        body: z.string(),
        caption: z.string(),
        visualBrief: z.string(),
        assetUrl: z.string(),
        sourceNotes: z.string(),
        brandReviewNotes: z.string(),
        realityReviewNotes: z.string(),
        scheduledLabel: z.string(),
        scheduledBucket: z.string(),
        note: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...patch } = input;
      await loadItem(id);
      const [updated] = await db
        .update(schema.contentItems)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(schema.contentItems.id, id))
        .returning();
      return updated;
    }),

  /** Mueve una pieza de fase en el tablero de Producción. */
  setStage: base
    .input(z.object({ id: z.number(), stage: z.enum(stages) }))
    .handler(async ({ input }) => {
      const item = await loadItem(input.id);
      if (
        input.stage === "programado" &&
        (item.brandStatus !== "Aprobado" || item.realityStatus !== "Verificado")
      ) {
        throw new ORPCError("BAD_REQUEST", { message: approvalQualityGateMessage });
      }
      const patch: Record<string, unknown> = { stage: input.stage, updatedAt: new Date() };
      if (input.stage === "aprobacion") patch.approvalState = "listo";
      if (input.stage === "programado") patch.approvalState = "aprobado";
      const [updated] = await db
        .update(schema.contentItems)
        .set(patch)
        .where(eq(schema.contentItems.id, input.id))
        .returning();
      return updated;
    }),

  /** Decisión humana desde Aprobaciones o Approval Watch, con historial inmutable. */
  decide: base
    .input(
      z.object({ id: z.number(), decision: z.enum(decisions), note: z.string().optional() }),
    )
    .handler(async ({ input }) => {
      const item = await loadItem(input.id);
      if (
        input.decision === "aprobar" &&
        (item.brandStatus !== "Aprobado" || item.realityStatus !== "Verificado")
      ) {
        throw new ORPCError("BAD_REQUEST", { message: approvalQualityGateMessage });
      }
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      let eventNote = input.note ?? "";

      if (input.decision === "aprobar") {
        patch.approvalState = "aprobado";
        patch.stage = "programado";
        patch.note = input.note ?? "Aprobado por el fundador.";
        eventNote ||= "Aprobado por el fundador.";
      }
      if (input.decision === "cambios") {
        patch.approvalState = "cambios";
        patch.stage = "copy";
        patch.note = input.note ?? "Cambios solicitados por el fundador.";
        eventNote ||= "Cambios solicitados por el fundador.";
      }
      if (input.decision === "rechazar") {
        patch.approvalState = "rechazado";
        patch.stage = "idea";
        patch.note = input.note ?? "Rechazado por el fundador.";
        eventNote ||= "Rechazado por el fundador.";
      }
      if (input.decision === "reality_check") {
        patch.approvalState = "pendiente";
        patch.stage = "quality";
        patch.realityStatus = "En verificación";
        patch.note = input.note ?? "Enviado al Reality Checker.";
        eventNote ||= "Enviado al Reality Checker.";
      }

      const [updated] = await db
        .update(schema.contentItems)
        .set(patch)
        .where(eq(schema.contentItems.id, item.id))
        .returning();

      await db.insert(schema.approvalEvents).values({
        contentId: item.id,
        decision: input.decision,
        note: eventNote,
      });

      const all = await db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.clientId, item.clientId));
      await db
        .update(schema.clients)
        .set({ scheduled: all.filter((c) => c.stage === "programado").length })
        .where(eq(schema.clients.id, item.clientId));

      return updated;
    }),
};
