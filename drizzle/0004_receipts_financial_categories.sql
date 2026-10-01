CREATE TABLE `receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `request_key` text NOT NULL,
  `order_id` text NOT NULL,
  `amount` integer NOT NULL,
  `payment` text NOT NULL,
  `received_at` text NOT NULL,
  `reported_by` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`reported_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_request_key_unique` ON `receipts` (`request_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_order_id_unique` ON `receipts` (`order_id`);
--> statement-breakpoint
CREATE INDEX `receipts_received_at` ON `receipts` (`received_at`);
--> statement-breakpoint
CREATE TABLE `financial_categories` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `financial_categories_name_unique` ON `financial_categories` (`name`);
--> statement-breakpoint
CREATE INDEX `financial_categories_type` ON `financial_categories` (`type`,`active`);
--> statement-breakpoint
INSERT INTO `financial_categories` (`id`,`name`,`type`,`active`) VALUES
  ('sales','Vendas','income',1),
  ('other-income','Outras entradas','income',1),
  ('ingredients','Ingredientes','expense',1),
  ('packaging','Embalagens','expense',1),
  ('suppliers','Fornecedores','expense',1),
  ('deliveries','Entregas','expense',1),
  ('fixed-expenses','Despesas fixas','expense',1),
  ('fees','Taxas','expense',1),
  ('refunds','Reembolsos','expense',1),
  ('other-expense','Outras saídas','expense',1);
--> statement-breakpoint
ALTER TABLE `ledger` ADD `receipt_id` text REFERENCES `receipts`(`id`);
--> statement-breakpoint
ALTER TABLE `ledger` ADD `request_hash` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_receipt_id_unique` ON `ledger` (`receipt_id`);
