CREATE TABLE `category_budgets` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`household_id` bigint unsigned NOT NULL,
	`period_id` bigint unsigned NOT NULL,
	`category_id` bigint unsigned NOT NULL,
	`limit_amount` decimal(13,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `category_budgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `category_budgets_household_period_category_unique` UNIQUE(`household_id`,`period_id`,`category_id`),
	CONSTRAINT `category_budgets_limit_amount_positive` CHECK(`category_budgets`.`limit_amount` > 0)
);
--> statement-breakpoint
ALTER TABLE `category_budgets` ADD CONSTRAINT `category_budgets_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `category_budgets` ADD CONSTRAINT `category_budgets_period_household_fk` FOREIGN KEY (`period_id`,`household_id`) REFERENCES `monthly_periods`(`id`,`household_id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `category_budgets` ADD CONSTRAINT `category_budgets_category_household_fk` FOREIGN KEY (`category_id`,`household_id`) REFERENCES `categories`(`id`,`household_id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `category_budgets_period_id_idx` ON `category_budgets` (`period_id`);