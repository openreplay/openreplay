CREATE TABLE sy_resources
(
    run_id                  UInt32,
    test_id                 UInt32,
    tenant_id               UInt32,
    name                    String,
    steps_count             UInt32,
    location                Enum8('local'=-2,'europe-west1-d'=-1,'us-east-2'=0, 'us-east-1'=1, 'us-west-1'=2, 'us-west-2'=3, 'af-south-1'=4, 'ap-east-1'=5, 'ap-south-1'=6, 'ap-northeast-3'=7, 'ap-northeast-2'=8, 'ap-southeast-1'=9, 'ap-southeast-2'=10, 'ap-northeast-1'=11, 'ca-central-1'=12, 'eu-central-1'=13, 'eu-west-1'=14, 'eu-west-2'=15, 'eu-south-1'=16, 'eu-west-3'=17, 'eu-north-1'=18, 'me-south-1'=19, 'sa-east-1'=20),
    state                   Enum8('passed'=0,'failed'=1),
    datetime                DateTime,
    browser                 String,
    device_type             Enum8('other'=0, 'desktop'=1, 'mobile'=2,'tablet'=3),
    device                  Nullable(String),

    start_time              UInt16,
    url                     String,
    url_host                Nullable(String) MATERIALIZED lower(domain(url)),
    url_hostpath            Nullable(String) MATERIALIZED concat(url_host, lower(path(url))),
    type                    Enum8('other'=-1, 'script'=0, 'stylesheet'=1, 'fetch'=2, 'img'=3, 'media'=4),
    duration                Nullable(UInt16),
    encoded_body_size       Nullable(UInt32),
    decoded_body_size       Nullable(UInt32),
    compression_ratio       Nullable(Float32) MATERIALIZED divide(decoded_body_size, encoded_body_size),
    failure_message         Nullable(String),
    secure_connection_start Nullable(UInt16),
    connect_start           UInt16,
    connect_end             UInt16,
    ssl_time                Nullable(UInt8) MATERIALIZED if(greater(secure_connection_start, 0),
                                                            minus(connect_end, secure_connection_start), NULL),
    tcp_time                Nullable(UInt8) MATERIALIZED minus(connect_end, connect_start),
    domain_lookup_start     UInt16,
    domain_lookup_end       UInt16,
    dns_time                Nullable(UInt8) MATERIALIZED minus(domain_lookup_end, domain_lookup_start),
    redirect_start          UInt16,
    redirect_end            UInt16,
    redirect_time           Nullable(UInt8) MATERIALIZED minus(redirect_end, redirect_start),
    request_start           UInt16,
    response_start          UInt16,
    response_end            UInt16,
    response_time           Nullable(UInt8) MATERIALIZED minus(response_end, response_start),
    ttfb                    Nullable(UInt8) MATERIALIZED minus(response_start, request_start),
    load_event_time         Nullable(UInt16) MATERIALIZED (coalesce(ssl_time, 0) + coalesce(ssl_time, 0) +
                                                           coalesce(dns_time, 0) + coalesce(redirect_time, 0) +
                                                           coalesce(response_time, 0) + coalesce(ttfb, 0))
) ENGINE = MergeTree
      PARTITION BY toDate(datetime)
      ORDER BY (test_id, run_id, datetime)
      TTL datetime + INTERVAL 1 MONTH;
