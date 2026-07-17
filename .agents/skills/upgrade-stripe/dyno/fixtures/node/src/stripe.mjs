export const stripeOptions = {};

export const handleWebhook = (event) => {
  switch (event.type) {
    case "checkout.session.completed":
      return { handled: true };
    default:
      throw new Error(`Unsupported event: ${event.type}`);
  }
};
