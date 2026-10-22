package alerts

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/senders"
)

const dispatchBatchSize = 200

// Senders groups the outbound channels. Any nil sender disables that channel.
type Senders struct {
	Slack interface {
		Send(context.Context, string, []senders.Item) error
	}
	MSTeams interface {
		Send(context.Context, string, []senders.Item) error
	}
	Webhook interface {
		Send(ctx context.Context, endpoint, authHeader string, data map[string]any) error
	}
	Email interface {
		Configured() bool
		Send(context.Context, string, senders.Item) error
	}
}

// Notifier builds notifications for fired alerts and fans them out.
type Notifier interface {
	Build(a *AlertToExecute, r Result, nowMs int64) Notification
	Dispatch(ctx context.Context, ns []Notification)
}

type notifierImpl struct {
	log     logger.Logger
	store   Storage
	senders Senders
}

func NewNotifier(log logger.Logger, store Storage, s Senders) Notifier {
	return &notifierImpl{log: log, store: store, senders: s}
}

// formatValue mirrors Python's f"{x:,}" after int() for whole numbers or round(x, 2) otherwise.
func formatValue(x float64) string {
	if x == math.Trunc(x) {
		return groupThousands(strconv.FormatInt(int64(x), 10))
	}
	s := strconv.FormatFloat(math.Round(x*100)/100, 'f', -1, 64)
	intPart, frac, _ := strings.Cut(s, ".")
	if frac == "" {
		return groupThousands(intPart)
	}
	return groupThousands(intPart) + "." + frac
}

