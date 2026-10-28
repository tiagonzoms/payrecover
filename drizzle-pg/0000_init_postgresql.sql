CREATE TYPE "public"."campaignStatus" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."companyStatus" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."emailLogStatus" AS ENUM('pending', 'sent', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."failedPaymentStatus" AS ENUM('pending', 'recovered', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."notificationType" AS ENUM('payment_recovered', 'campaign_completed', 'payment_failed', 'alert', 'info');--> statement-breakpoint
CREATE TYPE "public"."recoveryAttemptResult" AS ENUM('pending', 'sent', 'failed', 'recovered');--> statement-breakpoint
CREATE TYPE "public"."recoveryAttemptType" AS ENUM('email', 'retry', 'manual');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"website" varchar(255),
	"stripeConnected" boolean DEFAULT false NOT NULL,
	"stripeAccountId" varchar(255),
	"plan" "plan" DEFAULT 'starter' NOT NULL,
	"status" "companyStatus" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companyMetrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"totalFailedPayments" integer DEFAULT 0 NOT NULL,
	"totalRecoveredAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"recoveryRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"averageRecoveryTime" integer DEFAULT 0 NOT NULL,
	"lastUpdatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companyMetrics_companyId_unique" UNIQUE("companyId")
);
--> statement-breakpoint
CREATE TABLE "emailLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"recoveryAttemptId" integer NOT NULL,
	"recipientEmail" varchar(320) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"template" varchar(255) NOT NULL,
	"status" "emailLogStatus" DEFAULT 'pending' NOT NULL,
	"opens" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"sentAt" timestamp,
	"failureReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailSequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"steps" jsonb NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "failedPayments" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"stripeInvoiceId" varchar(255) NOT NULL,
	"stripeCustomerId" varchar(255) NOT NULL,
	"customerEmail" varchar(320),
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"failureReason" varchar(255),
	"status" "failedPaymentStatus" DEFAULT 'pending' NOT NULL,
	"campaignId" integer,
	"recoveredAt" timestamp,
	"failedAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" "notificationType" DEFAULT 'info' NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recoveryAttempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"failedPaymentId" integer NOT NULL,
	"campaignId" integer NOT NULL,
	"attemptNumber" integer NOT NULL,
	"type" "recoveryAttemptType" DEFAULT 'email' NOT NULL,
	"result" "recoveryAttemptResult" DEFAULT 'pending' NOT NULL,
	"details" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recoveryCampaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"emailSequenceId" integer,
	"maxRetries" integer DEFAULT 3 NOT NULL,
	"initialDelayHours" integer DEFAULT 24 NOT NULL,
	"retryDelayHours" integer DEFAULT 72 NOT NULL,
	"status" "campaignStatus" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripeAccounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"stripeAccountId" varchar(255) NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text,
	"publishableKey" varchar(255),
	"lastSyncedAt" timestamp,
	"webhookId" varchar(255),
	"webhookSecret" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripeAccounts_stripeAccountId_unique" UNIQUE("stripeAccountId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
