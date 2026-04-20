CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_user_properties_grouped
(
    project_id    UInt16,
    user_id       String,
    property_name String,
    value         String COMMENT 'The property-value as a string',
    data_count    AggregateFunction(sum, UInt16) COMMENT 'The number of appearance during the past month',
    _timestamp    DateTime DEFAULT now()
) ENGINE = AggregatingMergeTree()
      ORDER BY (project_id, user_id, property_name, value)
      PARTITION BY toYYYYMM(_timestamp)
      TTL _timestamp + INTERVAL 1 MONTH;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_user_properties_grouped_mv
    TO product_analytics.autocomplete_user_properties_grouped AS
SELECT project_id,
       `$user_id`            AS user_id,
       a.1                   AS property_name,
       a.2                   AS value,
       sumState(toUInt16(1)) AS data_count
FROM product_analytics.users
         ARRAY JOIN JSONExtractKeysAndValues(toString(`properties`), 'String') AS a
WHERE length(a.1) > 0
  AND isNull(toFloat64OrNull(a.1))
GROUP BY ALL;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 18;
