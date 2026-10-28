import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, Company, companies, FailedPayment, failedPayments, RecoveryAttempt, recoveryAttempts, EmailLog, emailLogs, RecoveryCampaign, recoveryCampaigns, EmailSequence, emailSequences, CompanyMetric, companyMetrics } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, { max: 10, connect_timeout: 10 });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= Dunning SaaS Database Helpers =============

/**
 * Companies
 */
export async function createCompany(data: {
  userId: number;
  name: string;
  email: string;
  website?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(companies).values(data).returning();
  return result;
}

export async function getCompanyById(companyId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getCompanyByStripeAccountId(
  stripeAccountId: string
) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(companies)
    .where(eq(companies.stripeAccountId, stripeAccountId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getCompaniesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(companies).where(eq(companies.userId, userId));
}

export async function updateCompany(companyId: number, data: Partial<Company>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(companies).set(data).where(eq(companies.id, companyId));
}

/**
 * Failed Payments
 */
export async function createFailedPayment(data: {
  companyId: number;
  stripeInvoiceId: string;
  stripeCustomerId: string;
  customerEmail?: string;
  amount: string;
  currency?: string;
  failureReason?: string;
  campaignId?: number;
  failedAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(failedPayments).values(data);
}

export async function getFailedPaymentsByCompanyId(companyId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(failedPayments)
    .where(eq(failedPayments.companyId, companyId))
    .orderBy(desc(failedPayments.failedAt))
    .limit(limit)
    .offset(offset);
}

export async function getFailedPaymentById(paymentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(failedPayments).where(eq(failedPayments.id, paymentId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateFailedPayment(paymentId: number, data: Partial<FailedPayment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(failedPayments).set(data).where(eq(failedPayments.id, paymentId));
}

/**
 * Recovery Campaigns
 */
export async function createRecoveryCampaign(data: {
  companyId: number;
  name: string;
  description?: string;
  emailSequenceId?: number;
  maxRetries?: number;
  initialDelayHours?: number;
  retryDelayHours?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(recoveryCampaigns).values(data);
}

export async function getRecoveryCampaignsByCompanyId(companyId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(recoveryCampaigns).where(eq(recoveryCampaigns.companyId, companyId));
}

export async function getRecoveryCampaignById(campaignId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(recoveryCampaigns).where(eq(recoveryCampaigns.id, campaignId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateRecoveryCampaign(campaignId: number, data: Partial<RecoveryCampaign>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(recoveryCampaigns).set(data).where(eq(recoveryCampaigns.id, campaignId));
}

/**
 * Email Sequences
 */
export async function createEmailSequence(data: {
  companyId: number;
  name: string;
  description?: string;
  steps: any;
  isDefault?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(emailSequences).values(data);
}

export async function getEmailSequencesByCompanyId(companyId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(emailSequences).where(eq(emailSequences.companyId, companyId));
}

export async function getEmailSequenceById(sequenceId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(emailSequences).where(eq(emailSequences.id, sequenceId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateEmailSequence(sequenceId: number, data: Partial<EmailSequence>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(emailSequences).set(data).where(eq(emailSequences.id, sequenceId));
}

/**
 * Recovery Attempts
 */
export async function createRecoveryAttempt(data: {
  failedPaymentId: number;
  campaignId: number;
  attemptNumber: number;
  type: "email" | "retry" | "manual";
  result?: "pending" | "sent" | "failed" | "recovered";
  details?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(recoveryAttempts).values(data);
}

export async function getRecoveryAttemptsByPaymentId(paymentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(recoveryAttempts)
    .where(eq(recoveryAttempts.failedPaymentId, paymentId))
    .orderBy(desc(recoveryAttempts.createdAt));
}

export async function updateRecoveryAttempt(attemptId: number, data: Partial<RecoveryAttempt>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(recoveryAttempts).set(data).where(eq(recoveryAttempts.id, attemptId));
}

/**
 * Email Logs
 */
export async function createEmailLog(data: {
  recoveryAttemptId: number;
  recipientEmail: string;
  subject: string;
  template: string;
  status?: "pending" | "sent" | "failed" | "bounced";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(emailLogs).values(data);
}

export async function getEmailLogsByAttemptId(attemptId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(emailLogs).where(eq(emailLogs.recoveryAttemptId, attemptId));
}

export async function updateEmailLog(logId: number, data: Partial<EmailLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(emailLogs).set(data).where(eq(emailLogs.id, logId));
}

/**
 * Company Metrics
 */
export async function getOrCreateCompanyMetrics(companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let result = await db.select().from(companyMetrics).where(eq(companyMetrics.companyId, companyId)).limit(1);
  
  if (result.length === 0) {
    await db.insert(companyMetrics).values({
      companyId,
      totalFailedPayments: 0,
      totalRecoveredAmount: "0",
      recoveryRate: "0",
      averageRecoveryTime: 0,
    });
    result = await db.select().from(companyMetrics).where(eq(companyMetrics.companyId, companyId)).limit(1);
  }

  return result[0];
}

export async function updateCompanyMetrics(companyId: number, data: Partial<CompanyMetric>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(companyMetrics).set(data).where(eq(companyMetrics.companyId, companyId));
}


