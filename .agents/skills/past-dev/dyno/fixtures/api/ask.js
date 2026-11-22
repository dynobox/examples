// POST /api/ask { userId, question } -> { answer }
// A server function: it runs on the host, not in the browser. It has no memory of earlier tickets.
export async function POST(request) {
  const { userId, question } = await request.json();
  return Response.json({ answer: `(fake answer to ${userId}: ${question})` });
}
