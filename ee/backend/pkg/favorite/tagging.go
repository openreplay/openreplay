package favorite

import (
	"context"
	"fmt"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/objectstorage"
)

func getMobFileNames(sessionID uint64) []string {
	return []string{
		fmt.Sprintf("%d/dom.mobs", sessionID),
		fmt.Sprintf("%d/dom.mobe", sessionID),
		fmt.Sprintf("%d/devtools.mob", sessionID),
	}
}

func setTags(objStorage objectstorage.ObjectStorage, sessionID uint64, toDelete bool) {
	if objStorage == nil {
		return
	}
	var tagValue string
	if toDelete {
		tagValue = env.StringDefault("RETENTION_D_VALUE", "default")
	} else {
		tagValue = env.StringDefault("RETENTION_L_VALUE", "vault")
	}
	for _, fileName := range getMobFileNames(sessionID) {
		if err := objStorage.Tag(fileName, "retention", tagValue); err != nil {
			fmt.Printf("Error tagging file %s with value %s: %s\n", fileName, tagValue, err)
		}
	}
}

func (f *favoritesImpl) updateClickHouseVault(projectID uint32, sessionID uint64, isVault bool) error {
	ctx := context.Background()

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
		return fmt.Errorf("failed to update sessions is_vault: %w", err)
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
		return fmt.Errorf("failed to update events is_vault: %w", err)
	}

	return nil
}
