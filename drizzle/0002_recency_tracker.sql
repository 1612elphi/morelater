CREATE TABLE `format_people` (
	`format_id` text NOT NULL,
	`person_id` text NOT NULL,
	`last_used_at` text,
	PRIMARY KEY(`format_id`, `person_id`),
	FOREIGN KEY (`format_id`) REFERENCES `formats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `formats` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`photo` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
