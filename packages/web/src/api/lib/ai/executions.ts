import { desc, eq, and } from "drizzle-orm";
import { db } from "../../database";
import * as schema from "../../database/schema";
import { getAIConfig } from "./provider";

export async function startAIExecution(input: {
  clientId: number;
  cycleId: number;
  agent: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const [execution] = await db
    .insert(schema.aiExecutions)
    .values({
      ...input,
      status: "generando",
      startedAt: new Date(),
      model: getAIConfig().model,
      metadata: JSON.stringify(input.metadata ?? {}),
    })
    .returning();
  return execution;
}

export async function finishAIExecution(
  id: number,
  status: "completado" | "error",
  errorMessage = "",
) {
  await db
    .update(schema.aiExecutions)
    .set({ status, errorMessage, completedAt: new Date() })
    .where(eq(schema.aiExecutions.id, id));
}

export async function latestAIExecutions(clientId: number, cycleId: number) {
  return db
    .select()
    .from(schema.aiExecutions)
    .where(
      and(
        eq(schema.aiExecutions.clientId, clientId),
        eq(schema.aiExecutions.cycleId, cycleId),
      ),
    )
    .orderBy(desc(schema.aiExecutions.startedAt), desc(schema.aiExecutions.id))
    .limit(20);
}