import {
  anyOf,
  artifact,
  command,
  defineDyno,
  finalMessage,
  skill,
  verify,
} from "@dynobox/sdk";

export default defineDyno({
  name: "[extract-design-system]",
  target: "extract-design-system",
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
      id: "dynobox-site-synthetic",
      name: "extract tokens from dynobox.xyz",
      prompt:
        "Use the extract-design-system skill to extract design primitives from https://dynobox.xyz/ and generate starter token files. The target URL is public and this is not extraction-only. Do not modify existing app code, styles, or config files; only create the generated extraction and design-system outputs. Summarize the likely colors, detected fonts, generated outputs, and v1 limitations.",
      setup: [
        "mkdir -p src && printf ':root { --existing-brand: #123456; }\\n' > src/styles.css",
      ],
      assertions: [
        skill.referenced("extract-design-system"),
        anyOf([
          command.called("npx", {
            argsInOrder: ["playwright", "install", "chromium"],
          }),
          verify.succeeds("npx playwright install --list | grep -q chromium"),
        ]),
        command.called("npx", {
          argsInOrder: ["extract-design-system", "https://dynobox.xyz/"],
        }),
        command.notCalled("npx", {
          argsInOrder: ["extract-design-system", "init"],
        }),
        command.notCalled("npx", { args: ["--extract-only"] }),
        artifact.exists(".extract-design-system/raw.json"),
        artifact.exists(".extract-design-system/normalized.json"),
        artifact.exists("design-system/tokens.json"),
        artifact.exists("design-system/tokens.css"),
        finalMessage.contains(".extract-design-system/raw.json"),
        finalMessage.contains(".extract-design-system/normalized.json"),
        finalMessage.contains("design-system/tokens.json"),
        finalMessage.contains("design-system/tokens.css"),
        verify.succeeds(
          "node -e \"JSON.parse(require('fs').readFileSync('.extract-design-system/normalized.json','utf8')); JSON.parse(require('fs').readFileSync('design-system/tokens.json','utf8'))\"",
        ),
        artifact.unchanged("src/styles.css"),
      ],
    },
    {
      id: "dynobox-site-extract-only",
      name: "extract tokens without starter files",
      prompt:
        "Use the extract-design-system skill to extract design primitives from https://dynobox.xyz/. The target URL is public and the user wants extraction artifacts only, not starter token files. Do not modify existing app code, styles, or config files; only create the generated extraction outputs. Summarize the likely colors, detected fonts, generated outputs, and v1 limitations.",
      setup: [
        "mkdir -p src && printf ':root { --existing-brand: #123456; }\\n' > src/styles.css",
      ],
      assertions: [
        skill.referenced("extract-design-system"),
        artifact.exists(".extract-design-system/raw.json"),
        artifact.exists(".extract-design-system/normalized.json"),
        finalMessage.contains(".extract-design-system/raw.json"),
        finalMessage.contains(".extract-design-system/normalized.json"),
        verify.succeeds(
          "node -e \"JSON.parse(require('fs').readFileSync('.extract-design-system/raw.json','utf8')); JSON.parse(require('fs').readFileSync('.extract-design-system/normalized.json','utf8'))\"",
        ),
        artifact.notExists("design-system/tokens.json"),
        artifact.notExists("design-system/tokens.css"),
        artifact.unchanged("src/styles.css"),
      ],
    },
  ],
});
