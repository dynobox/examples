import fs from "node:fs";

const html = fs.readFileSync("show-me-checkout-states.html", "utf8");

for (const [pattern, message] of [
  [/<!doctype html>/i, "missing HTML doctype"],
  [/<html\b[^>]*>[\s\S]*<head\b[^>]*>[\s\S]*<\/head>[\s\S]*<body\b[^>]*>[\s\S]*<\/body>[\s\S]*<\/html>/i, "missing complete HTML document"],
  [/<meta\b[^>]*name=["']viewport["'][^>]*>/i, "missing viewport metadata"],
  [/@media\s*\(/i, "missing responsive media query"],
  [/#DX-2048/, "missing fixture-specific order number"],
]) {
  if (!pattern.test(html)) {
    throw new Error(message);
  }
}

for (const label of ["Processing payment", "Payment declined", "Order confirmed"]) {
  if (!html.includes(label)) {
    throw new Error(`missing state label: ${label}`);
  }
}
