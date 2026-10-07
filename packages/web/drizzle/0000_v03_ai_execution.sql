ALTER TABLE `content_cycles` ADD `objective_proposal` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `content_cycles` ADD `objective_proposal_status` text DEFAULT 'sin propuesta' NOT NULL;
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