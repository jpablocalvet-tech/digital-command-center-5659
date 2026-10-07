import type { RouterClient } from "@orpc/server";
import { createApp } from "./__core/app";
import { ping } from "./routes/ping";
import { clients } from "./routes/clients";
import { content } from "./routes/content";
import { team } from "./routes/team";
import { strategy } from "./routes/strategy";
import { hours } from "./routes/hours";
import { cycles } from "./routes/cycles";
import { ai } from "./routes/ai";

// API features are oRPC procedures, one file per feature in ./routes/,
// composed into this router — typed end-to-end via the clients
// (web: src/web/lib/api.ts, mobile: lib/api.ts).
export const router = {
  ping,
  clients,
  content,
  team,
  strategy,
  hours,
  cycles,
  ai,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);

export default app;
