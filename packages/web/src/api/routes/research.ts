import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import { finishAIExecution, startAIExecution } from "../lib/ai/executions";
import {
  AIProviderError,
  aiProvider,
  researchBriefSchema,
} from "../lib/ai/provider";

async function generateResearchBrief(clientId: number, cycleId: number) {
  const [client] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.id, clientId));
  const [cycle] = await db
    .select()
    .from(schema.contentCycles)
    .where(and(eq(schema.contentCycles.clientId, clientId), eq(schema.contentCycles.id, cycleId)));
  const [strategy] = await db
    .select()
    .from(schema.strategies)
    .where(and(eq(schema.strategies.clientId, clientId), eq(schema.strategies.cycleId, cycleId)));

  if (!client || !cycle) {
    throw new ORPCError("NOT_FOUND", { message: "Cliente o ciclo no encontrado" });
  }
  if (!strategy) {
    throw new ORPCError("NOT_FOUND", { message: "Estrategia no encontrada" });
  }
  if (cycle.objectiveStatus !== "aprobado" || !cycle.objective.trim()) {
    throw new ORPCError("BAD_REQUEST", { message: "Aprueba el objetivo del ciclo antes de generar el brief" });
  }
  if (!strategy.audience.trim() || !strategy.problems.trim() || !strategy.pillars.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Guarda audiencia, problemas y pilares en la estrategia antes de generar el brief",
    });
  }

  const execution = await startAIExecution({
    clientId,
    cycleId,
    agent: "Research Agent",
    action: "generateResearchBrief",
    metadata: { sourceStrategyUpdatedAt: strategy.updatedAt.toISOString() },
  });

  try {
    const brief = await aiProvider.generateResearchBrief({
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
    });

    const [savedBrief] = await db
      .insert(schema.researchBriefs)
      .values({
        clientId,
        cycleId,
        executionId: execution.id,
        briefJson: JSON.stringify(brief),
        sourceStrategyUpdatedAt: strategy.updatedAt,
      })
      .returning();

    await finishAIExecution(execution.id, "completado");
    return { ...savedBrief, brief };
  } catch (error) {
    const message =
      error instanceof AIProviderError
        ? error.message
        : "No fue posible generar o guardar el Research Brief";
    await finishAIExecution(execution.id, "error", message);
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
  }
}

export const research = {
  generate: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(({ input }) => generateResearchBrief(input.clientId, input.cycleId)),

  latest: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(async ({ input }) => {
      const [row] = await db
        .select()
        .from(schema.researchBriefs)
        .where(
          and(
            eq(schema.researchBriefs.clientId, input.clientId),
            eq(schema.researchBriefs.cycleId, input.cycleId),
          ),
        )
        .orderBy(desc(schema.researchBriefs.createdAt), desc(schema.researchBriefs.id))
        .limit(1);
      if (!row) return null;
      return { ...row, brief: researchBriefSchema.parse(JSON.parse(row.briefJson)) };
    }),

  review: base
    .input(
      z.object({
        id: z.number(),
        clientId: z.number(),
        cycleId: z.number(),
        reviewStatus: z.enum(["aprobado", "cambios"]),
        humanNote: z.string().max(5000),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(schema.researchBriefs)
        .set({
          reviewStatus: input.reviewStatus,
          humanNote: input.humanNote,
          reviewedAt: new Date(),
        })
        .where(
          and(
            eq(schema.researchBriefs.id, input.id),
            eq(schema.researchBriefs.clientId, input.clientId),
            eq(schema.researchBriefs.cycleId, input.cycleId),
          ),
        )
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Research Brief no encontrado" });
      return updated;
    }),
};