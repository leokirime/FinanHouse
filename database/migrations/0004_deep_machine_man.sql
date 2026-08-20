CREATE TABLE `installment_plans` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`household_id` bigint unsigned NOT NULL,
	`description` varchar(255) NOT NULL,
	`category_id` bigint unsigned NOT NULL,
	`total_amount` decimal(13,2) NOT NULL,
	`installment_count` bigint unsigned NOT NULL,
	`first_reference_month` date NOT NULL,
	`due_day` bigint unsigned NOT NULL,
	`created_by_user_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `installment_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `installment_plans_id_household_id_unique` UNIQUE(`id`,`household_id`),
	CONSTRAINT `installment_plans_total_amount_positive` CHECK(`installment_plans`.`total_amount` > 0),
	CONSTRAINT `installment_plans_installment_count_min` CHECK(`installment_plans`.`installment_count` >= 2),
	CONSTRAINT `installment_plans_due_day_range` CHECK(`installment_plans`.`due_day` >= 1 and `installment_plans`.`due_day` <= 31)
);
--> statement-breakpoint
ALTER TABLE `financial_entries` ADD `installment_plan_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `financial_entries` ADD `installment_number` bigint unsigned;--> statement-breakpoint
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_installment_plan_number_unique` UNIQUE(`installment_plan_id`,`installment_number`);--> statement-breakpoint
ALTER TABLE `installment_plans` ADD CONSTRAINT `installment_plans_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `installment_plans` ADD CONSTRAINT `installment_plans_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `installment_plans` ADD CONSTRAINT `installment_plans_category_household_fk` FOREIGN KEY (`category_id`,`household_id`) REFERENCES `categories`(`id`,`household_id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `installment_plans_household_id_idx` ON `installment_plans` (`household_id`);--> statement-breakpoint
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_installment_coherence_check` CHECK ((`financial_entries`.`installment_plan_id` is null and `financial_entries`.`installment_number` is null) or (`financial_entries`.`installment_plan_id` is not null and `financial_entries`.`installment_number` is not null));--> statement-breakpoint
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_installment_plan_household_fk` FOREIGN KEY (`installment_plan_id`,`household_id`) REFERENCES `installment_plans`(`id`,`household_id`) ON DELETE restrict ON UPDATE no action;