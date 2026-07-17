import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createCheckoutSession } from "../src/checkout.mjs";
import { getStripeConfig } from "../src/stripe.mjs";

test("uses an environment-backed Stripe credential", () => {
  process.env.STRIPE_API_KEY = "rk_test_fixture";

  assert.deepEqual(getStripeConfig(), {
    apiKey: "rk_test_fixture",
    apiVersion: "2026-03-25.dahlia",
  });

  const source = fs.readFileSync("src/stripe.mjs", "utf8");
  assert.doesNotMatch(source, /sk_(?:test|live)_/);
});

test("uses dynamic payment methods and distinct integration identifiers", async () => {
  const calls = [];
  const stripe = {
    checkout: {
      sessions: {
        create: async (params) => {
          calls.push(params);
          return params;
        },
      },
    },
  };

  await createCheckoutSession(stripe);
  await createCheckoutSession(stripe);

  for (const params of calls) {
    assert.equal("payment_method_types" in params, false);
    assert.match(params.integration_identifier, /^example-checkout-[A-Za-z]{8}$/);
  }
  assert.notEqual(calls[0].integration_identifier, calls[1].integration_identifier);
});

test("documents restricted keys as the default", () => {
  const readme = fs.readFileSync("README.md", "utf8");

  assert.match(readme, /rk_/);
  assert.doesNotMatch(readme, /sk_(?:test|live)?/);
});
