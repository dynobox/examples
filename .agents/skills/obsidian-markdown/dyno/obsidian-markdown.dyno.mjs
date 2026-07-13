import {
  artifact,
  defineDyno,
  dyno,
  skill,
  verify,
} from "@dynobox/sdk";

const here = dyno.here(import.meta.url);

const stageReferences = [
  "PROPERTIES.md",
  "EMBEDS.md",
  "CALLOUTS.md",
].flatMap((file) => [
  `cp ${here.q(`../references/${file}`)} .agents/skills/obsidian-markdown/references/${file}`,
  `cp ${here.q(`../references/${file}`)} .claude/skills/obsidian-markdown/references/${file}`,
]);

// Parse the limited YAML shapes requested by these scenarios, not body text.
const verifyFrontmatter = (path, properties) => {
  const expected = JSON.stringify(properties);

  return verify.command(
    `node -e 'const fs = require("node:fs"); const note = fs.readFileSync(${JSON.stringify(path)}, "utf8"); const frontmatter = note.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---(?:\\r?\\n|$)/)?.[1]; const expected = ${expected}; if (!frontmatter) process.exit(1); const lines = frontmatter.split(/\\r?\\n/); for (const [field, value] of Object.entries(expected)) { if (Array.isArray(value)) { const start = lines.findIndex((line) => line === field + ":"); const values = []; for (const line of lines.slice(start + 1)) { const match = line.match(/^\\s*-\\s*(.+?)\\s*$/); if (!match) break; values.push(match[1]); } if (start < 0 || !value.every((item) => values.includes(item))) process.exit(1); } else { const actual = lines.find((line) => line.startsWith(field + ": "))?.slice(field.length + 2).trim(); if (actual !== value) process.exit(1); } }'`,
    { exitCode: 0 },
  );
};

const verifyPatterns = (path, patterns) => {
  const checks = patterns.map((pattern) => `${pattern}.test(note)`).join(" && ");

  return verify.command(
    `node -e 'const fs = require("node:fs"); const note = fs.readFileSync(${JSON.stringify(path)}, "utf8"); if (!(${checks})) process.exit(1)'`,
    { exitCode: 0 },
  );
};

const verifyCollapsedCalloutContent = (path, content) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); const lines = fs.readFileSync(${JSON.stringify(path)}, "utf8").split(/\\r?\\n/); const start = lines.findIndex((line) => /^>\\s*\\[![^\\]\\r\\n]+\\]-/.test(line)); if (start < 0) process.exit(1); const callout = []; for (const line of lines.slice(start)) { if (!line.startsWith(">")) break; callout.push(line); } if (!callout.join("\\n").includes(${JSON.stringify(content)})) process.exit(1);'`,
    { exitCode: 0 },
  );

const verifyDecisionParagraph = (path) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); const note = fs.readFileSync(${JSON.stringify(path)}, "utf8"); if (!/^(?=[^\\r\\n]*#architecture\\/decisions)(?=[^\\r\\n]*==Approved==)[^\\r\\n]*[ \\t]+\\^[A-Za-z0-9-]+[ \\t]*$/m.test(note)) process.exit(1);'`,
    { exitCode: 0 },
  );

const verifyHiddenEditorialComment = (path) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); const note = fs.readFileSync(${JSON.stringify(path)}, "utf8"); if (!/^%%\\r?\\n[\\s\\S]+?\\r?\\n%%$/m.test(note)) process.exit(1);'`,
    { exitCode: 0 },
  );

// Obsidian accepts either scalar or list properties for related-note metadata.
const verifyMetadataLink = (path, field, target) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); const note = fs.readFileSync(${JSON.stringify(path)}, "utf8"); const frontmatter = note.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---(?:\\r?\\n|$)/)?.[1]; if (!frontmatter) process.exit(1); const lines = frontmatter.split(/\\r?\\n/); const scalar = lines.find((line) => line.startsWith(${JSON.stringify(`${field}: `)}))?.slice(${field.length + 2}).trim().replace(/^"|"$/g, ""); const start = lines.findIndex((line) => line === ${JSON.stringify(`${field}:`)}); const values = []; for (const line of lines.slice(start + 1)) { const match = line.match(/^\\s*-\\s*(.+?)\\s*$/); if (!match) break; values.push(match[1].replace(/^"|"$/g, "")); } if (scalar !== ${JSON.stringify(target)} && !values.includes(${JSON.stringify(target)})) process.exit(1);'`,
    { exitCode: 0 },
  );

