import assert from "node:assert/strict";
import test from "node:test";
import { handleWebhook, stripeOptions } from "../src/stripe.mjs";

test("provides options when initializing Stripe", () => {
  assert.equal(typeof stripeOptions, "object");
});

test("handles completed checkout sessions", () => {
  assert.deepEqual(handleWebhook({ type: "checkout.session.completed" }), {
    handled: true,
  });
});
