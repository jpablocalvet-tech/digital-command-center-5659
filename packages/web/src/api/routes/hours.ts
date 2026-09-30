import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";

const classifications = [
  "automatizable",
  "estandarizable",
  "delegable",
  "founder_only",
] as const;
const priorities = ["alta", "media", "baja"] as const;
const statuses = ["pendiente", "en_proceso", "resuelto"] as const;

export const hours = {
  /** Founder Hours + Manual Tasks Tracker + Automation Backlog de un cliente. */
  overview: base.input(z.object({ clientId: z.number() })).handler(async ({ input }) => {
    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, input.clientId));
    if (!client) throw new ORPCError("NOT_FOUND", { message: "Cliente no encontrado" });

    const [distribution, tasks] = await Promise.all([
      db
        .select()
        .from(schema.founderHours)
        .where(eq(schema.founderHours.clientId, client.id))
        .orderBy(asc(schema.founderHours.id)),
      db
        .select()
        .from(schema.manualTasks)
        .where(eq(schema.manualTasks.clientId, client.id))
        .orderBy(asc(schema.manualTasks.id)),
    ]);

    const backlog = tasks
      .filter((t) => t.classification !== "founder_only" && t.status !== "resuelto")
      .map((t) => ({ ...t, recoverableMinutes: t.minutes * t.timesPerMonth }))
      .sort((a, b) => b.recoverableMinutes - a.recoverableMinutes);

    return {
      client,
      distribution,
      totalMinutes: distribution.reduce((total, d) => total + d.minutes, 0),
      targetMinutes: 240,
      tasks,
      backlog,
      recoverableMinutes: backlog.reduce((total, t) => total + t.recoverableMinutes, 0),
      automation: {
        automated: client.automationScore,
        standardized: client.standardizedScore,
        manual: client.manualScore,
      },
    };
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
