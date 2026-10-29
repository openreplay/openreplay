SELECT throwIf((SELECT openreplay_migration_state()) != 3, 'Previous step is not done') AS check;
ALTER TABLE experimental.sessions
    ADD INDEX IF NOT EXISTS user_id_idx (user_id) TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE product_analytics.events
    ADD INDEX IF NOT EXISTS user_id_idx ("$user_id") TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE product_analytics.events
    ADD INDEX IF NOT EXISTS devise_id_idx ("$device_id") TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE product_analytics.users_distinct_id
    ADD INDEX IF NOT EXISTS user_id_idx ("$user_id") TYPE bloom_filter(0.01) GRANULARITY 4;

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_sessions_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_sessions_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       t.3                   AS auto_captured,
       'sessions'            AS source,
       t.1                   AS name,
       toString(t.2)         AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
         ARRAY JOIN
     [--(name,column,auto-captured)
         ('user_browser', user_browser, TRUE),
         ('user_browser_version', user_browser_version, TRUE),
         ('user_country', user_country, TRUE),
         ('user_state', user_state, TRUE),
         ('user_city', user_city, TRUE),
         ('user_device', user_device, TRUE),
         ('user_os', user_os, TRUE),
         ('rev_id', rev_id, TRUE),
         ('referrer', referrer, TRUE),
         ('utm_source', utm_source, TRUE),
         ('utm_medium', utm_medium, TRUE),
         ('utm_campaign', utm_campaign, TRUE),
         ('user_id', user_id, FALSE),
         ('user_anonymous_id', user_anonymous_id, FALSE),
         ('metadata_1', metadata_1, FALSE),
         ('metadata_2', metadata_2, FALSE),
         ('metadata_3', metadata_3, FALSE),
         ('metadata_4', metadata_4, FALSE),
         ('metadata_5', metadata_5, FALSE),
         ('metadata_6', metadata_6, FALSE),
         ('metadata_7', metadata_7, FALSE),
         ('metadata_8', metadata_8, FALSE),
         ('metadata_9', metadata_9, FALSE),
         ('metadata_10', metadata_10, FALSE)
         ] AS t
WHERE isNotNull(t.2)
  AND notEmpty(toString(t.2))
GROUP BY ALL;

CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> (-1);
