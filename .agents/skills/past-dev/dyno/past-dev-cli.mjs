// A mock of `npx -y past-dev@latest`: one reply for each subcommand.
// `abandon` is not mocked: it gives the help text, and no scenario expects it.
// The text is copied from past-dev@0.1.0. No call reaches past.dev.
// init writes the files that the real init writes, so an agent that checks them finds what init printed.
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { CLAIM_CODE, CLAIM_FILE, CLAIM_OWNER, CLAIM_URL, CLI, CREATED_AT, DELETED_AT, UNCLAIMED_KEY } from "./constants.mjs";

const WARNING = `WARNING: This project and everything in it are deleted on ${DELETED_AT}, in 6 days 23 hours, unless a person claims it: run ${CLI} claim.`;

// A successful reply with these lines on stdout.
export const respond = (...lines) => ({ exitCode: 0, stdout: lines.join("\n") });

const read = (cwd, name) => readFile(path.join(cwd, name), "utf8").catch(() => "");

// The env file that sets PAST_API_KEY, or null.
async function keyFile(cwd) {
  for (const file of [".env.local", ".env"]) if (/^PAST_API_KEY=\S/m.test(await read(cwd, file))) return file;
  return null;
}

// The value of an option, as `--name value` or `--name=value`.
function option(args, name) {
  const i = args.indexOf(name);
  return i === -1 ? args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1) : args[i + 1];
}

// The options in the help text that take a value.
const VALUE_OPTIONS = /^--(id|identity|timestamp|label|audience|limit|max-tokens|timeout|dir|env-file|agent|for|code|mode)$/;

// The first argument that is not an option or the value of an option. "-" means stdin.
const positional = (args) => args.find((arg, i) => (arg === "-" || !arg.startsWith("-")) && !VALUE_OPTIONS.test(args[i - 1]));

// Each send, by ingestion ID: its folder, identity, date and text.
// As in past.dev, recall finds a send only after it completes, and only for its identity.
// Dynobox calls the handler in its own process, so this map lasts for the whole run.
const sends = new Map();

async function ingest(args, cwd) {
  const text = positional(args);
  const date = option(args, "--timestamp") ?? new Date().toISOString();
  // The mock cannot read stdin. For `ingest -`, it uses the ticket in data/tickets.json from the same day.
  const tickets = text === "-" ? JSON.parse((await read(cwd, "data/tickets.json")) || "[]") : [];
  const record = text === "-" ? tickets.find((ticket) => ticket.date.slice(0, 10) === date.slice(0, 10))?.text : text;
  const id = `ing_${createHash("sha256").update(`${cwd} ${args.join(" ")}`).digest("hex").slice(0, 8)}`;
  sends.set(id, { cwd, identity: option(args, "--identity"), date, text: record, completed: false });
  return respond(`Queued as ingestion ${id}. To wait until recall can find it, run ${CLI} ingestion ${id} --wait`);
}

function ingestion(args) {
  const id = positional(args);
  const send = sends.get(id);
  if (!send) return { exitCode: 1, stderr: `not-found: This project has no ingestion ${id}.` };
  send.completed = true;
  return respond(`Completed: recall can find what ingestion ${id} sent.`);
}

