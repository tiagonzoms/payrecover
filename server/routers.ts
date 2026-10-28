import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createCompany,
  getCompaniesByUserId,
  getCompanyById,
  updateCompany,
  getFailedPaymentsByCompanyId,
  getFailedPaymentById,
  createRecoveryCampaign,
  getRecoveryCampaignsByCompanyId,
  getRecoveryCampaignById,
  updateRecoveryCampaign,
  createEmailSequence,
  getEmailSequencesByCompanyId,
  getEmailSequenceById,
  updateEmailSequence,
  getRecoveryAttemptsByPaymentId,
  createRecoveryAttempt,
  getOrCreateCompanyMetrics,
  updateCompanyMetrics,
  getDb,
} from "./db";
import { failedPayments, recoveryAttempts } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { notificationsRouter } from "./routers/notifications";
import { stripeRouter } from "./routers/stripe";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { users } from "../drizzle/schema";
import { sdk } from "./_core/sdk";

export const appRouter = router({
  system: systemRouter,
  notifications: notificationsRouter,
  stripe: stripeRouter,
auth: router({
  me: publicProcedure.query(({ ctx }) => ctx.user),

  register: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(2).max(100),
        email: z.string().trim().email().max(320),
        password: z.string().min(8).max(128),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();

      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de dados indisponível.",
        });
      }

      const email = input.email.toLowerCase();

      const existing = await database
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este email já está registado.",
        });
      }

      const salt = randomBytes(16).toString("hex");

      const passwordHash = await new Promise<string>((resolve, reject) => {
        scrypt(input.password, salt, 64, (error, key) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(`${salt}:${key.toString("hex")}`);
        });
      });

      const openId = `local_${randomBytes(16).toString("hex")}`;

      const [user] = await database
        .insert(users)
        .values({
          openId,
          name: input.name,
          email,
          passwordHash,
          loginMethod: "email",
          lastSignedIn: new Date(),
        })
        .returning();

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível criar a conta.",
        });
      }

      const token = await sdk.createSessionToken(openId, {
        name: user.name || email,
      });

      ctx.res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().trim().email().max(320),
        password: z.string().min(1).max(128),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();

      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de dados indisponível.",
        });
      }

      const email = input.email.toLowerCase();

      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou palavra-passe incorretos.",
        });
      }

      const [salt, storedHash] = user.passwordHash.split(":");

      if (!salt || !storedHash || !/^[a-f0-9]{128}$/i.test(storedHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou palavra-passe incorretos.",
        });
      }

      const suppliedHash = await new Promise<Buffer>((resolve, reject) => {
        scrypt(input.password, salt, 64, (error, key) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(key as Buffer);
        });
      });

      const expectedHash = Buffer.from(storedHash, "hex");

      if (
        suppliedHash.length !== expectedHash.length ||
        !timingSafeEqual(suppliedHash, expectedHash)
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou palavra-passe incorretos.",
        });
      }

      await database
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      const token = await sdk.createSessionToken(user.openId, {
        name: user.name || email,
      });

      ctx.res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);

    ctx.res.clearCookie(COOKIE_NAME, {
      ...cookieOptions,
      maxAge: 0,
    });

    return { success: true } as const;
  }),
}),

  // ============= Companies =============
  companies: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        website: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const company = await createCompany({
          userId: ctx.user.id,
          name: input.name,
          email: input.email,
          website: input.website,
        });
        
        // Notify owner of new company signup
        try {
          await notifyOwner({
            title: "Nouvelle entreprise inscrite",
            content: `${input.name} (${input.email}) vient de s'inscrire sur PayRecover.`,
          });
        } catch (error) {
          console.error("Failed to notify owner:", error);
        }

        return company;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return getCompaniesByUserId(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const company = await getCompanyById(input.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return company;
      }),

    update: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        website: z.string().optional(),
        plan: z.enum(["starter", "professional", "enterprise"]).optional(),
        status: z.enum(["active", "inactive", "suspended"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const company = await getCompanyById(input.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { companyId, ...updateData } = input;
        return updateCompany(companyId, updateData);
      }),
  }),

  // ============= Failed Payments =============
  failedPayments: router({
    list: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        const company = await getCompanyById(input.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return getFailedPaymentsByCompanyId(input.companyId, input.limit, input.offset);
      }),

    getById: protectedProcedure
      .input(z.object({ paymentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const payment = await getFailedPaymentById(input.paymentId);
        if (!payment) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const company = await getCompanyById(payment.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return payment;
      }),

    getAttempts: protectedProcedure
      .input(z.object({ paymentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const payment = await getFailedPaymentById(input.paymentId);
        if (!payment) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const company = await getCompanyById(payment.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return getRecoveryAttemptsByPaymentId(input.paymentId);
      }),
  }),

  // ============= Recovery Campaigns =============
  campaigns: router({
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        emailSequenceId: z.number().optional(),
        maxRetries: z.number().default(3),
        initialDelayHours: z.number().default(24),
        retryDelayHours: z.number().default(72),
      }))
      .mutation(async ({ ctx, input }) => {
        const company = await getCompanyById(input.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { companyId, ...campaignData } = input;
        return createRecoveryCampaign({ companyId, ...campaignData });
      }),

    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const company = await getCompanyById(input.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return getRecoveryCampaignsByCompanyId(input.companyId);
      }),

    getById: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const campaign = await getRecoveryCampaignById(input.campaignId);
        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const company = await getCompanyById(campaign.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return campaign;
      }),

    update: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        emailSequenceId: z.number().optional(),
        maxRetries: z.number().optional(),
        initialDelayHours: z.number().optional(),
        retryDelayHours: z.number().optional(),
        status: z.enum(["active", "paused", "completed"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await getRecoveryCampaignById(input.campaignId);
        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const company = await getCompanyById(campaign.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { campaignId, ...updateData } = input;
        return updateRecoveryCampaign(campaignId, updateData);
      }),
  }),

  // ============= Email Sequences =============
  emailSequences: router({
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        steps: z.array(z.object({
          delayHours: z.number(),
          subject: z.string(),
          template: z.string(),
        })),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const company = await getCompanyById(input.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { companyId, ...sequenceData } = input;
        return createEmailSequence({ companyId, ...sequenceData });
      }),

    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const company = await getCompanyById(input.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return getEmailSequencesByCompanyId(input.companyId);
      }),

    getById: protectedProcedure
      .input(z.object({ sequenceId: z.number() }))
      .query(async ({ ctx, input }) => {
        const sequence = await getEmailSequenceById(input.sequenceId);
        if (!sequence) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const company = await getCompanyById(sequence.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return sequence;
      }),

    update: protectedProcedure
      .input(z.object({
        sequenceId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        steps: z.array(z.object({
          delayHours: z.number(),
          subject: z.string(),
          template: z.string(),
        })).optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const sequence = await getEmailSequenceById(input.sequenceId);
        if (!sequence) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const company = await getCompanyById(sequence.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { sequenceId, ...updateData } = input;
        return updateEmailSequence(sequenceId, updateData);
      }),
  }),

  // ============= Analytics =============
  analytics: router({
    getDashboard: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const company = await getCompanyById(input.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const metrics = await getOrCreateCompanyMetrics(input.companyId);
        const failedPaymentsList = await getFailedPaymentsByCompanyId(input.companyId, 10, 0);

        return {
          metrics,
          recentFailedPayments: failedPaymentsList,
        };
      }),

    getMetrics: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const company = await getCompanyById(input.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return getOrCreateCompanyMetrics(input.companyId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
