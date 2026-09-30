import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";

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

  /**
   * En V0.2 aún no ejecuta IA real. Solo deja explícito el punto de integración
   * que en V0.3 llamará al Marketing Orchestrator.
   */
  simulateGeneration: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(async ({ input }) => {
      const row = await loadStrategy(input.clientId, input.cycleId);
      const [updated] = await db
        .update(schema.strategies)
        .set({
          aiStatus: "simulado",
          aiMessage:
            "Simulación completada. En V0.3 el AI Team usará el objetivo aprobado del ciclo + Brand Hub + datos históricos para proponer la estrategia.",
          updatedAt: new Date(),
        })
        .where(eq(schema.strategies.id, row.id))
        .returning();
      return updated;
    }),
};
