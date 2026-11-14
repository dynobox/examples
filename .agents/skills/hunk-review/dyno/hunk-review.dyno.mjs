import { anyOf, command, defineDyno, finalMessage, sequence, skill } from "@dynobox/sdk";

// All responses go through Dynobox's native CLI mock and call records.
const hunkMock = {
  handler: ({ argv, cwd }) => {
    if (argv[1] === "list") {
      return { exitCode: 0, stdout: JSON.stringify({ sessions: [{ sessionId: "review-1", path: cwd, repo: cwd }] }) };
    }
    if (argv[1] === "review") {
      const hunk = { number: 1, oldStart: 10, newStart: 10 };
      if (argv.includes("--include-patch")) {
        hunk.patch = "@@ -10,3 +10,3 @@ function canManage(user) {\n-  return user.role === 'admin';\n+  return (user.role = 'admin');\n }";
      }
      return { exitCode: 0, stdout: JSON.stringify({ sessionId: "review-1", files: [{ path: "src/auth.js", hunks: [hunk] }] }) };
    }
    return { exitCode: 0, stdout: JSON.stringify({ sessionId: "review-1", file: "src/auth.js", hunk: 1, applied: 1 }) };
  },
};

export default defineDyno({
  name: "[hunk-review] reviews live sessions",
  target: "hunk-review",
  harnesses: [
    { id: "claude-code", model: "haiku", permissionMode: "dangerous" },
    { id: "codex", model: "gpt-6-luna", permissionMode: "dangerous" },
    {
      id: "opencode",
      model: "openai/gpt-6-luna",
      permissionMode: "dangerous",
    },
    {
      id: "pi",
      model: "anthropic/claude-haiku-5-5",
      permissionMode: "dangerous",
    },
    {
      id: "antigravity",
      model: "gemini-3.8-flash-low",
      permissionMode: "dangerous",
    },
  ],
  scenarios: [
    {
      id: "no-active-session",
      name: "reports that a session is needed",
      prompt:
        "Read .agents/skills/hunk-review/SKILL.md, then review the current changes with Hunk. The CLI is available on PATH as hunk.",
      cliMocks: { hunk: { response: { exitCode: 0, stdout: '{"sessions":[]}' } } },
      assertions: [
        skill.referenced("hunk-review"),
        command.called("hunk", { argsInOrder: ["session", "list"] }),
        command.notCalled("hunk", { argsInOrder: ["session", "comment"] }),
        finalMessage.contains("session"),
      ],
    },
    {
      id: "review-and-batch-comments",
      name: "reviews a session and adds a comment",
      prompt:
        "Read .agents/skills/hunk-review/SKILL.md, then review the live Hunk session and add a comment for any issue you find. The CLI is available on PATH as hunk.",
      cliMocks: { hunk: hunkMock },
      assertions: [
        skill.referenced("hunk-review"),
        sequence.inOrder([
          command.called("hunk", { argsInOrder: ["session", "list"] }),
          command.called("hunk", { argsInOrder: ["session", "review"] }),
        ]),
        anyOf([
          command.called("hunk", { argsInOrder: ["session", "comment", "add"] }),
          command.called("hunk", { argsInOrder: ["session", "comment", "apply"] }),
        ]),
      ],
    },
  ],
});
