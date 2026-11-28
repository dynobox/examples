// A mock of api.past.dev for Dynobox `httpMocks`. The real past-dev CLI runs against it, and no call reaches past.dev.
// Each answer has the fields that past-dev@0.1.0 reads. The claim routes are not mocked: they answer 404.
import { randomUUID } from "node:crypto";
import { CLAIM_TOKEN, CONSOLE_URL, DELETED, MADE, PROJECT_SLUG, UNCLAIMED_KEY } from "./constants.mjs";

export const json = (status, body) => ({ status, json: body });
const notFound = (message) => json(404, { error: { code: "not-found", message } });

// The unclaimed project, with the time left before its deletion at the moment of the request.
const project = () => ({
  createdAt: MADE,
  unclaimedUntil: DELETED,
  secondsLeft: Math.max(0, Math.floor((Date.parse(DELETED) - Date.now()) / 1000)),
});
const bearer = (headers) => String(headers.authorization).replace(/^Bearer /, "");

// init calls with its claim token. Like past.dev, the mock makes a project the first time it sees a token (201)
// and answers with the same project after that (200). The token in UNCLAIMED_PROJECT has its project already.
const tokens = new Set([CLAIM_TOKEN]);

// What each job sent, by ingestion ID. Dynobox calls the handler in its own process,
// and the jobs of a run can run at the same time, so the sends are kept per work directory.
const jobs = new Map();
const sendsOf = (workDir) => jobs.get(workDir) ?? jobs.set(workDir, new Map()).get(workDir);

const routes = {
  "POST /api/v1/agent-signups": ({ headers }) => {
    const token = bearer(headers);
    const status = tokens.has(token) ? 200 : 201;
    tokens.add(token);
    return json(status, { project: { slug: PROJECT_SLUG }, projectKey: UNCLAIMED_KEY, consoleUrl: CONSOLE_URL, ...project() });
  },

  // The CLI asks with the project key. Only the key that init writes is unclaimed: any other key,
  // as in "I already use past.dev", belongs to a project that a person owns.
  "GET /api/v1/agent-signups/status": ({ headers }) =>
    bearer(headers) === UNCLAIMED_KEY ? json(200, { state: "unclaimed", ...project() }) : json(200, { state: "owned" }),

  "POST /api/v1/ingest": ({ body, workDir }) => {
    const ingestionId = randomUUID();
    const occurredAt = body.timestamp ?? new Date().toISOString();
    sendsOf(workDir).set(ingestionId, { content: body.content, identity: body.identity, occurredAt, completed: false });
    return json(202, { ingestionId });
  },

  // A send completes when the CLI asks where it got to: `ingestion <id> --wait`.
  "GET /api/v1/ingest/:id": ({ path, workDir }) => {
    const send = sendsOf(workDir).get(path.split("/").pop());
    if (!send) return notFound("This project has no such ingestion.");
    send.completed = true;
    return json(200, { status: "completed" });
  },

  // As in past.dev, recall finds a send only after it completes, and only for its identity.
  // It gives back the 2 sends that share the most words with the query.
  "POST /api/v1/recall": ({ body, workDir }) => {
    const words = String(body.query).toLowerCase().match(/[a-z0-9$.]{4,}/g) ?? [];
    const score = (send) => words.filter((word) => send.content.toLowerCase().includes(word)).length;
    const results = [...sendsOf(workDir).values()]
      .filter((send) => send.completed && (!send.identity || send.identity === body.identity) && score(send) > 0)
      .sort((a, b) => score(b) - score(a))
      .slice(0, 2)
      .map((send, i) => ({ rank: i + 1, content: send.content, occurredAt: send.occurredAt }));
    return json(200, { results });
  },
};

// Overrides change one route, for example { "POST /api/v1/recall": () => json(200, { results: [...] }) }.
export function pastDevApi(overrides = {}) {
  const all = { ...routes, ...overrides };
  return {
    handler: (request) => {
      const route = all[`${request.method} ${request.path.replace(/^\/api\/v1\/ingest\/[^/]+$/, "/api/v1/ingest/:id")}`];
      if (!route) return notFound(`No route for ${request.method} ${request.path}.`);
      return route({ ...request, body: request.body ? JSON.parse(request.body) : {} });
    },
  };
}
