package uxtesting

import (
	"openreplay/backend/pkg/db/postgres/pool"
)

type UXTesting interface {
	GetInfo(testID string) (*UXTestInfo, error)
	SetTestSignal(testSignal *TestSignal) error
	SetTaskSignal(taskSignal *TaskSignal) error
}

type uxTestingImpl struct {
	db pool.Pool
}

func New(db pool.Pool) UXTesting {
	return &uxTestingImpl{
		db: db,
	}
}

type UXTestInfo struct {
	ProjectID    uint32        `json:"-"`
	Title        string        `json:"title"`
	Description  string        `json:"description"`
	StartingPath string        `json:"startingPath"`
	Status       string        `json:"status"`
	ReqMic       bool          `json:"reqMic"`
	ReqCamera    bool          `json:"reqCamera"`
	Guidelines   string        `json:"guidelines"`
	Conclusion   string        `json:"conclusion"`
	Tasks        []interface{} `json:"tasks"`
}

func (u *uxTestingImpl) GetInfo(testID string) (*UXTestInfo, error) {
	info := &UXTestInfo{}
	var description, startingPath, guidelines, conclusion *string
	err := u.db.QueryRow(`
		SELECT
		    ut_tests.project_id,
			ut_tests.title,
			ut_tests.description,
			ut_tests.starting_path,
			ut_tests.status,
			ut_tests.require_mic,
			ut_tests.require_camera,
			ut_tests.guidelines,
			ut_tests.conclusion_message,
			json_agg(
					json_build_object(
							'task_id', ut_tests_tasks.task_id,
					    	'title', ut_tests_tasks.title,
							'description', ut_tests_tasks.description,
							'allow_typing', ut_tests_tasks.allow_typing
						)
				) AS tasks
		FROM
			ut_tests
				JOIN
			ut_tests_tasks ON ut_tests.test_id = ut_tests_tasks.test_id
		WHERE ut_tests.test_id = $1 AND ut_tests.status IN ('preview', 'in-progress')
		GROUP BY
			ut_tests.test_id;
	`, testID).Scan(&info.ProjectID, &info.Title, &description, &startingPath, &info.Status, &info.ReqMic, &info.ReqCamera,
		&guidelines, &conclusion, &info.Tasks)
	if err != nil {
		return nil, err
	}
	if description != nil {
		info.Description = *description
	}
	if startingPath != nil {
		info.StartingPath = *startingPath
	}
	if guidelines != nil {
		info.Guidelines = *guidelines
	}
	if conclusion != nil {
		info.Conclusion = *conclusion
	}
	return info, nil
}

type TestSignal struct {
	SessionID uint64 `json:"sessionID"`
	TestID    int    `json:"testID"`
	Status    string `json:"status"`
	Timestamp uint64 `json:"timestamp"`
	Duration  uint64 `json:"duration"`
}

func (u *uxTestingImpl) SetTestSignal(signal *TestSignal) error {
	if err := u.db.Exec(`
		INSERT INTO ut_tests_signals (
			session_id, test_id, status, timestamp, duration
		) VALUES (
			$1, $2, $3, $4, 
		    CASE
        		WHEN $5 <= 0 THEN NULL
        		ELSE $5
    		END
		)`,
		signal.SessionID, signal.TestID, signal.Status, signal.Timestamp, signal.Duration,
	); err != nil {
		return err
	}
	return nil
}

type TaskSignal struct {
	SessionID uint64 `json:"sessionID"`
	TestID    int    `json:"testID"`
	TaskID    int    `json:"taskID"`
	Status    string `json:"status"`
	Answer    string `json:"answer"`
	Timestamp uint64 `json:"timestamp"`
	Duration  uint64 `json:"duration"`
}

func (u *uxTestingImpl) SetTaskSignal(signal *TaskSignal) error {
	if err := u.db.Exec(`
		INSERT INTO ut_tests_signals (
			session_id, test_id, task_id, status, comment, timestamp, duration
		) VALUES (
			$1, $2, $3, $4, NULLIF($5, ''), $6,
		    CASE
        		WHEN $7 <= 0 THEN NULL
        		ELSE $7
    		END
		)`,
		signal.SessionID, signal.TestID, signal.TaskID, signal.Status, signal.Answer, signal.Timestamp, signal.Duration,
	); err != nil {
		return err
	}
	return nil
}
