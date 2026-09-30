# App template

Runable copies this Bun and Turborepo project into each new sandbox.

The root package commands are the external contract:

- `bun run dev` starts the web app.
- `bun run dev:desktop` and `bun run dev:mobile` start platform clients.
- `bun run build` builds every package.
- `bun run start` starts or restarts the production server.
- `bun run stop` stops the production server.
- `bun run lint` and `bun run typecheck` validate the project.
- The `db:generate`, `db:migrate`, and `db:push` commands manage the database.

Deployment tools depend on these command names. Their implementations may change, but the names must remain stable.

The web package owns the API, database, and shared web interface. The mobile package is an Expo client. The desktop package is an Electron shell around the web app. Services use the fixed ports defined in `__ports.cjs`, and the web health endpoint is `/api/health`.

Secrets belong in the root `.env` file. Browser values must use the `VITE_` prefix. Commands prefixed with `internal:` are for template maintenance.

---

## Digital Command Center V0.2 — Core Operating Foundation

Esta versión convierte la V0.1 de demostración en una base operativa medible para **RUTA · Cliente 000**.

### Cambios principales

- **Content Cycles**: la operación queda separada por ciclo/campaña (inicial: `RUTA · Octubre 2026`).
- **Founder Hours reales**: cada minuto se registra como `TimeEntry`; ya no se usan totales mock.
- **Pipeline dinámico**: Inicio y Producción leen las mismas piezas; no hay conteos duplicados.
- **Atención dinámica**: aprobaciones, datos por confirmar y oportunidades de automatización se derivan del estado real.
- **Automation Score calculado**: usa carga mensual de tareas y su estado; no hay porcentajes arbitrarios.
- **Content Detail**: hook, copy/script, caption, CTA, visual brief, URL de asset, fuentes y notas de QA.
- **Approval History**: cada aprobar/cambiar/rechazar/reality check genera un evento histórico.
- **Brand Hub editable**: tono, pilares, vocabulario, promesas y restricciones.
- **Objective Builder**: el dueño define la prioridad del negocio; la IA propone el objetivo de marketing; el humano lo aprueba. En V0.2 el preview es heurístico y está etiquetado como simulación. La IA real entra en V0.3.

### Gobierno de objetivos

El sistema evita que la IA decida autónomamente qué quiere el negocio:

1. **Humano / cliente** define la prioridad de negocio y restricciones.
2. **AI Objective Builder** propone objetivo, métrica, target y razonamiento usando datos disponibles.
3. **Humano** aprueba, edita o rechaza.
4. El objetivo aprobado alimenta Strategy Lab y, después, al Marketing Orchestrator.
5. Si no existe línea base, el sistema evita inventar metas numéricas y prioriza medir el primer ciclo.

### Base de datos

V0.2 cambia el esquema de datos de forma importante. Como la V0.1 solo contiene datos mock, la ruta recomendada para el piloto es aplicar el nuevo esquema (`db:push`) y volver a ejecutar `src/api/database/seed.ts` antes de probar la V0.2.

Antes de hacerlo sobre una base que contenga información real, respáldala y prepara una migración conservadora.
