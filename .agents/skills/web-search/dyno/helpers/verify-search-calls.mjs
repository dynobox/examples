import assert from "node:assert/strict";
import fs from "node:fs";

const calls = JSON.parse(fs.readFileSync(".web-search-calls.json", "utf8"));
const search = calls.findIndex((args) => args.includes("passkeys") && !args.includes("--from"));
const fetch = calls.findIndex((args) => args.includes("--from") || args.includes("--fetch"));
assert.ok(search >= 0 && fetch > search, "Search must run before fetching results");
for (const args of calls.slice(search + 1).filter((args) => args.includes("--from") || args.includes("--fetch"))) {
  assert.equal(args[args.indexOf("--from") + 1], "passkey-results", "Fetch must use the returned result-set ID");
  assert.equal(args[args.indexOf("--fetch") + 1], "1,2", "Fetch must select results 1 and 2");
}
