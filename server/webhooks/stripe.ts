import { Router, Request, Response, raw } from "express";
import Stripe from "stripe";
import {
  getDb,
  getCompanyByStripeAccountId,
  createFailedPayment,
} from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export const stripeWebhookRouter = Router();

// Middleware pour recevoir le body brut (nécessaire pour la vérification de signature)
stripeWebhookRouter.post(
  "/",
  raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
      console.error("[Webhook] Missing Stripe signature");
      return res.status(400).json({ error: "Missing signature" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (error) {
      console.error("[Webhook] Invalid signature:", error);
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Gérer les événements de test
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case "customer.subscription.created":
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case "customer.subscription.updated":
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case "invoice.paid":
          await handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case "payment_intent.succeeded":
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("[Webhook] Error processing event:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * Gérer la session de checkout complétée
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  stripeAccountId?: string
) {
  console.log("[Webhook] Invoice payment failed:", invoice.id);

  if (!stripeAccountId) {
    console.error(
      "[Webhook] Missing connected Stripe account for invoice:",
      invoice.id
    );
    return;
  }

  const company = await getCompanyByStripeAccountId(stripeAccountId);

  if (!company) {
    console.error(
      "[Webhook] No company found for Stripe account:",
      stripeAccountId
    );
    return;
  }

  if (!invoice.id || !invoice.customer) {
    console.error(
      "[Webhook] Invoice is missing its ID or customer:",
      invoice.id
    );
    return;
  }

  try {
    await createFailedPayment({
      companyId: company.id,
      stripeInvoiceId: invoice.id,
      stripeCustomerId:
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer.id,
      customerEmail: invoice.customer_email ?? undefined,
      amount: (invoice.amount_remaining / 100).toFixed(2),
      currency: invoice.currency.toUpperCase(),
      failureReason:
        invoice.last_finalization_error?.message ??
        "Invoice payment failed",
      failedAt: new Date(),
    });

    console.log(
      `[Webhook] Failed invoice ${invoice.id} saved for company ${company.id}`
    );
  } catch (error) {
    console.error("[Webhook] Error saving failed invoice:", error);
    throw error;
  }
}

/**
 * Gérer la création d'une subscription
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("[Webhook] Subscription created:", subscription.id);

  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("[Webhook] Missing userId in subscription metadata");
    return;
  }

  const db = await getDb();
  if (!db) return;

  try {
    await db
      .update(users)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(users.id, parseInt(userId)));

    console.log(`[Webhook] Subscription created for user ${userId}`);
  } catch (error) {
    console.error("[Webhook] Error creating subscription:", error);
  }
}

/**
 * Gérer la mise à jour d'une subscription
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log("[Webhook] Checkout session completed:", session.id);

  const userId = session.metadata?.userId;

  if (!userId) {
    console.error("[Webhook] Missing userId in metadata");
    return;
  }

  const db = await getDb();

  if (!db) {
    console.error("[Webhook] Database not available");
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({ updatedAt: new Date() })
    .where(eq(users.id, Number(userId)));

  console.log(`[Webhook] Checkout completed for user ${userId}`);
}


/**
 * Gérer la mise à jour d'une subscription
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("[Webhook] Subscription updated:", subscription.id);

  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("[Webhook] Missing userId in subscription metadata");
    return;
  }

  const db = await getDb();
  if (!db) return;

  try {
    const status = subscription.status === "active" ? "active" : "inactive";

    await db
      .update(users)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(users.id, parseInt(userId)));

    console.log(`[Webhook] Subscription updated for user ${userId}: ${status}`);
  } catch (error) {
    console.error("[Webhook] Error updating subscription:", error);
  }
}

/**
 * Gérer la suppression d'une subscription
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[Webhook] Subscription deleted:", subscription.id);

  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("[Webhook] Missing userId in subscription metadata");
    return;
  }

  const db = await getDb();
  if (!db) return;

  try {
    await db
      .update(users)
      .set({
      updatedAt: new Date(),
      })
      .where(eq(users.id, parseInt(userId)));

    console.log(`[Webhook] Subscription deleted for user ${userId}`);
  } catch (error) {
    console.error("[Webhook] Error deleting subscription:", error);
  }
}

/**
 * Gérer le paiement de la facture
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("[Webhook] Invoice paid:", invoice.id);
  // Vous pouvez envoyer un email de confirmation ici
}

/**
 * Gérer l'échec du paiement
 */

/**
 * Gérer le succès du payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log("[Webhook] Payment intent succeeded:", paymentIntent.id);
}

/**
 * Gérer l'échec du payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log("[Webhook] Payment intent failed:", paymentIntent.id);
}
