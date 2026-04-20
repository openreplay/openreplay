SELECT throwIf((SELECT openreplay_migration_state()) != 14, 'Previous step is not done') AS check;

ALTER TABLE experimental.sessions_l7d_mv
    MODIFY QUERY SELECT session_id,
                        project_id,
                        tracker_version,
                        rev_id,
                        user_uuid,
                        user_os,
                        user_os_version,
                        user_browser,
                        user_browser_version,
                        user_device,
                        user_device_type,
                        user_country,
                        user_city,
                        user_state,
                        platform,
                        datetime,
                        timezone,
                        duration,
                        pages_count,
                        events_count,
                        errors_count,
                        utm_source,
                        utm_medium,
                        utm_campaign,
                        user_id,
                        user_anonymous_id,
                        issue_types,
                        referrer,
                        base_referrer,
                        screen_width,
                        screen_height,
                        metadata_1,
                        metadata_2,
                        metadata_3,
                        metadata_4,
                        metadata_5,
                        metadata_6,
                        metadata_7,
                        metadata_8,
                        metadata_9,
                        metadata_10,
                        _timestamp
                 FROM experimental.sessions
                 WHERE datetime >= now() - INTERVAL 7 DAY
                   AND isNotNull(duration)
                   AND duration > 0;

CREATE OR REPLACE FUNCTION openreplay_migration_state AS() ->
    -1;