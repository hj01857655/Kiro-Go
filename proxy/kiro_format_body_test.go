package proxy

import "testing"

func TestFormatUpstreamBody(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"empty", "", "<empty>"},
		{"whitespace-only", "   \n  ", "<empty>"},
		{"valid-json-compacted", "{\n  \"message\": \"x\",\n  \"code\": 1\n}", `{"message":"x","code":1}`},
		{"valid-json-array", "[\n  1,\n  2\n]", "[1,2]"},
		{"non-json-passthrough", "  plain error text  ", "plain error text"},
		{"invalid-json-passthrough", `{"broken":`, `{"broken":`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := formatUpstreamBody([]byte(c.in))
			if got != c.want {
				t.Errorf("got %q, want %q", got, c.want)
			}
		})
	}
}
