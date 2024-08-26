package transcoder

import (
	"errors"
	"time"

	"github.com/jackc/pgx/v4"
	"openreplay/backend/pkg/db/postgres/pool"
)

type Tasks interface {
	Add(spotID uint64, crop []int, duration int) error
	Get() (*Task, error)
	Done(task *Task) error
	Failed(task *Task, taskErr error) error
}

type tasksImpl struct {
	conn pool.Pool
}

func NewTasks(conn pool.Pool) Tasks {
	return &tasksImpl{conn: conn}
}

type Task struct {
	SpotID   uint64
	Crop     []int
	Duration int
	Status   string
	Path     string
	tx       pool.Tx
}

func (t *Task) HasToTrim() bool {
	return t.Crop != nil && len(t.Crop) == 2
}

func (t *Task) HasToTranscode() bool {
	return t.Duration > 15000
}

func (t *tasksImpl) Add(spotID uint64, crop []int, duration int) error {
	sql := `INSERT INTO spot_tasks (id, crop, duration, status, added_time) VALUES ($1, $2, $3, $4, $5)`
	if err := t.conn.Exec(sql, spotID, crop, duration, "pending", time.Now()); err != nil {
		return err
	}
	return nil
}

type NoTasksError struct{}

func (NoTasksError) Error() string {
	return "no tasks"
}

func (t *tasksImpl) Get() (task *Task, err error) {
	tx, err := t.conn.Begin()
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			tx.TxRollback()
		}
	}()

	task = &Task{tx: pool.Tx{Tx: tx}}
	sql := `SELECT id, crop, duration FROM spot_tasks WHERE status = 'pending' ORDER BY added_time FOR UPDATE SKIP LOCKED LIMIT 1`
	err = tx.TxQueryRow(sql).Scan(&task.SpotID, &task.Crop, &task.Duration)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, NoTasksError{}
		}
		return nil, err
	}
	return task, nil
}

func (t *tasksImpl) Done(task *Task) error {
	sql := `DELETE FROM spot_tasks WHERE id = $1`
	err := task.tx.TxExec(sql, task.SpotID)
	if err != nil {
		task.tx.TxRollback()
		return err
	}

	return task.tx.TxCommit()
}

func (t *tasksImpl) Failed(task *Task, taskErr error) error {
	sql := `UPDATE spot_tasks SET status = 'failed', error = $2 WHERE id = $1`
	err := task.tx.TxExec(sql, task.SpotID, taskErr.Error())
	if err != nil {
		task.tx.TxRollback()
		return err
	}

	return task.tx.TxCommit()
}
