CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`website` varchar(255),
	`stripeConnected` boolean NOT NULL DEFAULT false,
	`stripeAccountId` varchar(255),
	`plan` enum('starter','professional','enterprise') NOT NULL DEFAULT 'starter',
	`status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companyMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`totalFailedPayments` int NOT NULL DEFAULT 0,
	`totalRecoveredAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`recoveryRate` decimal(5,2) NOT NULL DEFAULT '0',
	`averageRecoveryTime` int NOT NULL DEFAULT 0,
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companyMetrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `companyMetrics_companyId_unique` UNIQUE(`companyId`)
);
--> statement-breakpoint
CREATE TABLE `emailLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recoveryAttemptId` int NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`template` varchar(255) NOT NULL,
	`status` enum('pending','sent','failed','bounced') NOT NULL DEFAULT 'pending',
	`opens` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`sentAt` timestamp,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailSequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`steps` json NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailSequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `failedPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`stripeInvoiceId` varchar(255) NOT NULL,
	`stripeCustomerId` varchar(255) NOT NULL,
	`customerEmail` varchar(320),
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`failureReason` varchar(255),
	`status` enum('pending','recovered','abandoned') NOT NULL DEFAULT 'pending',
	`campaignId` int,
	`recoveredAt` timestamp,
	`failedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `failedPayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recoveryAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`failedPaymentId` int NOT NULL,
	`campaignId` int NOT NULL,
	`attemptNumber` int NOT NULL,
	`type` enum('email','retry','manual') NOT NULL DEFAULT 'email',
	`result` enum('pending','sent','failed','recovered') NOT NULL DEFAULT 'pending',
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recoveryAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recoveryCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`emailSequenceId` int,
	`maxRetries` int NOT NULL DEFAULT 3,
	`initialDelayHours` int NOT NULL DEFAULT 24,
	`retryDelayHours` int NOT NULL DEFAULT 72,
	`status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recoveryCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stripeAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`stripeAccountId` varchar(255) NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`publishableKey` varchar(255),
	`lastSyncedAt` timestamp,
	`webhookId` varchar(255),
	`webhookSecret` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stripeAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripeAccounts_stripeAccountId_unique` UNIQUE(`stripeAccountId`)
);
