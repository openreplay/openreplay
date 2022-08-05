package clickhouse

import "fmt"

type batch struct {
	size      int
	values    [][]interface{}
	oldValues [][]interface{}
}

func NewBatch(size int) *batch {
	return &batch{
		size:      size,
		values:    make([][]interface{}, 0),
		oldValues: make([][]interface{}, 0),
	}
}

func (b *batch) Append(v ...interface{}) error {
	if len(v) != b.size {
		return fmt.Errorf("wrong values set size, got: %d, waited: %d", len(v), b.size)
	}
	b.values = append(b.values, v)
	return nil
}

func (b *batch) Commit() error {
	if len(b.oldValues) > 0 {
		//
	}

}
