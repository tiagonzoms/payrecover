import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * PostgreSQL schema for PayRecover.
 * Table and column names intentionally preserve the existing camelCase names.
 * `updatedAt` timestamps are updated by application code; PostgreSQL does not
 * support MySQL's column-level ON UPDATE CURRENT_TIMESTAMP syntax.
 */

export const userRoleEnum = pgEnum("role", ["user", "admin"]);
export const companyPlanEnum = pgEnum("plan", ["starter", "professional", "enterprise"]);
export const companyStatusEnum = pgEnum("companyStatus", ["active", "inactive", "suspended"]);
export const campaignStatusEnum = pgEnum("campaignStatus", ["active", "paused", "completed"]);
export const failedPaymentStatusEnum = pgEnum("failedPaymentStatus", ["pending", "recovered", "abandoned"]);
export const recoveryAttemptTypeEnum = pgEnum("recoveryAttemptType", ["email", "retry", "manual"]);
export const recoveryAttemptResultEnum = pgEnum("recoveryAttemptResult", ["pending", "sent", "failed", "recovered"]);
export const emailLogStatusEnum = pgEnum("emailLogStatus", ["pending", "sent", "failed", "bounced"]);
export const notificationTypeEnum = pgEnum("notificationType", ["payment_recovered", "campaign_completed", "payment_failed", "alert", "info"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: false }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  website: varchar("website", { length: 255 }),
  stripeConnected: boolean("stripeConnected").default(false).notNull(),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  plan: companyPlanEnum("plan").default("starter").notNull(),
  status: companyStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

export const stripeAccounts = pgTable("stripeAccounts", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }).notNull().unique(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  publishableKey: varchar("publishableKey", { length: 255 }),
  lastSyncedAt: timestamp("lastSyncedAt", { withTimezone: false }),
  webhookId: varchar("webhookId", { length: 255 }),
  webhookSecret: text("webhookSecret"),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export type StripeAccount = typeof stripeAccounts.$inferSelect;
export type InsertStripeAccount = typeof stripeAccounts.$inferInsert;

export const recoveryCampaigns = pgTable("recoveryCampaigns", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  emailSequenceId: integer("emailSequenceId"),
  maxRetries: integer("maxRetries").default(3).notNull(),
  initialDelayHours: integer("initialDelayHours").default(24).notNull(),
  retryDelayHours: integer("retryDelayHours").default(72).notNull(),
  status: campaignStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export type RecoveryCampaign = typeof recoveryCampaigns.$inferSelect;
export type InsertRecoveryCampaign = typeof recoveryCampaigns.$inferInsert;

export const emailSequences = pgTable("emailSequences", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  steps: jsonb("steps").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export type EmailSequence = typeof emailSequences.$inferSelect;
export type InsertEmailSequence = typeof emailSequences.$inferInsert;

export const failedPayments = pgTable("failedPayments", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }).notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  failureReason: varchar("failureReason", { length: 255 }),
  status: failedPaymentStatusEnum("status").default("pending").notNull(),
  campaignId: integer("campaignId"),
  recoveredAt: timestamp("recoveredAt", { withTimezone: false }),
  failedAt: timestamp("failedAt", { withTimezone: false }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export type FailedPayment = typeof failedPayments.$inferSelect;
export type InsertFailedPayment = typeof failedPayments.$inferInsert;

export const recoveryAttempts = pgTable("recoveryAttempts", {
  id: serial("id").primaryKey(),
  failedPaymentId: integer("failedPaymentId").notNull(),
  campaignId: integer("campaignId").notNull(),
  attemptNumber: integer("attemptNumber").notNull(),
  type: recoveryAttemptTypeEnum("type").default("email").notNull(),
  result: recoveryAttemptResultEnum("result").default("pending").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export type RecoveryAttempt = typeof recoveryAttempts.$inferSelect;
export type InsertRecoveryAttempt = typeof recoveryAttempts.$inferInsert;

export const emailLogs = pgTable("emailLogs", {
  id: serial("id").primaryKey(),
  recoveryAttemptId: integer("recoveryAttemptId").notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  template: varchar("template", { length: 255 }).notNull(),
  status: emailLogStatusEnum("status").default("pending").notNull(),
  opens: integer("opens").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  sentAt: timestamp("sentAt", { withTimezone: false }),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

export const companyMetrics = pgTable("companyMetrics", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull().unique(),
  totalFailedPayments: integer("totalFailedPayments").default(0).notNull(),
  totalRecoveredAmount: numeric("totalRecoveredAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  recoveryRate: numeric("recoveryRate", { precision: 5, scale: 2 }).default("0").notNull(),
  averageRecoveryTime: integer("averageRecoveryTime").default(0).notNull(),
  lastUpdatedAt: timestamp("lastUpdatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export type CompanyMetric = typeof companyMetrics.$inferSelect;
export type InsertCompanyMetric = typeof companyMetrics.$inferInsert;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: notificationTypeEnum("type").default("info").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
