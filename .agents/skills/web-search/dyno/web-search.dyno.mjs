import {
  command,
  defineDyno,
  finalMessage,
  sequence,
  skill,
  tool,
} from "@dynobox/sdk";

export default defineDyno({
  name: "[web-search] searches and cites fetched sources",
  target: "web-search",
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
        // The CLI must be invoked from the absolute skill directory.
        command.called("web-search.js", {
          originalMatches:
            /(?:^|\s)(?:\/|\$PWD\/|\$\{PWD\}\/|\$\(pwd\)\/).*\/web-search\.js/,
        }),
        // The caller's project-relative entry point is explicitly forbidden.
        tool.notCalled("shell", {
          matches: "(?:^|\\s)\\./web-search\\.js(?:\\s|$)",
        }),
        // Fetching numbered results requires the ID returned by the search.
        sequence.inOrder([
          command.called("web-search.js", { args: ["passkeys"] }),
          command.called("web-search.js", {
            argsInOrder: ["--from", "passkey-results", "--fetch", "1,2"],
          }),
        ]),
        // The response must cite a URL returned by the fetched fixture result.
        finalMessage.contains("https://example.test/passkeys-overview"),
      ],
    },
  ],
});
