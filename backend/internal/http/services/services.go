package services

import (
	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/internal/http/uaparser"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/featureflags"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/token"
)

type ServicesBuilder struct {
	Projects     projects.Projects
	Sessions     sessions.Sessions
	FeatureFlags featureflags.FeatureFlags
	Producer     types.Producer
	Flaker       *flakeid.Flaker
	UaParser     *uaparser.UAParser
	GeoIP        geoip.GeoParser
	Tokenizer    *token.Tokenizer
}

func New(cfg *http.Config, producer types.Producer, pgconn *postgres.Conn) (*ServicesBuilder, error) {
	projs := projects.New(pgconn)
	return &ServicesBuilder{
		Projects:     projs,
		Sessions:     sessions.New(pgconn, projs),
		FeatureFlags: featureflags.New(pgconn),
		Producer:     producer,
		Tokenizer:    token.NewTokenizer(cfg.TokenSecret),
		UaParser:     uaparser.NewUAParser(cfg.UAParserFile),
		GeoIP:        geoip.New(cfg.MaxMinDBFile),
		Flaker:       flakeid.NewFlaker(cfg.WorkerID),
	}, nil
}
