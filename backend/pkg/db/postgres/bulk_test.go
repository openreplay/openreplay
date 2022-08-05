package postgres

import (
	"fmt"
	"github.com/jackc/pgx/v4"
	"testing"
)

type poolMock struct {
	//
}

func (p poolMock) Query(sql string, args ...interface{}) (pgx.Rows, error) {
	return nil, nil
}

func (p poolMock) QueryRow(sql string, args ...interface{}) pgx.Row {
	return nil
}

func (p poolMock) Exec(sql string, arguments ...interface{}) error {
	fmt.Println(sql)
	fmt.Println(arguments...)
	return nil
}

func (p poolMock) SendBatch(b *pgx.Batch) pgx.BatchResults {
	return nil
}

func (p poolMock) Begin() (*_Tx, error) {
	return nil, nil
}

func (p poolMock) Close() {
}

func NewPoolMock() Pool {
	return &poolMock{}
}

func TestBulk(t *testing.T) {
	conn := NewPoolMock()
	bulk, err := NewBulk(conn, "autocomplete", "(value, type, project_id)", "($%d, $%d, $%d)", 3, 10)
	if err != nil {
		t.Errorf("can't create bulk: %s", err)
	}
	for i := 0; i < 10; i++ {
		if err := bulk.Append(fmt.Sprintf("var1+%d", i), fmt.Sprintf("var2+%d", i),
			i%2 == 0); err != nil {
			t.Errorf("can't add new values to bulk: %s", err)
		}
	}
}
