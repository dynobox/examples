#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
if (args.some((arg) => ["--help", "-h", "--version"].includes(arg))) {
  console.log("Usage: web-search.js <query> | --from <result-set-id> --fetch <indices>");
  process.exit(0);
}
// Anchor records at the fixture workspace even when the agent changes directory.
const record = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..", ".web-search-calls.json");
const calls = fs.existsSync(record) ? JSON.parse(fs.readFileSync(record, "utf8")) : [];
calls.push(args);
fs.writeFileSync(record, JSON.stringify(calls));

if (args.includes("--from")) {
  console.log("## Passkeys overview");
  console.log("URL: https://example.test/passkeys-overview");
  console.log("Passkeys use public-key cryptography and do not expose a shared secret to a phishing site.\n");
  console.log("## FIDO Alliance passkeys guide");
  console.log("URL: https://example.test/fido-passkeys-guide");
  console.log("Passkeys are tied to the legitimate site and help prevent phishing attacks.");
  process.exit(0);
}

console.log("## 1. Passkeys overview");
console.log("URL: https://example.test/passkeys-overview");
console.log("An introduction to passkeys and public-key cryptography.\n");
console.log("## 2. FIDO Alliance passkeys guide");
console.log("URL: https://example.test/fido-passkeys-guide");
console.log("A guide to phishing-resistant sign-in.\n");
console.log("Result set: passkey-results");
