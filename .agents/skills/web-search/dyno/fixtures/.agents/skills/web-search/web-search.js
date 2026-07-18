#!/usr/bin/env node

const args = process.argv.slice(2);

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
