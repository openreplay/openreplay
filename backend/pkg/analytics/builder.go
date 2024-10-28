package analytics

import (
	"openreplay/backend/pkg/common"
	"openreplay/backend/pkg/logger"
)

type ServiceBuilder struct {
	*common.ServicesBuilder
}

func NewServiceBuilder(log logger.Logger) *ServiceBuilder {
	return &ServiceBuilder{
		ServicesBuilder: common.NewServiceBuilder(log),
	}
}

func (sb *ServiceBuilder) Build() (*ServiceBuilder, error) {
	// Build common services
	if _, err := sb.ServicesBuilder.Build(); err != nil {
		return nil, err
	}

	return sb, nil
}