func groupThousands(digits string) string {
	neg := strings.HasPrefix(digits, "-")
	digits = strings.TrimPrefix(digits, "-")
	var b strings.Builder
	for i, c := range digits {
		if i > 0 && (len(digits)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	if neg {
		return "-" + b.String()
	}
	return b.String()
}

// Build is the port of helpers.generate_notification.
func (n *notifierImpl) Build(a *AlertToExecute, r Result, nowMs int64) Notification {
	return Notification{
		AlertID:     a.AlertID,
		TenantID:    a.TenantID,
		ProjectID:   a.ProjectID,
		ProjectName: a.ProjectName,
		Title:       a.Name,
		Description: fmt.Sprintf("%s = %s (%s %s).", a.SeriesName, formatValue(r.Value), a.Query.Operator, formatValue(float64(a.Query.Right))),
		ButtonText:  "Check metrics for more details",
		ButtonURL:   fmt.Sprintf("/%d/metrics", a.ProjectID),
		Messages:    a.Options.Message,
		StoredOptions: map[string]any{
			"source":     "ALERT",
			"sourceId":   a.AlertID,
			"sourceMeta": a.DetectionMethod,
			"projectId":  a.ProjectID,
		},
		WebhookData: map[string]any{
			"title":           a.Name,
			"limitValue":      float64(a.Query.Right),
			"actualValue":     r.Value,
			"operator":        string(a.Query.Operator),
			"trigger":         a.Query.Left,
			"alertId":         a.AlertID,
			"detectionMethod": a.DetectionMethod,
			"currentPeriod":   a.Options.CurrentPeriod,
			"previousPeriod":  a.Options.PreviousPeriod,
			"createdAt":       nowMs,
		},
	}
}

type target struct {
	notification Notification
	destination  string
}

func toItem(n Notification) senders.Item {
	return senders.Item{
		Title:       n.Title,
		Description: n.Description,
		ButtonText:  n.ButtonText,
		ButtonURL:   n.ButtonURL,
		ProjectID:   n.ProjectID,
		ProjectName: n.ProjectName,
	}
}

// Dispatch is the port of alerts.process_notifications: persist in-app notifications,
// then send per channel in batches of 200. Sender failures are logged and never abort the run.
func (n *notifierImpl) Dispatch(ctx context.Context, ns []Notification) {
	if len(ns) == 0 {
		return
	}
	if err := n.store.InsertNotifications(ctx, ns); err != nil {
		n.log.Error(ctx, "alerts: insert notifications: %s", err)
	}
	byType := map[string][]target{}
	for _, nt := range ns {
		for _, m := range nt.Messages {
			byType[m.Type] = append(byType[m.Type], target{notification: nt, destination: string(m.Value)})
		}
	}
	for typ, targets := range byType {
		for i := 0; i < len(targets); i += dispatchBatchSize {
			end := i + dispatchBatchSize
			if end > len(targets) {
				end = len(targets)
			}
			batch := targets[i:end]
			switch typ {
			case MessageSlack:
				n.sendViaWebhookTable(ctx, batch, MessageSlack)
			case MessageMSTeams:
				n.sendViaWebhookTable(ctx, batch, MessageMSTeams)
			case MessageWebhook:
				n.sendViaWebhookTable(ctx, batch, MessageWebhook)
			case MessageEmail:
				n.sendEmails(ctx, batch)
			default:
				n.log.Warn(ctx, "alerts: unknown notification channel %q", typ)
			}
		}
	}
}

// sendViaWebhookTable resolves destinations (webhook ids) against public.webhooks and sends
// per endpoint. Rows whose type does not match the channel are skipped, as in Python.
func (n *notifierImpl) sendViaWebhookTable(ctx context.Context, batch []target, channel string) {
	type key struct {
		tenant int64
		id     int64
	}
	grouped := map[key][]target{}
	for _, t := range batch {
		id, err := strconv.ParseInt(strings.TrimSpace(t.destination), 10, 64)
		if err != nil {
			n.log.Warn(ctx, "alerts: alert %d: invalid %s destination %q", t.notification.AlertID, channel, t.destination)
			continue
		}
		k := key{tenant: t.notification.TenantID, id: id}
		grouped[k] = append(grouped[k], t)
	}
	byTenant := map[int64][]int64{}
	for k := range grouped {
		byTenant[k.tenant] = append(byTenant[k.tenant], k.id)
	}
	hooks := map[key]Webhook{}
	for tenant, ids := range byTenant {
		found, err := n.store.Webhooks(ctx, ids, tenant)
		if err != nil {
			n.log.Error(ctx, "alerts: load webhooks: %s", err)
			continue
		}
		for id, h := range found {
			hooks[key{tenant: tenant, id: id}] = h
		}
	}
	for k, targets := range grouped {
		hook, ok := hooks[k]
		if !ok {
			n.log.Warn(ctx, "alerts: %s webhook %d not found", channel, k.id)
			continue
		}
		if hook.Type != channel {
			n.log.Warn(ctx, "alerts: webhook %d has type %q, expected %q", k.id, hook.Type, channel)
			continue
		}
		var err error
		switch channel {
		case MessageSlack:
			if n.senders.Slack == nil {
				continue
			}
			err = n.senders.Slack.Send(ctx, hook.Endpoint, itemsOf(targets))
		case MessageMSTeams:
			if n.senders.MSTeams == nil {
				continue
			}
			err = n.senders.MSTeams.Send(ctx, hook.Endpoint, itemsOf(targets))
		case MessageWebhook:
			if n.senders.Webhook == nil {
				continue
			}
			auth := ""
			if hook.AuthHeader != nil {
				auth = *hook.AuthHeader
			}
			for _, t := range targets {
				if e := n.senders.Webhook.Send(ctx, hook.Endpoint, auth, t.notification.WebhookData); e != nil && err == nil {
					err = e
				}
			}
		}
		if err != nil {
			n.log.Error(ctx, "alerts: sending %s notifications to webhook %d: %s", channel, k.id, err)
		}
	}
}

func itemsOf(targets []target) []senders.Item {
	out := make([]senders.Item, 0, len(targets))
	for _, t := range targets {
		out = append(out, toItem(t.notification))
	}
	return out
}

func (n *notifierImpl) sendEmails(ctx context.Context, batch []target) {
	if n.senders.Email == nil || !n.senders.Email.Configured() {
		n.log.Info(ctx, "alerts: no SMTP configuration, skipping %d email notification(s)", len(batch))
		return
	}
	for _, t := range batch {
		if err := n.senders.Email.Send(ctx, t.destination, toItem(t.notification)); err != nil {
			n.log.Error(ctx, "alerts: alert %d: email to %q failed: %s", t.notification.AlertID, t.destination, err)
		}
	}
}
