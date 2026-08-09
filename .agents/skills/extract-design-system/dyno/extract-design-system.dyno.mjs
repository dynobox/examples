import {
  anyOf,
  artifact,
  command,
  defineDyno,
  finalMessage,
  skill,
  verify,
} from "@dynobox/sdk";
import { extractDesignSystemMock } from "./helpers/extract-design-system-mock.mjs";

const summaryAssertions = [
  anyOf([finalMessage.contains("color"), finalMessage.contains("Color")]),
  anyOf([
    finalMessage.contains("font"),
    finalMessage.contains("Font"),
    finalMessage.contains("typeface"),
    finalMessage.contains("Typography"),
  ]),
  anyOf([
    finalMessage.contains("limitation"),
    finalMessage.contains("Limitation"),
    finalMessage.contains("caveat"),
    finalMessage.contains("constraint"),
  ]),
];

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
      cliMocks: { npx: extractDesignSystemMock },
      assertions: [
        skill.referenced("extract-design-system"),
        command.called("npx", {
          argsInOrder: ["playwright", "install", "chromium"],
        }),
        command.called("npx", {
          argsInOrder: ["extract-design-system", "https://dynobox.xyz/"],
        }),
        command.notCalled("npx", {
          args: ["extract-design-system", "init"],
        }),
        command.notCalled("npx", {
          args: ["extract-design-system", "--extract-only"],
        }),
        artifact.exists(".extract-design-system/raw.json"),
        artifact.exists(".extract-design-system/normalized.json"),
        artifact.exists("design-system/tokens.json"),
        artifact.exists("design-system/tokens.css"),
        finalMessage.contains(".extract-design-system/raw.json"),
        finalMessage.contains(".extract-design-system/normalized.json"),
        finalMessage.contains("design-system/tokens.json"),
        finalMessage.contains("design-system/tokens.css"),
        // The raw extraction artifact must be valid, non-empty JSON.
        verify.succeeds(
          "node -e \"const artifact = JSON.parse(require('node:fs').readFileSync('.extract-design-system/raw.json', 'utf8')); if (Object.keys(artifact).length === 0) throw new Error('raw extraction artifact is empty')\"",
        ),
        // The normalized extraction artifact must be valid, non-empty JSON.
        verify.succeeds(
          "node -e \"const artifact = JSON.parse(require('node:fs').readFileSync('.extract-design-system/normalized.json', 'utf8')); if (Object.keys(artifact).length === 0) throw new Error('normalized extraction artifact is empty')\"",
        ),
        // Generated tokens must be a non-empty copy of the normalized artifact.
        verify.succeeds(
          "node -e \"const fs = require('node:fs'); const { isDeepStrictEqual } = require('node:util'); const normalized = JSON.parse(fs.readFileSync('.extract-design-system/normalized.json', 'utf8')); const tokens = JSON.parse(fs.readFileSync('design-system/tokens.json', 'utf8')); if (Object.keys(tokens).length === 0) throw new Error('tokens.json is empty'); if (!isDeepStrictEqual(tokens, normalized)) throw new Error('tokens.json does not match normalized.json')\"",
        ),
        // Generated CSS must expose at least one custom property.
        verify.succeeds(
          "node -e \"if (!/--[A-Za-z0-9_-]+\\s*:/.test(require('node:fs').readFileSync('design-system/tokens.css', 'utf8'))) throw new Error('tokens.css has no custom properties')\"",
        ),
        artifact.unchanged("src/styles.css"),
        ...summaryAssertions,
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
      cliMocks: { npx: extractDesignSystemMock },
      assertions: [
        skill.referenced("extract-design-system"),
        command.called("npx", {
          argsInOrder: [
            "extract-design-system",
            "https://dynobox.xyz/",
            "--extract-only",
          ],
        }),
        artifact.exists(".extract-design-system/raw.json"),
        artifact.exists(".extract-design-system/normalized.json"),
        finalMessage.contains(".extract-design-system/raw.json"),
        finalMessage.contains(".extract-design-system/normalized.json"),
        // The raw extraction artifact must be valid, non-empty JSON.
        verify.succeeds(
          "node -e \"const artifact = JSON.parse(require('node:fs').readFileSync('.extract-design-system/raw.json', 'utf8')); if (Object.keys(artifact).length === 0) throw new Error('raw extraction artifact is empty')\"",
        ),
        // The normalized extraction artifact must be valid, non-empty JSON.
        verify.succeeds(
          "node -e \"const artifact = JSON.parse(require('node:fs').readFileSync('.extract-design-system/normalized.json', 'utf8')); if (Object.keys(artifact).length === 0) throw new Error('normalized extraction artifact is empty')\"",
        ),
        artifact.notExists("design-system/tokens.json"),
        artifact.notExists("design-system/tokens.css"),
        artifact.unchanged("src/styles.css"),
        ...summaryAssertions,
      ],
    },
  ],
});
