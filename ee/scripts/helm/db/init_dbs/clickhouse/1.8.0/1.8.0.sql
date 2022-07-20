ALTER TABLE sessions
    DROP COLUMN pages_count;


CREATE TABLE projects_metadata
(
    project_id UInt16,
    metadata_1 Nullable(String),
    metadata_2 Nullable(String),
    metadata_3 Nullable(String),
    metadata_4 Nullable(String),
    metadata_5 Nullable(String),
    metadata_6 Nullable(String),
    metadata_7 Nullable(String),
    metadata_8 Nullable(String),
    metadata_9 Nullable(String),
    metadata_10 Nullable(String),
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id)
      SETTINGS index_granularity = 512;

CREATE TABLE IF NOT EXISTS events_s
(
    session_id                                     UInt64,
    project_id                                     UInt16,
    event_type Enum8('CLICK'=0, 'INPUT'=1, 'PAGE'=2,'RESOURCE'=3,'REQUEST'=4,'PERFORMANCE'=5,'LONGTASK'=6,'ERROR'=7,'CUSTOM'=8, 'GRAPHQL'=9, 'STATEACTION'=10),
    datetime                                       DateTime,
    label Nullable(String),
    hesitation_time Nullable(UInt32),
    name Nullable(String),
    payload Nullable(String),
    level Nullable(Enum8('info'=0, 'error'=1))              DEFAULT if(event_type == 'CUSTOM', 'info', null),
    source Nullable(Enum8('js_exception'=0, 'bugsnag'=1, 'cloudwatch'=2, 'datadog'=3, 'elasticsearch'=4, 'newrelic'=5, 'rollbar'=6, 'sentry'=7, 'stackdriver'=8, 'sumologic'=9)),
    message Nullable(String),
    error_id Nullable(String),
    duration Nullable(UInt16),
    context Nullable(Enum8('unknown'=0, 'self'=1, 'same-origin-ancestor'=2, 'same-origin-descendant'=3, 'same-origin'=4, 'cross-origin-ancestor'=5, 'cross-origin-descendant'=6, 'cross-origin-unreachable'=7, 'multiple-contexts'=8)),
    container_type Nullable(Enum8('window'=0, 'iframe'=1, 'embed'=2, 'object'=3)),
    container_id Nullable(String),
    container_name Nullable(String),
    container_src Nullable(String),
    url Nullable(String),
    url_host Nullable(String)                      MATERIALIZED lower(domain(url)),
    url_path Nullable(String)                      MATERIALIZED lower(pathFull(url)),
    request_start Nullable(UInt16),
    response_start Nullable(UInt16),
    response_end Nullable(UInt16),
    dom_content_loaded_event_start Nullable(UInt16),
    dom_content_loaded_event_end Nullable(UInt16),
    load_event_start Nullable(UInt16),
    load_event_end Nullable(UInt16),
    first_paint Nullable(UInt16),
    first_contentful_paint Nullable(UInt16),
    speed_index Nullable(UInt16),
    visually_complete Nullable(UInt16),
    time_to_interactive Nullable(UInt16),
    ttfb Nullable(UInt16)                          MATERIALIZED if(greaterOrEquals(response_start, request_start),
                                                                   minus(response_start, request_start), Null),
    ttlb Nullable(UInt16)                          MATERIALIZED if(greaterOrEquals(response_end, request_start),
                                                                   minus(response_end, request_start), Null),
    response_time Nullable(UInt16)                 MATERIALIZED if(greaterOrEquals(response_end, response_start),
                                                                   minus(response_end, response_start), Null),
    dom_building_time Nullable(UInt16)             MATERIALIZED if(
            greaterOrEquals(dom_content_loaded_event_start, response_end),
            minus(dom_content_loaded_event_start, response_end), Null),
    dom_content_loaded_event_time Nullable(UInt16) MATERIALIZED if(
            greaterOrEquals(dom_content_loaded_event_end, dom_content_loaded_event_start),
            minus(dom_content_loaded_event_end, dom_content_loaded_event_start), Null),
    load_event_time Nullable(UInt16)               MATERIALIZED if(greaterOrEquals(load_event_end, load_event_start),
                                                                   minus(load_event_end, load_event_start), Null),
    min_fps Nullable(UInt8),
    avg_fps Nullable(UInt8),
    max_fps Nullable(UInt8),
    min_cpu Nullable(UInt8),
    avg_cpu Nullable(UInt8),
    max_cpu Nullable(UInt8),
    min_total_js_heap_size Nullable(UInt64),
    avg_total_js_heap_size Nullable(UInt64),
    max_total_js_heap_size Nullable(UInt64),
    min_used_js_heap_size Nullable(UInt64),
    avg_used_js_heap_size Nullable(UInt64),
    max_used_js_heap_size Nullable(UInt64),
    type Nullable(Enum8('other'=-1, 'script'=0, 'stylesheet'=1, 'fetch'=2, 'img'=3, 'media'=4)),
    header_size Nullable(UInt16),
    encoded_body_size Nullable(UInt32),
    decoded_body_size Nullable(UInt32),
    compression_ratio Nullable(Float32)            MATERIALIZED divide(decoded_body_size, encoded_body_size),
    success Nullable(UInt8),
    method Nullable(Enum8('GET' = 0, 'HEAD' = 1, 'POST' = 2, 'PUT' = 3, 'DELETE' = 4, 'CONNECT' = 5, 'OPTIONS' = 6, 'TRACE' = 7, 'PATCH' = 8)),
    status Nullable(UInt16),
    request_body Nullable(String),
    response_body Nullable(String),
    _timestamp                                     DateTime DEFAULT now()
) ENGINE = MergeTree
      PARTITION BY toYYYYMM(datetime)
      ORDER BY (project_id, datetime, event_type, session_id)
      TTL datetime + INTERVAL 1 MONTH;

