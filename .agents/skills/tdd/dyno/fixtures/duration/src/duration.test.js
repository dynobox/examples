import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDuration } from "./duration.js";

test("parses hours", () => {
  assert.equal(parseDuration("2h"), 120);
});

test("parses minutes", () => {
  assert.equal(parseDuration("45m"), 45);
});

test("rejects input without a unit", () => {
  assert.throws(() => parseDuration("abc"));
});
