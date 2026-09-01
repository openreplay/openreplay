package database

import (
	"github.com/prometheus/client_golang/prometheus"
)

const (
	MessageSaved     = "saved"
	MessageError     = "error"
	MessageDuplicate = "duplicate"
	MessageNoSession = "no_session"
)

type Database interface {
	RecordBatchElements(number float64)
	RecordBatchInsertDuration(durMillis float64)
	RecordBulkElements(size float64, db, table string)
	RecordBulkInsertDuration(durMillis float64, db, table string)
	RecordRequestDuration(durMillis float64, method, table string)
	IncreaseTotalRequests(method, table string)
	IncreaseRedisRequests(method, table string)
	RecordRedisRequestDuration(durMillis float64, method, table string)
	IncreaseSaverMessages(platform, outcome string)
	RecordBulkDroppedRows(size float64, db, table string)
	IncreaseBulkSendRetries(db, table string)
	RecordCHQueueDepth(size float64)
	List() []prometheus.Collector
}

type databaseImpl struct{}

func New(serviceName string) Database { return &databaseImpl{} }

func (d *databaseImpl) List() []prometheus.Collector                                       { return []prometheus.Collector{} }
func (d *databaseImpl) RecordBatchElements(number float64)                                 {}
func (d *databaseImpl) RecordBatchInsertDuration(durMillis float64)                        {}
func (d *databaseImpl) RecordBulkElements(size float64, db, table string)                  {}
func (d *databaseImpl) RecordBulkInsertDuration(durMillis float64, db, table string)       {}
func (d *databaseImpl) RecordRequestDuration(durMillis float64, method, table string)      {}
func (d *databaseImpl) IncreaseTotalRequests(method, table string)                         {}
func (d *databaseImpl) IncreaseRedisRequests(method, table string)                         {}
func (d *databaseImpl) RecordRedisRequestDuration(durMillis float64, method, table string) {}
func (d *databaseImpl) IncreaseSaverMessages(platform, outcome string)                     {}
func (d *databaseImpl) RecordBulkDroppedRows(size float64, db, table string)               {}
func (d *databaseImpl) IncreaseBulkSendRetries(db, table string)                           {}
func (d *databaseImpl) RecordCHQueueDepth(size float64)                                    {}