// Gives back the 2 completed sends for this identity that share the most words with the question.
// A send with no identity is for every identity.
function recall(args, cwd) {
  const identity = option(args, "--identity");
  if (!identity) return { exitCode: 2, stderr: "recall needs --identity <id>, the id of the person the recall answers as." };
  const words = (positional(args) ?? "").toLowerCase().match(/[a-z0-9$.]{4,}/g) ?? [];
  const matches = [...sends.values()]
    .filter((send) => send.cwd === cwd && send.completed && send.text && (!send.identity || send.identity === identity))
    .map((send) => ({ send, score: words.filter((word) => send.text.toLowerCase().includes(word)).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  if (matches.length === 0) return respond("Nothing in past.dev matches that yet.");
  return respond(...matches.map(({ send }, i) => `[${i + 1}] ${send.date.slice(0, 10)} ${send.text}`));
}

// Like the real CLI, init reuses a project that waits for its claim, and makes no project when a key is set already.
// --fresh ends the waiting project and makes a new one.
async function init(args, cwd) {
  if (path.resolve(cwd) === homedir()) {
    return {
      exitCode: 1,
      stderr:
        "home-directory: init makes no project in the home folder, where the app's files and the coding sessions' files would be the same. " +
        "Run it in the app's folder, or with --for coding-agent for coding sessions.",
    };
  }
  const pending = await read(cwd, ".past/claim.json");
  if (pending && !args.includes("--fresh")) {
    return respond(
      `Using the unclaimed past.dev project that init made on ${CREATED_AT}. Its key is in .env, as PAST_API_KEY.`,
      "The claim token is in .past/claim.json; never print or commit it.",
      "",
      WARNING,
    );
  }
  const file = pending ? null : await keyFile(cwd);
  if (file) {
    return {
      exitCode: 1,
      stderr: `key-exists: A past.dev key is set already (${file}), so init made no project. To use that key or its account, follow https://past.dev/agent-setup/prompt.md.`,
    };
  }
  await writeProject(cwd);
  return INIT_DONE;
}

// Writes the key into .env, the claim token into .past/claim.json, and the lines that .gitignore needs.
async function writeProject(cwd) {
  const file = (name) => path.join(cwd, name);
  const env = (await readFile(file(".env"), "utf8").catch(() => "")).replace(/^PAST_API_KEY=.*\n?/m, "");
  await writeFile(file(".env"), `${env}${env && !env.endsWith("\n") ? "\n" : ""}PAST_API_KEY=${UNCLAIMED_KEY}\n`, { mode: 0o600 });
  await mkdir(file(".past"), { recursive: true });
  await writeFile(file(".past/claim.json"), `${CLAIM_FILE}\n`, { mode: 0o600 });
  const ignored = await readFile(file(".gitignore"), "utf8").catch(() => "");
  const present = new Set(ignored.split(/\r?\n/).map((line) => line.trim()));
  const missing = [".env", ".past/"].filter((entry) => !present.has(entry));
  if (missing.length > 0) {
    await appendFile(file(".gitignore"), `${ignored && !ignored.endsWith("\n") ? "\n" : ""}${missing.join("\n")}\n`);
  }
}

const INIT_DONE = respond(
  "Made an unclaimed past.dev project. Its key is in .env, as PAST_API_KEY.",
  "Added .env and .past/ to .gitignore.",
  "The claim token is in .past/claim.json; never print or commit it.",
  "",
  WARNING,
);

// No browser opens here, as in a cloud sandbox: claim prints a link, and the page shows a code after approval.
// As in the real CLI, a finished claim removes .past/claim.json, so status then finds an owned project.
async function claim(args, cwd) {
  const code = args[args.indexOf("--code") + 1];
  if (!args.includes("--code")) {
    return respond(
      `Claim the project on this page, on any device: ${CLAIM_URL}`,
      "Sign in or sign up there, and approve. The page then shows a code.",
      `Finish the claim with: ${CLI} claim --code <code>`,
    );
  }
  if (code !== CLAIM_CODE) return { exitCode: 1, stderr: `Check the code the page showed, then run ${CLI} claim --code <code> again.` };
  await rm(path.join(cwd, ".past/claim.json"), { force: true });
  return respond(`Claimed. The project now belongs to the account ${CLAIM_OWNER}.`, "Open it in the console at https://app.past.dev.");
}

// Like the real status: unclaimed with a claim file, owned with only a key, and no-key without a key.
async function status(args, cwd) {
  if (await read(cwd, ".past/claim.json")) {
    return respond(`State: unclaimed. Made on ${CREATED_AT}.`, `Claim: not started. To claim the project, run ${CLI} claim.`, "", WARNING);
  }
  if (await keyFile(cwd)) return respond("State: owned. The project belongs to an account; open it in the console at https://app.past.dev.");
  return {
    exitCode: 2,
    stderr:
      "no-key: No past.dev project key found. The CLI reads PAST_API_KEY from the environment, then from .env.local, " +
      ".env.development.local, .env.development and .env in this folder, then apiKey from ~/.past/config.json. " +
      `Create a project key in the console at https://app.past.dev, or run ${CLI} init to make a project without an account.`,
  };
}

// The help text of past-dev@0.1.0, word for word. An agent that misses an option here thinks the CLI cannot do it.
const HELP = `past-dev: the command line for past.dev, memory for AI agents and apps.

Usage:
  past-dev init [--for app|coding-agent] [--identity <id>] [--dir <path>]
                [--env-file <path>] [--agent claude-code|codex|cursor|other] [--fresh]
  past-dev claim [--no-browser] [--code <code>] [--dir <path>]
  past-dev status [--dir <path>]
  past-dev abandon [--dir <path>]
  past-dev ingest <text|-> [--id <id>] [--timestamp <time>] [--label <label>]
                  [--audience <slug>] [--identity <id>]
  past-dev recall <query> --identity <id> [--limit <n>] [--max-tokens <n>]
  past-dev ingestion <ingestionId> [--wait] [--timeout <seconds>]

  init        Make an unclaimed past.dev project, with no account, and write its key
              where the code reads it: the env file the app's framework loads, or
              ~/.past/config.json for coding sessions (--for coding-agent). --fresh
              ends a project that waits for its claim and makes a new one.
  claim       Ask the person to sign in and claim the project: in a browser this
              machine opens, or on any device, with the code the page then shows
              (--code). --no-browser prints the page's link instead of opening it.
  status      Show the project's state, how the claim stands, and the date the
              project is deleted unless someone claims it, with the time left.
  abandon     End the unclaimed project, and remove the key and the files init wrote.
  ingest      Send one data point. With - as the text, it reads standard input; put
              -- before a text that starts with a dash.
  recall      Ask what past.dev holds about a question, as the identity that asks.
  ingestion   Read where a send got to. --wait reads again every 2 seconds until the
              send completes or fails, for 120 seconds or the --timeout you give.

Options:
  --json               Print {"result": ...} or {"error": ...} as JSON
  --mode agent|human   Agent mode prints plain lines and stops init and the wait for a
                       claim after 90 seconds; it is on when a coding agent runs the CLI
                       or standard output is no terminal
  --help, -h           Show this help
  --version, -v        Show the version

The project key comes from PAST_API_KEY in the environment, else from PAST_API_KEY= in
.env.local, .env.development.local, .env.development or .env in this folder, else from
apiKey in ~/.past/config.json. PAST_API_URL sets another address for the API: https, or
http to this machine only.

Run it with ${CLI} <command>. Docs: https://past.dev/docs`;

const replies = {
  help: respond(HELP),
  version: respond("0.1.0"),
  init,
  status,
  ingest,
  ingestion,
  recall,
  claim,
};

// `open` does nothing, so no scenario can open a browser on the machine that runs the tests.
export const OPEN_MOCK = { response: { exitCode: 0 } };

// Use overrides to change one reply, for example { recall: respond("...") }.
export function pastDevCli(overrides = {}) {
  const all = { ...replies, ...overrides };
  return {
    handler: ({ argv, cwd }) => {
      const pkg = argv.findIndex((arg) => arg.startsWith("past-dev"));
      if (pkg === -1) return { exitCode: 1, stderr: "npx past is another package. Use npx -y past-dev@latest." };
      if (argv.includes("--help") || argv.includes("-h")) return all.help;
      if (argv.includes("--version") || argv.includes("-v")) return all.version;
      const reply = all[argv[pkg + 1]] ?? all.help;
      return typeof reply === "function" ? reply(argv.slice(pkg + 2), cwd) : reply;
    },
  };
}
