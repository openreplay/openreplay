package favorite

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/aws/aws-sdk-go/aws/awserr"

	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/objectstorage"
)

const (
	vaultAttemptTimeout = 120 * time.Second
	vaultAttempts       = 3
	vaultBackoff        = 2 * time.Second
	vaultMaxJobs        = 8
	vaultStopTimeout    = 30 * time.Second
)

var (
	vaultQueue = newCoalescer()
	vaultSem   = make(chan struct{}, vaultMaxJobs)
	vaultOnce  sync.Once

	vaultCtx, vaultCancel = context.WithCancel(context.Background())
)

func getMobFileNames(sessionID uint64) []string {
	return []string{
		fmt.Sprintf("%d/dom.mobs", sessionID),
		fmt.Sprintf("%d/dom.mobe", sessionID),
		fmt.Sprintf("%d/devtools.mob", sessionID),
	}
}

func isNotFound(err error) bool {
	var awsErr awserr.Error
	if errors.As(err, &awsErr) {
		return awsErr.Code() == "NoSuchKey" || awsErr.Code() == "NotFound"
	}
	var respErr *azcore.ResponseError
	return errors.As(err, &respErr) && respErr.ErrorCode == "BlobNotFound"
}

func tagFile(ctx context.Context, objStorage objectstorage.ObjectStorage, fileName, tagValue string) error {
	done := make(chan error, 1)
	go func() {
		done <- objStorage.Tag(fileName, "retention", tagValue)
	}()
	select {
	case err := <-done:
		return err
	case <-ctx.Done():
		return ctx.Err()
	}
}

func setTags(ctx context.Context, objStorage objectstorage.ObjectStorage, sessionID uint64, isVault bool) error {
	if objStorage == nil {
		return nil
	}
	var tagValue string
	if isVault {
		tagValue = env.StringDefault("RETENTION_L_VALUE", "vault")
	} else {
		tagValue = env.StringDefault("RETENTION_D_VALUE", "default")
	}
	var firstErr error
	for _, fileName := range getMobFileNames(sessionID) {
		if err := ctx.Err(); err != nil {
			return err
		}
		if err := tagFile(ctx, objStorage, fileName, tagValue); err != nil && !isNotFound(err) && firstErr == nil {
			firstErr = fmt.Errorf("can't tag file %s with value %s: %s", fileName, tagValue, err)
		}
	}
	return firstErr
}

func retry(ctx context.Context, attempts int, backoff, attemptTimeout time.Duration, fn func(context.Context) error, onFail func(attempt int, err error)) error {
	var err error
	for attempt := 1; attempt <= attempts; attempt++ {
		attemptCtx, cancel := context.WithTimeout(ctx, attemptTimeout)
		err = fn(attemptCtx)
		cancel()
		if err == nil {
			return nil
		}
		onFail(attempt, err)
		if attempt == attempts {
			break
		}
		select {
		case <-ctx.Done():
			return err
		case <-time.After(backoff * time.Duration(attempt)):
		}
	}
	return err
}

func acquire(ctx context.Context, sem chan struct{}) bool {
	select {
	case sem <- struct{}{}:
		return true
	case <-ctx.Done():
		return false
	}
}

func release(sem chan struct{}) {
	<-sem
}

type coalescer struct {
	mu      sync.Mutex
	running map[string]bool
	wg      sync.WaitGroup
	onPanic func(key string, r interface{})
}

func newCoalescer() *coalescer {
	return &coalescer{running: make(map[string]bool)}
}

func (c *coalescer) call(key string, apply func()) {
	defer func() {
		if r := recover(); r != nil && c.onPanic != nil {
			c.onPanic(key, r)
		}
	}()
	apply()
}

func (c *coalescer) submit(key string, apply func()) {
	c.mu.Lock()
	if _, ok := c.running[key]; ok {
		c.running[key] = true
		c.mu.Unlock()
		return
	}
	c.running[key] = false
	c.wg.Add(1)
	c.mu.Unlock()
	go func() {
		defer c.wg.Done()
		for {
			c.call(key, apply)
			c.mu.Lock()
			if !c.running[key] {
				delete(c.running, key)
				c.mu.Unlock()
				return
			}
			c.running[key] = false
			c.mu.Unlock()
		}
	}()
}

