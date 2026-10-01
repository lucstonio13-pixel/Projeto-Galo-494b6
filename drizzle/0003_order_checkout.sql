ALTER TABLE `orders` ADD `request_hash` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `email` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `area` text DEFAULT '' NOT NULL;
