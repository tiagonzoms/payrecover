import Stripe from "stripe";
import { getDb, createFailedPayment, getCompanyById, getRecoveryCampaignsByCompanyId, createRecoveryAttempt, createEmailLog, updateFailedPayment } from "./db";
import { ENV } from "./_core/env";

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover" as any,
});

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(event: Stripe.Event) {
  console.log(`[Stripe] Received event: ${event.type}`);

  switch (event.type) {
    case "charge.failed":
      await handleChargeFailed(event.data.object as Stripe.Charge);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle charge.failed event
 */
async function handleChargeFailed(charge: Stripe.Charge) {
  console.log(`[Stripe] Charge failed: ${charge.id}`);

  // Find company by Stripe customer ID
  const db = await getDb();
  if (!db) {
    console.error("[Stripe] Database not available");
    return;
  }

  // For now, we'll log the event
  // In production, you would need to track which company owns this customer
  console.log(`[Stripe] Failed charge for customer: ${charge.customer}`);
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`[Stripe] Invoice payment failed: ${invoice.id}`);

  const db = await getDb();
  if (!db) {
    console.error("[Stripe] Database not available");
    return;
  }

  // Get customer email
  const customer = await stripe.customers.retrieve(invoice.customer as string);
  const customerEmail = (customer as any).email || "";

  // Log the failed payment
  // In production, you would match the invoice to a company and create a recovery campaign
  console.log(`[Stripe] Failed payment for customer: ${customerEmail}`);
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`[Stripe] Invoice payment succeeded: ${invoice.id}`);

  const db = await getDb();
  if (!db) {
    console.error("[Stripe] Database not available");
    return;
  }

  // Mark any failed payments for this invoice as recovered
  // This would be implemented in production
  console.log(`[Stripe] Payment recovered for invoice: ${invoice.id}`);
}

/**
 * Create a test charge to verify Stripe integration
 */
export async function createTestCharge(amount: number, customerId: string) {
  try {
    const charge = await stripe.charges.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      customer: customerId,
      description: "Test charge for PayRecover",
    });

    return charge;
  } catch (error) {
    console.error("[Stripe] Failed to create test charge:", error);
    throw error;
  }
}

/**
 * Get Stripe customer
 */
export async function getStripeCustomer(customerId: string) {
  try {
    return await stripe.customers.retrieve(customerId);
  } catch (error) {
    console.error("[Stripe] Failed to get customer:", error);
    throw error;
  }
}

/**
 * List failed invoices for a customer
 */
export async function getFailedInvoices(customerId: string) {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      status: "open",
      limit: 100,
    });

    return invoices.data.filter((inv: Stripe.Invoice) => !(inv as any).paid === false);
  } catch (error) {
    console.error("[Stripe] Failed to get invoices:", error);
    throw error;
  }
}

/**
 * Retry a failed payment
 */
export async function retryPayment(invoiceId: string) {
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    
    // Attempt to pay the invoice
    const result = await stripe.invoices.pay(invoiceId);
    
    return result;
  } catch (error) {
    console.error("[Stripe] Failed to retry payment:", error);
    throw error;
  }
}

/**
 * Get Stripe account balance
 */
export async function getAccountBalance() {
  try {
    const balance = await stripe.balance.retrieve();
    return balance;
  } catch (error) {
    console.error("[Stripe] Failed to get balance:", error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(body: string, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }

  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("[Stripe] Webhook signature verification failed:", error);
    throw error;
  }
}
