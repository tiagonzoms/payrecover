CREATE TYPE "public"."stripeWebhookProcessingStatus" AS ENUM('pending', 'processing', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TABLE "stripeWebhookEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripeEventId" varchar(255) NOT NULL,
	"stripeAccountId" varchar(255) NOT NULL,
	"livemode" boolean NOT NULL,
	"eventType" varchar(255) NOT NULL,
	"eventCreatedAt" timestamp with time zone NOT NULL,
	"processingStatus" "stripeWebhookProcessingStatus" DEFAULT 'pending' NOT NULL,
	"processedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripeWebhookEvents_account_mode_event_unique" UNIQUE("stripeAccountId","livemode","stripeEventId")
);
--> statement-breakpoint
ALTER TABLE "failedPayments" ADD COLUMN "stripeAccountId" varchar(255);--> statement-breakpoint
ALTER TABLE "failedPayments" ADD COLUMN "livemode" boolean;--> statement-breakpoint
ALTER TABLE "failedPayments" ADD COLUMN "lastStripeEventId" varchar(255);--> statement-breakpoint
ALTER TABLE "failedPayments" ADD COLUMN "lastStripeEventCreatedAt" timestamp with time zone;