ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS error_tags_keys Array(String);
ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS error_tags_values Array(Nullable(String));

ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS issue_type Nullable(Enum8('click_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19));
ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS issue_id Nullable(String);
ALTER TABLE experimental.events
    MODIFY COLUMN event_type Enum8('CLICK'=0, 'INPUT'=1, 'LOCATION'=2,'REQUEST'=3,'PERFORMANCE'=4,'ERROR'=5,'CUSTOM'=6, 'GRAPHQL'=7, 'STATEACTION'=8, 'ISSUE'=9);


CREATE TABLE IF NOT EXISTS experimental.issues
(
    project_id     UInt16,
    issue_id       String,
    type Enum8('click_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19),
    context_string String,
    context_keys Array(String),
    context_values Array(Nullable(String)),
    _timestamp     DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, issue_id, type)
      TTL _timestamp + INTERVAL 3 MONTH;

CREATE MATERIALIZED VIEW IF NOT EXISTS experimental.js_errors_sessions_mv
            ENGINE = ReplacingMergeTree(_timestamp)
                PARTITION BY toYYYYMM(datetime)
                ORDER BY (project_id, datetime, event_type, error_id, session_id)
                TTL _timestamp + INTERVAL 35 DAY
            POPULATE
AS
SELECT session_id,
       project_id,
       events.datetime         AS datetime,
       event_type,
       assumeNotNull(error_id) AS error_id,
       source,
       name,
       message,
       error_tags_keys,
       error_tags_values,
       message_id,
       user_browser,
       user_browser_version,
       user_os,
       user_os_version,
       user_device_type,
       user_device,
       user_country,
       _timestamp
FROM experimental.events
         INNER JOIN experimental.sessions USING (session_id)
WHERE event_type = 'ERROR'
  AND source = 'js_exception';

-- TODO: find a way to update materialized views; or drop and re-create them
