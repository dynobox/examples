import {
  anyOf,
  artifact,
  command,
  defineDyno,
  dyno,
  finalMessage,
  skill,
  tool,
  verify,
} from "@dynobox/sdk";
import { createSetup } from "./helpers/setup.mjs";

const here = dyno.here(import.meta.url);

const referenceWasRead = (name) =>
  anyOf([
    tool.called("read_file", {
      path: `.agents/skills/stripe-best-practices/references/${name}.md`,
    }),
    tool.called("read_file", {
      path: `.claude/skills/stripe-best-practices/references/${name}.md`,
    }),
    command.called("cat", {
      argsMatching: [new RegExp(`references/${name}\\.md$`)],
    }),
    command.called("sed", {
      originalIncludes: `references/${name}.md`,
    }),
  ]);

export default defineDyno({
  name: "[stripe-best-practices] modernizes a Checkout integration",
  target: "stripe-best-practices",
  setup: createSetup(here),
  harnesses: [
    {
      id: "claude-code",
      model: "sonnet",
      permissionMode: "dangerous",
    },
    {
      id: "codex",
      model: "gpt-5.4-mini",
      permissionMode: "dangerous",
    },
  ],
  scenarios: [
    {
      id: "checkout-security-modernization",
      name: "modernize Checkout and credential handling",
      prompt:
        "Read .agents/skills/stripe-best-practices/SKILL.md and the relevant payment and security references, then modernize this non-Terminal Checkout integration. Keep Checkout Sessions and the configured API version. Enable dynamic payment methods, load the Stripe credential from STRIPE_API_KEY, document restricted keys as the default, and tag each session with the example-checkout label plus the required random suffix. Do not modify the tests. Run npm test and summarize the security and payment-method changes.",
      assertions: [
        skill.referenced("stripe-best-practices"),
        referenceWasRead("payments"),
        referenceWasRead("security"),
        command.called("npm", { args: ["test"] }),
        artifact.unchanged("test/checkout.test.mjs"),
        artifact.contains("README.md", "rk_"),
        verify.succeeds("npm test"),
        verify.succeeds(
          "node -e 'const fs = require(\"node:fs\"); const source = fs.readFileSync(\"src/checkout.mjs\", \"utf8\") + fs.readFileSync(\"src/stripe.mjs\", \"utf8\"); if (/payment_method_types/.test(source) || /sk_(?:test|live)_/.test(source)) process.exit(1)'",
        ),
        anyOf([
          finalMessage.contains("dynamic payment methods"),
          finalMessage.contains("Dynamic payment methods"),
        ]),
        anyOf([
          finalMessage.contains("restricted key"),
          finalMessage.contains("Restricted key"),
          finalMessage.contains("RAK"),
        ]),
      ],
    },
  ],
});
