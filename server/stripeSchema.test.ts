import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  failedPayments,
  stripeWebhookEvents,
  stripeWebhookProcessingStatusEnum,
  type InsertFailedPayment,
} from "../drizzle/schema";

describe("Stripe idempotency schema compatibility", () => {
  it("requires explicit event identity and environment, with no inferred mode", () => {
    for (const column of [
      stripeWebhookEvents.stripeEventId,
      stripeWebhookEvents.stripeAccountId,
      stripeWebhookEvents.livemode,
      stripeWebhookEvents.eventType,
      stripeWebhookEvents.eventCreatedAt,
    ]) {
      expect(column.notNull).toBe(true);
      expect(column.hasDefault).toBe(false);
    }
  });

  it("scopes event uniqueness to account, environment and event together", () => {
    const config = getTableConfig(stripeWebhookEvents);
    expect(config.name).toBe("stripeWebhookEvents");
    expect(config.uniqueConstraints).toHaveLength(1);
    expect(config.uniqueConstraints[0].columns.map(column => column.name)).toEqual([
      "stripeAccountId", "livemode", "stripeEventId",
    ]);
    // No separate account or mode uniqueness that would reject other events.
    expect(config.columns.filter(column => column.isUnique)).toHaveLength(0);
  });

  it("starts events pending rather than prematurely processed", () => {
    expect(stripeWebhookEvents.processingStatus.default).toBe("pending");
    expect(stripeWebhookEvents.processingStatus.notNull).toBe(true);
    expect(stripeWebhookProcessingStatusEnum.enumValues).toEqual([
      "pending", "processing", "processed", "failed", "ignored",
    ]);
    expect(stripeWebhookEvents.processedAt.notNull).toBe(false);
    expect(stripeWebhookEvents.processedAt.hasDefault).toBe(false);
  });

  it("preserves unknown context on legacy debts as nullable without defaults", () => {
    for (const column of [
      failedPayments.stripeAccountId,
      failedPayments.livemode,
      failedPayments.lastStripeEventId,
      failedPayments.lastStripeEventCreatedAt,
    ]) {
      expect(column.notNull).toBe(false);
      expect(column.hasDefault).toBe(false);
    }
    const legacyInsert: InsertFailedPayment = {
      companyId: 1, stripeInvoiceId: "in_mock", stripeCustomerId: "cus_mock",
      amount: "12.50", failedAt: new Date("2026-01-01T00:00:00Z"),
    };
    expect(legacyInsert).not.toHaveProperty("livemode");
  });

  it("does not impose debt uniqueness before historical reconciliation", () => {
    const config = getTableConfig(failedPayments);
    expect(config.uniqueConstraints).toHaveLength(0);
    expect(config.indexes.filter(index => index.config.unique)).toHaveLength(0);
    expect(config.columns.filter(column => column.isUnique)).toHaveLength(0);
    expect(failedPayments.stripeInvoiceId.notNull).toBe(true);
  });

  it("preserves timezone information for Stripe event and processing dates", () => {
    for (const column of [
      stripeWebhookEvents.eventCreatedAt, stripeWebhookEvents.processedAt,
      stripeWebhookEvents.createdAt, stripeWebhookEvents.updatedAt,
      failedPayments.lastStripeEventCreatedAt,
    ]) {
      expect(column.getSQLType()).toBe("timestamp with time zone");
    }
  });
});
