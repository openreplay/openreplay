package charts

import (
	"encoding/json"
	"fmt"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Charts interface {
	GetData(projectId int, userId uint64, req *GetCardChartDataRequest) ([]DataPoint, error)
}

type chartsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
}

func New(log logger.Logger, conn pool.Pool) (Charts, error) {
	return &chartsImpl{
		log:    log,
		pgconn: conn,
	}, nil
}

func (s *chartsImpl) GetData(projectId int, userID uint64, req *GetCardChartDataRequest) ([]DataPoint, error) {
	jsonInput := `
    {
        "data": [
            {
                "timestamp": 1733934939000,
                "Series A": 100,
                "Series B": 200
            },
            {
                "timestamp": 1733935939000,
                "Series A": 150,
                "Series B": 250
            }
        ]
    }`

	var resp GetCardChartDataResponse
	if err := json.Unmarshal([]byte(jsonInput), &resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return resp.Data, nil
}
