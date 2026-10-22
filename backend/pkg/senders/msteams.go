package senders

import (
	"context"
	"fmt"
	"strings"
)

const msTeamsBatchSize = 50

type MSTeams struct {
	http    *HTTP
	siteURL string
}

func NewMSTeams(h *HTTP, siteURL string) *MSTeams {
	return &MSTeams{http: h, siteURL: strings.TrimRight(siteURL, "/")}
}

type teamsFact struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type teamsSection struct {
	ActivityTitle    string      `json:"activityTitle,omitempty"`
	ActivitySubtitle string      `json:"activitySubtitle,omitempty"`
	Facts            []teamsFact `json:"facts,omitempty"`
	Markdown         bool        `json:"markdown,omitempty"`
	Text             string      `json:"text,omitempty"`
}

func (m *MSTeams) section(it Item) teamsSection {
	return teamsSection{
		ActivityTitle:    it.Title,
		ActivitySubtitle: fmt.Sprintf("On Project *%s*", it.ProjectName),
		Facts: []teamsFact{
			{Name: "Target:", Value: m.siteURL + it.ButtonURL},
			{Name: "Description:", Value: it.Description},
		},
		Markdown: true,
	}
}

// Send posts the items to one MS Teams incoming-webhook endpoint as MessageCards, 50 sections
// per request with a "***" separator between consecutive sections.
func (m *MSTeams) Send(ctx context.Context, endpoint string, items []Item) error {
	sections := make([]teamsSection, 0, len(items))
	for _, it := range items {
		sections = append(sections, m.section(it))
	}
	var firstErr error
	for _, part := range chunk(sections, msTeamsBatchSize) {
		withSep := make([]teamsSection, 0, 2*len(part))
		for i, sec := range part {
			if i > 0 {
				withSep = append(withSep, teamsSection{Text: "***"})
			}
			withSep = append(withSep, sec)
		}
		card := map[string]any{
			"@type":    "MessageCard",
			"@context": "http://schema.org/extensions",
			"summary":  part[0].ActivityTitle,
			"sections": withSep,
		}
		if _, _, err := m.http.PostJSON(ctx, endpoint, card, nil); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}
