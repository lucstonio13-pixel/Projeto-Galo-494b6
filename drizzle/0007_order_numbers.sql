ALTER TABLE `orders` ADD `number` integer;
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_unique` ON `orders` (`number`);
--> statement-breakpoint
CREATE TABLE `order_number_sequence` (
	`id` integer PRIMARY KEY NOT NULL,
	`next_number` integer NOT NULL,
	CONSTRAINT `order_number_sequence_id` CHECK (`id` = 1),
	CONSTRAINT `order_number_sequence_range` CHECK (`next_number` >= 1 AND `next_number` <= 10000)
);
