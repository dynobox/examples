import {
  anyOf,
  artifact,
  command,
  defineDyno,
  dyno,
  skill,
  verify,
} from "@dynobox/sdk";
import {
  fileWasRead,
  verifyFileExcludes,
  verifyNodeWebhookFallback,
} from "./helpers/assertions.mjs";

const here = dyno.here(import.meta.url);
const commonFixture = here.fixtures("common");

export default defineDyno({
  name: "[upgrade-stripe] upgrades dynamic and strongly typed SDKs",
  target: "upgrade-stripe",
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
      id: "node-sdk-upgrade",
      name: "upgrade the Node SDK and API version",
      fixtures: [commonFixture, here.fixtures("node")],
      prompt:
        "Read .agents/skills/upgrade-stripe/SKILL.md, then use the upgrade-stripe skill to perform the approved Stripe upgrade described in UPGRADE.md. Preserve the application behavior. Do not modify test files or UPGRADE.md. This fixture has no installed third-party packages, so do not contact a package registry.",
      assertions: [
        // Goal: prove the harness consulted the upgrade instructions rather than guessing.
        skill.referenced("upgrade-stripe"),
        // Goal: ensure it inspected the application manifest before changing dependencies.
        fileWasRead("package.json"),
        // Goal: ensure it used the user-provided upgrade target as the source of truth.
        fileWasRead("UPGRADE.md"),
        // Goal: require a local regression-test run without prescribing an equivalent runner invocation.
        anyOf([
          command.called("npm", { args: ["test"] }),
          command.called("node", { argsInOrder: ["--test"] }),
        ]),
        // Goal: verify the approved Node SDK dependency is reflected in the manifest.
        artifact.contains("package.json", '"stripe": "18.5.0"'),
        // Goal: verify the lockfile was updated alongside the manifest.
        artifact.contains("package-lock.json", '"stripe": "18.5.0"'),
        artifact.contains("package-lock.json", '"version": "18.5.0"'),
        // Goal: require the skill's explicit API-version configuration for Node.
        artifact.contains("src/stripe.mjs", "2025-08-27.basil"),
        // Goal: protect the user-owned regression tests from being weakened or replaced.
        artifact.unchanged("test/stripe.test.mjs"),
        // Goal: protect the user-approved upgrade target from alteration.
        artifact.unchanged("UPGRADE.md"),
        // Goal: verify the resulting integration still passes its regression suite.
        verify.succeeds("npm test"),
        // Goal: require forward-compatible handling of webhook event types introduced after the upgrade.
        verifyNodeWebhookFallback(),
      ],
    },
    {
      id: "go-sdk-upgrade",
      name: "upgrade a strongly typed Go SDK",
      fixtures: [commonFixture, here.fixtures("go")],
      prompt:
        "Read .agents/skills/upgrade-stripe/SKILL.md, then use the upgrade-stripe skill to perform the approved Stripe upgrade described in UPGRADE.md. Preserve the application behavior. Do not modify test files or UPGRADE.md. This fixture uses only the Go standard library at runtime, so do not download dependencies.",
      assertions: [
        // Goal: prove the harness consulted the upgrade instructions rather than guessing.
        skill.referenced("upgrade-stripe"),
        // Goal: ensure it inspected the Go module before changing the SDK version.
        fileWasRead("go.mod"),
        // Goal: ensure it used the user-provided upgrade target as the source of truth.
        fileWasRead("UPGRADE.md"),
        // Goal: require a local regression-test run as part of the upgrade workflow.
        command.called("go", { argsInOrder: ["test", "./..."] }),
        // Goal: verify the approved strongly typed SDK module is selected.
        artifact.contains(
          "go.mod",
          "github.com/stripe/stripe-go/v82 v82.0.0",
        ),
        // Goal: protect the user-owned regression tests from being weakened or replaced.
        artifact.unchanged("stripe_test.go"),
        // Goal: protect the user-approved upgrade target from alteration.
        artifact.unchanged("UPGRADE.md"),
        // Goal: require the skill's strongly typed SDK rule: no request-level API-version override.
        verifyFileExcludes("stripe.go", "Stripe-Version"),
        // Goal: verify the resulting integration still passes its regression suite.
        verify.succeeds("go test ./..."),
      ],
    },
  ],
});
