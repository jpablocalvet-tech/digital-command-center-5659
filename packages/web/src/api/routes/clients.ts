import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";

async function loadClient(id: number) {
  const [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, id));
  if (!client) throw new ORPCError("NOT_FOUND", { message: "Cliente no encontrado" });
  return client;
}

export const clients = {
  /** Lista para el selector superior y la pantalla de Clientes. */
  list: base.handler(async () => {
    const rows = await db.select().from(schema.clients).orderBy(asc(schema.clients.id));
    const hours = await db.select().from(schema.founderHours);
    return rows.map((client) => ({
      ...client,
      founderMinutes: hours
        .filter((h) => h.clientId === client.id)
        .reduce((total, h) => total + h.minutes, 0),
    }));
  }),

  get: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const client = await loadClient(input.id);
    const hours = await db
      .select()
      .from(schema.founderHours)
      .where(eq(schema.founderHours.clientId, client.id));
    return {
      ...client,
      founderMinutes: hours.reduce((total, h) => total + h.minutes, 0),
    };
  }),

  /** Todo lo que necesita la pantalla Inicio en una sola llamada. */
  dashboard: base.input(z.object({ clientId: z.number() })).handler(async ({ input }) => {
    const client = await loadClient(input.clientId);
    const [attention, content, pipeline, agents, hours, tasks] = await Promise.all([
      db
        .select()
        .from(schema.attentionItems)
        .where(eq(schema.attentionItems.clientId, client.id))
        .orderBy(asc(schema.attentionItems.id)),
      db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.clientId, client.id))
        .orderBy(asc(schema.contentItems.id)),
      db
        .select()
        .from(schema.pipelineStages)
        .where(eq(schema.pipelineStages.clientId, client.id))
        .orderBy(asc(schema.pipelineStages.position)),
      db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.clientId, client.id))
        .orderBy(asc(schema.agents.position)),
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

    const founderMinutes = hours.reduce((total, h) => total + h.minutes, 0);
    const readyForApproval = content.filter(
      (c) => c.approvalState === "listo" || c.approvalState === "dato_por_confirmar",
    ).length;

    return {
      client: { ...client, founderMinutes },
      attention,
      content,
      pipeline,
      agents,
      hours,
      tasks,
      kpis: {
        cycleContent: content.length,
        readyForApproval,
        scheduled: content.filter((c) => c.stage === "programado").length,
        leads: client.leads,
        founderMinutes,
        automationScore: client.automationScore,
      },
    };
  }),
};
