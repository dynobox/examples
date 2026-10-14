// Independent check of the fix, run in the scenario work directory after the
// agent finishes. It does not rely on the agent's own tests.
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const { parseDuration } = await import(
  pathToFileURL(join(process.cwd(), "src/duration.js")).href
);

assert.equal(parseDuration("1h30m"), 90, "1h30m should be 90 minutes");
assert.equal(parseDuration("2h15m"), 135, "2h15m should be 135 minutes");
assert.equal(parseDuration("2h"), 120, "2h should still be 120 minutes");
assert.equal(parseDuration("45m"), 45, "45m should still be 45 minutes");
assert.throws(() => parseDuration("abc"), "input without a unit should throw");

console.log("parseDuration behaves correctly");
