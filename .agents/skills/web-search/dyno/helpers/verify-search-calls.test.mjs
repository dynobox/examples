import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, copyFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const verifier = fileURLToPath(new URL("./verify-search-calls.mjs", import.meta.url));
const fixture = fileURLToPath(new URL("../fixtures/.agents/skills/web-search/web-search.js", import.meta.url));
function accepts(calls) {
  const cwd = mkdtempSync(path.join(tmpdir(), "search-order-check-"));
  writeFileSync(path.join(cwd, ".web-search-calls.json"), JSON.stringify(calls));
  return spawnSync(process.execPath, [verifier], { cwd, encoding: "utf8" }).status === 0;
}
const search = ["passkeys"];
const fetch = ["--from", "passkey-results", "--fetch", "1,2"];
test("actual search must precede fetch using the returned ID and selected indices", () => {
  assert.ok(accepts([search, fetch]));
  for (const calls of [[fetch, search], [search], [search, ["--from", "wrong", "--fetch", "1,2"]], [search, ["--from", "passkey-results", "--fetch", "1"]]]) assert.equal(accepts(calls), false);
});
test("fixture records calls at the workspace root even from the skill directory", () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "search-fixture-check-"));
  const skillDir = path.join(cwd, ".agents/skills/web-search");
  mkdirSync(skillDir, { recursive: true });
  const entry = path.join(skillDir, "web-search.mjs");
  copyFileSync(fixture, entry);
  assert.equal(spawnSync(process.execPath, [entry, "--help"], { cwd: skillDir }).status, 0);
  assert.equal(existsSync(path.join(cwd, ".web-search-calls.json")), false);
  for (const args of [search, fetch]) assert.equal(spawnSync(process.execPath, [entry, ...args], { cwd: skillDir }).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(path.join(cwd, ".web-search-calls.json"), "utf8")), [search, fetch]);
});
