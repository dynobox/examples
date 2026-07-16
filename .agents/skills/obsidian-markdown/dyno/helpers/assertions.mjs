import { verify } from "@dynobox/sdk";

// Parse the limited YAML shapes requested by these scenarios, not body text.
export const verifyFrontmatter = (path, properties) => {
  const expected = JSON.stringify(properties);

  return verify.command(
    `node -e 'const fs = require("node:fs"); const note = fs.readFileSync(${JSON.stringify(path)}, "utf8"); const frontmatter = note.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---(?:\\r?\\n|$)/)?.[1]; const expected = ${expected}; if (!frontmatter) process.exit(1); const lines = frontmatter.split(/\\r?\\n/); for (const [field, value] of Object.entries(expected)) { if (Array.isArray(value)) { const start = lines.findIndex((line) => line === field + ":"); const values = []; for (const line of lines.slice(start + 1)) { const match = line.match(/^\\s*-\\s*(.+?)\\s*$/); if (!match) break; values.push(match[1]); } if (start < 0 || !value.every((item) => values.includes(item))) process.exit(1); } else { const actual = lines.find((line) => line.startsWith(field + ": "))?.slice(field.length + 2).trim(); if (actual !== value) process.exit(1); } }'`,
    { exitCode: 0 },
  );
};

export const verifyPatterns = (path, patterns) => {
  const checks = patterns.map((pattern) => `${pattern}.test(note)`).join(" && ");

  return verify.command(
    `node -e 'const fs = require("node:fs"); const note = fs.readFileSync(${JSON.stringify(path)}, "utf8"); if (!(${checks})) process.exit(1)'`,
    { exitCode: 0 },
  );
};

export const verifyCollapsedCalloutContent = (path, content) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); const lines = fs.readFileSync(${JSON.stringify(path)}, "utf8").split(/\\r?\\n/); const start = lines.findIndex((line) => /^>\\s*\\[![^\\]\\r\\n]+\\]-/.test(line)); if (start < 0) process.exit(1); const callout = []; for (const line of lines.slice(start)) { if (!line.startsWith(">")) break; callout.push(line); } if (!callout.join("\\n").includes(${JSON.stringify(content)})) process.exit(1);'`,
    { exitCode: 0 },
  );

export const verifyDecisionParagraph = (path) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); const note = fs.readFileSync(${JSON.stringify(path)}, "utf8"); if (!/^(?=[^\\r\\n]*#architecture\\/decisions)(?=[^\\r\\n]*==Approved==)[^\\r\\n]*[ \\t]+\\^[A-Za-z0-9-]+[ \\t]*$/m.test(note)) process.exit(1);'`,
    { exitCode: 0 },
  );

export const verifyHiddenEditorialComment = (path) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); const note = fs.readFileSync(${JSON.stringify(path)}, "utf8"); if (!/^%%\\r?\\n[\\s\\S]+?\\r?\\n%%$/m.test(note)) process.exit(1);'`,
    { exitCode: 0 },
  );

// Obsidian accepts either scalar or list properties for related-note metadata.
export const verifyMetadataLink = (path, field, target) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); const note = fs.readFileSync(${JSON.stringify(path)}, "utf8"); const frontmatter = note.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---(?:\\r?\\n|$)/)?.[1]; if (!frontmatter) process.exit(1); const lines = frontmatter.split(/\\r?\\n/); const scalar = lines.find((line) => line.startsWith(${JSON.stringify(`${field}: `)}))?.slice(${field.length + 2}).trim().replace(/^"|"$/g, ""); const start = lines.findIndex((line) => line === ${JSON.stringify(`${field}:`)}); const values = []; for (const line of lines.slice(start + 1)) { const match = line.match(/^\\s*-\\s*(.+?)\\s*$/); if (!match) break; values.push(match[1].replace(/^"|"$/g, "")); } if (scalar !== ${JSON.stringify(target)} && !values.includes(${JSON.stringify(target)})) process.exit(1);'`,
    { exitCode: 0 },
  );

// Parse Mermaid nodes and edges so labels alone cannot satisfy the flow check.
export const verifyMermaidFlow = (path) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); const note = fs.readFileSync(${JSON.stringify(path)}, "utf8"); const mermaid = note.match(/\`\`\`mermaid\\s*\\r?\\n([\\s\\S]*?)\`\`\`/)?.[1]; if (!mermaid) process.exit(1); const labels = new Map(); const edges = new Map(); for (const line of mermaid.split(/\\r?\\n/)) { const parts = line.split("-->").map((part) => part.trim().replace(/^\\|[^|]*\\|/, "")); const ids = parts.map((part) => part.match(/^([A-Za-z][\\w-]*)/)?.[1]).filter(Boolean); for (let index = 0; index < ids.length - 1; index += 1) edges.set(ids[index], [...(edges.get(ids[index]) ?? []), ids[index + 1]]); for (const match of line.matchAll(/\\b([A-Za-z][\\w-]*)\\s*(?:\\[([^\\]]+)\\]|\\{([^}]+)\\}|\\(([^)]+)\\))/g)) labels.set(match[1], match[2] ?? match[3] ?? match[4]); for (const id of ids) if (!labels.has(id)) labels.set(id, id); } const nodeFor = (label) => [...labels].find(([id, value]) => id === label || value.trim() === label)?.[0]; const hasPath = (start, end) => { const seen = new Set([start]); const queue = [start]; while (queue.length) { const current = queue.shift(); if (current === end) return true; for (const next of edges.get(current) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next); } } return false; }; const proposal = nodeFor("Proposal"); const review = nodeFor("Review"); const approved = nodeFor("Approved"); if (!proposal || !review || !approved || !hasPath(proposal, review) || !hasPath(review, approved)) process.exit(1);'`,
    { exitCode: 0 },
  );

// Dynobox stages skills and writes logs after setup; exclude only those runner files.
export const verifyOnlyCreates = (path) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); const { createHash } = require("node:crypto"); const { execFileSync } = require("node:child_process"); const snapshot = JSON.parse(fs.readFileSync(".dyno-fixture-manifest", "utf8")); const files = execFileSync("find", [".", "-type", "f", "-print"], { encoding: "utf8" }).trim().split("\\n").filter(Boolean); const stagedSkills = new Set(["./.agents/skills/obsidian-markdown/SKILL.md", "./.claude/skills/obsidian-markdown/SKILL.md"]); const staticFiles = files.filter((file) => file !== "./.dyno-fixture-manifest" && !file.startsWith("./dynobox-") && !stagedSkills.has(file)); const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex"); if (Object.entries(snapshot).some(([file, expected]) => !staticFiles.includes(file) || hash(file) !== expected)) process.exit(1); const added = staticFiles.filter((file) => !Object.prototype.hasOwnProperty.call(snapshot, file)); if (added.length !== 1 || added[0] !== ${JSON.stringify(`./${path}`)}) process.exit(1);'`,
    { exitCode: 0 },
  );
