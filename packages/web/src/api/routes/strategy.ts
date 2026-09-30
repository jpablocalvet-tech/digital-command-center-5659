import { z } from "zod";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";

async function loadStrategy(clientId: number) {
  const [row] = await db
    .select()
    .from(schema.strategies)
    .where(eq(schema.strategies.clientId, clientId));
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

export const strategy = {
  get: base
    .input(z.object({ clientId: z.number() }))
    .handler(({ input }) => loadStrategy(input.clientId)),

  update: base
    .input(z.object({ clientId: z.number(), values: fields }))
    .handler(async ({ input }) => {
      const row = await loadStrategy(input.clientId);
      const [updated] = await db
        .update(schema.strategies)
        .set({ ...input.values, updatedAt: new Date() })
        .where(eq(schema.strategies.id, row.id))
        .returning();
      return updated;
    }),

  /**
   * Botón "Generar estrategia con AI Team": en V0.1 solo simula el estado,
   * no hay IA real conectada.
   */
  simulateGeneration: base
    .input(z.object({ clientId: z.number() }))
    .handler(async ({ input }) => {
      const row = await loadStrategy(input.clientId);
      const [updated] = await db
        .update(schema.strategies)
        .set({
          aiStatus: "simulado",
          aiMessage:
            "Simulación completada. El AI Team todavía no está conectado en esta versión de validación (V0.1).",
          updatedAt: new Date(),
        })
        .where(eq(schema.strategies.id, row.id))
        .returning();
      return updated;
    }),
};
