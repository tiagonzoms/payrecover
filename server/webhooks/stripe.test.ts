import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { readFileSync } from "node:fs";
const m = vi.hoisted(() => ({ verify: vi.fn(), db: vi.fn(), company: vi.fn(), save: vi.fn() }));
vi.mock("../db", () => ({ getDb: m.db, getCompanyByStripeAccountId: m.company, createFailedPayment: m.save }));
vi.mock("stripe", () => ({ default: class { webhooks = { constructEvent: m.verify }; } }));
import { stripeWebhookRouter } from "./stripe";
let server: Server | undefined;
let event: any;
beforeEach(() => {
  vi.resetAllMocks();
  event = { id: "evt_mock", type: "invoice.payment_failed", account: "acct_mock", data: { object: { id: "in_mock", customer: "cus_mock", amount_remaining: 1250, currency: "eur" } } };
  m.verify.mockImplementation(() => event);
  m.db.mockResolvedValue({});
  m.company.mockResolvedValue({ id: 42 });
  m.save.mockResolvedValue(undefined);
});
afterEach(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  server = undefined;
});
async function post(signature = "mock-signature") {
  const app = express();
  app.use("/api/stripe/webhook", stripeWebhookRouter);
  app.use(express.json());
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server!.once("listening", resolve));
  const address = server.address() as { port: number };
  return fetch(`http://127.0.0.1:${address.port}/api/stripe/webhook`, { method: "POST", headers: { "content-type": "application/json", ...(signature ? { "stripe-signature": signature } : {}) }, body: JSON.stringify({ mock: true }) });
}
describe("Stripe Connect webhook forwarding", () => {
  it.each(["cus_mock", { id: "cus_mock" }])("persists the invoice under the company resolved from event.account: %j", async customer => {
    event.data.object.customer = customer;
    const res = await post();
    expect(res.status).toBe(200);
    expect(m.company).toHaveBeenCalledWith("acct_mock");
    expect(m.save).toHaveBeenCalledWith(expect.objectContaining({ companyId: 42, stripeInvoiceId: "in_mock", stripeCustomerId: "cus_mock", amount: "12.50", currency: "EUR" }));
    expect(Buffer.isBuffer(m.verify.mock.calls[0][0])).toBe(true);
  });
  it("explicitly ignores platform invoices without looking up a company", async () => {
    delete event.account;
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, ignored: true, reason: "missing_connect_account" });
    expect(m.company).not.toHaveBeenCalled(); expect(m.save).not.toHaveBeenCalled();
  });
  it.each(["unavailable", "lookup", "write", "unknown"])("does not acknowledge a connected invoice when %s fails", async kind => {
    if (kind === "unavailable") m.db.mockResolvedValue(null);
    if (kind === "lookup") m.company.mockRejectedValue(new Error("mock lookup failure"));
    if (kind === "write") m.save.mockRejectedValue(new Error("mock write failure"));
    if (kind === "unknown") m.company.mockResolvedValue(undefined);
    const res = await post();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
    if (kind !== "write") expect(m.save).not.toHaveBeenCalled();
  });
  it("does not bypass invoice persistence for synthetic test IDs", async () => {
    event.id = "evt_test_mock";
    m.save.mockRejectedValue(new Error("mock write failure"));
    expect((await post()).status).toBe(500);
  });
  it("rejects a missing signature", async () => {
    expect((await post("")).status).toBe(400);
    expect(m.verify).not.toHaveBeenCalled(); expect(m.save).not.toHaveBeenCalled();
  });
  it("rejects an invalid signature", async () => {
    m.verify.mockImplementation(() => { throw new Error("mock signature failure"); });
    expect((await post()).status).toBe(400); expect(m.save).not.toHaveBeenCalled();
  });
  it("mounts the webhook once before the JSON parser in the server entry point", () => {
    const source = readFileSync(new URL("../_core/index.ts", import.meta.url), "utf8");
    const mount = 'app.use("/api/stripe/webhook", stripeWebhookRouter)';
    expect(source.split(mount)).toHaveLength(2);
    expect(source.indexOf(mount)).toBeLessThan(source.indexOf("app.use(express.json("));
  });
});
