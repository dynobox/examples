export const createCheckoutSession = (stripe) =>
  stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: "price_fixture", quantity: 1 }],
    payment_method_types: ["card"],
    success_url: "https://example.test/success",
  });
