import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { verifyCollapsedCalloutContent, verifyHiddenEditorialComment, verifyPatterns } from "./assertions.mjs";

function accepts(check, text) {
  const cwd = mkdtempSync(path.join(tmpdir(), "obsidian-check-"));
  writeFileSync(path.join(cwd, "Note.md"), text);
  const result = spawnSync("/bin/sh", ["-c", check.command], { cwd, encoding: "utf8" });
  assert.equal(result.stderr, "");
  return result.status === 0;
}

test("foldable answers can use the topic heading or the callout title", () => {
  const check = verifyCollapsedCalloutContent("Note.md", "Offline access");
  for (const text of [
    "## Offline access\n\n> [!faq]- Can I use these notes offline?\n> Yes, keep a local copy.",
    "> [!faq]- Offline access\n> Yes, keep a local copy.",
    "> [!faq]+ Offline access\n> Yes, keep a local copy.",
    "## Other topic\n> [!faq]- Other\n> Other answer.\n\n## Offline access\n> [!faq]- Offline\n> Local copies work.",
  ]) assert.ok(accepts(check, text), text);
});

test("unrelated, non-foldable, and empty callouts do not pass", () => {
  const check = verifyCollapsedCalloutContent("Note.md", "Offline access");
  for (const text of [
    "## Offline access\nPlain answer.\n\n## Other topic\n> [!faq]- Other\n> Unrelated answer.",
    "## Offline access\n> [!faq] Offline access\n> Answer.",
    "## Offline access\n> [!faq]- Offline access",
  ]) assert.equal(accepts(check, text), false, text);
});

test("hidden comments accept inline and multiline forms but need paired delimiters", () => {
  const check = verifyHiddenEditorialComment("Note.md");
  for (const text of ["%% Editorial note %%", "%%\nEditorial note\n%%"]) assert.ok(accepts(check, text));
  for (const text of ["Editorial note", "%% Editorial note", "%% %%"]) assert.equal(accepts(check, text), false);
});

test("warning aliases pass but ordinary notes do not", () => {
  const check = verifyPatterns("Note.md", [/^>\s*\[!(?:warning|caution|attention|danger|error)\]/im]);
  for (const type of ["warning", "caution", "attention", "danger", "error"]) assert.ok(accepts(check, `> [!${type}] Delivery risk\n> Decisions could delay delivery.`));
  assert.equal(accepts(check, "> [!note] Routine information"), false);
});
