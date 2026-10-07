import { z } from "zod";
import { asc, eq, and } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import { finishAIExecution, startAIExecution } from "../lib/ai/executions";
import { AIProviderError, aiProvider } from "../lib/ai/provider";

const statuses = ["Planificado", "Activo", "Cerrado"] as const;

const agentTemplates = [
  ["Marketing Orchestrator", "Coordina el ciclo y reparte trabajo"],
  ["Research Agent", "Investiga audiencia y temas"],
  ["Competitor Agent", "Observa competencia y referencias"],
  ["Strategy Agent", "Define pilares y ángulos"],
  ["Content Agent", "Escribe copy y guiones"],
  ["Brand Guardian", "Verifica tono y coherencia de marca"],
  ["Reality Checker", "Comprueba datos y afirmaciones"],
  ["Analytics Agent", "Lee resultados y aprendizajes"],
] as const;

export const cycles = {
  list: base.input(z.object({ clientId: z.number() })).handler(({ input }) =>
    db
      .select()
      .from(schema.contentCycles)
      .where(eq(schema.contentCycles.clientId, input.clientId))
      .orderBy(asc(schema.contentCycles.startDate)),
  ),

  get: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [row] = await db
      .select()
      .from(schema.contentCycles)
      .where(eq(schema.contentCycles.id, input.id));
    if (!row) throw new ORPCError("NOT_FOUND", { message: "Ciclo no encontrado" });
    return row;
  }),

  active: base.input(z.object({ clientId: z.number() })).handler(async ({ input }) => {
    const [row] = await db
      .select()
      .from(schema.contentCycles)
      .where(
        and(
          eq(schema.contentCycles.clientId, input.clientId),
          eq(schema.contentCycles.status, "Activo"),
        ),
      );
    return row ?? null;
  }),

  create: base
    .input(
      z.object({
        clientId: z.number(),
        name: z.string().min(2),
        startDate: z.string().min(10),
        endDate: z.string().min(10),
        businessGoal: z.string().default(""),
        objective: z.string().default(""),
        primaryMetric: z.string().default(""),
        baseline: z.string().default(""),
        target: z.string().default(""),
        objectiveRationale: z.string().default(""),
        status: z.enum(statuses).default("Planificado"),
        targetContentCount: z.number().int().min(1).max(100).default(8),
      }),
    )
    .handler(async ({ input }) => {
      if (input.status === "Activo") {
        const existing = await db
          .select()
          .from(schema.contentCycles)
          .where(
            and(
              eq(schema.contentCycles.clientId, input.clientId),
              eq(schema.contentCycles.status, "Activo"),
            ),
          );
        for (const cycle of existing) {
          await db
            .update(schema.contentCycles)
            .set({ status: "Cerrado" })
            .where(eq(schema.contentCycles.id, cycle.id));
        }
      }

      const [created] = await db
        .insert(schema.contentCycles)
        .values({
          ...input,
          objectiveSource: "manual",
          objectiveStatus: input.objective.trim() ? "aprobado" : "borrador",
          objectiveProposalStatus: input.objective.trim() ? "aprobado" : "sin propuesta",
        })
        .returning();

      await db.insert(schema.strategies).values({
        clientId: created.clientId,
        cycleId: created.id,
        objective: created.objective,
        audience: "",
        problems: "",
        valueProp: "",
        competitors: "",
        pillars: "",
        channels: "",
        mainCta: "",
        aiStatus: "inactivo",
        aiMessage: "",
      });

      await db.insert(schema.agents).values(
        agentTemplates.map(([name, role], index) => ({
          clientId: created.clientId,
          cycleId: created.id,
          position: index + 1,
          name,
          role,
          status: "esperando",
          lastAction: "Ciclo nuevo; sin ejecución todavía",
        })),
      );

      return created;
    }),

  previewObjective: base
    .input(
      z.object({
        clientId: z.number(),
        cycleId: z.number(),
        businessGoal: z.string().min(3),
        primaryMetric: z.string().default(""),
        baseline: z.string().default(""),
      }),
    )
    .handler(async ({ input }) => {
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.id, input.clientId));
      const [cycle] = await db
        .select()
        .from(schema.contentCycles)
        .where(
          and(
            eq(schema.contentCycles.id, input.cycleId),
            eq(schema.contentCycles.clientId, input.clientId),
          ),
        );
      if (!client || !cycle) throw new ORPCError("NOT_FOUND", { message: "Cliente o ciclo no encontrado" });

      const [clientCycles, clientContent, timeEntries, tasks] = await Promise.all([
        db.select().from(schema.contentCycles).where(eq(schema.contentCycles.clientId, client.id)),
        db.select().from(schema.contentItems).where(eq(schema.contentItems.clientId, client.id)),
        db.select().from(schema.timeEntries).where(eq(schema.timeEntries.clientId, client.id)),
        db.select().from(schema.manualTasks).where(eq(schema.manualTasks.clientId, client.id)),
      ]);
      const previousCycles = clientCycles
        .filter((entry) => entry.id !== cycle.id)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .slice(-5);
      const previousCycleIds = new Set(previousCycles.map((entry) => entry.id));
      const currentItems = clientContent.filter((item) => item.cycleId === cycle.id);
      const previousItems = clientContent.filter((item) => previousCycleIds.has(item.cycleId));
      const currentMinutes = timeEntries
        .filter((entry) => entry.cycleId === cycle.id)
        .reduce((total, entry) => total + entry.minutes, 0);

      const execution = await startAIExecution({
        ...input,
        agent: "Objective Builder",
        action: "generateObjective",
        metadata: {
          historicalCycleCount: previousCycles.length,
          priorContentCount: previousItems.length,
          currentContentCount: currentItems.length,
          founderMinutesRecorded: currentMinutes,
        },
      });
      await db
        .update(schema.contentCycles)
        .set({
          businessGoal: input.businessGoal,
          primaryMetric: input.primaryMetric || cycle.primaryMetric,
          baseline: input.baseline || cycle.baseline,
          objectiveProposalStatus: "generando",
        })
        .where(eq(schema.contentCycles.id, cycle.id));

      try {
        const generated = await aiProvider.generateObjective({
          client: {
            name: client.name,
            businessType: client.type,
            service: client.service,
            generalObjective: client.objective,
            leads: client.leads,
            scheduled: client.scheduled,
            learning: client.learning,
          },
          cycle: {
            ...cycle,
            businessGoal: input.businessGoal,
            primaryMetric: input.primaryMetric || cycle.primaryMetric,
            baseline: input.baseline || cycle.baseline,
          },
          historicalCycles: previousCycles.map((previous) => ({
            name: previous.name,
            objective: previous.objective,
            primaryMetric: previous.primaryMetric,
            baseline: previous.baseline,
            target: previous.target,
            contentCount: previousItems.filter((item) => item.cycleId === previous.id).length,
            publishedCount: previousItems.filter(
              (item) => item.cycleId === previous.id && item.stage === "publicado",
            ).length,
          })),
          results: {
            previousContentCount: previousItems.length,
            previousPublishedCount: previousItems.filter((item) => item.stage === "publicado").length,
            previousApprovedCount: previousItems.filter((item) => item.approvalState === "aprobado").length,
            currentContentCount: currentItems.length,
            currentPublishedCount: currentItems.filter((item) => item.stage === "publicado").length,
          },
          capacity: {
            targetContentCount: cycle.targetContentCount,
            founderMinutesRecorded: currentMinutes,
            founderHoursRecorded: Math.round((currentMinutes / 60) * 10) / 10,
            monthlyTaskMinutes: tasks.reduce((total, task) => total + task.minutes * task.timesPerMonth, 0),
          },
        });
        const baseline = input.baseline || cycle.baseline;
        const hasBaseline =
          /\d/.test(baseline) &&
          !/(sin|no hay|no existe|no validada|por definir)/i.test(baseline);
        const proposal = hasBaseline
          ? generated
          : {
              ...generated,
              objective: `Construir una línea base fiable de ${generated.primaryMetric} para medir el avance de la prioridad de negocio durante este ciclo.`,
              successCriteria: [
                `Registrar el valor inicial y final de ${generated.primaryMetric} con la misma definición.`,
                "Documentar el volumen y la calidad de las solicitudes generadas durante el ciclo.",
                "Identificar qué canales y acciones contribuyeron a los resultados para fijar una meta respaldada en el siguiente ciclo.",
              ],
              reasoning:
                "No hay una línea base cuantitativa suficiente para fijar una meta numérica responsable. El primer ciclo debe medir resultados comparables y construir esa línea base.",
              assumptions: [
                "Se podrá registrar la métrica con la misma definición durante todo el ciclo.",
                "El volumen por sí solo no representa la calidad de las solicitudes; también se revisará su cualificación.",
              ],
              confidenceNotes: [
                "Histórico insuficiente: este ciclo sirve para construir una línea base, no para fijar metas numéricas.",
                "La confianza de cualquier objetivo cuantitativo debe revisarse con datos del ciclo completo.",
              ],
            };

        await db
          .update(schema.contentCycles)
          .set({
            objectiveProposal: JSON.stringify(proposal),
            objectiveProposalStatus: "propuesto",
          })
          .where(eq(schema.contentCycles.id, cycle.id));
        await finishAIExecution(execution.id, "completado");
        return proposal;
      } catch (error) {
        const message =
          error instanceof AIProviderError ? error.message : "No fue posible generar la propuesta de objetivo";
        await db
          .update(schema.contentCycles)
          .set({ objectiveProposalStatus: "error" })
          .where(eq(schema.contentCycles.id, cycle.id));
        await finishAIExecution(execution.id, "error", message);
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
      }
    }),

  updateObjective: base
    .input(
      z.object({
        id: z.number(),
        businessGoal: z.string(),
        objective: z.string(),
        primaryMetric: z.string(),
        baseline: z.string(),
        target: z.string(),
        objectiveRationale: z.string(),
        objectiveSource: z.string().default("manual"),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...patch } = input;
      const [updated] = await db
        .update(schema.contentCycles)
        .set({ ...patch, objectiveStatus: "aprobado", objectiveProposalStatus: "aprobado" })
        .where(eq(schema.contentCycles.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Ciclo no encontrado" });

      // Mantener Strategy Lab alineado con el objetivo aprobado del ciclo.
      await db
        .update(schema.strategies)
        .set({ objective: updated.objective, updatedAt: new Date() })
        .where(
          and(
            eq(schema.strategies.clientId, updated.clientId),
            eq(schema.strategies.cycleId, updated.id),
          ),
        );

      return updated;
    }),
};
