import {
  artifact,
  defineDyno,
  dyno,
  skill,
} from "@dynobox/sdk";
import {
  verifyCollapsedCalloutContent,
  verifyDecisionParagraph,
  verifyFrontmatter,
  verifyHiddenEditorialComment,
  verifyMermaidFlow,
  verifyMetadataLink,
  verifyOnlyCreates,
  verifyPatterns,
} from "./helpers/assertions.mjs";
import { createSetup } from "./helpers/setup.mjs";

const here = dyno.here(import.meta.url);

export default defineDyno({
  name: "[obsidian-markdown] creates Obsidian notes",
  target: "obsidian-markdown",
  setup: createSetup(here),
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
      id: "project-note",
      name: "create a connected project note",
      prompt:
        "Read .agents/skills/obsidian-markdown/SKILL.md, then use the obsidian-markdown skill to create Project Alpha.md in this vault. Give it title Project Alpha, project and active labels, and the alias Alpha. Connect it to the existing Architecture note, cite https://help.obsidian.md/ as Obsidian documentation, display assets/roadmap.png at exactly 300 pixels wide, and prominently warn that unresolved architecture decisions could delay delivery. Create only the requested note; leave the existing vault files unchanged.",
      assertions: [
        skill.referenced("obsidian-markdown"),
        artifact.exists(".agents/skills/obsidian-markdown/references/CALLOUTS.md"),
        artifact.exists(".claude/skills/obsidian-markdown/references/CALLOUTS.md"),
        artifact.exists("Project Alpha.md"),
        artifact.contains("Project Alpha.md", "![[assets/roadmap.png|300]]"),
        artifact.contains("Project Alpha.md", "> [!warning]"),
        artifact.contains("Project Alpha.md", "architecture"),
        artifact.contains("Project Alpha.md", "delay"),
        artifact.unchanged("Architecture.md"),
        artifact.unchanged("assets/roadmap.png"),
        verifyFrontmatter(
          "Project Alpha.md",
          {
            title: "Project Alpha",
            tags: ["project", "active"],
            aliases: ["Alpha"],
          },
        ),
        verifyPatterns("Project Alpha.md", [
          /\[\[Architecture(?:\|[^\]]+)?\]\]/,
          /\[[^\]]+\]\(https:\/\/help\.obsidian\.md\/\)/,
        ]),
        verifyOnlyCreates("Project Alpha.md"),
      ],
    },
    {
      id: "reference-syntax",
      name: "create a note using reference syntax",
      prompt:
        "Read .agents/skills/obsidian-markdown/SKILL.md and its references, then use the obsidian-markdown skill to create Research FAQ.md in this vault. Give it title Research FAQ and connect it to Other Note as related metadata. Make the Offline access answer collapsible, and include page 3 of the existing guide.pdf inline. Create only the requested note; leave the existing vault files unchanged.",
      assertions: [
        skill.referenced("obsidian-markdown"),
        artifact.exists("Research FAQ.md"),
        artifact.contains("Research FAQ.md", "![[guide.pdf#page=3]]"),
        artifact.unchanged("Other Note.md"),
        artifact.unchanged("guide.pdf"),
        verifyFrontmatter("Research FAQ.md", { title: "Research FAQ" }),
        verifyMetadataLink("Research FAQ.md", "related", "[[Other Note]]"),
        verifyCollapsedCalloutContent("Research FAQ.md", "Offline access"),
        verifyOnlyCreates("Research FAQ.md"),
      ],
    },
    {
      id: "obsidian-extensions",
      name: "create a decision record using Obsidian extensions",
      prompt:
        "Read .agents/skills/obsidian-markdown/SKILL.md and its references, then use the obsidian-markdown skill to create Decision Record.md for an approved migration decision. Make the decision paragraph directly linkable, classify the decision paragraph using the inline nested architecture/decisions label, apply the vault's native inline highlight treatment to the word Approved in that paragraph, add a private editorial note that stays hidden in reading view, and diagram the flow from Proposal to Review to Approved. Create only the requested note; leave the existing vault files unchanged.",
      assertions: [
        skill.referenced("obsidian-markdown"),
        artifact.exists("Decision Record.md"),
        artifact.contains("Decision Record.md", "```mermaid"),
        artifact.contains("Decision Record.md", "Proposal"),
        artifact.contains("Decision Record.md", "Review"),
        artifact.contains("Decision Record.md", "Approved"),
        artifact.unchanged("Architecture.md"),
        artifact.unchanged("Other Note.md"),
        verifyDecisionParagraph("Decision Record.md"),
        verifyHiddenEditorialComment("Decision Record.md"),
        verifyMermaidFlow("Decision Record.md"),
        verifyOnlyCreates("Decision Record.md"),
      ],
    },
  ],
});
