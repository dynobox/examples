import { command, defineDyno, dyno, finalMessage, sequence, skill } from "@dynobox/sdk";

const here = dyno.here(import.meta.url);

export default defineDyno({
  name: "[web-search] searches and cites sources",
  target: "web-search",
  harnesses: [
    { id: "claude-code", model: "haiku", permissionMode: "dangerous" },
    { id: "codex", model: "gpt-6-luna", permissionMode: "dangerous" },
    {
      id: "pi",
      model: "anthropic/claude-haiku-5-5",
      permissionMode: "dangerous",
    },
    {
      id: "antigravity",
      model: "gemini-3.8-flash-low",
      permissionMode: "dangerous",
    },
  ],
  scenarios: [
    {
      id: "search-fetch-and-cite",
      name: "searches and fetches a source",
      prompt:
        "Read .agents/skills/web-search/SKILL.md, then use the skill to research passkeys. Run the bundled CLI with bun and its absolute script path. Search for passkeys, fetch result 1 using the returned result-set ID, and give a short answer with a link to the fetched source.",
      // Use Bun so the mock does not intercept Node-based harness startup.
      // Stage the real entry point; Dynobox supplies the CLI responses.
      setup: [
        `cp ${here.q("../web-search.js")} .agents/skills/web-search/web-search.js`,
        "chmod -x .agents/skills/web-search/web-search.js",
      ],
      cliMocks: {
        bun: {
          handler: ({ argv }) => {
            if (!argv[0]?.endsWith("/web-search.js")) {
              return { exitCode: 1, stderr: "Use bun <absolute-skill-path>/web-search.js" };
            }
            return argv.includes("--from")
              ? { exitCode: 0, stdout: "URL: https://fidoalliance.org/passkeys/\nPasskeys use public-key cryptography and are bound to the legitimate site, helping prevent phishing." }
              : { exitCode: 0, stdout: "1. FIDO Alliance passkeys guide\nURL: https://fidoalliance.org/passkeys/\nResult set: passkey-results" };
          },
        },
      },
      assertions: [
        skill.referenced("web-search"),
        sequence.inOrder([
          command.called("bun", { args: ["passkeys"], argsMatching: [/\/web-search\.js$/] }),
          command.called("bun", { argsInOrder: ["--from", "passkey-results", "--fetch", "1"] }),
        ]),
        finalMessage.contains("https://fidoalliance.org/passkeys/"),
      ],
    },
  ],
});
