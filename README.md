# Example Skill Dynos

Small examples of Dynobox features, using installed agent skills as realistic
tasks. Each dyno checks a few observable behaviors. These examples demonstrate
how to write a dyno; they do not aim for full skill coverage.

Run the examples:

```sh
npm run dynobox
```

Include harness output and debug artifact paths:

```sh
npm run dynobox -- --debug
```

All dynos use Claude Code, Codex, Pi, and Antigravity (AGY). Some also use
OpenCode or Cursor.

## Examples

Dynos live under `.agents/skills/<skill>/dyno/`.

| Skill | Dynobox features illustrated |
| --- | --- |
| [extract-design-system](https://github.com/arvindrk/extract-design-system) | A native CLI handler supplies extraction files; command and artifact assertions check the workflow and preserve existing styles. |
| [hunk-review](https://github.com/modem-dev/hunk/tree/main/skills/hunk-review) | Static and handler CLI mocks, ordered command calls, and `anyOf` for alternative comment commands. |
| [obsidian-markdown](https://github.com/kepano/obsidian-skills) | File creation, content checks, alternative valid embed paths, and unchanged source fixtures. |
| [past-dev](https://past.dev/SKILL.md) | The skill comes from its website, not a local copy. The real past-dev CLI runs against an `httpMocks` handler for its API, which recalls a ticket only after it was sent and its ingestion finished. HTTP assertions check what reached the API, multi-turn `user.replies` give the approvals, and a recall result with an injected instruction checks that nothing goes to another host. |
| [show-me](https://github.com/humanlayer/skills/tree/main/plugins/show-me/skills/show-me) | Final-message assertions for text and Mermaid, an HTML artifact, and a static mock for `open`. |
| [tdd](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd) | Feature and bug-fix tasks with transcript checks, preserved tests, and native verification using `node --test`. |
| [web-search](https://github.com/ogulcancelik/agent-skills/tree/main/skills/web-search) | Native CLI responses, search-before-fetch command order, and a source link in the final answer. |

External CLI responses are declared in each dyno's `cliMocks`. Dynobox records
mock calls for command and sequence assertions. There are no custom call logs,
mock executables, or verification helper programs. The past-dev dyno mocks an
HTTP API with `httpMocks` instead, and keeps its mock handler and fixed data in
plain modules next to the dyno file.

The TDD fixtures contain ordinary project tests because writing and fixing tests
is the task. Dynobox runs the resulting suite with `verify.succeeds("node --test")`.

## Authoring

Use `[skill] description` for the dyno name, with a lowercase action such as
`[tdd] fixes a bug`. Set the target to the skill directory name, such as `tdd`.
Dynos for the same skill share a target and use different descriptions.

Keep scenarios short. Start with `skill.referenced(...)` and add a few native
command, artifact, or final-message assertions that show the behavior of interest.
Use `sequence.inOrder` when order is the point, and `verify.succeeds` when a
project command can check the result.

Validate without invoking a harness:

```sh
node --check path/to/example.dyno.mjs
npx dynobox validate path/to/example.dyno.mjs
```

Dynobox copies adjacent fixtures into each workspace and stages the authored
`SKILL.md` in both `.agents` and `.claude` layouts. Copy supporting skill
references in `setup` when the example needs them.
