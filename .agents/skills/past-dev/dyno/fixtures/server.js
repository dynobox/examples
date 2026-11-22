import http from "node:http";
import { answer } from "./model.js";

// POST /chat { userId, message } -> { reply }
http
  .createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/chat") return res.writeHead(404).end();
    let body = "";
    for await (const chunk of req) body += chunk;
    const { userId, message } = JSON.parse(body);
    const reply = await answer({ userId, message });
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ reply }));
  })
  .listen(3000);
