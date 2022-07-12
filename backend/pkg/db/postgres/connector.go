package postgres

import (
	"context"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric/instrument/syncfloat64"
	"log"
	"openreplay/backend/pkg/monitoring"
	"strings"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

func getTimeoutContext() context.Context {
	ctx, _ := context.WithTimeout(context.Background(), time.Duration(time.Second*30))
	return ctx
}

type batchItem struct {
	query     string
	arguments []interface{}
}

type Conn struct {
	c                 *pgxpool.Pool // TODO: conditional usage of Pool/Conn (use interface?)
	batches           map[uint64]*pgx.Batch
	batchSizes        map[uint64]int
	rawBatches        map[uint64][]*batchItem
	batchQueueLimit   int
	batchSizeLimit    int
	batchSizeBytes    syncfloat64.Histogram
	batchSizeLines    syncfloat64.Histogram
	sqlRequestTime    syncfloat64.Histogram
	sqlRequestCounter syncfloat64.Counter
}

func NewConn(url string, queueLimit, sizeLimit int, metrics *monitoring.Metrics) *Conn {
	if metrics == nil {
		log.Fatalf("metrics is nil")
	}
	c, err := pgxpool.Connect(context.Background(), url)
	if err != nil {
		log.Println(err)
		log.Fatalln("pgxpool.Connect Error")
	}
	conn := &Conn{
		c:               c,
		batches:         make(map[uint64]*pgx.Batch),
		batchSizes:      make(map[uint64]int),
		rawBatches:      make(map[uint64][]*batchItem),
		batchQueueLimit: queueLimit,
		batchSizeLimit:  sizeLimit,
	}
	conn.initMetrics(metrics)
	return conn
}

func (conn *Conn) Close() error {
	conn.c.Close()
	return nil
}

func (conn *Conn) initMetrics(metrics *monitoring.Metrics) {
	var err error
	conn.batchSizeBytes, err = metrics.RegisterHistogram("batch_size_bytes")
	if err != nil {
		log.Printf("can't create batchSizeBytes metric: %s", err)
	}
	conn.batchSizeLines, err = metrics.RegisterHistogram("batch_size_lines")
	if err != nil {
		log.Printf("can't create batchSizeLines metric: %s", err)
	}
	conn.sqlRequestTime, err = metrics.RegisterHistogram("sql_request_time")
	if err != nil {
		log.Printf("can't create sqlRequestTime metric: %s", err)
	}
	conn.sqlRequestCounter, err = metrics.RegisterCounter("sql_request_number")
	if err != nil {
		log.Printf("can't create sqlRequestNumber metric: %s", err)
	}
}

func (conn *Conn) batchQueue(sessionID uint64, sql string, args ...interface{}) {
	batch, ok := conn.batches[sessionID]
	if !ok {
		conn.batches[sessionID] = &pgx.Batch{}
		conn.rawBatches[sessionID] = make([]*batchItem, 0)
		batch = conn.batches[sessionID]
	}
	batch.Queue(sql, args...)
	// Temp raw batch store
	raw := conn.rawBatches[sessionID]
	raw = append(raw, &batchItem{
		query:     sql,
		arguments: args,
	})
	conn.rawBatches[sessionID] = raw
}

func (conn *Conn) CommitBatches() {
	for sessID, b := range conn.batches {
		// Record batch size in bytes and number of lines
		conn.batchSizeBytes.Record(context.Background(), float64(conn.batchSizes[sessID]))
		conn.batchSizeLines.Record(context.Background(), float64(b.Len()))

		start := time.Now()
		isFailed := false

		// Send batch to db and execute
		br := conn.c.SendBatch(getTimeoutContext(), b)
		l := b.Len()
		for i := 0; i < l; i++ {
			if ct, err := br.Exec(); err != nil {
				log.Printf("Error in PG batch (command tag %s, session: %d): %v \n", ct.String(), sessID, err)
				failedSql := conn.rawBatches[sessID][i]
				query := strings.ReplaceAll(failedSql.query, "\n", " ")
				log.Println("failed sql req:", query, failedSql.arguments)
				isFailed = true
			}
		}
		br.Close() // returns err
		conn.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
			attribute.String("method", "batch"), attribute.Bool("failed", isFailed))
		conn.sqlRequestCounter.Add(context.Background(), 1,
			attribute.String("method", "batch"), attribute.Bool("failed", isFailed))
	}
	conn.batches = make(map[uint64]*pgx.Batch)
	conn.batchSizes = make(map[uint64]int)
	conn.rawBatches = make(map[uint64][]*batchItem)
}

