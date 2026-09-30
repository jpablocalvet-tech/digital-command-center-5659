import { z } from "zod";
import { asc, eq, and } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import { calculateAutomation } from "../lib/metrics";

const classifications = [
  "automatizable",
  "estandarizable",
  "delegable",
  "founder_only",
] as const;
const priorities = ["alta", "media", "baja"] as const;
const statuses = ["pendiente", "en_proceso", "resuelto"] as const;
const categories = [
  "Estrategia",
  "Research",
  "Revisión",
  "Diseño",
  "Cliente",
  "Administración",
  "Ventas",
  "Otros",
] as const;

export const hours = {
  /** Founder Hours reales + Manual Tasks + Automation Backlog por cliente/ciclo. */
  overview: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(async ({ input }) => {
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.id, input.clientId));
      if (!client) throw new ORPCError("NOT_FOUND", { message: "Cliente no encontrado" });

      const [cycle] = await db
        .select()
        .from(schema.contentCycles)
        .where(
          and(
            eq(schema.contentCycles.id, input.cycleId),
            eq(schema.contentCycles.clientId, client.id),
          ),
        );
      if (!cycle) throw new ORPCError("NOT_FOUND", { message: "Ciclo no encontrado" });

      const [entries, tasks] = await Promise.all([
        db
          .select()
          .from(schema.timeEntries)
          .where(
            and(
              eq(schema.timeEntries.clientId, client.id),
              eq(schema.timeEntries.cycleId, cycle.id),
            ),
          )
          .orderBy(asc(schema.timeEntries.date), asc(schema.timeEntries.id)),
        db
          .select()
          .from(schema.manualTasks)
          .where(eq(schema.manualTasks.clientId, client.id))
          .orderBy(asc(schema.manualTasks.id)),
      ]);

      const distribution = Object.entries(
        entries.reduce<Record<string, number>>((acc, entry) => {
          acc[entry.category] = (acc[entry.category] ?? 0) + entry.minutes;
          return acc;
        }, {}),
      ).map(([category, minutes], index) => ({ id: index + 1, category, minutes }));

      const automation = calculateAutomation(tasks);
      const backlog = tasks
        .filter((task) => task.classification !== "founder_only" && task.status !== "resuelto")
        .map((task) => ({ ...task, recoverableMinutes: task.minutes * task.timesPerMonth }))
        .sort((a, b) => b.recoverableMinutes - a.recoverableMinutes);

      return {
        client,
        cycle,
        entries,
        distribution,
        totalMinutes: entries.reduce((total, entry) => total + entry.minutes, 0),
        targetMinutes: 240,
        tasks,
        backlog,
        recoverableMinutes: automation.recoverableMinutes,
        eliminatedMinutes: automation.eliminatedMinutes,
        manualMonthlyMinutes: automation.manualMinutes,
        automation,
      };
    }),

  createTimeEntry: base
    .input(
      z.object({
        clientId: z.number(),
        cycleId: z.number(),
        category: z.enum(categories),
        minutes: z.number().int().min(1).max(24 * 60),
        date: z.string().min(10),
        description: z.string().default(""),
      }),
    )
    .handler(async ({ input }) => {
      const [created] = await db.insert(schema.timeEntries).values(input).returning();
      return created;
    }),

  deleteTimeEntry: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [deleted] = await db
      .delete(schema.timeEntries)
      .where(eq(schema.timeEntries.id, input.id))
      .returning();
    if (!deleted) throw new ORPCError("NOT_FOUND", { message: "Registro no encontrado" });
    return deleted;
  }),

  updateTask: base
    .input(
      z.object({
        id: z.number(),
        classification: z.enum(classifications).optional(),
        priority: z.enum(priorities).optional(),
        status: z.enum(statuses).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...patch } = input;
      const [updated] = await db
        .update(schema.manualTasks)
        .set(patch)
        .where(eq(schema.manualTasks.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Tarea no encontrada" });
      return updated;
    }),

  createTask: base
    .input(
      z.object({
        clientId: z.number(),
        task: z.string().min(2),
        frequency: z.string().min(1),
        minutes: z.number().int().min(1),
        timesPerMonth: z.number().int().min(1),
        classification: z.enum(classifications),
        priority: z.enum(priorities),
      }),
    )
    .handler(async ({ input }) => {
      const [created] = await db
        .insert(schema.manualTasks)
        .values({ ...input, status: "pendiente" })
        .returning();
      return created;
    }),
};
