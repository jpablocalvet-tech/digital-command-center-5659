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
