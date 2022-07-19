package postgres

import (
	"bytes"
	"errors"
	"fmt"
)

const (
	insertPrefix = `INSERT INTO `
	insertValues = ` VALUES `
	insertSuffix = ` ON CONFLICT DO NOTHING;`
)

type Bulk interface {
	Append(args ...interface{}) error
	Send() error
}

type bulkImpl struct {
	conn      Pool
	table     string
	columns   string
	template  string
	setSize   int
	sizeLimit int
	values    []interface{}
}

func (b *bulkImpl) Append(args ...interface{}) error {
	if len(args) != b.setSize {
		return fmt.Errorf("wrong number of arguments, waited: %d, got: %d", b.setSize, len(args))
	}
	b.values = append(b.values, args...)
	if len(b.values)/b.setSize >= b.sizeLimit {
		return b.send()
	}
	return nil
}

func (b *bulkImpl) Send() error {
	if len(b.values) == 0 {
		return nil
	}
	return b.send()
}

func (b *bulkImpl) send() error {
	request := bytes.NewBufferString(insertPrefix + b.table + b.columns + insertValues)
	args := make([]interface{}, b.setSize)
	for i := 0; i < len(b.values)/b.setSize; i++ {
		for j := 0; j < b.setSize; j++ {
			args[j] = i*b.setSize + j + 1
		}
		if i > 0 {
			request.WriteByte(',')
		}
		request.WriteString(fmt.Sprintf(b.template, args...))
	}
	request.WriteString(insertSuffix)
	err := b.conn.Exec(request.String(), b.values...)
	b.values = make([]interface{}, 0, b.setSize*b.sizeLimit)
	if err != nil {
		return fmt.Errorf("send bulk err: %s", err)
	}
	return nil
}

func NewBulk(conn Pool, table, columns, template string, setSize, sizeLimit int) (Bulk, error) {
	switch {
	case conn == nil:
		return nil, errors.New("db conn is empty")
	case table == "":
		return nil, errors.New("table is empty")
	case columns == "":
		return nil, errors.New("columns is empty")
	case template == "":
		return nil, errors.New("template is empty")
	case setSize <= 0:
		return nil, errors.New("set size is wrong")
	case sizeLimit <= 0:
		return nil, errors.New("size limit is wrong")
	}
	return &bulkImpl{
		conn:      conn,
		table:     table,
		columns:   columns,
		template:  template,
		setSize:   setSize,
		sizeLimit: sizeLimit,
		values:    make([]interface{}, 0, setSize*sizeLimit),
	}, nil
}
