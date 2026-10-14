import {
  artifact,
  command,
  defineDyno,
  dyno,
  sequence,
  skill,
  verify,
} from "@dynobox/sdk";

// Path helpers that resolve relative to this file.
const here = dyno.here(import.meta.url);

// This dyno is in .agents/skills/tdd/, so Dynobox copies the tdd SKILL.md into
// each scenario work directory. The agent can find the skill there.
export default defineDyno({
  name: "[tdd] fixes a bug test-first",
  target: "tdd",

  // Each scenario runs once on each of these harnesses.
  harnesses: [
    { id: "claude-code", model: "sonnet", permissionMode: "dangerous" },
    // Dynobox cannot set reasoning effort. Codex reads it from
    // ~/.codex/config.toml (model_reasoning_effort = "medium").
    { id: "codex", model: "gpt-5.6-terra", permissionMode: "dangerous" },
    { id: "cursor", permissionMode: "dangerous" },
    { id: "antigravity", permissionMode: "dangerous" },
  ],

  scenarios: [
    {
      id: "parse-duration-bug",
      name: "reproduces the bug with a failing test, then fixes it",

      // Copies fixtures/duration/ into the work directory before the agent
      // starts. src/duration.js has the bug: it reads only the first unit of
      // "1h30m". The existing tests in test/duration.test.js all pass.
      fixtures: here.fixtures("duration"),

      // The skill tells the agent to confirm the seam with the user before it
      // writes tests. Nobody can answer during a dyno run, so the prompt
      // agrees the seam up front.
      prompt: [
        'Bug report: parseDuration("1h30m") in src/duration.js returns 60, but it must return 90 (durations are in minutes).',
        "Use the tdd skill to fix it.",
        "The seam is agreed: the exported parseDuration function.",
        "Add the test to test/duration.test.js and run the tests with `node --test`.",
        "Do not install packages. Do not ask questions.",
      ].join(" "),

      // Each assertion gets a label, which the report shows in place of the
      // default description.
      assertions: [
        // Passes when the agent opens the tdd SKILL.md.
        { ...skill.referenced("tdd"), label: "reads the tdd skill" },

        // A red-green loop runs the tests at least twice: once to see the new
        // test fail, and once to see it pass. This checks that the two runs
        // occurred, in order. It does not check their results.
        {
          ...sequence.inOrder([
            command.called("node", { args: ["--test"] }),
            command.called("node", { args: ["--test"] }),
          ]),
          label: "runs the tests at least twice (red → green)",
        },

        // Artifact assertions read the work directory after the agent stops.
        {
          ...artifact.contains("test/duration.test.js", "1h30m"),
          label: "adds a test for the reported case",
        },
        {
          ...artifact.contains("test/duration.test.js", "parses hours"),
          label: "keeps the existing tests",
        },

        // Verify commands also run in the work directory after the agent
        // stops. Each one passes when its command exits with 0.
        {
          ...verify.succeeds("node --test"),
          label: "ends with a passing suite",
        },

        // The agent wrote its own tests, so a separate script checks
        // parseDuration with other durations too.
        {
          ...verify.succeeds(`node ${here.q("./helpers/verify-duration.mjs")}`),
          label: "fix passes an independent check of other durations",
        },

        // The task needs only node:test, so there must be no node_modules.
        {
          ...artifact.notExists("node_modules"),
          label: "installs no packages",
        },
      ],
    },
  ],
});