func (conn *Conn) updateBatchSize(sessionID uint64, reqSize int) {
	conn.batchSizes[sessionID] += reqSize
	if conn.batchSizes[sessionID] >= conn.batchSizeLimit || conn.batches[sessionID].Len() >= conn.batchQueueLimit {
		conn.commitBatch(sessionID)
	}
}

// Send only one batch to pg
func (conn *Conn) commitBatch(sessionID uint64) {
	b, ok := conn.batches[sessionID]
	if !ok {
		log.Printf("can't find batch for session: %d", sessionID)
		return
	}
	// Record batch size in bytes and number of lines
	conn.batchSizeBytes.Record(context.Background(), float64(conn.batchSizes[sessionID]))
	conn.batchSizeLines.Record(context.Background(), float64(b.Len()))

	start := time.Now()
	isFailed := false

	// Send batch to db and execute
	br := conn.c.SendBatch(getTimeoutContext(), b)
	l := b.Len()
	for i := 0; i < l; i++ {
		if ct, err := br.Exec(); err != nil {
			log.Printf("Error in PG batch (command tag %s, session: %d): %v \n", ct.String(), sessionID, err)
			failedSql := conn.rawBatches[sessionID][i]
			query := strings.ReplaceAll(failedSql.query, "\n", " ")
			log.Println("failed sql req:", query, failedSql.arguments)
			isFailed = true
		}
	}
	br.Close()

	conn.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", "batch"), attribute.Bool("failed", isFailed))
	conn.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", "batch"), attribute.Bool("failed", isFailed))

	// Clean batch info
	delete(conn.batches, sessionID)
	delete(conn.batchSizes, sessionID)
	delete(conn.rawBatches, sessionID)
}

func (conn *Conn) query(sql string, args ...interface{}) (pgx.Rows, error) {
	start := time.Now()
	res, err := conn.c.Query(getTimeoutContext(), sql, args...)
	method, table := methodName(sql)
	conn.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", method), attribute.String("table", table))
	conn.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", method), attribute.String("table", table))
	return res, err
}

func (conn *Conn) queryRow(sql string, args ...interface{}) pgx.Row {
	start := time.Now()
	res := conn.c.QueryRow(getTimeoutContext(), sql, args...)
	method, table := methodName(sql)
	conn.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", method), attribute.String("table", table))
	conn.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", method), attribute.String("table", table))
	return res
}

func (conn *Conn) exec(sql string, args ...interface{}) error {
	start := time.Now()
	_, err := conn.c.Exec(getTimeoutContext(), sql, args...)
	method, table := methodName(sql)
	conn.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", method), attribute.String("table", table))
	conn.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", method), attribute.String("table", table))
	return err
}

type _Tx struct {
	pgx.Tx
	sqlRequestTime    syncfloat64.Histogram
	sqlRequestCounter syncfloat64.Counter
}

func (conn *Conn) begin() (_Tx, error) {
	start := time.Now()
	tx, err := conn.c.Begin(context.Background())
	conn.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", "begin"))
	conn.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", "begin"))
	return _Tx{tx, conn.sqlRequestTime, conn.sqlRequestCounter}, err
}

func (tx _Tx) exec(sql string, args ...interface{}) error {
	start := time.Now()
	_, err := tx.Exec(context.Background(), sql, args...)
	method, table := methodName(sql)
	tx.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", method), attribute.String("table", table))
	tx.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", method), attribute.String("table", table))
	return err
}

func (tx _Tx) rollback() error {
	start := time.Now()
	err := tx.Rollback(context.Background())
	tx.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", "rollback"))
	tx.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", "rollback"))
	return err
}

func (tx _Tx) commit() error {
	start := time.Now()
	err := tx.Commit(context.Background())
	tx.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", "commit"))
	tx.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", "commit"))
	return err
}

func methodName(sql string) (string, string) {
	cmd, table := "unknown", "unknown"

	// Prepare sql request for parsing
	sql = strings.TrimSpace(sql)
	sql = strings.ReplaceAll(sql, "\n", " ")
	sql = strings.ReplaceAll(sql, "\t", "")
	sql = strings.ToLower(sql)

	// Get sql command name
	parts := strings.Split(sql, " ")
	if parts[0] == "" {
		return cmd, table
	} else {
		cmd = strings.TrimSpace(parts[0])
	}

	// Get table name
	switch cmd {
	case "select":
		for i, p := range parts {
			if strings.TrimSpace(p) == "from" {
				table = strings.TrimSpace(parts[i+1])
			}
		}
	case "update":
		table = strings.TrimSpace(parts[1])
	case "insert":
		table = strings.TrimSpace(parts[2])
	}
	return cmd, table
}
