CREATE TABLE `categories` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);
--> statement-breakpoint
CREATE INDEX `categories_sort` ON `categories` (`sort_order`,`name`);
--> statement-breakpoint
ALTER TABLE `products` ADD `category_id` text REFERENCES categories(id);
--> statement-breakpoint
INSERT INTO `categories` (`id`,`name`,`sort_order`,`active`)
SELECT lower(hex(randomblob(16))), `category`, 0, 1
FROM `products`
WHERE trim(`category`) <> ''
GROUP BY `category`;
--> statement-breakpoint
UPDATE `products`
SET `category_id` = (SELECT `id` FROM `categories` WHERE `categories`.`name` = `products`.`category` LIMIT 1);
--> statement-breakpoint
CREATE INDEX `products_category` ON `products` (`category_id`);
--> statement-breakpoint
CREATE TABLE `option_groups` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `name` text NOT NULL,
  `min_select` integer DEFAULT 0 NOT NULL,
  `max_select` integer DEFAULT 1 NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `option_groups_product` ON `option_groups` (`product_id`,`sort_order`);
--> statement-breakpoint
CREATE TABLE `product_options` (
  `id` text PRIMARY KEY NOT NULL,
  `group_id` text NOT NULL,
  `name` text NOT NULL,
  `price` integer DEFAULT 0 NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  FOREIGN KEY (`group_id`) REFERENCES `option_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_options_group` ON `product_options` (`group_id`,`sort_order`);
