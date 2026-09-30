import { z } from "zod";
import { asc, eq } from "drizzle-orm";
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
  list: base.input(z.object({ clientId: z.number() })).handler(({ input }) =>
    db
      .select()
      .from(schema.contentItems)
      .where(eq(schema.contentItems.clientId, input.clientId))
      .orderBy(asc(schema.contentItems.id)),
  ),

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

  /** Decisión humana desde Aprobaciones o Approval Watch. */
  decide: base
    .input(
      z.object({ id: z.number(), decision: z.enum(decisions), note: z.string().optional() }),
    )
    .handler(async ({ input }) => {
      const item = await loadItem(input.id);
      const patch: Record<string, unknown> = { updatedAt: new Date() };

      if (input.decision === "aprobar") {
        patch.approvalState = "aprobado";
        patch.stage = "programado";
        patch.note = input.note ?? "Aprobado por el fundador.";
      }
      if (input.decision === "cambios") {
        patch.approvalState = "cambios";
        patch.stage = "copy";
        patch.note = input.note ?? "Cambios solicitados por el fundador.";
      }
      if (input.decision === "rechazar") {
        patch.approvalState = "rechazado";
        patch.stage = "idea";
        patch.note = input.note ?? "Rechazado por el fundador.";
      }
      if (input.decision === "reality_check") {
        patch.approvalState = "pendiente";
        patch.stage = "quality";
        patch.realityStatus = "En verificación";
        patch.note = input.note ?? "Enviado al Reality Checker.";
      }

      const [updated] = await db
        .update(schema.contentItems)
        .set(patch)
        .where(eq(schema.contentItems.id, item.id))
        .returning();

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
