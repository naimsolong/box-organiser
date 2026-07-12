CREATE TABLE `warehouse_invitations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`warehouse_id` integer NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`token` text NOT NULL,
	`invited_by_user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouse_invitations_token_unique` ON `warehouse_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `warehouse_invitations_email_idx` ON `warehouse_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `warehouse_invitations_warehouse_idx` ON `warehouse_invitations` (`warehouse_id`);--> statement-breakpoint
CREATE TABLE `warehouse_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`warehouse_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`invited_by_user_id` text,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouse_members_unique` ON `warehouse_members` (`warehouse_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `warehouse_members_user_idx` ON `warehouse_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_by_user_id` text NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `boxes` ADD `warehouse_id` integer REFERENCES warehouses(id);