CREATE TABLE `chip_colours` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hex` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chip_tags` (
	`chip_id` text NOT NULL,
	`tag` text NOT NULL,
	FOREIGN KEY (`chip_id`) REFERENCES `chips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chips` (
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
	FOREIGN KEY (`colour_id`) REFERENCES `chip_colours`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_chip_id`) REFERENCES `chips`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `day_tag_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`colour` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `day_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`tag_type_id` text NOT NULL,
	FOREIGN KEY (`tag_type_id`) REFERENCES `day_tag_types`(`id`) ON UPDATE no action ON DELETE no action
);
