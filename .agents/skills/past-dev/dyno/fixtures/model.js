// Calls the model with the user's message. It has no memory of earlier tickets.
export async function answer({ userId, message }) {
  return `(model reply to ${userId}: ${message})`;
}