// Parse Mermaid nodes and edges so labels alone cannot satisfy the flow check.
const verifyMermaidFlow = (path) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); const note = fs.readFileSync(${JSON.stringify(path)}, "utf8"); const mermaid = note.match(/\`\`\`mermaid\\s*\\r?\\n([\\s\\S]*?)\`\`\`/)?.[1]; if (!mermaid) process.exit(1); const labels = new Map(); const edges = new Map(); for (const line of mermaid.split(/\\r?\\n/)) { const parts = line.split("-->").map((part) => part.trim().replace(/^\\|[^|]*\\|/, "")); const ids = parts.map((part) => part.match(/^([A-Za-z][\\w-]*)/)?.[1]).filter(Boolean); for (let index = 0; index < ids.length - 1; index += 1) edges.set(ids[index], [...(edges.get(ids[index]) ?? []), ids[index + 1]]); for (const match of line.matchAll(/\\b([A-Za-z][\\w-]*)\\s*(?:\\[([^\\]]+)\\]|\\{([^}]+)\\}|\\(([^)]+)\\))/g)) labels.set(match[1], match[2] ?? match[3] ?? match[4]); for (const id of ids) if (!labels.has(id)) labels.set(id, id); } const nodeFor = (label) => [...labels].find(([id, value]) => id === label || value.trim() === label)?.[0]; const hasPath = (start, end) => { const seen = new Set([start]); const queue = [start]; while (queue.length) { const current = queue.shift(); if (current === end) return true; for (const next of edges.get(current) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next); } } return false; }; const proposal = nodeFor("Proposal"); const review = nodeFor("Review"); const approved = nodeFor("Approved"); if (!proposal || !review || !approved || !hasPath(proposal, review) || !hasPath(review, approved)) process.exit(1);'`,
    { exitCode: 0 },
  );

// Dynobox stages skills and writes logs after setup; exclude only those runner files.
const verifyOnlyCreates = (path) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); const { createHash } = require("node:crypto"); const { execFileSync } = require("node:child_process"); const snapshot = JSON.parse(fs.readFileSync(".dyno-fixture-manifest", "utf8")); const files = execFileSync("find", [".", "-type", "f", "-print"], { encoding: "utf8" }).trim().split("\\n").filter(Boolean); const stagedSkills = new Set(["./.agents/skills/obsidian-markdown/SKILL.md", "./.claude/skills/obsidian-markdown/SKILL.md"]); const staticFiles = files.filter((file) => file !== "./.dyno-fixture-manifest" && !file.startsWith("./dynobox-") && !stagedSkills.has(file)); const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex"); if (Object.entries(snapshot).some(([file, expected]) => !staticFiles.includes(file) || hash(file) !== expected)) process.exit(1); const added = staticFiles.filter((file) => !Object.prototype.hasOwnProperty.call(snapshot, file)); if (added.length !== 1 || added[0] !== ${JSON.stringify(`./${path}`)}) process.exit(1);'`,
    { exitCode: 0 },
  );

export default defineDyno({
  name: "[obsidian-markdown] creates Obsidian notes",
  target: "obsidian-markdown",
  setup: [
    "mkdir -p .agents/skills/obsidian-markdown/references .claude/skills/obsidian-markdown/references",
    ...stageReferences,
    "node -e \"const fs = require('node:fs'); const { createHash } = require('node:crypto'); const { execFileSync } = require('node:child_process'); const files = execFileSync('find', ['.', '-type', 'f', '-print'], { encoding: 'utf8' }).trim().split('\\n').filter((file) => file !== './.dyno-fixture-manifest'); const snapshot = Object.fromEntries(files.map((file) => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])); fs.writeFileSync('.dyno-fixture-manifest', JSON.stringify(snapshot))\"",
  ],
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
