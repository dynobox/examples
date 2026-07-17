import { anyOf, command, tool, verify } from "@dynobox/sdk";

export const fileWasRead = (path) =>
  anyOf([
    tool.called("read_file", { path }),
    command.called("cat", {
      argsMatching: [new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)],
    }),
    command.called("sed", { originalIncludes: path }),
  ]);

export const verifyFileExcludes = (path, text) =>
  verify.command(
    `node -e 'const fs = require("node:fs"); if (fs.readFileSync(${JSON.stringify(path)}, "utf8").includes(${JSON.stringify(text)})) process.exit(1)'`,
    { exitCode: 0 },
  );

export const verifyNodeWebhookFallback = () =>
  verify.command(
    "node -e 'import(\"./src/stripe.mjs\").then(({ handleWebhook }) => { const result = handleWebhook({ type: \"future.event.created\" }); if (!result || result.handled !== false) process.exit(1); })'",
    { exitCode: 0 },
  );
