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

const doesNotLaunchTui = command.notCalled("hunk", {
  originalMatches: /^(?:.*[\\/])?hunk\s+(?:diff|show)(?:\s|$)/,
});

// Each scenario supplies a deterministic ./hunk fixture. Keep host Hunk
// sessions closed while running this dyno: this assertion detects a bare hunk
// command only after it could have controlled a real daemon.
const doesNotUsePathHunk = command.notCalled("hunk", {
  originalMatches: /^hunk\s+session(?:\s|$)/,
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
        "Read .agents/skills/hunk-review/SKILL.md, then review the current changes with Hunk. Run every Hunk command through ./hunk, never hunk from PATH.",
      setup: ["chmod +x hunk && printf 'no-session\n' > .hunk-scenario"],
      assertions: [
        skill.referenced("hunk-review"),
        command.called("hunk", { argsInOrder: ["session", "list"] }),
        command.notCalled("hunk", {
          argsInOrder: ["session", "comment"],
        }),
        doesNotLaunchTui,
        // The fixture owns the empty session list used by this scenario.
        doesNotUsePathHunk,
        finalMessage.contains("Hunk"),
        finalMessage.contains("terminal"),
        finalMessage.contains("session"),
      ],
    },
    {
      id: "review-and-batch-comments",
      name: "inspects structure and annotates review issues",
      prompt:
        "Read .agents/skills/hunk-review/SKILL.md, then review the live Hunk session and annotate any issues you find. Run every Hunk command through ./hunk, never hunk from PATH.",
      setup: ["chmod +x hunk && printf 'review\n' > .hunk-scenario"],
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
        // The comment artifacts below are emitted only by the ./hunk fixture.
        doesNotUsePathHunk,
        artifact.exists(".hunk-comments.json"),
        artifact.contains(".hunk-comments.json", "src/auth.js"),
        artifact.contains(".hunk-comments.json", "src/jobs.js"),
        // The fixture records comment add/apply payloads here; this verifies the
        // simulated session received exactly two notes without using a daemon.
        verify.succeeds(
          "node -e \"const comments = JSON.parse(require('node:fs').readFileSync('.hunk-comments.json', 'utf8')).comments; if (comments.length !== 2) throw new Error('expected exactly two review comments')\"",
        ),
      ],
    },
    {
      id: "tracked-changes-only",
      name: "reloads a session without untracked files",
      prompt:
        "Read .agents/skills/hunk-review/SKILL.md, then update the live Hunk review to show tracked changes only. Run every Hunk command through ./hunk, never hunk from PATH.",
      setup: ["chmod +x hunk && printf 'reload\n' > .hunk-scenario"],
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
        // The reload artifact below is the fixture's record of the nested command.
        doesNotUsePathHunk,
        artifact.exists(".hunk-reload.json"),
        artifact.contains(".hunk-reload.json", "--exclude-untracked"),
      ],
    },
  ],
});
