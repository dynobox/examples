import {
  anyOf,
  artifact,
  command,
  defineDyno,
  finalMessage,
  sequence,
  skill,
  verify,
} from "@dynobox/sdk";
import { hunkMock } from "./helpers/hunk-mock.mjs";

const doesNotLaunchTui = command.notCalled("hunk", {
  originalMatches: /^(?:.*[\\/])?hunk\s+(?:diff|show)(?:\s|$)/,
});

export default defineDyno({
  name: "[hunk-review] controls live review sessions",
  target: "hunk-review",
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
      id: "no-active-session",
      name: "asks the user to launch Hunk when no session exists",
      prompt:
        "Read .agents/skills/hunk-review/SKILL.md, then review the current changes with Hunk. The Hunk CLI is available on PATH as hunk.",
      setup: ["printf 'no-session\n' > .review-mode"],
      cliMocks: { hunk: hunkMock },
      assertions: [
        skill.referenced("hunk-review"),
        command.called("hunk", { argsInOrder: ["session", "list"] }),
        command.notCalled("hunk", {
          argsInOrder: ["session", "comment"],
        }),
        doesNotLaunchTui,
        finalMessage.contains("Hunk"),
        finalMessage.contains("session"),
      ],
    },
    {
      id: "review-and-batch-comments",
      name: "inspects structure and annotates review issues",
      prompt:
        "Read .agents/skills/hunk-review/SKILL.md, then review the live Hunk session and annotate any issues you find. The Hunk CLI is available on PATH as hunk.",
      setup: ["printf 'review\n' > .review-mode"],
      cliMocks: { hunk: hunkMock },
      assertions: [
        skill.referenced("hunk-review"),
        sequence.inOrder([
          command.called("hunk", { argsInOrder: ["session", "list"] }),
          command.called("hunk", {
            originalMatches:
              /^(?!.*--include-patch)(?:\.\/)?hunk\s+session\s+review\b.*--json(?:\s|$)/,
          }),
          command.called("hunk", {
            args: ["session", "review", "--include-patch", "--json"],
          }),
          command.called("hunk", {
            argsInOrder: ["session", "navigate"],
          }),
        ]),
        anyOf([
          command.called("hunk", {
            argsInOrder: ["session", "comment", "apply", "--stdin"],
          }),
          command.called("hunk", {
            argsInOrder: ["session", "comment", "add"],
          }),
        ]),
        doesNotLaunchTui,
        artifact.exists(".hunk-comments.json"),
        artifact.contains(".hunk-comments.json", "src/auth.js"),
        artifact.contains(".hunk-comments.json", "src/jobs.js"),
        // The mock records the simulated session's two expected review notes.
        verify.succeeds(
          "node -e \"const comments = JSON.parse(require('node:fs').readFileSync('.hunk-comments.json', 'utf8')).comments; if (comments.length !== 2) throw new Error('expected exactly two review comments')\"",
        ),
      ],
    },
    {
      id: "tracked-changes-only",
      name: "reloads a session without untracked files",
      prompt:
        "Read .agents/skills/hunk-review/SKILL.md, then update the live Hunk review to show tracked changes only. The Hunk CLI is available on PATH as hunk.",
      setup: ["printf 'reload\n' > .review-mode"],
      cliMocks: { hunk: hunkMock },
      assertions: [
        skill.referenced("hunk-review"),
        sequence.inOrder([
          command.called("hunk", { argsInOrder: ["session", "list"] }),
          command.called("hunk", {
            argsInOrder: [
              "session",
              "reload",
              "--repo",
              "--",
              "diff",
              "--exclude-untracked",
            ],
          }),
        ]),
        doesNotLaunchTui,
        // The mock records the nested replacement command.
        artifact.exists(".hunk-reload.json"),
        artifact.contains(".hunk-reload.json", "--exclude-untracked"),
      ],
    },
  ],
});
