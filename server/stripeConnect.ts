import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { parse } from "cookie";
import { getCompanyById, getDb } from "./db";
import { sdk } from "./_core/sdk";
import { companies, stripeAccounts } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const ttl = 10 * 60 * 1000;
const pending = new Map<string, number>();
const cookieName = "payrecover_connect";
function secret() {
  const value = process.env.STRIPE_CONNECT_STATE_SECRET || process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Connect state secret must contain at least 32 characters");
  return value;
}
function baseUrl() {
  const url = new URL(process.env.APP_BASE_URL || "http://localhost:3000");
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("Invalid APP_BASE_URL");
  return url.origin;
}
function cookieOptions() {
  return { httpOnly: true, secure: baseUrl().startsWith("https:"), sameSite: "lax" as const, path: "/api/stripe/connect", maxAge: ttl };
}
export function getStripeConnectAuthorizeUrl(options: { companyId: number; userId: number; redirectUri: string; nonce: string }) {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) throw new Error("Missing Connect client ID");
  const payload = Buffer.from(JSON.stringify({ companyId: options.companyId, userId: options.userId, ts: Date.now(), nonce: options.nonce })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  const params = new URLSearchParams({ response_type: "code", client_id: clientId, scope: "read_write", state: `${payload}.${signature}`, redirect_uri: options.redirectUri });
  return `https://connect.stripe.com/oauth/authorize?${params}`;
}
function readState(req: Request) {
  try {
    if (typeof req.query.state !== "string" || req.query.state.length > 2048) return null;
    const parts = req.query.state.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!Number.isSafeInteger(value.companyId) || value.companyId <= 0 || !Number.isSafeInteger(value.userId) || value.userId <= 0 || !Number.isSafeInteger(value.ts) || value.ts > Date.now() || Date.now() - value.ts >= ttl || typeof value.nonce !== "string") return null;
    if (parse(req.headers.cookie || "")[cookieName] !== value.nonce || (pending.get(value.nonce) || 0) <= Date.now()) return null;
    return value as { companyId: number; userId: number; nonce: string };
  } catch { return null; }
}
export async function saveStripeConnection(companyId: number, userId: number, token: Stripe.OAuthToken) {
  if (!token.stripe_user_id || !token.access_token) throw new Error("Incomplete OAuth response");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    const [company] = await tx.select().from(companies).where(eq(companies.id, companyId)).for("update");
    if (!company || company.userId !== userId) throw new Error("Forbidden");
    const values = { stripeAccountId: token.stripe_user_id!, accessToken: token.access_token!, refreshToken: token.refresh_token || null, publishableKey: token.stripe_publishable_key || null, lastSyncedAt: new Date(), updatedAt: new Date() };
    const [existing] = await tx.select().from(stripeAccounts).where(eq(stripeAccounts.companyId, companyId)).limit(1);
    if (existing) await tx.update(stripeAccounts).set(values).where(eq(stripeAccounts.companyId, companyId));
    else await tx.insert(stripeAccounts).values({ companyId, ...values });
    await tx.update(companies).set({ stripeConnected: true, stripeAccountId: token.stripe_user_id, updatedAt: new Date() }).where(eq(companies.id, companyId));
  });
}
export function registerStripeConnectRoutes(app: Express) {
  app.get("/api/stripe/connect/start", async (req: Request, res: Response) => {
    try {
      const companyId = typeof req.query.companyId === "string" ? Number(req.query.companyId) : NaN;
      if (!Number.isSafeInteger(companyId) || companyId <= 0) return res.status(400).json({ message: "Invalid companyId" });
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      const company = await getCompanyById(companyId);
      if (!company || company.userId !== user.id) return res.status(403).json({ message: "Forbidden" });
      if (!stripe) throw new Error("Stripe unavailable");
    pending.forEach((expires, nonce) => {
  if (expires <= Date.now()) {
    pending.delete(nonce);
  }
});
      if (pending.size >= 10000) throw new Error("Too many pending requests");
      const nonce = randomBytes(32).toString("base64url");
      const url = getStripeConnectAuthorizeUrl({ companyId, userId: user.id, nonce, redirectUri: `${baseUrl()}/api/stripe/connect/callback` });
      pending.set(nonce, Date.now() + ttl);
      res.cookie(cookieName, nonce, cookieOptions());
      return res.redirect(url);
    } catch { return res.status(503).json({ message: "Stripe Connect unavailable" }); }
  });
  app.get("/api/stripe/connect/callback", async (req: Request, res: Response) => {
    try {
      const state = readState(req);
      if (!state) return res.redirect("/pricing?stripe=error&reason=invalid_oauth_state");
      const target = `/companies/${state.companyId}/stripe`;
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user || user.id !== state.userId) return res.redirect(`${target}?stripe=error&reason=unauthorized`);
      const company = await getCompanyById(state.companyId);
      if (!company || company.userId !== user.id) return res.redirect(`${target}?stripe=error&reason=company_not_found`);
      // Consume synchronously before exchanging the code, including concurrent callbacks.
      if (!pending.delete(state.nonce)) return res.redirect("/pricing?stripe=error&reason=invalid_oauth_state");
      res.clearCookie(cookieName, { ...cookieOptions(), maxAge: undefined });
      if (typeof req.query.error === "string") return res.redirect(`${target}?stripe=error&reason=stripe_oauth_denied`);
      if (!stripe || typeof req.query.code !== "string" || !req.query.code) return res.redirect(`${target}?stripe=error&reason=invalid_oauth_code`);
      const token = await stripe.oauth.token({ grant_type: "authorization_code", code: req.query.code });
      await saveStripeConnection(state.companyId, user.id, token);
      return res.redirect(`${target}?stripe=connected`);
    } catch { return res.redirect("/pricing?stripe=error&reason=oauth_exchange_failed"); }
  });
}
