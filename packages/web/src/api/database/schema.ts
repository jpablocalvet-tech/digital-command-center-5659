import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/** Clientes de la agencia. RUTA es el "Cliente 000" (piloto interno). */
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  service: text("service").notNull(),
  /** Objetivo general del cliente; el objetivo operativo vive por ciclo. */
  objective: text("objective").notNull(),
  contactName: text("contact_name").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  contactWhatsapp: text("contact_whatsapp").notNull().default(""),
  status: text("status").notNull().default("Activo"),
  leads: integer("leads").notNull().default(0),
  scheduled: integer("scheduled").notNull().default(0),
  brandVoice: text("brand_voice").notNull().default(""),
  brandPillars: text("brand_pillars").notNull().default(""),
  brandColors: text("brand_colors").notNull().default(""),
  brandNotes: text("brand_notes").notNull().default(""),
  brandUseWords: text("brand_use_words").notNull().default(""),
  brandAvoidWords: text("brand_avoid_words").notNull().default(""),
  allowedPromises: text("allowed_promises").notNull().default(""),
  communicationRestrictions: text("communication_restrictions").notNull().default(""),
  learning: text("learning").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Ciclos de contenido/campañas. Toda operación temporal debe pertenecer a un ciclo. */
export const contentCycles = sqliteTable("content_cycles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(), // YYYY-MM-DD
  /** Prioridad de negocio expresada por el dueño/cliente. */
  businessGoal: text("business_goal").notNull().default(""),
  /** Objetivo de marketing del ciclo, idealmente propuesto por IA y aprobado por humano. */
  objective: text("objective").notNull().default(""),
  objectiveSource: text("objective_source").notNull().default("manual"),
  objectiveStatus: text("objective_status").notNull().default("aprobado"),
  objectiveProposal: text("objective_proposal").notNull().default(""),
  objectiveProposalStatus: text("objective_proposal_status").notNull().default("sin propuesta"),
  primaryMetric: text("primary_metric").notNull().default(""),
  baseline: text("baseline").notNull().default(""),
  target: text("target").notNull().default(""),
  objectiveRationale: text("objective_rationale").notNull().default(""),
  status: text("status").notNull().default("Planificado"),
  targetContentCount: integer("target_content_count").notNull().default(8),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Alertas manuales futuras. Las alertas operativas principales se calculan dinámicamente. */
export const attentionItems = sqliteTable("attention_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  cycleId: integer("cycle_id"),
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
  cycleId: integer("cycle_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  objective: text("objective").notNull().default(""),
  cta: text("cta").notNull().default(""),
  pillar: text("pillar").notNull().default(""),
  channel: text("channel").notNull().default(""),
  hook: text("hook").notNull().default(""),
  body: text("body").notNull().default(""),
  caption: text("caption").notNull().default(""),
  visualBrief: text("visual_brief").notNull().default(""),
  assetUrl: text("asset_url").notNull().default(""),
  sourceNotes: text("source_notes").notNull().default(""),
  brandReviewNotes: text("brand_review_notes").notNull().default(""),
  realityReviewNotes: text("reality_review_notes").notNull().default(""),
  stage: text("stage").notNull().default("idea"),
  approvalState: text("approval_state").notNull().default("pendiente"),
  brandStatus: text("brand_status").notNull().default("Pendiente"),
  realityStatus: text("reality_status").notNull().default("Pendiente"),
  scheduledLabel: text("scheduled_label").notNull().default(""),
  scheduledBucket: text("scheduled_bucket").notNull().default(""),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  note: text("note").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Historial inmutable de decisiones humanas/QA sobre cada contenido. */
export const approvalEvents = sqliteTable("approval_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contentId: integer("content_id").notNull(),
  decision: text("decision").notNull(),
  note: text("note").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Agentes del ciclo; los agentes con ejecución real derivan su estado de ai_executions. */
export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  cycleId: integer("cycle_id").notNull(),
  position: integer("position").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  status: text("status").notNull().default("esperando"),
  lastAction: text("last_action").notNull().default(""),
});

/** Registro operativo de ejecuciones de IA; nunca almacena prompts ni secretos. */
export const aiExecutions = sqliteTable("ai_executions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  cycleId: integer("cycle_id").notNull(),
  agent: text("agent").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  model: text("model").notNull().default(""),
  errorMessage: text("error_message").notNull().default(""),
  metadata: text("metadata").notNull().default("{}"),
});

/** Briefs de Research Agent; cada ejecución conserva su propio resultado. */
export const researchBriefs = sqliteTable("research_briefs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  cycleId: integer("cycle_id").notNull(),
  executionId: integer("execution_id")
    .notNull()
    .references(() => aiExecutions.id),
  briefJson: text("brief_json").notNull(),
  reviewStatus: text("review_status", {
    enum: ["pendiente", "aprobado", "cambios"],
  })
    .notNull()
    .default("pendiente"),
  humanNote: text("human_note").notNull().default(""),
  sourceStrategyUpdatedAt: integer("source_strategy_updated_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
});

/** Founder Hours reales: cada entrada es un registro de tiempo. */
export const timeEntries = sqliteTable("time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  cycleId: integer("cycle_id").notNull(),
  category: text("category").notNull(),
  minutes: integer("minutes").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  description: text("description").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
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

/** Strategy Lab: una ficha por cliente + ciclo. */
export const strategies = sqliteTable("strategies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  cycleId: integer("cycle_id").notNull(),
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
