# Example Skill Dynos

This repository evaluates popular agent skills in isolated Dynobox workspaces. Dynos
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
generation and extraction-only mode against `https://dynobox.xyz/`. A
scenario-scoped `npx` mock makes browser installation and extraction deterministic
while verifying the required commands, valid and non-empty JSON outputs, CSS
custom properties, preservation of existing styles, and a summary of colors,
fonts, and limitations.

### hunk-review

Source: <https://github.com/modem-dev/hunk/tree/main/skills/hunk-review>

`hunk-review/dyno/hunk-review.dyno.mjs` uses a scenario-scoped Hunk CLI mock to
cover no-session handling, structure-first review, navigation before inline
comments, the prohibition on launching the interactive TUI, and tracked-only
session reloads. It tests the agent workflow without requiring a live Hunk daemon
or a fixture executable.

### obsidian-markdown

Source: <https://github.com/kepano/obsidian-skills>

`obsidian-markdown/dyno/obsidian-markdown.dyno.mjs` creates project, reference,
and decision-record notes. It verifies parsed frontmatter, wikilinks, embeds,
callouts, collapsible content, block IDs, hidden comments, and connected Mermaid
flow while allowing only the requested note to be created.

### web-search

Source: <https://github.com/ogulcancelik/agent-skills/tree/main/skills/web-search>

`web-search/dyno/web-search.dyno.mjs` demonstrates the core research workflow
with a deterministic CLI fixture. It verifies that the agent consults the
skill, uses the bundled CLI by absolute path, searches before fetching selected
results with the returned result-set ID, avoids `./web-search.js`, and cites a
URL from a fetched fixture result. It tests the agent workflow, not live browser
or search-engine behavior.

## Authoring

Validate a dyno without invoking a harness:

```sh
node --check path/to/test.dyno.mjs
npx dynobox validate path/to/test.dyno.mjs
```

Dynobox stages the authored `SKILL.md` in both `.agents` and `.claude` skill
layouts so each supported harness can discover it natively.
