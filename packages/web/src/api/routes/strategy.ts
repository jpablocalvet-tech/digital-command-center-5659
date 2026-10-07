import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import { finishAIExecution, startAIExecution } from "../lib/ai/executions";
import { AIProviderError, aiProvider } from "../lib/ai/provider";

async function loadStrategy(clientId: number, cycleId: number) {
  const [row] = await db
    .select()
    .from(schema.strategies)
    .where(
      and(eq(schema.strategies.clientId, clientId), eq(schema.strategies.cycleId, cycleId)),
    );
  if (!row) throw new ORPCError("NOT_FOUND", { message: "Estrategia no encontrada" });
  return row;
}

const fields = z.object({
  objective: z.string(),
  audience: z.string(),
  problems: z.string(),
  valueProp: z.string(),
  competitors: z.string(),
  pillars: z.string(),
  channels: z.string(),
  mainCta: z.string(),
});

async function generateStrategy(clientId: number, cycleId: number) {
  const [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, clientId));
  const [cycle] = await db
    .select()
    .from(schema.contentCycles)
    .where(and(eq(schema.contentCycles.clientId, clientId), eq(schema.contentCycles.id, cycleId)));
  const strategy = await loadStrategy(clientId, cycleId);
  if (!client || !cycle) throw new ORPCError("NOT_FOUND", { message: "Cliente o ciclo no encontrado" });
  if (cycle.objectiveStatus !== "aprobado" || !cycle.objective.trim()) {
    throw new ORPCError("BAD_REQUEST", { message: "Aprueba un objetivo antes de generar la estrategia" });
  }

  const [entries, tasks] = await Promise.all([
    db
      .select()
      .from(schema.timeEntries)
      .where(
        and(
          eq(schema.timeEntries.clientId, clientId),
          eq(schema.timeEntries.cycleId, cycleId),
        ),
      ),
    db.select().from(schema.manualTasks).where(eq(schema.manualTasks.clientId, clientId)),
  ]);
  const founderMinutes = entries.reduce((total, entry) => total + entry.minutes, 0);
  const execution = await startAIExecution({
    clientId,
    cycleId,
    agent: "Marketing Orchestrator",
    action: "generateStrategy",
    metadata: {
      targetContentCount: cycle.targetContentCount,
      founderMinutesRecorded: founderMinutes,
      manualTaskCount: tasks.length,
    },
  });

  try {
    const proposal = await aiProvider.generateStrategy({
      client: {
        name: client.name,
        businessType: client.type,
        service: client.service,
        generalObjective: client.objective,
      },
      cycle: {
        name: cycle.name,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        objective: cycle.objective,
        primaryMetric: cycle.primaryMetric,
        successCriteria: cycle.target,
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
      capacity: {
        targetContentCount: cycle.targetContentCount,
        founderMinutesRecorded: founderMinutes,
        monthlyTaskMinutes: tasks.reduce((total, task) => total + task.minutes * task.timesPerMonth, 0),
      },
      targetContentCount: cycle.targetContentCount,
    });
    await finishAIExecution(execution.id, "completado");
    return proposal;
  } catch (error) {
    const message =
      error instanceof AIProviderError ? error.message : "No fue posible generar la estrategia";
    await finishAIExecution(execution.id, "error", message);
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
  }
}

export const strategy = {
  get: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(({ input }) => loadStrategy(input.clientId, input.cycleId)),

  update: base
    .input(z.object({ clientId: z.number(), cycleId: z.number(), values: fields }))
    .handler(async ({ input }) => {
      const row = await loadStrategy(input.clientId, input.cycleId);
      const [updated] = await db
        .update(schema.strategies)
        .set({ ...input.values, updatedAt: new Date() })
        .where(eq(schema.strategies.id, row.id))
        .returning();
      return updated;
    }),

  generate: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(({ input }) => generateStrategy(input.clientId, input.cycleId)),

  simulateGeneration: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(({ input }) => generateStrategy(input.clientId, input.cycleId)),
};
