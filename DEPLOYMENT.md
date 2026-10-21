# TZALAM Command — Render production

Recovered from digital-command-center-5659 main, c560f90 (V0.6 Quality Gate).
React, Hono/oRPC, Drizzle/libSQL and all existing modules are retained.

## Production

Use this repository, branch main, with Render's native Node/Bun runtime.
Build: `bun install --frozen-lockfile --ignore-scripts && bun run build:render`
Start: `bun run start:render`
Health: `/healthz` (only public endpoint; no business data).

Persistent disk mounted at `/var/data`, 1 GB; single service instance.
DATABASE_URL=file:/var/data/tzalam.db
BUN_VERSION=1.3.14
NODE_ENV=production
OPERATOR_USERNAME=propietario
OPERATOR_PASSWORD: set by the owner directly in Render, at least 20 characters.
Do not paste secrets into chat, commit them or add them to client variables.

The public /login page accepts the existing owner username/password via POST.
Hono signs a 12-hour HS256 session; its cookie is Secure, HttpOnly, host-only
and SameSite=Lax. APIs and assets reject missing, invalid or expired sessions.
The password is only read from Render environment; no new secret is needed.
Changing the password invalidates earlier sessions. Login/logout and data writes
reject cross-origin requests. Render's canonical public URL is used behind the
HTTPS proxy. Missing or short credentials prevent startup.

Startup applies tracked schema-only migrations and calls an idempotent bootstrap.
It does not use the original destructive demonstration seed. Only known
opportunities are inserted: Administración Residencial / GESTIÓN VISIBLE 90
(target 14,900 MXN) and CASEM (value unknown). RUTA remains internal Client 000.
No contacts or dates are invented, no messaging or prospecting is activated.
Existing database records are never deleted by bootstrap. If an existing
unjournaled database is attached, migration may refuse to start; inspect and
back it up rather than resetting it.

Local verification: `bun scripts/verify-render.ts`. Temporary records are only
created in an isolated temporary database. Native production does not use the abandoned Sites adapter.
AI gateway keys are optional and unconfigured. No new AI execution is enabled.

## Strategy Lab startup repair

The original production bootstrap inserted the RUTA cycle directly without the
strategy record normally created by cycles.create. strategy.get then returned
NOT_FOUND, while the page rendered that failure as perpetual loading. Startup
now inserts empty strategies only for cycles missing one, retaining the cycle's
existing objective and preserving every saved strategy. The page distinguishes
loading, unavailable selection and failed requests, with an explicit retry.
The verification script covers legacy missing records, idempotent repair, saved
strategy preservation and strategy persistence across process restart.
