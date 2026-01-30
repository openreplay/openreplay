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

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_mv;
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

ALTER TABLE product_analytics.autocomplete_simple
    MODIFY COLUMN source Enum8('sessions'=0,'users'=1,'events'=2);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_events_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       t.3                   AS auto_captured,
       'events'              AS source,
       t.1                   AS name,
       toString(t.2)         AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM product_analytics.events
         ARRAY JOIN
     [--(name,column,auto-captured)
         ('$user_id', "$user_id", FALSE),
         ('$sdk_edition', "$sdk_edition", TRUE),
         ('$sdk_version', "$sdk_version", TRUE),
         ('$current_url', "$current_url", TRUE),
         ('$current_path', "$current_path", TRUE),
         ('$initial_referrer', "$initial_referrer", TRUE),
         ('$referring_domain', "$referring_domain", TRUE),
         ('$country', "$country", TRUE),
         ('$state', "$state", TRUE),
         ('$city', "$city", TRUE),
         ('$or_api_endpoint', "$or_api_endpoint", TRUE)
         ] AS t
WHERE isNotNull(t.2)
  AND notEmpty(toString(t.2))
GROUP BY ALL;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_users_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       t.3                   AS auto_captured,
       'users'               AS source,
       t.1                   AS name,
       toString(t.2)         AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM product_analytics.users
         ARRAY JOIN
     [--(name,column,auto-captured)
         ('$user_id', "$user_id", FALSE),
         ('$email', "$email", FALSE),
         ('$name', "$name", FALSE),
         ('$first_name', "$first_name", FALSE),
         ('$last_name', "$last_name", FALSE),
         ('$phone', "$phone", FALSE),
         ('$sdk_edition', "$sdk_edition", TRUE),
         ('$sdk_version', "$sdk_version", TRUE),
         ('$current_url', "$current_url", TRUE),
         ('$current_path', "$current_path", TRUE),
         ('$initial_referrer', "$initial_referrer", TRUE),
         ('$referring_domain', "$referring_domain", TRUE),
         ('initial_utm_source', initial_utm_source, TRUE),
         ('initial_utm_medium', initial_utm_medium, TRUE),
         ('initial_utm_campaign', initial_utm_campaign, TRUE),
         ('$country', "$country", TRUE),
         ('$state', "$state", TRUE),
         ('$city', "$city", TRUE),
         ('$or_api_endpoint', "$or_api_endpoint", TRUE)
         ] AS t
WHERE isNotNull(t.2)
  AND notEmpty(toString(t.2))
GROUP BY ALL;

ALTER TABLE product_analytics.all_events
    DROP COLUMN display_name,
    DROP COLUMN description,
    DROP COLUMN status,
    DROP COLUMN _edited_by_user;

ALTER TABLE product_analytics.all_properties
    DROP COLUMN display_name,
    DROP COLUMN description,
    DROP COLUMN status,
    DROP COLUMN _edited_by_user;

CREATE TABLE IF NOT EXISTS product_analytics.all_events_customized
(
    project_id    UInt16,
    auto_captured BOOL                   DEFAULT FALSE,
    event_name    String,
    display_name  String                 DEFAULT '',
    description   String                 DEFAULT '',
    status        LowCardinality(String) DEFAULT 'visible' COMMENT 'visible/hidden/dropped',

    created_at    DateTime64,
    _deleted_at   Nullable(DateTime64),
    _is_deleted   BOOL                   DEFAULT FALSE,
    _timestamp    DateTime               DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp, _is_deleted)
      ORDER BY (project_id, auto_captured, event_name);

CREATE TABLE IF NOT EXISTS product_analytics.all_properties_customized
(
    project_id    UInt16,
    source        Enum8('sessions'=0,'users'=1,'events'=2),
    property_name String,
    auto_captured BOOL,
    display_name  String                 DEFAULT '',
    description   String                 DEFAULT '',
    status        LowCardinality(String) DEFAULT 'visible' COMMENT 'visible/hidden/dropped',

    created_at    DateTime64,
    _deleted_at   Nullable(DateTime64),
    _is_deleted   BOOL                   DEFAULT FALSE,
    _timestamp    DateTime               DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp, _is_deleted)
      ORDER BY (project_id, source, property_name, auto_captured);

DROP TABLE IF EXISTS product_analytics.events_all_properties_extractor_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.events_all_properties_extractor_mv
    TO product_analytics.all_properties AS
SELECT project_id,
       'events'                    AS source,
       property_name,
       TRUE                        AS is_event_property,
       auto_captured_property      AS auto_captured,
       0                           AS data_count,
       0                           AS query_count,
       event_properties.created_at AS created_at
FROM product_analytics.event_properties;

DROP TABLE IF EXISTS product_analytics.users_all_properties_extractor_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.users_all_properties_extractor_mv
    TO product_analytics.all_properties AS
SELECT project_id,
       'users'                AS source,
       property_name,
       FALSE                  AS is_event_property,
       auto_captured_property AS auto_captured,
       0                      AS data_count,
       0                      AS query_count,
       _timestamp             AS created_at
FROM product_analytics.user_properties;

DROP TABLE IF EXISTS product_analytics.all_events_extractor_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.all_events_extractor_mv
    TO product_analytics.all_events AS
SELECT project_id,
       `$auto_captured` AS auto_captured,
       `$event_name`    AS event_name,
       created_at       AS created_at
FROM product_analytics.events
GROUP BY ALL;