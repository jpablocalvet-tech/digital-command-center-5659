import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/** Clientes de la agencia. RUTA es el "Cliente 000" (piloto interno). */
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  service: text("service").notNull(),
  objective: text("objective").notNull(),
  status: text("status").notNull().default("Activo"),
  leads: integer("leads").notNull().default(0),
  scheduled: integer("scheduled").notNull().default(0),
  automationScore: integer("automation_score").notNull().default(0),
  standardizedScore: integer("standardized_score").notNull().default(0),
  manualScore: integer("manual_score").notNull().default(0),
  brandVoice: text("brand_voice").notNull().default(""),
  brandPillars: text("brand_pillars").notNull().default(""),
  brandColors: text("brand_colors").notNull().default(""),
  brandNotes: text("brand_notes").notNull().default(""),
  learning: text("learning").notNull().default(""),
});

/** Items de "Necesita tu atención". priority: critico | atencion | informativo */
export const attentionItems = sqliteTable("attention_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  priority: text("priority").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  link: text("link").notNull().default("/aprobaciones"),
  linkLabel: text("link_label").notNull().default("Revisar"),
});

/**
 * Piezas de contenido. stage sigue el tablero de Producción:
 * idea | research | copy | diseno | quality | aprobacion | programado | publicado
 * approvalState: pendiente | listo | cambios | aprobado | rechazado | dato_por_confirmar
 */
export const contentItems = sqliteTable("content_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  objective: text("objective").notNull().default(""),
  cta: text("cta").notNull().default(""),
  stage: text("stage").notNull().default("idea"),
  approvalState: text("approval_state").notNull().default("pendiente"),
  brandStatus: text("brand_status").notNull().default("Pendiente"),
  realityStatus: text("reality_status").notNull().default("Pendiente"),
  scheduledLabel: text("scheduled_label").notNull().default(""),
  scheduledBucket: text("scheduled_bucket").notNull().default(""),
  note: text("note").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Conteo de piezas por fase del Content Pipeline (funnel del ciclo). */
export const pipelineStages = sqliteTable("pipeline_stages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  position: integer("position").notNull(),
  name: text("name").notNull(),
  count: integer("count").notNull().default(0),
});

/** AI Marketing Team. status: esperando | trabajando | completado | revision | bloqueado | sin_datos */
export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  position: integer("position").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  status: text("status").notNull().default("esperando"),
  lastAction: text("last_action").notNull().default(""),
});

/** Distribución de Founder Hours del ciclo, en minutos. */
export const founderHours = sqliteTable("founder_hours", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  category: text("category").notNull(),
  minutes: integer("minutes").notNull().default(0),
});

/**
 * Manual Tasks Tracker.
 * classification: automatizable | estandarizable | delegable | founder_only
 * priority: alta | media | baja — status: pendiente | en_proceso | resuelto
 */
export const manualTasks = sqliteTable("manual_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  task: text("task").notNull(),
  frequency: text("frequency").notNull().default("Semanal"),
  minutes: integer("minutes").notNull().default(0),
  timesPerMonth: integer("times_per_month").notNull().default(4),
  classification: text("classification").notNull().default("automatizable"),
  priority: text("priority").notNull().default("media"),
  status: text("status").notNull().default("pendiente"),
});

/** Strategy Lab: una ficha por cliente. */
export const strategies = sqliteTable("strategies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  objective: text("objective").notNull().default(""),
  audience: text("audience").notNull().default(""),
  problems: text("problems").notNull().default(""),
  valueProp: text("value_prop").notNull().default(""),
  competitors: text("competitors").notNull().default(""),
  pillars: text("pillars").notNull().default(""),
  channels: text("channels").notNull().default(""),
  mainCta: text("main_cta").notNull().default(""),
  aiStatus: text("ai_status").notNull().default("inactivo"),
  aiMessage: text("ai_message").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
