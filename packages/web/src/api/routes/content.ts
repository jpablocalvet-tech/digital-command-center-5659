import { z } from "zod";
import { asc, eq, and } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";

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

async function loadItem(id: number) {
  const [item] = await db.select().from(schema.contentItems).where(eq(schema.contentItems.id, id));
  if (!item) throw new ORPCError("NOT_FOUND", { message: "Contenido no encontrado" });
  return item;
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
      await loadItem(input.id);
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
