package stripeupgrade

import (
	"testing"
)

func TestCreatesStripeRequest(t *testing.T) {
	req := NewStripeRequest()
	if req.Method != "GET" {
		t.Fatalf("unexpected method: %s", req.Method)
	}
	if req.URL.Path != "/v1/customers" {
		t.Fatalf("unexpected path: %s", req.URL.Path)
	}
}
