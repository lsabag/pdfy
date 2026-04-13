CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`details` text,
	`user_id` text NOT NULL,
	`document_id` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`type` text DEFAULT 'TEXT' NOT NULL,
	`page_number` integer NOT NULL,
	`position` text NOT NULL,
	`highlight_color` text,
	`document_id` text NOT NULL,
	`author_id` text NOT NULL,
	`parent_id` text,
	`is_resolved` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `conversions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`format` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`output_key` text,
	`error_message` text,
	`requested_by_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text DEFAULT 'application/pdf' NOT NULL,
	`size_bytes` integer NOT NULL,
	`page_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'PROCESSING' NOT NULL,
	`storage_key` text NOT NULL,
	`thumbnail_key` text,
	`metadata` text,
	`is_password_protected` integer DEFAULT false NOT NULL,
	`folder_id` text,
	`tags` text DEFAULT '[]',
	`is_favorite` integer DEFAULT false NOT NULL,
	`owner_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`owner_id` text NOT NULL,
	`color` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'VIEWER' NOT NULL,
	`token` text NOT NULL,
	`invited_by_id` text NOT NULL,
	`accepted_at` text,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`invited_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invites_token_unique` ON `invites` (`token`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`data` text,
	`user_id` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`created_by_id` text NOT NULL,
	`recipient_id` text,
	`permission` text DEFAULT 'VIEW' NOT NULL,
	`token` text NOT NULL,
	`password` text,
	`expires_at` text,
	`max_downloads` integer,
	`download_count` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shares_token_unique` ON `shares` (`token`);--> statement-breakpoint
CREATE TABLE `signatures` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`signer_id` text NOT NULL,
	`signature_data` text NOT NULL,
	`page_number` integer NOT NULL,
	`position` text NOT NULL,
	`ip_address` text NOT NULL,
	`user_agent` text NOT NULL,
	`signed_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`signer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'VIEWER' NOT NULL,
	`avatar_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`storage_used_bytes` integer DEFAULT 0 NOT NULL,
	`storage_quota_bytes` integer DEFAULT 5368709120 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_login_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);