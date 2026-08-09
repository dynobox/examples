import fs from "node:fs/promises";
import path from "node:path";

export const hunkMock = {
  handler: async ({ argv, cwd }) => {
    const isCommand = (...parts) =>
      parts.every((part, index) => argv[index] === part);
    const scenario = await fs
      .readFile(path.join(cwd, ".review-mode"), "utf8")
      .then((value) => value.trim())
      .catch(() => "review");

    if (isCommand("session", "list")) {
      return scenario === "no-session"
        ? { exitCode: 0, stdout: JSON.stringify({ sessions: [] }) }
        : {
            exitCode: 0,
            stdout: JSON.stringify({
              sessions: [
                {
                  sessionId: "review-1",
                  path: cwd,
                  repo: cwd,
                  source: "diff",
                  fileCount: 2,
                },
              ],
            }),
          };
    }

    if (scenario === "no-session" && argv[0] === "session") {
      return { exitCode: 1, stderr: "No active Hunk sessions" };
    }

    if (isCommand("session", "get")) {
      return {
        exitCode: 0,
        stdout: `Session: review-1\nPath: ${cwd}\nRepo: ${cwd}\nSource: diff`,
      };
    }

    if (isCommand("session", "review")) {
      const files = [
        {
          path: "src/auth.js",
          hunks: [{ number: 1, oldStart: 10, newStart: 10 }],
        },
        {
          path: "src/jobs.js",
          hunks: [{ number: 1, oldStart: 21, newStart: 21 }],
        },
      ];
      if (argv.includes("--include-patch")) {
        files[0].hunks[0].patch =
          "@@ -10,4 +10,4 @@ function canManage(user) {\n-  return user.role === 'admin';\n+  return (user.role = 'admin');\n }";
        files[1].hunks[0].patch =
          "@@ -21,5 +21,5 @@ async function runJobs(items) {\n   await Promise.all(items.map(async (item) => {\n-    await processItem(item);\n+    processItem(item);\n   }));";
      }
      return {
        exitCode: 0,
        stdout: JSON.stringify({ sessionId: "review-1", files }),
      };
    }

    if (isCommand("session", "context")) {
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          sessionId: "review-1",
          file: "src/auth.js",
          hunk: 1,
          noteMarkupWidth: 72,
        }),
      };
    }

    if (isCommand("session", "navigate")) {
      await fs.writeFile(
        path.join(cwd, ".hunk-navigation.json"),
        `${JSON.stringify({ args: argv }, null, 2)}\n`,
      );
      return { exitCode: 0, stdout: "Navigated to requested hunk" };
    }

    if (isCommand("session", "comment", "apply")) {
      // Mock handlers receive argv, not stdin. Record the fixture's findings
      // once the command assertion proves the agent selected batch application.
      await fs.writeFile(
        path.join(cwd, ".hunk-comments.json"),
        `${JSON.stringify(
          {
            comments: [
              { filePath: "src/auth.js" },
              { filePath: "src/jobs.js" },
            ],
          },
          null,
          2,
        )}\n`,
      );
      return { exitCode: 0, stdout: JSON.stringify({ applied: 2 }) };
    }

    if (isCommand("session", "comment", "add")) {
      const valueAfter = (flag) => {
        const index = argv.indexOf(flag);
        return index === -1 ? undefined : argv[index + 1];
      };
      const filePath = valueAfter("--file");
      const summary = valueAfter("--summary");
      const oldLine = valueAfter("--old-line");
      const newLine = valueAfter("--new-line");
      if (
        !filePath ||
        !summary ||
        (oldLine === undefined) === (newLine === undefined)
      ) {
        return {
          exitCode: 2,
          stderr:
            "comment add needs file, summary, and exactly one line target.",
        };
      }
      const commentPath = path.join(cwd, ".hunk-comments.json");
      const payload = await fs
        .readFile(commentPath, "utf8")
        .then(JSON.parse)
        .catch(() => ({ comments: [] }));
      payload.comments.push({
        filePath,
        summary,
        ...(oldLine === undefined
          ? { newLine: Number(newLine) }
          : { oldLine: Number(oldLine) }),
      });
      await fs.writeFile(commentPath, `${JSON.stringify(payload, null, 2)}\n`);
      return {
        exitCode: 0,
        stdout: JSON.stringify({ id: `comment-${payload.comments.length}` }),
      };
    }

    if (isCommand("session", "reload")) {
      const separator = argv.indexOf("--");
      if (separator === -1 || !argv[separator + 1]) {
        return {
          exitCode: 2,
          stderr: "Pass the replacement Hunk command after `--`",
        };
      }
      await fs.writeFile(
        path.join(cwd, ".hunk-reload.json"),
        `${JSON.stringify({ args: argv }, null, 2)}\n`,
      );
      return { exitCode: 0, stdout: "Reloaded live session" };
    }

    return {
      exitCode: 2,
      stderr: `Unsupported deterministic Hunk command: ${argv.join(" ")}`,
    };
  },
};
