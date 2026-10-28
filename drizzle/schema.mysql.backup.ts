import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", { /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============= Dunning SaaS Tables =============

/**
 * Companies: Entreprises clientes utilisant la plateforme
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  website: varchar("website", { length: 255 }),
  stripeConnected: boolean("stripeConnected").default(false).notNull(),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  plan: mysqlEnum("plan", ["starter", "professional", "enterprise"]).default("starter").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * StripeAccounts: Comptes Stripe connectés
 */
export const stripeAccounts = mysqlTable("stripeAccounts", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }).notNull().unique(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  publishableKey: varchar("publishableKey", { length: 255 }),
  lastSyncedAt: timestamp("lastSyncedAt"),
  webhookId: varchar("webhookId", { length: 255 }),
  webhookSecret: text("webhookSecret"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StripeAccount = typeof stripeAccounts.$inferSelect;
export type InsertStripeAccount = typeof stripeAccounts.$inferInsert;

/**
 * RecoveryCampaigns: Campagnes de récupération de paiements
 */
export const recoveryCampaigns = mysqlTable("recoveryCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  emailSequenceId: int("emailSequenceId"),
  maxRetries: int("maxRetries").default(3).notNull(),
  initialDelayHours: int("initialDelayHours").default(24).notNull(),
  retryDelayHours: int("retryDelayHours").default(72).notNull(),
  status: mysqlEnum("status", ["active", "paused", "completed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RecoveryCampaign = typeof recoveryCampaigns.$inferSelect;
export type InsertRecoveryCampaign = typeof recoveryCampaigns.$inferInsert;

/**
 * EmailSequences: Modèles de séquences d'e-mails
 */
export const emailSequences = mysqlTable("emailSequences", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  steps: json("steps").notNull(), // JSON array of email steps
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailSequence = typeof emailSequences.$inferSelect;
export type InsertEmailSequence = typeof emailSequences.$inferInsert;

/**
 * FailedPayments: Paiements échoués détectés
 */
export const failedPayments = mysqlTable("failedPayments", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }).notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  failureReason: varchar("failureReason", { length: 255 }),
  status: mysqlEnum("status", ["pending", "recovered", "abandoned"]).default("pending").notNull(),
  campaignId: int("campaignId"),
  recoveredAt: timestamp("recoveredAt"),
  failedAt: timestamp("failedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FailedPayment = typeof failedPayments.$inferSelect;
export type InsertFailedPayment = typeof failedPayments.$inferInsert;

/**
 * RecoveryAttempts: Historique des tentatives de récupération
 */
export const recoveryAttempts = mysqlTable("recoveryAttempts", {
  id: int("id").autoincrement().primaryKey(),
  failedPaymentId: int("failedPaymentId").notNull(),
  campaignId: int("campaignId").notNull(),
  attemptNumber: int("attemptNumber").notNull(),
  type: mysqlEnum("type", ["email", "retry", "manual"]).default("email").notNull(),
  result: mysqlEnum("result", ["pending", "sent", "failed", "recovered"]).default("pending").notNull(),
  details: json("details"), // Additional metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RecoveryAttempt = typeof recoveryAttempts.$inferSelect;
export type InsertRecoveryAttempt = typeof recoveryAttempts.$inferInsert;

/**
 * EmailLogs: Logs détaillés des e-mails envoyés
 */
export const emailLogs = mysqlTable("emailLogs", {
  id: int("id").autoincrement().primaryKey(),
  recoveryAttemptId: int("recoveryAttemptId").notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  template: varchar("template", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "bounced"]).default("pending").notNull(),
  opens: int("opens").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  sentAt: timestamp("sentAt"),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

/**
 * CompanyMetrics: Métriques agrégées par entreprise
 */
export const companyMetrics = mysqlTable("companyMetrics", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull().unique(),
  totalFailedPayments: int("totalFailedPayments").default(0).notNull(),
  totalRecoveredAmount: decimal("totalRecoveredAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  recoveryRate: decimal("recoveryRate", { precision: 5, scale: 2 }).default("0").notNull(), // percentage
  averageRecoveryTime: int("averageRecoveryTime").default(0).notNull(), // in hours
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompanyMetric = typeof companyMetrics.$inferSelect;
export type InsertCompanyMetric = typeof companyMetrics.$inferInsert;

/**
 * Notifications: Notificações para usuários
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["payment_recovered", "campaign_completed", "payment_failed", "alert", "info"]).default("info").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: json("data"), // Additional metadata
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;