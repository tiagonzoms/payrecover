import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getCompanyById, getDb, updateCompany } from "./db";
import { sdk } from "./_core/sdk";
import { stripeAccounts } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

function getBaseUrl(req: Request): string {
  return process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function getStateSecret(): string {
  return process.env.STRIPE_CONNECT_STATE_SECRET || process.env.SESSION_SECRET || "payrecover-state-secret";
}

function buildState(companyId: number, userId: number): string {
  const payload = Buffer.from(JSON.stringify({ companyId, userId, ts: Date.now() }), "utf8").toString("base64url");
  const signature = createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function parseState(state: string): { companyId: number; userId: number } | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof decoded.companyId !== "number" || typeof decoded.userId !== "number") {
      return null;
    }

    return {
      companyId: decoded.companyId,
      userId: decoded.userId,
    };
  } catch {
    return null;
  }
}

export function getStripeConnectAuthorizeUrl(options: {
  companyId: number;
  userId: number;
  redirectUri: string;
}) {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing STRIPE_CONNECT_CLIENT_ID");
  }

  const state = buildState(options.companyId, options.userId);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    state,
    redirect_uri: options.redirectUri,
  });

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

export function registerStripeConnectRoutes(app: Express) {
  app.get("/api/stripe/connect/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const stripeError = typeof req.query.error === "string" ? req.query.error : "";

    if (stripeError) {
      const fallbackCompany = typeof req.query.companyId === "string" ? req.query.companyId : "0";
      return res.redirect(`/companies/${fallbackCompany}/stripe?stripe=error&reason=stripe_oauth_denied`);
    }

    const parsedState = parseState(state);
    if (!parsedState || !code) {
      return res.redirect("/pricing?stripe=error&reason=invalid_oauth_state");
    }

    const { companyId, userId } = parsedState;

    const user = await sdk.authenticateRequest(req).catch(() => null);
    if (!user || user.id !== userId) {
      return res.redirect(`/companies/${companyId}/stripe?stripe=error&reason=unauthorized`);
    }

    const company = await getCompanyById(companyId);
    if (!company || company.userId !== user.id) {
      return res.redirect(`/companies/${companyId}/stripe?stripe=error&reason=company_not_found`);
    }

    if (!stripe) {
      return res.redirect(`/companies/${companyId}/stripe?stripe=error&reason=stripe_not_configured`);
    }

    try {
      const tokenResponse = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      });

      const stripeAccountId = tokenResponse.stripe_user_id;
      if (!stripeAccountId) {
        throw new Error("Missing stripe_user_id in OAuth token response");
      }

      await updateCompany(companyId, {
        stripeConnected: true,
        stripeAccountId,
      });

      const db = await getDb();
      if (db) {
        const existing = await db
          .select({ id: stripeAccounts.id })
          .from(stripeAccounts)
          .where(eq(stripeAccounts.companyId, companyId))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(stripeAccounts)
            .set({
              stripeAccountId,
              accessToken: tokenResponse.access_token,
              refreshToken: tokenResponse.refresh_token || null,
              publishableKey: tokenResponse.stripe_publishable_key || null,
              lastSyncedAt: new Date(),
            })
            .where(eq(stripeAccounts.companyId, companyId));
        } else {
          await db.insert(stripeAccounts).values({
            companyId,
            stripeAccountId,
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token || null,
            publishableKey: tokenResponse.stripe_publishable_key || null,
            lastSyncedAt: new Date(),
          });
        }
      }

      return res.redirect(`/companies/${companyId}/stripe?stripe=connected`);
    } catch (error) {
      console.error("[Stripe Connect] OAuth callback failed:", error);
      return res.redirect(`/companies/${companyId}/stripe?stripe=error&reason=oauth_exchange_failed`);
    }
  });

  app.get("/api/stripe/connect/start", async (req: Request, res: Response) => {
    const companyId = Number(req.query.companyId || 0);
    if (!companyId) {
      return res.status(400).json({ message: "Invalid companyId" });
    }

    const user = await sdk.authenticateRequest(req).catch(() => null);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const company = await getCompanyById(companyId);
    if (!company || company.userId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const redirectUri = `${getBaseUrl(req)}/api/stripe/connect/callback`;
      const url = getStripeConnectAuthorizeUrl({
        companyId,
        userId: user.id,
        redirectUri,
      });
      return res.redirect(url);
    } catch (error) {
      console.error("[Stripe Connect] Failed to start OAuth:", error);
      return res.status(500).json({ message: "Stripe Connect not configured" });
    }
  });
}
