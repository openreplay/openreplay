CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.15.0-ee';

ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS transfer_size Nullable(UInt32);

ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS selector Nullable(String);

ALTER TABLE experimental.events
    ADD COLUMN IF NOT EXISTS coordinate Tuple(x Nullable(UInt16), y Nullable(UInt16));

ALTER TABLE experimental.sessions
    ADD COLUMN IF NOT EXISTS timezone LowCardinality(Nullable(String));


CREATE TABLE IF NOT EXISTS experimental.ios_events
(
    session_id                    UInt64,
    project_id                    UInt16,
    event_type Enum8('TAP'=0, 'INPUT'=1, 'SWIPE'=2, 'VIEW'=3,'REQUEST'=4,'CRASH'=5,'CUSTOM'=6, 'STATEACTION'=8, 'ISSUE'=9),
    datetime                      DateTime,
    label Nullable(String),
    name Nullable(String),
    payload Nullable(String),
    level Nullable(Enum8('info'=0, 'error'=1)) DEFAULT if(event_type == 'CUSTOM', 'info', null),
    context Nullable(Enum8('unknown'=0, 'self'=1, 'same-origin-ancestor'=2, 'same-origin-descendant'=3, 'same-origin'=4, 'cross-origin-ancestor'=5, 'cross-origin-descendant'=6, 'cross-origin-unreachable'=7, 'multiple-contexts'=8)),
    url Nullable(String),
    url_host Nullable(String)     MATERIALIZED lower(domain(url)),
    url_path Nullable(String)     MATERIALIZED lower(pathFull(url)),
    url_hostpath Nullable(String) MATERIALIZED concat(url_host, url_path),
    request_start Nullable(UInt16),
    response_start Nullable(UInt16),
    response_end Nullable(UInt16),
    method Nullable(Enum8('GET' = 0, 'HEAD' = 1, 'POST' = 2, 'PUT' = 3, 'DELETE' = 4, 'CONNECT' = 5, 'OPTIONS' = 6, 'TRACE' = 7, 'PATCH' = 8)),
    status Nullable(UInt16),
    duration Nullable(UInt16),
    success Nullable(UInt8),
    request_body Nullable(String),
    response_body Nullable(String),
    issue_type Nullable(Enum8('tap_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19,'mouse_thrashing'=20,'app_crash'=21)),
    issue_id Nullable(String),
    transfer_size Nullable(UInt32),
    coordinate Tuple(x Nullable(UInt16), y Nullable(UInt16)),
    direction Nullable(String),
    reason Nullable(String),
    stacktrace Nullable(String),
    message_id                    UInt64       DEFAULT 0,
    _timestamp                    DateTime     DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(datetime)
      ORDER BY (project_id, datetime, event_type, session_id, message_id)
      TTL datetime + INTERVAL 3 MONTH;