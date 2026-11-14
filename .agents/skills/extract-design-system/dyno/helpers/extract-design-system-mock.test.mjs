import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { extractDesignSystemMock } from "./extract-design-system-mock.mjs";

const run = (cwd, argv) => extractDesignSystemMock.handler({ cwd, argv, env: {} });

test("npx options preserve both installation and extraction", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "extract-mock-options-"));
  assert.equal((await run(cwd, ["--yes", "playwright", "install", "chromium"])).exitCode, 0);
  assert.equal((await run(cwd, ["-y", "extract-design-system", "https://example.test/"])).exitCode, 0);
  assert.ok(JSON.parse(await readFile(path.join(cwd, "design-system/tokens.json"), "utf8")).colors);
});

test("help after extraction-only does not generate or change artifacts", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "extract-mock-help-"));
  assert.equal((await run(cwd, ["extract-design-system", "https://example.test/", "--extract-only"])).exitCode, 0);
  const raw = await readFile(path.join(cwd, ".extract-design-system/raw.json"));
  for (const flag of ["--help", "-h"]) {
    assert.equal((await run(cwd, ["extract-design-system", flag])).exitCode, 0);
    assert.deepEqual(await readdir(cwd), [".extract-design-system"]);
    assert.deepEqual(await readFile(path.join(cwd, ".extract-design-system/raw.json")), raw);
  }
});

test("invalid targets and unknown options cannot create output", async () => {
  for (const args of [["init"], ["--unknown"], ["file:///tmp/example"], ["https://example.test/", "--unknown"]]) {
    const cwd = await mkdtemp(path.join(tmpdir(), "extract-mock-invalid-"));
    assert.notEqual((await run(cwd, ["extract-design-system", ...args])).exitCode, 0);
    assert.deepEqual(await readdir(cwd), []);
  }
});
