package datasaver

import (
	"errors"
	"openreplay/backend/pkg/db/events"
	"openreplay/backend/pkg/db/stats"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/sessions/cache"
)

type Saver struct {
	sessions sessions.Sessions
	cache    cache.Sessions
	events   events.Events
	stats    stats.Stats
	producer types.Producer
}

func New(sessions sessions.Sessions, cache cache.Sessions, events events.Events, stats stats.Stats, producer types.Producer) (*Saver, error) {
	switch {
	case sessions == nil:
		return nil, errors.New("sessions is empty")
	case events == nil:
		return nil, errors.New("events is empty")
	case stats == nil:
		return nil, errors.New("stats is empty")
	}
	return &Saver{
		sessions: sessions,
		cache:    cache,
		events:   events,
		stats:    stats,
		producer: producer,
	}, nil
}
