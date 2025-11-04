package charts

import (
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/go-playground/validator/v10"

	"openreplay/backend/pkg/analytics/model"
)

type Charts interface {
	GetData(projectId int, userId uint64, req *model.MetricPayload) (interface{}, error)
}

type chartsImpl struct {
	chConn driver.Conn
}

func New(chConn driver.Conn) (Charts, error) {
	return &chartsImpl{
		chConn: chConn,
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
		return nil, fmt.Errorf("error validating payload: %v", err)

	}
	qb, err := NewQueryBuilder(payload)
	if err != nil {
		return nil, fmt.Errorf("error creating query builder: %v", err)
	}

	if len(payload.MetricPayload.Series) == 0 {
		return "", fmt.Errorf("series empty")
	}
	resp, err := qb.Execute(payload, s.chConn)
	if err != nil {
		return nil, fmt.Errorf("error executing query: %v", err)
	}
	return map[string]interface{}{"data": resp}, nil
}
