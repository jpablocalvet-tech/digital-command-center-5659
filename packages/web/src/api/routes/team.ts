import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";

export const team = {
  /** AI Marketing Team del cliente (estados mock, sin IA real en V0.1). */
  list: base.input(z.object({ clientId: z.number() })).handler(({ input }) =>
    db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.clientId, input.clientId))
      .orderBy(asc(schema.agents.position)),
  ),
};
