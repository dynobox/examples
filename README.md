# Dynobox Skill Dynos

This repository contains Dynobox scenarios for popular agent skills. Each dyno
exercises a skill in an isolated workspace and checks the resulting commands,
artifacts, and final response.

Run all dynos with:

```sh
npm run dynobox
```

For harness output and retained debug artifacts:

```sh
npm run dynobox -- --debug
```

## Skills

### extract-design-system

Source: <https://github.com/arvindrk/extract-design-system>

The dyno is at
`.agents/skills/extract-design-system/dyno/extract-design-system.dyno.mjs`.
It asks the skill to extract design primitives from `https://dynobox.xyz/`
without changing existing application styles. It verifies the generated raw
and normalized extraction files, starter JSON and CSS token files, valid JSON,
and preservation of existing styles.

Dynobox stages the authored `SKILL.md` in both `.agents` and `.claude` skill
layouts so each supported harness can discover it natively.
