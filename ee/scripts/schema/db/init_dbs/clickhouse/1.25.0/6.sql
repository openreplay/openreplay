SELECT throwIf((SELECT openreplay_migration_state()) != 5, 'Previous step is not done') AS check;
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
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 6;
