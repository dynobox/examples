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
  name: "tdd: builds a feature",
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
      id: "slugify-feature",
      name: "Build URL slugs test-first",
      fixtures: here.fixtures("slugify"),
      // Dynobox stages SKILL.md before scenario setup; copy its linked guides.
      setup: [
        `cp ${here.q("../tests.md")} .agents/skills/tdd/tests.md`,
        `cp ${here.q("../mocking.md")} .agents/skills/tdd/mocking.md`,
      ],
      // Agree the public interface up front so a headless run can proceed.
      prompt: [
        "Read .agents/skills/tdd/SKILL.md and use the tdd skill to implement slugify(text) in src/slugify.js.",
        "Lowercase the text, trim surrounding whitespace, and replace each run of spaces with one hyphen.",
        'For example, "  Ship It  Now  " should become "ship-it-now".',
        "The agreed seam is the exported slugify function.",
        "Write tests beside it in src/slugify.test.js using node:test.",
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
          ...artifact.exists("src/slugify.test.js"),
          id: "tests",
          label: "Creates tests beside the code",
        },
        {
          ...verify.succeeds("node --test"),
          id: "passing-suite",
          label: "Final test suite passes",
        },
        {
          ...verify.succeeds(`node ${here.q("helpers/verify-slugify.mjs")}`),
          id: "behavior",
          label: "Slugs match the specification",
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
