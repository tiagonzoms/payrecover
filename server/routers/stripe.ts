import { protectedProcedure, router } from "../\_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const stripeRouter = router({
  /**
   * Criar sessão de checkout
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        priceId: z.string(),
        planId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!stripe) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe is not configured",
        });
      }

      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price: input.priceId,
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: `${ctx.req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${ctx.req.headers.origin}/pricing`,
          customer_email: ctx.user.email || undefined,
          metadata: {
            userId: ctx.user.id.toString(),
            planId: input.planId,
          },
        });

        return {
          url: session.url,
          sessionId: session.id,
        };
      } catch (error) {
        console.error("[Stripe] Error creating checkout session:", error);
        throw new Error("Failed to create checkout session");
      }
    }),

  /**
   * Obter detalhes da sessão de checkout
   */
  getCheckoutSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      if (!stripe) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe is not configured",
        });
      }

      try {
        const session = await stripe.checkout.sessions.retrieve(input.sessionId);
        return session;
      } catch (error) {
        console.error("[Stripe] Error retrieving checkout session:", error);
        throw new Error("Failed to retrieve checkout session");
      }
    }),

  /**
   * Listar assinaturas do usuário
   */
  listSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    if (!stripe) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Stripe is not configured",
      });
    }

    try {
      const subscriptions = await stripe.subscriptions.list({
        limit: 10,
      });

      return subscriptions.data.filter(
        (sub) => sub.metadata?.userId === ctx.user.id.toString()
      );
    } catch (error) {
      console.error("[Stripe] Error listing subscriptions:", error);
      return [];
    }
  }),

  /**
   * Cancelar assinatura
   */
  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ input }) => {
      if (!stripe) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe is not configured",
        });
      }

      try {
        const subscription = await stripe.subscriptions.cancel(input.subscriptionId);
        return subscription;
      } catch (error) {
        console.error("[Stripe] Error canceling subscription:", error);
        throw new Error("Failed to cancel subscription");
      }
    }),

  /**
   * Obter portal de faturamento
   */
  createBillingPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    if (!stripe) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Stripe is not configured",
      });
    }

    try {
      // Primeiro, obter ou criar customer
      const customers = await stripe.customers.list({
        email: ctx.user.email || undefined,
        limit: 1,
      });

      let customerId: string;

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: ctx.user.email || undefined,
          metadata: {
            userId: ctx.user.id.toString(),
          },
        });
        customerId = customer.id;
      }

      // Criar sessão do portal de faturamento
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${ctx.req.headers.origin}/dashboard`,
      });

      return {
        url: session.url,
      };
    } catch (error) {
      console.error("[Stripe] Error creating billing portal session:", error);
      throw new Error("Failed to create billing portal session");
    }
  }),
});
