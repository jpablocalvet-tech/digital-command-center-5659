# Digital Command Center — Design

Aplicación web interna (solo web) que funciona como sistema operativo de una agencia digital semi-automatizada para PYMES. Cliente 000: RUTA Travel Design Studio. Interfaz 100% en español, estética de herramienta empresarial: limpia, clara, ligera, con tarjetas, jerarquía tipográfica fuerte y mucho aire. **Nada de estética "robot" futurista**: sin neones, sin glow, sin fondos oscuros tecnológicos.

Objetivo de diseño: que el fundador entienda el estado del negocio en menos de 30 segundos. Lo primero que se ve arriba: cliente activo → qué necesita atención → KPIs → pipeline.

## Brand & Colors

CSS variables en `packages/web/src/web/styles.css` (tema claro único, sin dark mode).

| Token | Valor | Uso |
|-------|-------|-----|
| background | #F4F6F9 | Fondo de página |
| card | #FFFFFF | Tarjetas y superficies |
| foreground | #0F1B2D | Texto principal |
| muted-foreground | #62708A | Texto secundario, labels |
| border | #E3E8F0 | Hairlines, divisores |
| primary (ink navy) | #14314F | Sidebar, botones primarios, títulos |
| accent (teal) | #0E8C7F | Estados positivos, "Completado", progreso automatizado |
| warning (amber) | #B7791F | Prioridad "Atención", estandarizado, pendientes |
| critical (red) | #B42318 | Prioridad "Crítico", rechazar, manual |
| info (blue) | #2E5AAC | Prioridad "Informativo", "Trabajando" |
| surface-soft | #EEF2F7 | Chips neutros, columnas kanban |

Semántica de estado (badges): Completado = teal, Trabajando = azul, Esperando = neutro, Requiere revisión = ámbar, Bloqueado = rojo.

## Typography

- Display / títulos: **Manrope** (600–800), tracking ligeramente negativo.
- Cuerpo / UI: **Plus Jakarta Sans** (400–600).
- Números de KPI: Manrope 700, tamaño grande (32–40px), `tabular-nums`.
- Labels de sección: 11–12px, mayúsculas, `letter-spacing: .08em`, color muted.
- Cargadas desde Google Fonts en `index.html`.

## Layout

- Shell fijo: sidebar izquierda 248px (ink navy) + topbar blanco con selector de cliente + contenido con `max-width: 1320px`, padding 24–32px.
- Responsive: sidebar colapsa a menú hamburguesa < 1024px; grids de KPI 6→3→2 columnas; kanban con scroll horizontal.
- Radios: 14px tarjetas, 10px controles, 999px chips. Sombra muy suave (`0 1px 2px rgba(16,27,45,.06)`), sin sombras pesadas.
- Densidad: máximo 6 KPIs por fila, una idea por tarjeta, nada de tablas con más de 7 columnas.

## Pages (todas en `packages/web/src/web/pages/`)

1. **Inicio** (`index.tsx`) — cliente activo, "Necesita tu atención", 6 KPIs, Content Pipeline (8 fases con conteo), AI Marketing Team, Approval Watch, Próximos contenidos (Hoy/Mañana/Esta semana), Founder Hours, Automation Score + tareas manuales, Learning Loop.
2. **Clientes** (`clientes.tsx`) — tarjetas de cliente con objetivo, horas, automation, estado; abre Client Hub.
3. **Client Hub** (`cliente.tsx`, ruta `/clientes/:id`) — ficha con tabs: Resumen, Marca, Objetivos, Contenido, Resultados, Horas, Automatización.
4. **Strategy Lab** (`strategy-lab.tsx`) — campos editables (objetivo, audiencia, problemas, propuesta de valor, competidores, pilares, canales, CTA) + botón "Generar estrategia con AI Team" (simulación).
5. **AI Team** (`ai-team.tsx`) — 8 agentes con estado y última acción.
6. **Producción** (`produccion.tsx`) — kanban de 8 columnas, mover piezas entre fases.
7. **Aprobaciones** (`aprobaciones.tsx`) — decisión humana: aprobar / solicitar cambio / rechazar, con estado de Brand Guardian y Reality Checker.
8. **Hours & Automation** (`hours-automation.tsx`) — Founder Hours, Manual Tasks Tracker y Automation Backlog ordenado por horas recuperables.

Componentes compartidos en `components/`: `layout.tsx` (shell + nav), `ui/card.tsx`, `ui/badge.tsx`, `ui/button.tsx`, `kpi-card.tsx`, `pipeline.tsx`, `client-switcher.tsx`, `integrations-strip.tsx` (Google Workspace, Canva, ManyChat, Meta, WhatsApp, IA, GROUP HQ como "Próximamente", sin implementar).

## Key User Flows

1. Abrir Inicio → ver atención + KPIs + pipeline → clic en un item de atención → Aprobaciones.
2. Aprobaciones → Aprobar / Solicitar cambio / Rechazar → la pieza avanza de fase y los KPIs se actualizan.
3. Producción → mover una pieza de fase con el control de columna.
4. Hours & Automation → clasificar tarea manual → ver backlog priorizado por horas recuperadas.

## Architecture

- API oRPC en `packages/web/src/api/routes/` (clients, content, agents, strategy, hours), Drizzle + SQLite, semilla con datos mock de RUTA.
- Hooks de datos en `src/web/queries/`, TanStack Query; mutaciones invalidan las queries afectadas.
- Sin autenticación, sin integraciones reales, sin IA real en V0.1.
