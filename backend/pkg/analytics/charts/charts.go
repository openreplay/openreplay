package charts

import (
	"fmt"
	"log"
	"openreplay/backend/pkg/analytics/db"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Charts interface {
	GetData(projectId int, userId uint64, req *MetricPayload) (interface{}, error)
}

type chartsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
	chConn db.Connector
}

func New(log logger.Logger, conn pool.Pool, chConn db.Connector) (Charts, error) {
	return &chartsImpl{
		log:    log,
		pgconn: conn,
		chConn: chConn,
	}, nil
}

// GetData def get_chart()
func (s *chartsImpl) GetData(projectId int, userID uint64, req *MetricPayload) (interface{}, error) {
	if req == nil {
		return nil, fmt.Errorf("request is empty")
	}

	payload := Payload{
		ProjectId:     projectId,
		UserId:        userID,
		MetricPayload: req,
	}
	qb, err := NewQueryBuilder(payload)
	if err != nil {
		log.Fatalf("Error creating query builder: %v", err)
	}

	resp, err := qb.Execute(payload, s.chConn)
	if err != nil {
		log.Fatalf("Error building query: %v", err)
	}

	return resp, nil
}
