CREATE TABLE `categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`household_id` bigint unsigned NOT NULL,
	`name` varchar(80) NOT NULL,
	`entry_type` varchar(10) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_id_household_id_unique` UNIQUE(`id`,`household_id`),
	CONSTRAINT `categories_household_type_name_unique` UNIQUE(`household_id`,`entry_type`,`name`),
	CONSTRAINT `categories_entry_type_check` CHECK(`categories`.`entry_type` in ('income', 'expense')),
	CONSTRAINT `categories_status_check` CHECK(`categories`.`status` in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE `financial_entries` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`household_id` bigint unsigned NOT NULL,
	`period_id` bigint unsigned NOT NULL,
	`category_id` bigint unsigned NOT NULL,
	`responsible_member_id` bigint unsigned,
	`created_by_user_id` bigint unsigned NOT NULL,
	`entry_type` varchar(10) NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'planned',
	`description` varchar(255) NOT NULL,
	`expected_amount` decimal(13,2) NOT NULL,
	`actual_amount` decimal(13,2),
	`due_date` date,
	`realization_date` date,
	`notes` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_entries_entry_type_check` CHECK(`financial_entries`.`entry_type` in ('income', 'expense')),
	CONSTRAINT `financial_entries_status_check` CHECK(`financial_entries`.`status` in ('planned', 'pending', 'realized', 'cancelled')),
	CONSTRAINT `financial_entries_expected_amount_positive` CHECK(`financial_entries`.`expected_amount` > 0),
	CONSTRAINT `financial_entries_actual_amount_positive` CHECK(`financial_entries`.`actual_amount` is null or `financial_entries`.`actual_amount` > 0)
);
--> statement-breakpoint
CREATE TABLE `household_members` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`household_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`role` varchar(20) NOT NULL DEFAULT 'member',
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	`removed_at` timestamp,
	CONSTRAINT `household_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `household_members_household_user_unique` UNIQUE(`household_id`,`user_id`),
	CONSTRAINT `household_members_role_check` CHECK(`household_members`.`role` in ('owner', 'member')),
	CONSTRAINT `household_members_status_check` CHECK(`household_members`.`status` in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`currency_code` varchar(3) NOT NULL DEFAULT 'BRL',
	`timezone` varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo',
	`created_by_user_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `households_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_periods` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`household_id` bigint unsigned NOT NULL,
	`reference_month` date NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'open',
	`closed_at` timestamp,
	`closed_by_user_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthly_periods_id` PRIMARY KEY(`id`),
	CONSTRAINT `monthly_periods_id_household_id_unique` UNIQUE(`id`,`household_id`),
	CONSTRAINT `monthly_periods_household_reference_month_unique` UNIQUE(`household_id`,`reference_month`),
	CONSTRAINT `monthly_periods_status_check` CHECK(`monthly_periods`.`status` in ('open', 'review', 'closed'))
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`display_name` varchar(120) NOT NULL,
	`email` varchar(255) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_status_check` CHECK(`users`.`status` in ('active', 'inactive'))
);
--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_responsible_member_id_household_members_id_fk` FOREIGN KEY (`responsible_member_id`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_period_household_fk` FOREIGN KEY (`period_id`,`household_id`) REFERENCES `monthly_periods`(`id`,`household_id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_category_household_fk` FOREIGN KEY (`category_id`,`household_id`) REFERENCES `categories`(`id`,`household_id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `household_members` ADD CONSTRAINT `household_members_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `household_members` ADD CONSTRAINT `household_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `households` ADD CONSTRAINT `households_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_periods` ADD CONSTRAINT `monthly_periods_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_periods` ADD CONSTRAINT `monthly_periods_closed_by_user_id_users_id_fk` FOREIGN KEY (`closed_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `financial_entries_household_id_idx` ON `financial_entries` (`household_id`);--> statement-breakpoint
CREATE INDEX `financial_entries_period_id_idx` ON `financial_entries` (`period_id`);--> statement-breakpoint
CREATE INDEX `financial_entries_category_id_idx` ON `financial_entries` (`category_id`);--> statement-breakpoint
CREATE INDEX `financial_entries_status_idx` ON `financial_entries` (`status`);--> statement-breakpoint
CREATE INDEX `financial_entries_entry_type_idx` ON `financial_entries` (`entry_type`);--> statement-breakpoint
CREATE INDEX `financial_entries_due_date_idx` ON `financial_entries` (`due_date`);--> statement-breakpoint
CREATE INDEX `financial_entries_realization_date_idx` ON `financial_entries` (`realization_date`);