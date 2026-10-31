import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), company: vi.fn(), db: vi.fn(), token: vi.fn() }));
vi.mock("./db", () => ({ getDb: m.db, getCompanyById: m.company }));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: m.auth } }));
vi.mock("stripe", () => ({ default: class { oauth = { token: m.token }; } }));
vi.stubEnv("STRIPE_SECRET_KEY", "mock-only");
vi.stubEnv("STRIPE_CONNECT_CLIENT_ID", "mock-client");
vi.stubEnv("STRIPE_CONNECT_STATE_SECRET", "a".repeat(32));
vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
const { registerStripeConnectRoutes, saveStripeConnection } = await import("./stripeConnect");
const routes: Record<string, Function> = {};
registerStripeConnectRoutes({ get: (path: string, handler: Function) => { routes[path] = handler; } } as any);
function response() { const r: any = { redirect: vi.fn(), cookie: vi.fn(), clearCookie: vi.fn(), json: vi.fn() }; r.status = vi.fn(() => r); return r; }
async function start() {
  const res = response();
  await routes["/api/stripe/connect/start"]({ query: { companyId: "1" }, headers: {} }, res);
  const state = new URL(res.redirect.mock.calls[0][0]).searchParams.get("state")!;
  return { query: { state, code: "mock-code" }, headers: { cookie: `payrecover_connect=${res.cookie.mock.calls[0][1]}` } };
}
beforeEach(() => { vi.clearAllMocks(); m.auth.mockResolvedValue({ id: 1 }); m.company.mockResolvedValue({ id: 1, userId: 1 }); m.token.mockRejectedValue(new Error("mock exchange failure")); });
describe("Connect OAuth", () => {
  it("registers both routes and rejects a foreign company", async () => {
    m.company.mockResolvedValue({ userId: 2 }); const res = response();
    await routes["/api/stripe/connect/start"]({ query: { companyId: "1" } }, res);
    expect(res.status).toHaveBeenCalledWith(403); expect(m.token).not.toHaveBeenCalled();
  });
  it("rejects anonymous initiation", async () => {
    m.auth.mockResolvedValue(null); const res = response();
    await routes["/api/stripe/connect/start"]({ query: { companyId: "1" } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
  it.each(["tampered", "cookie", "expired", "user", "owner"])("rejects invalid callback: %s", async kind => {
    const req = await start();
    if (kind === "tampered") req.query.state += "x";
    if (kind === "cookie") req.headers.cookie = "";
    if (kind === "expired") vi.spyOn(Date, "now").mockReturnValue(Date.now() + 600001);
    if (kind === "user") m.auth.mockResolvedValue({ id: 2 });
    if (kind === "owner") m.company.mockResolvedValue({ userId: 2 });
    await routes["/api/stripe/connect/callback"](req, response());
    expect(m.token).not.toHaveBeenCalled(); vi.restoreAllMocks();
  });
  it("consumes state even when exchange fails", async () => {
    const req = await start(); await routes["/api/stripe/connect/callback"](req, response());
    await routes["/api/stripe/connect/callback"](req, response()); expect(m.token).toHaveBeenCalledTimes(1);
  });
  it("handles denial without exchanging a code", async () => {
    const req = await start(); Object.assign(req.query, { error: "access_denied" });
    const res = response(); await routes["/api/stripe/connect/callback"](req, res);
    expect(m.token).not.toHaveBeenCalled(); expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("stripe_oauth_denied"));
  });
  it("refuses incomplete tokens or missing database", async () => {
    await expect(saveStripeConnection(1, 1, {} as any)).rejects.toThrow();
    m.db.mockResolvedValue(null);
    await expect(saveStripeConnection(1, 1, { stripe_user_id: "acct_mock", access_token: "mock" } as any)).rejects.toThrow("Database unavailable");
  });
  it("saves account before marking company connected inside one transaction", async () => {
    const writes: string[] = [];
    const tx = { select: vi.fn().mockReturnValueOnce({ from: () => ({ where: () => ({ for: async () => [{ userId: 1 }] }) }) }).mockReturnValueOnce({ from: () => ({ where: () => ({ limit: async () => [] }) }) }), insert: () => ({ values: async () => { writes.push("account"); } }), update: () => ({ set: () => ({ where: async () => { writes.push("company"); } }) }) };
    const transaction = vi.fn(async fn => fn(tx)); m.db.mockResolvedValue({ transaction });
    await saveStripeConnection(1, 1, { stripe_user_id: "acct_mock", access_token: "mock" } as any);
    expect(transaction).toHaveBeenCalledTimes(1); expect(writes).toEqual(["account", "company"]);
    tx.insert = () => ({ values: async () => { throw new Error("save failed"); } }); writes.length = 0;
    await expect(saveStripeConnection(1, 1, { stripe_user_id: "acct_mock", access_token: "mock" } as any)).rejects.toThrow();
    expect(writes).toEqual([]);
  });
});
