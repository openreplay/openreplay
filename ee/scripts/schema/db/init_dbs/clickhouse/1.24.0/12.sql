SELECT throwIf((SELECT openreplay_migration_state()) != 11, 'Previous step is not done') AS check;
DROP TABLE IF EXISTS product_analytics.autocomplete_event_properties_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_event_dproperties_mv;

-- changes for events-autocomplete
DROP TABLE IF EXISTS product_analytics.autocomplete_events_grouped_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_events_grouped;

CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_events_grouped
(
    project_id UInt16,
    value      String COMMENT 'The $event_name',
    data_count AggregateFunction(sum, UInt16) COMMENT 'The number of appearance during the past month',
    _timestamp DateTime
) ENGINE = AggregatingMergeTree()
      ORDER BY (project_id, value)
      PARTITION BY toYYYYMM(_timestamp)
      TTL _timestamp + INTERVAL 1 MONTH;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_events_grouped_mv
    TO product_analytics.autocomplete_events_grouped AS
SELECT project_id,
       `$event_name`         AS value,
       sumState(toUInt16(1)) AS data_count
FROM product_analytics.events
WHERE value != ''
GROUP BY ALL;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 12;
