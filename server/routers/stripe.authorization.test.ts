import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
const mocks = vi.hoisted(() => ({ session: vi.fn(), retrieve: vi.fn(), cancel: vi.fn(), create: vi.fn() }));
vi.mock("stripe", () => ({ default: class { checkout = { sessions: { retrieve: mocks.session, create: mocks.create } }; subscriptions = { retrieve: mocks.retrieve, cancel: mocks.cancel }; } }));
vi.stubEnv("STRIPE_SECRET_KEY", "mock-only");
const { stripeRouter } = await import("./stripe");
function caller(id: number | null) {
  return stripeRouter.createCaller({ user: id === null ? null : { id }, req: { headers: { origin: "http://localhost" } }, res: {} } as unknown as TrpcContext);
}
beforeEach(() => vi.resetAllMocks());
describe("Stripe ownership authorization", () => {
  it.each(["2", undefined, "", "01"])("denies foreign or missing owner %s", async owner => {
    mocks.session.mockResolvedValue({ metadata: { userId: owner } });
    mocks.retrieve.mockResolvedValue({ metadata: { userId: owner } });
    await expect(caller(1).getCheckoutSession({ sessionId: "cs_mock" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(1).cancelSubscription({ subscriptionId: "sub_mock" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
  it("allows the owner", async () => {
    const session = { metadata: { userId: "1" } };
    mocks.session.mockResolvedValue(session);
    mocks.retrieve.mockResolvedValue(session);
    mocks.cancel.mockResolvedValue({ id: "sub_mock", status: "canceled" });
    await expect(caller(1).getCheckoutSession({ sessionId: "cs_mock" })).resolves.toEqual(session);
    await expect(caller(1).cancelSubscription({ subscriptionId: "sub_mock" })).resolves.toMatchObject({ status: "canceled" });
    expect(mocks.cancel).toHaveBeenCalledWith("sub_mock");
  });
  it("rejects anonymous requests before contacting Stripe", async () => {
    await expect(caller(null).getCheckoutSession({ sessionId: "cs_mock" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller(null).cancelSubscription({ subscriptionId: "sub_mock" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.retrieve).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
  it("does not cancel when retrieval fails", async () => {
    mocks.retrieve.mockRejectedValue(new Error("mock failure"));
    await expect(caller(1).cancelSubscription({ subscriptionId: "sub_mock" })).rejects.toThrow();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
  it("sets ownership on new subscriptions", async () => {
    mocks.create.mockResolvedValue({ id: "cs_mock", url: "http://localhost" });
    await caller(1).createCheckoutSession({ priceId: "price_mock", planId: "starter" });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ metadata: { userId: "1", planId: "starter" }, subscription_data: { metadata: { userId: "1" } } }));
  });
});
