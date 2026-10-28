package tasks

import (
	"openreplay/backend/pkg/assist"
	"openreplay/backend/pkg/scheduler"
)

// eeJobs lists the crons that exist only in the enterprise edition. This file replaces
// backend/internal/tasks/ee.go in EE builds (backend/build.sh copies ee/backend/* over
// backend/); eeDeps is defined in backend/internal/tasks/extensions.go.
//
// To add a cron: implement scheduler.Job (Name, DefaultSchedule, Run; optionally
// RunTimeout) in a package under ee/backend/pkg, construct it from d and append it below.
// The scheduler then gives it the overlap guard, per-run timeout, metrics, health entry
// and the CRON_SCHEDULES / CRON_DISABLED overrides by name, exactly like "alerts".
// Never import an EE-only package from a file that also exists in backend/.
func eeJobs(d eeDeps) ([]scheduler.Job, error) {
	jobs := []scheduler.Job{
		// Replaces ee/api/crons/ee_crons.assist_events_aggregates_cron.
		assist.NewAggregatesJob(d.log, d.pg),
	}
	return jobs, nil
}
