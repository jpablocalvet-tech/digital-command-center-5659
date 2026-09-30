import { z } from "zod";
import { asc, eq, and } from "drizzle-orm";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";

export const team = {
  /** AI Marketing Team del ciclo (estados mock, sin IA real en V0.2). */
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
