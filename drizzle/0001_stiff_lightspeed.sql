CREATE TABLE `chip_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`source_chip_id` text NOT NULL,
	`target_chip_id` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`source_chip_id`) REFERENCES `chips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_chip_id`) REFERENCES `chips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chips` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text,
	`time` text,
	`duration_minutes` integer,
	`colour_id` text,
	`status` text DEFAULT 'obskur' NOT NULL,
	`modifier` text,
	`is_shoot` integer DEFAULT false NOT NULL,
	`linked_chip_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`body` text,
	`starred` integer DEFAULT false NOT NULL,
	`series` text,
	`series_number` integer,
	`calendar_uid` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`colour_id`) REFERENCES `chip_colours`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_chips`("id", "title", "date", "time", "duration_minutes", "colour_id", "status", "modifier", "is_shoot", "linked_chip_id", "sort_order", "body", "starred", "series", "series_number", "calendar_uid", "created_at", "updated_at") SELECT "id", "title", "date", "time", "duration_minutes", "colour_id", "status", "modifier", "is_shoot", "linked_chip_id", "sort_order", "body", "starred", "series", "series_number", "calendar_uid", "created_at", "updated_at" FROM `chips`;--> statement-breakpoint
DROP TABLE `chips`;--> statement-breakpoint
ALTER TABLE `__new_chips` RENAME TO `chips`;--> statement-breakpoint
PRAGMA foreign_keys=ON;