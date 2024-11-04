CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.20.0-ee';

CREATE TABLE IF NOT EXISTS experimental.resources
(
    session_id        UInt64,
    project_id        UInt16,
    datetime          DateTime,
    url               String,
    url_host          String MATERIALIZED lower(domain(url)),
    url_path          String,
    url_hostpath      String MATERIALIZED concat(url_host, url_path),
    type              Enum8('other'=-1, 'script'=0, 'stylesheet'=1, 'fetch'=2, 'img'=3, 'media'=4),
    name              Nullable(String) MATERIALIZED if(type = 'fetch', null,
                                                       coalesce(nullIf(splitByChar('/', url_path)[-1], ''),
                                                                nullIf(splitByChar('/', url_path)[-2], ''))),
    duration          Nullable(UInt16),
    ttfb              Nullable(UInt16),
    header_size       Nullable(UInt16),
    encoded_body_size Nullable(UInt32),
    decoded_body_size Nullable(UInt32),
    compression_ratio Nullable(Float32) MATERIALIZED divide(decoded_body_size, encoded_body_size),
    success           Nullable(UInt8) COMMENT 'currently available for type=img only',
    message_id        UInt64   DEFAULT 0,
    _timestamp        DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(datetime)
      ORDER BY (project_id, datetime, type, session_id, message_id)
      TTL datetime + INTERVAL 3 MONTH;

CREATE MATERIALIZED VIEW IF NOT EXISTS experimental.resources_l7d_mv
            ENGINE = ReplacingMergeTree(_timestamp)
                PARTITION BY toYYYYMMDD(datetime)
                ORDER BY (project_id, datetime, type, session_id, message_id)
                TTL datetime + INTERVAL 7 DAY
            POPULATE
AS
SELECT session_id,
       project_id,
       datetime,
       url,
       url_host,
       url_path,
       url_hostpath,
       type,
       name,
       duration,
       ttfb,
       header_size,
       encoded_body_size,
       decoded_body_size,
       compression_ratio,
       success,
       message_id,
       _timestamp
FROM experimental.resources
WHERE datetime >= now() - INTERVAL 7 DAY;