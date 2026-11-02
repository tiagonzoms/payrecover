import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { getTableConfig } from "drizzle-orm/pg-core";
import { stripeWebhookEvents } from "../drizzle/schema";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const sql = read("../drizzle-pg/0002_stripe_webhook_idempotency.sql");
const statements = sql.replaceAll("--> statement-breakpoint", "").split(";")
  .map(statement => statement.trim().replace(/\s+/g, " ")).filter(Boolean);

describe("Pending Stripe migration security", () => {
  it("protects the table and sequence immediately after table creation", () => {
    expect(statements).toHaveLength(9);
    expect(statements[0]).toMatch(/^CREATE TYPE "public"\."stripeWebhookProcessingStatus" AS ENUM/);
    expect(statements[1]).toMatch(/^CREATE TABLE "stripeWebhookEvents" \(/);
    expect(statements.slice(2, 5)).toEqual([
      'ALTER TABLE public."stripeWebhookEvents" ENABLE ROW LEVEL SECURITY',
      'REVOKE ALL PRIVILEGES ON TABLE public."stripeWebhookEvents" FROM PUBLIC, anon, authenticated',
      'REVOKE ALL PRIVILEGES ON SEQUENCE public."stripeWebhookEvents_id_seq" FROM PUBLIC, anon, authenticated',
    ]);
    expect(sql).not.toMatch(/\b(DROP|TRUNCATE|DELETE|UPDATE|INSERT|GRANT)\b/i);
    expect(sql).not.toMatch(/FORCE ROW LEVEL SECURITY/i);
  });

  it("keeps RLS enabled without client policies in both schema and snapshot", () => {
    const config = getTableConfig(stripeWebhookEvents);
    const snapshot = JSON.parse(read("../drizzle-pg/meta/0002_snapshot.json"));
    expect(config.enableRLS).toBe(true);
    expect(config.policies).toEqual([]);
    expect(snapshot.tables["public.stripeWebhookEvents"].isRLSEnabled).toBe(true);
    expect(snapshot.tables["public.stripeWebhookEvents"].policies).toEqual({});
    expect(snapshot.prevId).toBe(JSON.parse(read("../drizzle-pg/meta/0001_snapshot.json")).id);
  });

  it("only adds nullable context columns to existing debts", () => {
    expect(statements.slice(5)).toEqual([
      'ALTER TABLE "failedPayments" ADD COLUMN "stripeAccountId" varchar(255)',
      'ALTER TABLE "failedPayments" ADD COLUMN "livemode" boolean',
      'ALTER TABLE "failedPayments" ADD COLUMN "lastStripeEventId" varchar(255)',
      'ALTER TABLE "failedPayments" ADD COLUMN "lastStripeEventCreatedAt" timestamp with time zone',
    ]);
  });

  it("preserves the exact bytes of migrations 0000 and 0001", () => {
    const history = [
      ["0000_init_postgresql", "327e51796985b3a0897d38ce36e3e120e84a1154280b9176ecfdaabdb7e782fb"],
      ["0001_strong_bastion", "e15afc8e5cc445cc5eeb44ad351d20b2d6948b7f0dfc258c95a65cfdb399abf2"],
    ];
    for (const [name, expected] of history) {
      const bytes = readFileSync(new URL("../drizzle-pg/" + name + ".sql", import.meta.url));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(expected);
    }
  });
});
