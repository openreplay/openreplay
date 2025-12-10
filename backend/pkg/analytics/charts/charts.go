package charts

import (
	"context"
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/go-playground/validator/v10"
	"go.uber.org/zap"

	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/logger"
)

type Charts interface {
	GetData(projectId int, userId uint64, req *model.MetricPayload) (interface{}, error)
}

type chartsImpl struct {
	chConn driver.Conn
	Logger logger.Logger
}

func New(logger logger.Logger, chConn driver.Conn) (Charts, error) {
	return &chartsImpl{
		chConn: chConn,
		Logger: logger,
	}, nil
}

// GetData def get_chart()
func (s *chartsImpl) GetData(projectId int, userID uint64, req *model.MetricPayload) (interface{}, error) {
	if req == nil {
		return nil, fmt.Errorf("request is empty")
	}

	payload := &Payload{
		ProjectId:     projectId,
		UserId:        userID,
		MetricPayload: req,
	}
	var validate *validator.Validate = validator.New()
	var err error
	if err = validate.Struct(payload); err != nil {
		s.Logger.Error(context.Background(), "Error validating payload", zap.Error(err))
		return nil, fmt.Errorf("error validating payload: %v", err)
	}
	qb, err := NewQueryBuilder(s.Logger, payload)
	if err != nil {
		s.Logger.Error(context.Background(), "Error creating query builder", zap.Error(err))
		return nil, fmt.Errorf("error creating query builder: %v", err)
	}

	if len(payload.MetricPayload.Series) == 0 {
		s.Logger.Error(context.Background(), "Series is empty")
		return "", fmt.Errorf("series empty")
	}
	resp, err := qb.Execute(payload, s.chConn)
	if err != nil {
		s.Logger.Error(context.Background(), "Error executing query", zap.Error(err))
		return nil, fmt.Errorf("error executing query: %v", err)
	}
	s.Logger.Info(context.Background(), "Query executed successfully")
	return map[string]interface{}{"data": resp}, nil
}
