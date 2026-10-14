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
  name: "[tdd] builds a feature test-first",
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
      id: "slugify-feature",
      name: "implements slugify with a red-green loop",

      // Copies fixtures/slugify/ into the work directory before the agent
      // starts. It has a package.json and a src/slugify.js stub that throws.
      fixtures: here.fixtures("slugify"),

      // The skill tells the agent to confirm the seam with the user before it
      // writes tests. Nobody can answer during a dyno run, so the prompt
      // agrees the seam up front.
      prompt: [
        "Use the tdd skill to implement slugify(text) in src/slugify.js.",
        "slugify lowercases the text, trims surrounding whitespace, and replaces each run of spaces with one hyphen.",
        "The seam is agreed: the exported slugify function.",
        "Write the tests in test/slugify.test.js with node:test and run them with `node --test`.",
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
          ...artifact.exists("test/slugify.test.js"),
          label: "writes the test file",
        },

        // Verify commands also run in the work directory after the agent
        // stops. Each one passes when its command exits with 0.
        {
          ...verify.succeeds("node --test"),
          label: "ends with a passing suite",
        },

        // The agent wrote its own tests, so a separate script checks slugify
        // against the spec.
        {
          ...verify.succeeds(`node ${here.q("./helpers/verify-slugify.mjs")}`),
          label: "slugify passes an independent spec check",
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
