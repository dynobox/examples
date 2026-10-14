// Independent check of the feature, run in the scenario work directory after
// the agent finishes. It does not rely on the agent's own tests.
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const { slugify } = await import(
  pathToFileURL(join(process.cwd(), "src/slugify.js")).href
);

assert.equal(slugify("Hello World"), "hello-world", "should lowercase");
assert.equal(slugify("  Trim Me  "), "trim-me", "should trim");
assert.equal(slugify("a   b"), "a-b", "should collapse a run of spaces");
assert.equal(
  slugify("Ship It  Now "),
  "ship-it-now",
  "should combine all rules",
);

console.log("slugify behaves correctly");
