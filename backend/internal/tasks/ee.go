package tasks

import "openreplay/backend/pkg/scheduler"

// eeJobs returns the crons that exist only in the enterprise edition. This community stub
// is overlaid by ee/backend/internal/tasks/ee.go in EE builds (see backend/build.sh); keep
// shared types in extensions.go.
func eeJobs(_ eeDeps) ([]scheduler.Job, error) {
	return nil, nil
}
