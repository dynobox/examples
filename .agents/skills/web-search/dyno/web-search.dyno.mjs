import {
  anyOf,
  command,
  defineDyno,
  dyno,
  finalMessage,
  skill,
  verify,
} from "@dynobox/sdk";

const here = dyno.here(import.meta.url);
const absoluteScript = /^(?:\/|\$PWD\/|\$\{PWD\}\/|\$\(pwd\)\/).*\/web-search\.js$/;
const absoluteInvocation = /(?:^|[\s"'])(?:\/|\$PWD\/|\$\{PWD\}\/|\$\(pwd\)\/).*\/web-search\.js/;
const absoluteCall = (matcher) => anyOf([
  command.called("web-search.js", { ...matcher, originalMatches: absoluteInvocation }),
  command.called("node", { ...matcher, argsMatching: [absoluteScript] }),
]);

export default defineDyno({
  name: "[web-search] searches and cites fetched sources",
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
      name: "searches, fetches selected results, and cites a source",
      prompt:
        "Read .agents/skills/web-search/SKILL.md, then use the web-search skill to research passkeys. Search for passkeys, inspect results 1 and 2, and give a concise answer explaining what passkeys are and why they are more resistant to phishing. Include links to the sources you inspected.",
      setup: ["chmod +x .agents/skills/web-search/web-search.js"],
      assertions: [
        // The harness must consult the skill instructions before researching.
        skill.referenced("web-search"),
        // Both research calls require an absolute path, including Node invocation.
        absoluteCall({ args: ["passkeys"] }),
        absoluteCall({ argsInOrder: ["--from", "passkey-results", "--fetch", "1,2"] }),
        // Actual fixture calls establish order, including nested shell execution.
        verify.succeeds(`node ${here.q("./helpers/verify-search-calls.mjs")}`),
        // The response must cite a URL returned by the fetched fixture result.
        finalMessage.contains("https://example.test/passkeys-overview"),
      ],
    },
  ],
});
