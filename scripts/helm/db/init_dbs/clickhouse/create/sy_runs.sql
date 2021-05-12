CREATE TABLE sy_runs
(
    run_id                     UInt32,
    test_id                    UInt32,
    tenant_id                  UInt32,
    name                       String,
    steps_count                UInt32,
    location                   Enum8('local'=-2,'europe-west1-d'=-1,'us-east-2'=0, 'us-east-1'=1, 'us-west-1'=2, 'us-west-2'=3, 'af-south-1'=4, 'ap-east-1'=5, 'ap-south-1'=6, 'ap-northeast-3'=7, 'ap-northeast-2'=8, 'ap-southeast-1'=9, 'ap-southeast-2'=10, 'ap-northeast-1'=11, 'ca-central-1'=12, 'eu-central-1'=13, 'eu-west-1'=14, 'eu-west-2'=15, 'eu-south-1'=16, 'eu-west-3'=17, 'eu-north-1'=18, 'me-south-1'=19, 'sa-east-1'=20),
    state                      Enum8('passed'=0,'failed'=1),
    failure_message            Nullable(String),
    datetime                   DateTime,
    browser                    String,
    device_type                Enum8('other'=0, 'desktop'=1, 'mobile'=2,'tablet'=3),
    duration                   UInt32,
    device                     Nullable(String),
    speed_index                Nullable(UInt32),
    first_contentful_paint     Nullable(UInt32),
    time_to_interactive        Nullable(UInt32),


    cpu_script_evaluation      UInt16,
    cpu_style_layout           UInt16,
    cpu_paint_composite_render UInt16,
    cpu_garbage_collection     UInt16,
    cpu_parse_HTML             UInt16,
    cpu_script_parse_compile   UInt16,
    cpu_other                  UInt16,
    cpu_time                   UInt32,
    cpu_score                  UInt8,
    js_heap_used_size          Float32
) ENGINE = MergeTree
      PARTITION BY toDate(datetime)
      ORDER BY (test_id, run_id, datetime)
      TTL datetime + INTERVAL 1 MONTH;