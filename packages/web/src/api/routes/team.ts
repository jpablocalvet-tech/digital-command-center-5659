import { z } from "zod";
import { asc, eq, and } from "drizzle-orm";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";

export const team = {
  /** Agentes del ciclo; las ejecuciones reales se consultan mediante el registro de IA. */
  list: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(({ input }) =>
      db
        .select()
        .from(schema.agents)
        .where(
          and(eq(schema.agents.clientId, input.clientId), eq(schema.agents.cycleId, input.cycleId)),
        )
        .orderBy(asc(schema.agents.position)),
    ),
};
