import { z } from "zod";
import { base } from "../__core/app";
import { latestAIExecutions } from "../lib/ai/executions";
import { getAIConfig } from "../lib/ai/provider";

export const ai = {
  status: base.handler(() => getAIConfig()),
  executions: base
    .input(z.object({ clientId: z.number(), cycleId: z.number() }))
    .handler(({ input }) => latestAIExecutions(input.clientId, input.cycleId)),
};