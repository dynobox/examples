const referenceFiles = ["PROPERTIES.md", "EMBEDS.md", "CALLOUTS.md"];

export const createSetup = (here) => [
  "mkdir -p .agents/skills/obsidian-markdown/references .claude/skills/obsidian-markdown/references",
  ...referenceFiles.flatMap((file) => [
    `cp ${here.q(`../references/${file}`)} .agents/skills/obsidian-markdown/references/${file}`,
    `cp ${here.q(`../references/${file}`)} .claude/skills/obsidian-markdown/references/${file}`,
  ]),
  "node -e \"const fs = require('node:fs'); const { createHash } = require('node:crypto'); const { execFileSync } = require('node:child_process'); const files = execFileSync('find', ['.', '-type', 'f', '-print'], { encoding: 'utf8' }).trim().split('\\n').filter((file) => file !== './.dyno-fixture-manifest'); const snapshot = Object.fromEntries(files.map((file) => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])); fs.writeFileSync('.dyno-fixture-manifest', JSON.stringify(snapshot))\"",
];
