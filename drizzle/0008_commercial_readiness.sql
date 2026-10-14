ALTER TABLE `orders` ADD `legal_version` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `legal_accepted_at` text;
