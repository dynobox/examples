import {
  artifact,
  command,
  defineDyno,
  dyno,
  finalMessage,
  skill,
  verify,
} from "@dynobox/sdk";

const here = dyno.here(import.meta.url);

export default defineDyno({
  name: "[show-me] explains topics visually",
  target: "show-me",
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
    {
      id: "opencode",
      permissionMode: "dangerous",
    },
  ],
  scenarios: [
    {
      id: "compact-save-logic",
      name: "shows save behavior as compact pseudocode",
      prompt:
        "Use the show-me skill to explain src/save-cache.ts as compact pseudocode. Keep it focused.",
      assertions: [
        skill.referenced("show-me"),
        finalMessage.contains("```text"),
        finalMessage.contains("saveContent"),
        artifact.unchanged("src/save-cache.ts"),
      ],
    },
    {
      id: "mermaid-runtime-flow",
      name: "shows runtime interaction with Mermaid",
      prompt:
        "Use the show-me skill to visualize docs/runtime-flow.md as a concise Mermaid sequence diagram.",
      assertions: [
        skill.referenced("show-me"),
        finalMessage.contains("```mermaid"),
        finalMessage.contains("sequenceDiagram"),
        finalMessage.contains("Daemon"),
        artifact.unchanged("docs/runtime-flow.md"),
      ],
    },
    {
      id: "responsive-checkout-comparison",
      name: "creates and opens a focused UI comparison",
      prompt:
        "Use the show-me skill to turn checkout/states.md into ./show-me-checkout-states.html and open it.",
      cliMocks: {
        open: { response: { exitCode: 0 } },
      },
      assertions: [
        skill.referenced("show-me"),
        artifact.exists("show-me-checkout-states.html"),
        artifact.unchanged("checkout/states.md"),
        command.called("open", {
          originalMatches: /show-me-checkout-states\.html/,
        }),
        verify.succeeds(
          `node ${here.q("./helpers/verify-checkout-html.mjs")}`,
        ),
      ],
    },
  ],
});