CREATE TABLE IF NOT EXISTS sessions
(
    session_id   UInt64,
    project_id   UInt16,
    tracker_version LowCardinality(String),
    rev_id LowCardinality(Nullable(String)),
    user_uuid    UUID,
    user_os LowCardinality(String),
    user_os_version LowCardinality(Nullable(String)),
    user_browser LowCardinality(String),
    user_browser_version LowCardinality(Nullable(String)),
    user_device Nullable(String),
    user_device_type Enum8('other'=0, 'desktop'=1, 'mobile'=2),
    user_country Enum8('UN'=-128, 'RW'=-127, 'SO'=-126, 'YE'=-125, 'IQ'=-124, 'SA'=-123, 'IR'=-122, 'CY'=-121, 'TZ'=-120, 'SY'=-119, 'AM'=-118, 'KE'=-117, 'CD'=-116, 'DJ'=-115, 'UG'=-114, 'CF'=-113, 'SC'=-112, 'JO'=-111, 'LB'=-110, 'KW'=-109, 'OM'=-108, 'QA'=-107, 'BH'=-106, 'AE'=-105, 'IL'=-104, 'TR'=-103, 'ET'=-102, 'ER'=-101, 'EG'=-100, 'SD'=-99, 'GR'=-98, 'BI'=-97, 'EE'=-96, 'LV'=-95, 'AZ'=-94, 'LT'=-93, 'SJ'=-92, 'GE'=-91, 'MD'=-90, 'BY'=-89, 'FI'=-88, 'AX'=-87, 'UA'=-86, 'MK'=-85, 'HU'=-84, 'BG'=-83, 'AL'=-82, 'PL'=-81, 'RO'=-80, 'XK'=-79, 'ZW'=-78, 'ZM'=-77, 'KM'=-76, 'MW'=-75, 'LS'=-74, 'BW'=-73, 'MU'=-72, 'SZ'=-71, 'RE'=-70, 'ZA'=-69, 'YT'=-68, 'MZ'=-67, 'MG'=-66, 'AF'=-65, 'PK'=-64, 'BD'=-63, 'TM'=-62, 'TJ'=-61, 'LK'=-60, 'BT'=-59, 'IN'=-58, 'MV'=-57, 'IO'=-56, 'NP'=-55, 'MM'=-54, 'UZ'=-53, 'KZ'=-52, 'KG'=-51, 'TF'=-50, 'HM'=-49, 'CC'=-48, 'PW'=-47, 'VN'=-46, 'TH'=-45, 'ID'=-44, 'LA'=-43, 'TW'=-42, 'PH'=-41, 'MY'=-40, 'CN'=-39, 'HK'=-38, 'BN'=-37, 'MO'=-36, 'KH'=-35, 'KR'=-34, 'JP'=-33, 'KP'=-32, 'SG'=-31, 'CK'=-30, 'TL'=-29, 'RU'=-28, 'MN'=-27, 'AU'=-26, 'CX'=-25, 'MH'=-24, 'FM'=-23, 'PG'=-22, 'SB'=-21, 'TV'=-20, 'NR'=-19, 'VU'=-18, 'NC'=-17, 'NF'=-16, 'NZ'=-15, 'FJ'=-14, 'LY'=-13, 'CM'=-12, 'SN'=-11, 'CG'=-10, 'PT'=-9, 'LR'=-8, 'CI'=-7, 'GH'=-6, 'GQ'=-5, 'NG'=-4, 'BF'=-3, 'TG'=-2, 'GW'=-1, 'MR'=0, 'BJ'=1, 'GA'=2, 'SL'=3, 'ST'=4, 'GI'=5, 'GM'=6, 'GN'=7, 'TD'=8, 'NE'=9, 'ML'=10, 'EH'=11, 'TN'=12, 'ES'=13, 'MA'=14, 'MT'=15, 'DZ'=16, 'FO'=17, 'DK'=18, 'IS'=19, 'GB'=20, 'CH'=21, 'SE'=22, 'NL'=23, 'AT'=24, 'BE'=25, 'DE'=26, 'LU'=27, 'IE'=28, 'MC'=29, 'FR'=30, 'AD'=31, 'LI'=32, 'JE'=33, 'IM'=34, 'GG'=35, 'SK'=36, 'CZ'=37, 'NO'=38, 'VA'=39, 'SM'=40, 'IT'=41, 'SI'=42, 'ME'=43, 'HR'=44, 'BA'=45, 'AO'=46, 'NA'=47, 'SH'=48, 'BV'=49, 'BB'=50, 'CV'=51, 'GY'=52, 'GF'=53, 'SR'=54, 'PM'=55, 'GL'=56, 'PY'=57, 'UY'=58, 'BR'=59, 'FK'=60, 'GS'=61, 'JM'=62, 'DO'=63, 'CU'=64, 'MQ'=65, 'BS'=66, 'BM'=67, 'AI'=68, 'TT'=69, 'KN'=70, 'DM'=71, 'AG'=72, 'LC'=73, 'TC'=74, 'AW'=75, 'VG'=76, 'VC'=77, 'MS'=78, 'MF'=79, 'BL'=80, 'GP'=81, 'GD'=82, 'KY'=83, 'BZ'=84, 'SV'=85, 'GT'=86, 'HN'=87, 'NI'=88, 'CR'=89, 'VE'=90, 'EC'=91, 'CO'=92, 'PA'=93, 'HT'=94, 'AR'=95, 'CL'=96, 'BO'=97, 'PE'=98, 'MX'=99, 'PF'=100, 'PN'=101, 'KI'=102, 'TK'=103, 'TO'=104, 'WF'=105, 'WS'=106, 'NU'=107, 'MP'=108, 'GU'=109, 'PR'=110, 'VI'=111, 'UM'=112, 'AS'=113, 'CA'=114, 'US'=115, 'PS'=116, 'RS'=117, 'AQ'=118, 'SX'=119, 'CW'=120, 'BQ'=121, 'SS'=122),
    datetime     DateTime,
    duration     UInt32,
    pages_count  UInt16,
    events_count UInt16,
    errors_count UInt16,
    utm_source Nullable(String),
    utm_medium Nullable(String),
    utm_campaign Nullable(String),
    user_id Nullable(String),
    metadata_1 Nullable(String),
    metadata_2 Nullable(String),
    metadata_3 Nullable(String),
    metadata_4 Nullable(String),
    metadata_5 Nullable(String),
    metadata_6 Nullable(String),
    metadata_7 Nullable(String),
    metadata_8 Nullable(String),
    metadata_9 Nullable(String),
    metadata_10 Nullable(String),
    issue_types Array(LowCardinality(String)),
    _timestamp   DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMMDD(datetime)
      ORDER BY (project_id, datetime, session_id)
      TTL datetime + INTERVAL 1 MONTH
      SETTINGS index_granularity = 512;

CREATE TABLE IF NOT EXISTS autocomplete
(
    project_id UInt16,
    type LowCardinality(String),
    value      String,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, type, value)
      TTL _timestamp + INTERVAL 1 MONTH;

CREATE TABLE IF NOT EXISTS errors
(
    error_id   String,
    project_id UInt16,
    source Enum8('js_exception'=1,'bugsnag'=2,'cloudwatch'=3,'datadog'=4,'newrelic'=5,'rollbar'=6,'sentry'=7,'stackdriver'=8,'sumologic'=9, 'elasticsearch'=10),
    name Nullable(String),
    message    String,
    payload    String,
    stacktrace Nullable(String), --to save the stacktrace and not query S3 another time
    stacktrace_parsed_at Nullable(DateTime),
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMMDD(_timestamp)
      ORDER BY (project_id, source, error_id)
      TTL _timestamp + INTERVAL 1 MONTH
      SETTINGS index_granularity = 512;

CREATE MATERIALIZED VIEW sessions_l7d_mv
            ENGINE = ReplacingMergeTree(_timestamp)
                PARTITION BY toYYYYMMDD(datetime)
                ORDER BY (project_id, datetime, session_id)
                TTL datetime + INTERVAL 7 DAY
                SETTINGS index_granularity = 512
            POPULATE
AS
SELECT *
FROM massive_split.sessions_s
WHERE datetime >= now() - INTERVAL 7 DAY
  AND isNotNull(duration)
  AND duration > 0;

CREATE MATERIALIZED VIEW events_l7d_mv
            ENGINE = ReplacingMergeTree(_timestamp)
                PARTITION BY toYYYYMM(datetime)
                ORDER BY (project_id, datetime, session_id)
                TTL datetime + INTERVAL 7 DAY
            POPULATE
AS
SELECT *
FROM massive_split.events_s
WHERE datetime >= now() - INTERVAL 7 DAY;


CREATE MATERIALIZED VIEW sessions_info_l1m_mv
            ENGINE = ReplacingMergeTree(_timestamp)
                PARTITION BY toYYYYMM(datetime)
                ORDER BY (project_id, datetime, session_id)
                TTL datetime + INTERVAL 1 MONTH
                SETTINGS index_granularity = 512
            POPULATE
AS
SELECT project_id,
       session_id,
       datetime,
       now()  AS _timestamp,
       toJSONString(map('project_id', toString(project_id),
                        'session_id', toString(session_id),
                        'user_uuid', toString(user_uuid),
                        'user_id', user_id,
                        'user_os', user_os,
                        'user_browser', user_browser,
                        'user_device', user_device,
           --'user_device_type', user_device_type,
--'user_country', user_country,
                        'start_ts', toString(datetime),
                        'duration', toString(duration),
                        'events_count', toString(events_count),
                        'pages_count', toString(pages_count),
                        'errors_count', toString(errors_count),
           -- 'user_anonymous_id', user_anonymous_id,
-- 'platform', platform,
-- 'issue_score', issue_score,
-- issue_types,
-- favorite,
-- viewed,
                        'metadata', CAST((arrayFilter(x->isNotNull(x),
                                                      arrayMap(
                                                              x->if(isNotNull(x[1]) AND isNotNull(x[2]), toString(x[1]),
                                                                    NULL),
                                                              [
                                                                  [projects_meta.metadata_1,sessions.metadata_1],
                                                                  [projects_meta.metadata_2,sessions.metadata_2],
                                                                  [projects_meta.metadata_3,sessions.metadata_3],
                                                                  [projects_meta.metadata_4,sessions.metadata_4],
                                                                  [projects_meta.metadata_5,sessions.metadata_5],
                                                                  [projects_meta.metadata_6,sessions.metadata_6],
                                                                  [projects_meta.metadata_7,sessions.metadata_7],
                                                                  [projects_meta.metadata_8,sessions.metadata_8],
                                                                  [projects_meta.metadata_9,sessions.metadata_9],
                                                                  [projects_meta.metadata_10,sessions.metadata_10]
                                                                  ])),
                                          arrayFilter(x->isNotNull(x),
                                                      arrayMap(
                                                              x->if(isNotNull(x[1]) AND isNotNull(x[2]), toString(x[2]),
                                                                    NULL),
                                                              [
                                                                  [projects_meta.metadata_1,sessions.metadata_1],
                                                                  [projects_meta.metadata_2,sessions.metadata_2],
                                                                  [projects_meta.metadata_3,sessions.metadata_3],
                                                                  [projects_meta.metadata_4,sessions.metadata_4],
                                                                  [projects_meta.metadata_5,sessions.metadata_5],
                                                                  [projects_meta.metadata_6,sessions.metadata_6],
                                                                  [projects_meta.metadata_7,sessions.metadata_7],
                                                                  [projects_meta.metadata_8,sessions.metadata_8],
                                                                  [projects_meta.metadata_9,sessions.metadata_9],
                                                                  [projects_meta.metadata_10,sessions.metadata_10]
                                                                  ]))), 'Map(String,String)')
           )) AS info
FROM massive_split.sessions
         INNER JOIN projects_metadata USING (project_id)
WHERE datetime >= now() - INTERVAL 1 MONTH
  AND isNotNull(duration)
  AND duration > 0;

CREATE MATERIALIZED VIEW sessions_info_l7d_mv
            ENGINE = ReplacingMergeTree(_timestamp)
                PARTITION BY toYYYYMMDD(datetime)
                ORDER BY (project_id, datetime, session_id)
                TTL datetime + INTERVAL 7 DAY
                SETTINGS index_granularity = 512
            POPULATE
AS
SELECT *
FROM sessions_info_l1m_mv
WHERE datetime >= now() - INTERVAL 7 DAY;