func (c *coalescer) wait(ctx context.Context) error {
	done := make(chan struct{})
	go func() {
		c.wg.Wait()
		close(done)
	}()
	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (f *favoritesImpl) Run() {}

func (f *favoritesImpl) Stop() {
	ctx, cancel := context.WithTimeout(context.Background(), vaultStopTimeout)
	defer cancel()
	if err := f.Wait(ctx); err != nil {
		f.log.Error(ctx, "vault sync still in flight on shutdown: %s", err)
		vaultCancel()
	}
}

func (f *favoritesImpl) Wait(ctx context.Context) error {
	return vaultQueue.wait(ctx)
}

func (f *favoritesImpl) isFavorite(sessionID uint64) (bool, error) {
	var exists bool
	sql := `SELECT EXISTS(SELECT 1 FROM public.user_favorite_sessions WHERE session_id = $1);`
	if err := f.conn.QueryRow(sql, sessionID).Scan(&exists); err != nil {
		return false, fmt.Errorf("can't read favorite state: %s", err)
	}
	return exists, nil
}

func (f *favoritesImpl) syncVault(projectID uint32, sessionID uint64) {
	vaultOnce.Do(func() {
		vaultQueue.onPanic = func(key string, r interface{}) {
			f.log.Error(context.Background(), "vault sync panicked for %s: %v", key, r)
		}
	})
	key := fmt.Sprintf("%d/%d", projectID, sessionID)
	vaultQueue.submit(key, func() {
		f.runVaultSync(projectID, sessionID)
	})
}

func (f *favoritesImpl) runVaultSync(projectID uint32, sessionID uint64) {
	ctx := vaultCtx
	if !acquire(ctx, vaultSem) {
		f.log.Error(ctx, "vault sync aborted for session %d: %s", sessionID, ctx.Err())
		return
	}
	defer release(vaultSem)

	var isVault bool
	err := retry(ctx, vaultAttempts, vaultBackoff, vaultAttemptTimeout, func(context.Context) error {
		var err error
		isVault, err = f.isFavorite(sessionID)
		return err
	}, func(attempt int, err error) {
		f.log.Error(ctx, "favorite state read attempt %d/%d failed for session %d: %s", attempt, vaultAttempts, sessionID, err)
	})
	if err != nil {
		isVault = true
		f.log.Error(ctx, "vault sync can't read state for session %d, defaulting to vault: %s", sessionID, err)
	}

	err = retry(ctx, vaultAttempts, vaultBackoff, vaultAttemptTimeout, func(attemptCtx context.Context) error {
		return f.updateVaultStatus(attemptCtx, projectID, sessionID, isVault)
	}, func(attempt int, err error) {
		f.log.Error(ctx, "vault copy attempt %d/%d failed for session %d (vault=%t): %s", attempt, vaultAttempts, sessionID, isVault, err)
	})
	if err != nil {
		f.log.Error(ctx, "vault copy gave up for session %d (vault=%t): %s", sessionID, isVault, err)
	}

	err = retry(ctx, vaultAttempts, vaultBackoff, vaultAttemptTimeout, func(attemptCtx context.Context) error {
		return setTags(attemptCtx, f.objStorage, sessionID, isVault)
	}, func(attempt int, err error) {
		f.log.Error(ctx, "vault tagging attempt %d/%d failed for session %d (vault=%t): %s", attempt, vaultAttempts, sessionID, isVault, err)
	})
	if err != nil {
		f.log.Error(ctx, "vault tagging gave up for session %d (vault=%t): %s", sessionID, isVault, err)
	}
}

func (f *favoritesImpl) updateVaultStatus(ctx context.Context, projectID uint32, sessionID uint64, isVault bool) error {
	sessionsQuery := `
		INSERT INTO experimental.sessions (
			session_id, project_id, tracker_version, rev_id, user_uuid, 
			user_os, user_os_version, user_browser, user_browser_version, user_device, 
			user_device_type, user_country, user_city, user_state, platform, 
			datetime, timezone, duration, pages_count, events_count, errors_count, 
			utm_source, utm_medium, utm_campaign, user_id, user_anonymous_id, 
			issue_types, referrer, screen_width, screen_height, 
			metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, 
			metadata_6, metadata_7, metadata_8, metadata_9, metadata_10, 
			is_vault
		)
		SELECT 
			session_id, project_id, tracker_version, rev_id, user_uuid, 
			user_os, user_os_version, user_browser, user_browser_version, user_device, 
			user_device_type, user_country, user_city, user_state, platform, 
			datetime, timezone, duration, pages_count, events_count, errors_count, 
			utm_source, utm_medium, utm_campaign, user_id, user_anonymous_id, 
			issue_types, referrer, screen_width, screen_height, 
			metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, 
			metadata_6, metadata_7, metadata_8, metadata_9, metadata_10, 
			? as is_vault
		FROM experimental.sessions
		WHERE project_id = ? AND session_id = ?
	`
	if err := f.chConn.Exec(ctx, sessionsQuery, isVault, projectID, sessionID); err != nil {
		return fmt.Errorf("failed to update sessions is_vault: %s", err)
	}

	eventsQuery := `
		INSERT INTO product_analytics.events (
			project_id, event_id, "$event_name", created_at, distinct_id, 
			"$user_id", "$device_id", session_id, "$time", "$source", "$duration_s", 
			properties, "$properties", description, 
			group_id1, group_id2, group_id3, group_id4, group_id5, group_id6, 
			"$auto_captured", "$sdk_edition", "$sdk_version", 
			"$os", "$os_version", "$browser", "$browser_version", "$device", 
			"$screen_height", "$screen_width", "$current_url", 
			"$initial_referrer", "$referring_domain", "$referrer", "$initial_referring_domain", 
			"$search_engine", "$search_engine_keyword", 
			"utm_source", "utm_medium", "utm_campaign", 
			"$country", "$state", "$city", "$or_api_endpoint", "$timezone", 
			issue_type, issue_id, error_id, 
			is_vault, "$tags", "$import"
		)
		SELECT 
			project_id, event_id, "$event_name", created_at, distinct_id, 
			"$user_id", "$device_id", session_id, "$time", "$source", "$duration_s", 
			properties, "$properties", description, 
			group_id1, group_id2, group_id3, group_id4, group_id5, group_id6, 
			"$auto_captured", "$sdk_edition", "$sdk_version", 
			"$os", "$os_version", "$browser", "$browser_version", "$device", 
			"$screen_height", "$screen_width", "$current_url", 
			"$initial_referrer", "$referring_domain", "$referrer", "$initial_referring_domain", 
			"$search_engine", "$search_engine_keyword", 
			"utm_source", "utm_medium", "utm_campaign", 
			"$country", "$state", "$city", "$or_api_endpoint", "$timezone", 
			issue_type, issue_id, error_id, 
			? as is_vault, "$tags", "$import"
		FROM product_analytics.events
		WHERE project_id = ? AND session_id = ?
	`
	if err := f.chConn.Exec(ctx, eventsQuery, isVault, projectID, sessionID); err != nil {
		return fmt.Errorf("failed to update events is_vault: %s", err)
	}

	return nil
}
