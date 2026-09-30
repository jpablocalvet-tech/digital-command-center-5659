import { z } from "zod";
import { asc, eq, and } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";

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

  /**
   * Objective Builder V0.2: preview heurístico, NO IA real.
   * Sirve para validar el flujo humano: prioridad de negocio → propuesta → aprobación.
   * En V0.3 se sustituye por IA usando histórico, funnel, capacidad y estacionalidad.
   */
  previewObjective: base
    .input(
      z.object({
        businessGoal: z.string().min(3),
        baseline: z.string().default(""),
        primaryMetric: z.string().default("Solicitudes cualificadas"),
      }),
    )
    .handler(({ input }) => {
      const noBaseline = !input.baseline.trim() || /sin|no hay|no existe/i.test(input.baseline);
      return {
        mode: "simulado" as const,
        objective: noBaseline
          ? `Avanzar la prioridad de negocio “${input.businessGoal}” y establecer una línea base real de ${input.primaryMetric.toLowerCase()} durante el ciclo.`
          : `Avanzar la prioridad de negocio “${input.businessGoal}” mejorando ${input.primaryMetric.toLowerCase()} respecto a la línea base disponible.`,
        primaryMetric: input.primaryMetric || "Solicitudes cualificadas",
        target: noBaseline
          ? "Establecer línea base; no fijar una meta numérica sin datos del primer ciclo"
          : "Definir meta cuantitativa después de revisar la línea base y capacidad del ciclo",
        rationale: noBaseline
          ? "Como todavía no existe una línea base validada, inventar un número objetivo daría falsa precisión. El primer ciclo debe producir evidencia y medir el embudo."
          : "La meta final debe considerar histórico, capacidad operativa y calidad del lead antes de fijar un número.",
      };
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
        objectiveStatus: z.string().default("aprobado"),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...patch } = input;
      const [updated] = await db
        .update(schema.contentCycles)
        .set(patch)
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
