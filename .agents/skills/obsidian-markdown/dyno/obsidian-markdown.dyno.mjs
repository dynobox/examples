import { anyOf, artifact, defineDyno, dyno, skill } from "@dynobox/sdk";

const here = dyno.here(import.meta.url);

export default defineDyno({
  name: "[obsidian-markdown] creates Obsidian notes",
  target: "obsidian-markdown",
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
  // SKILL.md is staged automatically; copy its supporting references too.
  setup: [
    "mkdir -p .agents/skills/obsidian-markdown/references .claude/skills/obsidian-markdown/references",
    ...["PROPERTIES.md", "EMBEDS.md", "CALLOUTS.md"].flatMap((file) => [
      `cp ${here.q(`../references/${file}`)} .agents/skills/obsidian-markdown/references/${file}`,
      `cp ${here.q(`../references/${file}`)} .claude/skills/obsidian-markdown/references/${file}`,
    ]),
  ],
  scenarios: [
    {
      id: "project-note",
      name: "creates a connected project note",
      prompt:
        "Read .agents/skills/obsidian-markdown/SKILL.md, then create Project Alpha.md. Link to the existing Architecture note and embed assets/roadmap.png at 300 pixels wide. Leave the existing vault files unchanged.",
      assertions: [
        skill.referenced("obsidian-markdown"),
        artifact.exists("Project Alpha.md"),
        anyOf([
          artifact.contains("Project Alpha.md", "[[Architecture]]"),
          artifact.contains("Project Alpha.md", "[[Architecture|"),
        ]),
        anyOf([
          artifact.contains("Project Alpha.md", "![[assets/roadmap.png|300]]"),
          artifact.contains("Project Alpha.md", "![[roadmap.png|300]]"),
        ]),
        artifact.unchanged("Architecture.md"),
      ],
    },
    {
      id: "reference-syntax",
      name: "embeds a reference document",
      prompt:
        "Read .agents/skills/obsidian-markdown/SKILL.md, then create Research FAQ.md. Connect it to Other Note in the note metadata and embed page 3 of guide.pdf. Leave the existing vault files unchanged.",
      assertions: [
        skill.referenced("obsidian-markdown"),
        artifact.exists("Research FAQ.md"),
        artifact.contains("Research FAQ.md", "[[Other Note]]"),
        artifact.contains("Research FAQ.md", "![[guide.pdf#page=3]]"),
        artifact.unchanged("guide.pdf"),
      ],
    },
  ],
});
