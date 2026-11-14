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

All dynos use the Claude Code, Codex, Pi, and Antigravity (AGY) harnesses.
Some dynos also use OpenCode or Cursor.

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

### show-me

Source: <https://github.com/humanlayer/skills/tree/main/plugins/show-me/skills/show-me>

`show-me/dyno/show-me.dyno.mjs` covers focused pseudocode, Mermaid sequence
diagrams, and responsive HTML visualizations. It verifies the selected visual
format, preserves the source fixtures, creates and opens the HTML artifact, and
checks its essential document structure and responsive metadata.

### tdd

Source: <https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd>

Two dynos test feature development with `slugify(text)` and a bug fix for
`parseDuration("1h30m")` on Claude Code, Codex, Pi, Cursor, and AGY. They check skill
use, test runs, failure output, passing tests, and the final behavior. The bug-fix
dyno also checks that the existing tests stay unchanged.

### web-search

Source: <https://github.com/ogulcancelik/agent-skills/tree/main/skills/web-search>

`web-search/dyno/web-search.dyno.mjs` demonstrates the core research workflow
with a deterministic CLI fixture. It verifies that the agent consults the
skill, uses the bundled CLI by absolute path, searches before fetching selected
results with the returned result-set ID, avoids `./web-search.js`, and cites a
URL from a fetched fixture result. It tests the agent workflow, not live browser
or search-engine behavior.

## Authoring

Use `[skill] description` for the dyno name, with a lowercase action such as
`[tdd] fixes a bug`. Set the target to the skill directory name, such as `tdd`.
Dynos for the same skill share a target and use different descriptions.

Validate a dyno without invoking a harness:

```sh
node --check path/to/test.dyno.mjs
npx dynobox validate path/to/test.dyno.mjs
```

Dynobox stages the authored `SKILL.md` in both `.agents` and `.claude` skill
layouts so each supported harness can discover it natively.
