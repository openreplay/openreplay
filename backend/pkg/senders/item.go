package senders

// Item is the channel-agnostic notification card that Slack, MS Teams and e-mail render.
// ButtonURL is site-relative (e.g. "/12/metrics"); each sender prefixes it with the site URL.
type Item struct {
	Title       string
	Description string
	ButtonText  string
	ButtonURL   string
	ProjectID   int64
	ProjectName string
}
