CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.25.0';

ALTER TABLE product_analytics.all_events
    ADD COLUMN status LowCardinality(String) DEFAULT 'visible' COMMENT 'visible/hidden/dropped' AFTER description;


DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_browser_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_browser_version_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_country_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_state_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_city_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_device_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_rev_id_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_referrer_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_utm_source_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_utm_medium_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_utm_campaign_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_id_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_anonymous_id_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_1_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_2_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_3_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_4_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_5_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_6_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_7_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_8_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_9_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_10_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_simple_mv;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_mv
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

ALTER TABLE product_analytics.autocomplete_events_grouped
    MODIFY COLUMN _timestamp DateTime DEFAULT now();

ALTER TABLE product_analytics.users_distinct_id
    MODIFY TTL _deleted_at WHERE _deleted_at != '1970-01-01 00:00:00';

DROP TABLE IF EXISTS experimental.autocomplete;