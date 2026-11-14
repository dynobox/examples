import { artifact, command, defineDyno, finalMessage, skill } from "@dynobox/sdk";
import fs from "node:fs/promises";
import path from "node:path";

// A native CLI mock can provide files for the agent to inspect.
const npxMock = {
  handler: async ({ argv, cwd }) => {
    if (argv.includes("playwright")) return { exitCode: 0, stdout: "Chromium installed" };
    if (argv.includes("--help") || argv.includes("-h")) {
      return { exitCode: 0, stdout: "Usage: extract-design-system <url> [--extract-only]" };
    }
    if (!argv.includes("extract-design-system") || !argv.includes("https://dynobox.xyz/")) {
      return { exitCode: 1, stderr: "Expected extract-design-system https://dynobox.xyz/" };
    }
    const tokens = JSON.stringify({ colors: { primary: "#123456" }, fonts: ["Inter"] });
    const extraction = path.join(cwd, ".extract-design-system");
    await fs.mkdir(extraction, { recursive: true });
    await fs.writeFile(path.join(extraction, "raw.json"), tokens);
    await fs.writeFile(path.join(extraction, "normalized.json"), tokens);
    if (!argv.includes("--extract-only")) {
      const output = path.join(cwd, "design-system");
      await fs.mkdir(output, { recursive: true });
      await fs.writeFile(path.join(output, "tokens.json"), tokens);
      await fs.writeFile(path.join(output, "tokens.css"), ":root { --color-primary: #123456; }\n");
    }
    return { exitCode: 0, stdout: "Extracted design primitives. Font: Inter." };
  },
};

export default defineDyno({
  name: "[extract-design-system] extracts design primitives",
  target: "extract-design-system",
  harnesses: [
    { id: "claude-code", model: "haiku", permissionMode: "dangerous" },
    { id: "codex", model: "gpt-6-luna", permissionMode: "dangerous" },
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
  setup: ["mkdir -p src && printf ':root { --existing-brand: #abcdef; }\n' > src/styles.css"],
  scenarios: [
    {
      id: "dynobox-site-synthetic",
      name: "extracts starter tokens",
      prompt:
        "Read .agents/skills/extract-design-system/SKILL.md, then extract design primitives from the public site https://dynobox.xyz/ and generate starter token files. Leave existing app styles unchanged and summarize the detected fonts.",
      cliMocks: { npx: npxMock },
      assertions: [
        skill.referenced("extract-design-system"),
        command.called("npx", { argsInOrder: ["extract-design-system", "https://dynobox.xyz/"] }),
        artifact.unchanged("src/styles.css"),
        finalMessage.contains("Inter"),
      ],
    },
    {
      id: "dynobox-site-extract-only",
      name: "extracts without starter files",
      prompt:
        "Read .agents/skills/extract-design-system/SKILL.md, then extract design primitives from the public site https://dynobox.xyz/. I want extraction artifacts only, without starter token files. Leave existing app styles unchanged.",
      cliMocks: { npx: npxMock },
      assertions: [
        skill.referenced("extract-design-system"),
        command.called("npx", { args: ["extract-design-system", "https://dynobox.xyz/", "--extract-only"] }),
        artifact.notExists("design-system/tokens.css"),
        artifact.unchanged("src/styles.css"),
      ],
    },
  ],
});
