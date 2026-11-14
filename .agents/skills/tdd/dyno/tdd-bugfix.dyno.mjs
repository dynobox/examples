import {
  artifact,
  defineDyno,
  dyno,
  sequence,
  skill,
  transcript,
  tool,
  verify,
} from "@dynobox/sdk";

const here = dyno.here(import.meta.url);

export default defineDyno({
  name: "[tdd] fixes a bug",
  target: "tdd",
  harnesses: [
    { id: "claude-code", model: "haiku", permissionMode: "dangerous" },
    { id: "codex", model: "gpt-6-luna", permissionMode: "dangerous" },
    { id: "cursor", model: "composer-2.5", permissionMode: "dangerous" },
    {
      id: "antigravity",
      model: "gemini-3.8-flash-low",
      permissionMode: "dangerous",
    },
    {
      id: "pi",
      model: "anthropic/claude-haiku-5-5",
      permissionMode: "dangerous",
    },
  ],
  scenarios: [
    {
      id: "parse-duration-bug",
      name: "Fix combined durations test-first",
      fixtures: here.fixtures("duration"),
      // Dynobox stages SKILL.md before scenario setup; copy its linked guides.
      setup: [
        `cp ${here.q("../tests.md")} .agents/skills/tdd/tests.md`,
        `cp ${here.q("../mocking.md")} .agents/skills/tdd/mocking.md`,
      ],
      // The existing tests pass, so the agent must add a regression test.
      prompt: [
        'Bug report: parseDuration("1h30m") in src/duration.js returns 60, but it must return 90 minutes.',
        "Read .agents/skills/tdd/SKILL.md and use the tdd skill to fix it.",
        "The agreed seam is the exported parseDuration function.",
        "Add a node:test regression test beside the code in src/duration.regression.test.js.",
        "Keep src/duration.test.js unchanged.",
        "Run tests with `node --test --test-reporter=tap`.",
        "Do not install packages. You have approval to proceed without further questions.",
      ].join(" "),
      assertions: [
        {
          ...skill.referenced("tdd"),
          id: "skill",
          label: "Reads the TDD skill",
        },
        {
          ...sequence.inOrder([
            // Raw shell matching also sees test commands after heredocs.
            tool.called("shell", { matches: String.raw`(?:^|[\s"';&|])(?:[^\s"';&|]+/)?node\s+--test(?:[\s"']|$)` }),
            tool.called("shell", { matches: String.raw`(?:^|[\s"';&|])(?:[^\s"';&|]+/)?node\s+--test(?:[\s"']|$)` }),
          ]),
          id: "test-runs",
          label: "Runs tests during development",
        },
        // TAP failure output is simple evidence; it does not prove edit order.
        {
          ...transcript.contains("not ok"),
          id: "failing-test",
          label: "Reports a failing test",
        },
        {
          ...artifact.contains("src/duration.regression.test.js", "1h30m"),
          id: "regression",
          label: "Adds a regression for the reported input",
        },
        {
          ...artifact.unchanged("src/duration.test.js"),
          id: "existing-tests",
          label: "Preserves every existing test",
        },
        {
          ...verify.succeeds("node --test"),
          id: "passing-suite",
          label: "Final test suite passes",
        },
        {
          ...verify.succeeds(`node ${here.q("helpers/verify-duration.mjs")}`),
          id: "behavior",
          label: "Durations match the specification",
        },
        {
          ...artifact.notExists("node_modules"),
          id: "dependencies",
          label: "Uses no installed dependencies",
        },
      ],
    },
  ],
});
