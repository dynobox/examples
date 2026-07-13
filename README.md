# Dynobox Skill Dynos

This repository evaluates agent skills in isolated Dynobox workspaces. Dynos
assert observable commands, generated artifacts, preservation of inputs, and
the final response rather than only harness completion.

Run the default skill suite:

```sh
npm run dynobox
```

For harness output and retained debug artifacts:

```sh
npm run dynobox -- --debug
```

The suite uses the Claude Code and Codex harnesses with pinned models.

## Coverage

### extract-design-system

Source: <https://github.com/arvindrk/extract-design-system>

`extract-design-system/dyno/extract-design-system.dyno.mjs` covers starter-token
generation and extraction-only mode against `https://dynobox.xyz/`. It verifies
the required command, valid and non-empty JSON outputs, CSS custom properties,
preservation of existing styles, and a summary of colors, fonts, and limitations.

### obsidian-markdown

Source: <https://github.com/kepano/obsidian-skills>

`obsidian-markdown/dyno/obsidian-markdown.dyno.mjs` creates project, reference,
and decision-record notes. It verifies parsed frontmatter, wikilinks, embeds,
callouts, collapsible content, block IDs, hidden comments, and connected Mermaid
flow while allowing only the requested note to be created.

## Authoring

Validate a dyno without invoking a harness:

```sh
node --check path/to/test.dyno.mjs
npx dynobox validate path/to/test.dyno.mjs
```

Dynobox stages the authored `SKILL.md` in both `.agents` and `.claude` skill
layouts so each supported harness can discover it natively.
