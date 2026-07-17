package stripeupgrade

import "net/http"

func NewStripeRequest() *http.Request {
	req, _ := http.NewRequest(http.MethodGet, "https://api.stripe.com/v1/customers", nil)
	req.Header.Set("Stripe-Version", "2024-12-18.acacia")
	return req
}
