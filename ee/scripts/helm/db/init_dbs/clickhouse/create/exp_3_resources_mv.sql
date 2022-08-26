CREATE MATERIALIZED VIEW IF NOT EXISTS experimental.resources_l7d_mv
            ENGINE = MergeTree
                PARTITION BY toYYYYMM(datetime)
                ORDER BY (project_id, datetime, type, session_id)
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
       _timestamp
FROM experimental.resources
WHERE datetime >= now() - INTERVAL 7 DAY;