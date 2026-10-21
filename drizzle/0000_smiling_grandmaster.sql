CREATE TABLE `agents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`cycle_id` integer NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'esperando' NOT NULL,
	`last_action` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_executions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`cycle_id` integer NOT NULL,
	`agent` text NOT NULL,
	`action` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`model` text DEFAULT '' NOT NULL,
	`error_message` text DEFAULT '' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `approval_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_id` integer NOT NULL,
	`decision` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attention_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`cycle_id` integer,
	`priority` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`link` text DEFAULT '/aprobaciones' NOT NULL,
	`link_label` text DEFAULT 'Revisar' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`service` text NOT NULL,
	`objective` text NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`contact_email` text DEFAULT '' NOT NULL,
	`contact_whatsapp` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Activo' NOT NULL,
	`leads` integer DEFAULT 0 NOT NULL,
	`scheduled` integer DEFAULT 0 NOT NULL,
	`brand_voice` text DEFAULT '' NOT NULL,
	`brand_pillars` text DEFAULT '' NOT NULL,
	`brand_colors` text DEFAULT '' NOT NULL,
	`brand_notes` text DEFAULT '' NOT NULL,
	`brand_use_words` text DEFAULT '' NOT NULL,
	`brand_avoid_words` text DEFAULT '' NOT NULL,
	`allowed_promises` text DEFAULT '' NOT NULL,
	`communication_restrictions` text DEFAULT '' NOT NULL,
	`learning` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_cycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`business_goal` text DEFAULT '' NOT NULL,
	`objective` text DEFAULT '' NOT NULL,
	`objective_source` text DEFAULT 'manual' NOT NULL,
	`objective_status` text DEFAULT 'aprobado' NOT NULL,
	`objective_proposal` text DEFAULT '' NOT NULL,
	`objective_proposal_status` text DEFAULT 'sin propuesta' NOT NULL,
	`primary_metric` text DEFAULT '' NOT NULL,
	`baseline` text DEFAULT '' NOT NULL,
	`target` text DEFAULT '' NOT NULL,
	`objective_rationale` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Planificado' NOT NULL,
	`target_content_count` integer DEFAULT 8 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`cycle_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`objective` text DEFAULT '' NOT NULL,
	`cta` text DEFAULT '' NOT NULL,
	`pillar` text DEFAULT '' NOT NULL,
	`channel` text DEFAULT '' NOT NULL,
	`hook` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`visual_brief` text DEFAULT '' NOT NULL,
	`asset_url` text DEFAULT '' NOT NULL,
	`source_notes` text DEFAULT '' NOT NULL,
	`brand_review_notes` text DEFAULT '' NOT NULL,
	`reality_review_notes` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT 'idea' NOT NULL,
	`approval_state` text DEFAULT 'pendiente' NOT NULL,
	`brand_status` text DEFAULT 'Pendiente' NOT NULL,
	`reality_status` text DEFAULT 'Pendiente' NOT NULL,
	`scheduled_label` text DEFAULT '' NOT NULL,
	`scheduled_bucket` text DEFAULT '' NOT NULL,
	`scheduled_at` integer,
	`note` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `manual_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`task` text NOT NULL,
	`frequency` text DEFAULT 'Semanal' NOT NULL,
	`minutes` integer DEFAULT 0 NOT NULL,
	`times_per_month` integer DEFAULT 4 NOT NULL,
	`classification` text DEFAULT 'automatizable' NOT NULL,
	`priority` text DEFAULT 'media' NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_key` text,
	`business` text NOT NULL,
	`segment` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`fit` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT 'Media' NOT NULL,
	`score` integer,
	`offer` text DEFAULT '' NOT NULL,
	`estimated_value` integer,
	`monthly_revenue` integer DEFAULT 0 NOT NULL,
	`state` text DEFAULT 'Prospecto' NOT NULL,
	`last_contact` text DEFAULT '' NOT NULL,
	`next_action` text DEFAULT '' NOT NULL,
	`follow_up_date` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `opportunities_seed_key_unique` ON `opportunities` (`seed_key`);--> statement-breakpoint
CREATE TABLE `research_briefs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`cycle_id` integer NOT NULL,
	`execution_id` integer NOT NULL,
	`brief_json` text NOT NULL,
	`review_status` text DEFAULT 'pendiente' NOT NULL,
	`human_note` text DEFAULT '' NOT NULL,
	`source_strategy_updated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`reviewed_at` integer,
	FOREIGN KEY (`execution_id`) REFERENCES `ai_executions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `strategies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`cycle_id` integer NOT NULL,
	`objective` text DEFAULT '' NOT NULL,
	`audience` text DEFAULT '' NOT NULL,
	`problems` text DEFAULT '' NOT NULL,
	`value_prop` text DEFAULT '' NOT NULL,
	`competitors` text DEFAULT '' NOT NULL,
	`pillars` text DEFAULT '' NOT NULL,
	`channels` text DEFAULT '' NOT NULL,
	`main_cta` text DEFAULT '' NOT NULL,
	`ai_status` text DEFAULT 'inactivo' NOT NULL,
	`ai_message` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`cycle_id` integer NOT NULL,
	`category` text NOT NULL,
	`minutes` integer NOT NULL,
	`date` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
