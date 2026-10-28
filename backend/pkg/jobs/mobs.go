package jobs

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"openreplay/backend/pkg/storage"
)

const deletionTag = "to_delete_in_days"

// mobKeys lists every object a session's replay may be stored under: the keys written by
// the Go storage service (dom.mob, dom.mobs, dom.mobe, devtools.mob) and the flat legacy
// keys the Python API deleted (<sid>, <sid>e, <sid>devtools).
func mobKeys(sessionID int64) []string {
	sid := strconv.FormatInt(sessionID, 10)
	return []string{
		sid + storage.DOM,
		sid + storage.DOM + "s",
		sid + storage.DOM + "e",
		sid + storage.DEV,
		sid,
		sid + "e",
		sid + "devtools",
	}
}

// tagMobsForDeletion mirrors StorageClient.tag_for_deletion for every key of every
// session: existing objects get the lifecycle tag, missing ones are skipped. All keys are
// attempted; the first tagging error is returned so the job is marked failed like in Python.
func (j *jobsImpl) tagMobsForDeletion(ctx context.Context, sessionIDs []int64) error {
	if j.objStore == nil {
		return nil
	}
	var firstErr error
	tagged := 0
	for _, id := range sessionIDs {
		if err := ctx.Err(); err != nil {
			return err
		}
		for _, key := range mobKeys(id) {
			if !j.objStore.Exists(key) {
				continue
			}
			if err := j.objStore.Tag(key, deletionTag, j.deleteInDay); err != nil {
				j.log.Error(ctx, "failed to tag %s for deletion: %v", key, err)
				if firstErr == nil {
					firstErr = fmt.Errorf("tag %s: %w", key, err)
				}
				continue
			}
			tagged++
		}
	}
	j.log.Info(ctx, "tagged %d replay files of %d sessions for deletion", tagged, len(sessionIDs))
	if firstErr != nil {
		return errors.Join(firstErr)
	}
	return nil
}
