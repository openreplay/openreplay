CREATE TABLE IF NOT EXISTS experimental.resources
(
    session_id                          UInt64,
    project_id                          UInt16,
    datetime                            DateTime,
    url                                 String,
    url_host                            String MATERIALIZED lower(domain(url)),
    url_path                            String MATERIALIZED lower(path(url)),
    url_hostpath                        String MATERIALIZED concat(url_host, url_path),
    type Enum8('other'=-1, 'script'=0, 'stylesheet'=1, 'fetch'=2, 'img'=3, 'media'=4),
    name Nullable(String)               MATERIALIZED if(type = 'fetch', null,
                                                        coalesce(nullIf(splitByChar('/', url_path)[-1], ''),
                                                                 nullIf(splitByChar('/', url_path)[-2], ''))),
    duration Nullable(UInt16),
    ttfb Nullable(UInt16),
    header_size Nullable(UInt16),
    encoded_body_size Nullable(UInt32),
    decoded_body_size Nullable(UInt32),
    compression_ratio Nullable(Float32) MATERIALIZED divide(decoded_body_size, encoded_body_size),
    success Nullable(UInt8) COMMENT 'currently available for type=img only',
    _timestamp                          DateTime DEFAULT now()
) ENGINE = MergeTree
      PARTITION BY toYYYYMM(datetime)
      ORDER BY (project_id, datetime, type, session_id)
      TTL datetime + INTERVAL 3 MONTH;