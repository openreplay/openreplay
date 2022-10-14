CREATE DATABASE IF NOT EXISTS experimental;

CREATE TABLE IF NOT EXISTS experimental.autocomplete
(
    project_id UInt16,
    type LowCardinality(String),
    value      String,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, type, value)
      TTL _timestamp + INTERVAL 1 MONTH;

CREATE TABLE IF NOT EXISTS experimental.events
(
    session_id                                     UInt64,
    project_id                                     UInt16,
    event_type Enum8('CLICK'=0, 'INPUT'=1, 'LOCATION'=2,'REQUEST'=3,'PERFORMANCE'=4,'ERROR'=5,'CUSTOM'=6, 'GRAPHQL'=7, 'STATEACTION'=8, 'ISSUE'=9),
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
    url_hostpath Nullable(String)                  MATERIALIZED concat(url_host, url_path),
    request_start Nullable(UInt16),
    response_start Nullable(UInt16),
    response_end Nullable(UInt16),
    dom_content_loaded_event_start Nullable(UInt16),
    dom_content_loaded_event_end Nullable(UInt16),
    load_event_start Nullable(UInt16),
    load_event_end Nullable(UInt16),
    first_paint Nullable(UInt16),
    first_contentful_paint_time Nullable(UInt16),
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
    method Nullable(Enum8('GET' = 0, 'HEAD' = 1, 'POST' = 2, 'PUT' = 3, 'DELETE' = 4, 'CONNECT' = 5, 'OPTIONS' = 6, 'TRACE' = 7, 'PATCH' = 8)),
    status Nullable(UInt16),
    success Nullable(UInt8),
    request_body Nullable(String),
    response_body Nullable(String),
    issue_type Nullable(Enum8('click_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19)),
    issue_id Nullable(String),
    error_tags_keys Array(String),
    error_tags_values Array(Nullable(String)),
    message_id                                     UInt64   DEFAULT 0,
    _timestamp                                     DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(datetime)
      ORDER BY (project_id, datetime, event_type, session_id, message_id)
      TTL datetime + INTERVAL 3 MONTH;

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
    message_id                          UInt64   DEFAULT 0,
    _timestamp                          DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(datetime)
      ORDER BY (project_id, datetime, type, session_id, message_id)
      TTL datetime + INTERVAL 3 MONTH;

CREATE TABLE IF NOT EXISTS experimental.sessions
(
    session_id                     UInt64,
    project_id                     UInt16,
    tracker_version LowCardinality(String),
    rev_id LowCardinality(Nullable(String)),
    user_uuid                      UUID,
    user_os LowCardinality(String),
    user_os_version LowCardinality(Nullable(String)),
    user_browser LowCardinality(String),
    user_browser_version LowCardinality(Nullable(String)),
    user_device Nullable(String),
    user_device_type Enum8('other'=0, 'desktop'=1, 'mobile'=2),
    user_country Enum8('UN'=-128, 'RW'=-127, 'SO'=-126, 'YE'=-125, 'IQ'=-124, 'SA'=-123, 'IR'=-122, 'CY'=-121, 'TZ'=-120, 'SY'=-119, 'AM'=-118, 'KE'=-117, 'CD'=-116, 'DJ'=-115, 'UG'=-114, 'CF'=-113, 'SC'=-112, 'JO'=-111, 'LB'=-110, 'KW'=-109, 'OM'=-108, 'QA'=-107, 'BH'=-106, 'AE'=-105, 'IL'=-104, 'TR'=-103, 'ET'=-102, 'ER'=-101, 'EG'=-100, 'SD'=-99, 'GR'=-98, 'BI'=-97, 'EE'=-96, 'LV'=-95, 'AZ'=-94, 'LT'=-93, 'SJ'=-92, 'GE'=-91, 'MD'=-90, 'BY'=-89, 'FI'=-88, 'AX'=-87, 'UA'=-86, 'MK'=-85, 'HU'=-84, 'BG'=-83, 'AL'=-82, 'PL'=-81, 'RO'=-80, 'XK'=-79, 'ZW'=-78, 'ZM'=-77, 'KM'=-76, 'MW'=-75, 'LS'=-74, 'BW'=-73, 'MU'=-72, 'SZ'=-71, 'RE'=-70, 'ZA'=-69, 'YT'=-68, 'MZ'=-67, 'MG'=-66, 'AF'=-65, 'PK'=-64, 'BD'=-63, 'TM'=-62, 'TJ'=-61, 'LK'=-60, 'BT'=-59, 'IN'=-58, 'MV'=-57, 'IO'=-56, 'NP'=-55, 'MM'=-54, 'UZ'=-53, 'KZ'=-52, 'KG'=-51, 'TF'=-50, 'HM'=-49, 'CC'=-48, 'PW'=-47, 'VN'=-46, 'TH'=-45, 'ID'=-44, 'LA'=-43, 'TW'=-42, 'PH'=-41, 'MY'=-40, 'CN'=-39, 'HK'=-38, 'BN'=-37, 'MO'=-36, 'KH'=-35, 'KR'=-34, 'JP'=-33, 'KP'=-32, 'SG'=-31, 'CK'=-30, 'TL'=-29, 'RU'=-28, 'MN'=-27, 'AU'=-26, 'CX'=-25, 'MH'=-24, 'FM'=-23, 'PG'=-22, 'SB'=-21, 'TV'=-20, 'NR'=-19, 'VU'=-18, 'NC'=-17, 'NF'=-16, 'NZ'=-15, 'FJ'=-14, 'LY'=-13, 'CM'=-12, 'SN'=-11, 'CG'=-10, 'PT'=-9, 'LR'=-8, 'CI'=-7, 'GH'=-6, 'GQ'=-5, 'NG'=-4, 'BF'=-3, 'TG'=-2, 'GW'=-1, 'MR'=0, 'BJ'=1, 'GA'=2, 'SL'=3, 'ST'=4, 'GI'=5, 'GM'=6, 'GN'=7, 'TD'=8, 'NE'=9, 'ML'=10, 'EH'=11, 'TN'=12, 'ES'=13, 'MA'=14, 'MT'=15, 'DZ'=16, 'FO'=17, 'DK'=18, 'IS'=19, 'GB'=20, 'CH'=21, 'SE'=22, 'NL'=23, 'AT'=24, 'BE'=25, 'DE'=26, 'LU'=27, 'IE'=28, 'MC'=29, 'FR'=30, 'AD'=31, 'LI'=32, 'JE'=33, 'IM'=34, 'GG'=35, 'SK'=36, 'CZ'=37, 'NO'=38, 'VA'=39, 'SM'=40, 'IT'=41, 'SI'=42, 'ME'=43, 'HR'=44, 'BA'=45, 'AO'=46, 'NA'=47, 'SH'=48, 'BV'=49, 'BB'=50, 'CV'=51, 'GY'=52, 'GF'=53, 'SR'=54, 'PM'=55, 'GL'=56, 'PY'=57, 'UY'=58, 'BR'=59, 'FK'=60, 'GS'=61, 'JM'=62, 'DO'=63, 'CU'=64, 'MQ'=65, 'BS'=66, 'BM'=67, 'AI'=68, 'TT'=69, 'KN'=70, 'DM'=71, 'AG'=72, 'LC'=73, 'TC'=74, 'AW'=75, 'VG'=76, 'VC'=77, 'MS'=78, 'MF'=79, 'BL'=80, 'GP'=81, 'GD'=82, 'KY'=83, 'BZ'=84, 'SV'=85, 'GT'=86, 'HN'=87, 'NI'=88, 'CR'=89, 'VE'=90, 'EC'=91, 'CO'=92, 'PA'=93, 'HT'=94, 'AR'=95, 'CL'=96, 'BO'=97, 'PE'=98, 'MX'=99, 'PF'=100, 'PN'=101, 'KI'=102, 'TK'=103, 'TO'=104, 'WF'=105, 'WS'=106, 'NU'=107, 'MP'=108, 'GU'=109, 'PR'=110, 'VI'=111, 'UM'=112, 'AS'=113, 'CA'=114, 'US'=115, 'PS'=116, 'RS'=117, 'AQ'=118, 'SX'=119, 'CW'=120, 'BQ'=121, 'SS'=122),
    platform Enum8('web'=1,'ios'=2,'android'=3) DEFAULT 'web',
    datetime                       DateTime,
    duration                       UInt32,
    pages_count                    UInt16,
    events_count                   UInt16,
    errors_count                   UInt16,
    utm_source Nullable(String),
    utm_medium Nullable(String),
    utm_campaign Nullable(String),
    user_id Nullable(String),
    user_anonymous_id Nullable(String),
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
    referrer Nullable(String),
    base_referrer Nullable(String) MATERIALIZED lower(concat(domain(referrer), path(referrer))),
    issue_score Nullable(UInt32),
    _timestamp                     DateTime     DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMMDD(datetime)
      ORDER BY (project_id, datetime, session_id)
      TTL datetime + INTERVAL 3 MONTH
      SETTINGS index_granularity = 512;

CREATE TABLE IF NOT EXISTS experimental.user_favorite_sessions
(
    project_id UInt16,
    user_id    UInt32,
    session_id UInt64,
    _timestamp DateTime DEFAULT now(),
    sign       Int8
) ENGINE = CollapsingMergeTree(sign)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, session_id)
      TTL _timestamp + INTERVAL 3 MONTH;

CREATE TABLE IF NOT EXISTS experimental.user_viewed_sessions
(
    project_id UInt16,
    user_id    UInt32,
    session_id UInt64,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, session_id)
      TTL _timestamp + INTERVAL 3 MONTH;

CREATE TABLE IF NOT EXISTS experimental.user_viewed_errors
(
    project_id UInt16,
    user_id    UInt32,
    error_id   String,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, error_id)
      TTL _timestamp + INTERVAL 3 MONTH;

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

CREATE MATERIALIZED VIEW IF NOT EXISTS experimental.events_l7d_mv
            ENGINE = ReplacingMergeTree(_timestamp)
                PARTITION BY toYYYYMM(datetime)
                ORDER BY (project_id, datetime, event_type, session_id, message_id)
                TTL datetime + INTERVAL 7 DAY
            POPULATE
AS
SELECT session_id,
       project_id,
       event_type,
       datetime,
       label,
       hesitation_time,
       name,
       payload,
       level,
       source,
       message,
       error_id,
       duration,
       context,
       container_type,
       container_id,
       container_name,
       container_src,
       url,
       url_host,
       url_path,
       url_hostpath,
       request_start,
       response_start,
       response_end,
       dom_content_loaded_event_start,
       dom_content_loaded_event_end,
       load_event_start,
       load_event_end,
       first_paint,
       first_contentful_paint_time,
       speed_index,
       visually_complete,
       time_to_interactive,
       ttfb,
       ttlb,
       response_time,
       dom_building_time,
       dom_content_loaded_event_time,
       load_event_time,
       min_fps,
       avg_fps,
       max_fps,
       min_cpu,
       avg_cpu,
       max_cpu,
       min_total_js_heap_size,
       avg_total_js_heap_size,
       max_total_js_heap_size,
       min_used_js_heap_size,
       avg_used_js_heap_size,
       max_used_js_heap_size,
       method,
       status,
       success,
       request_body,
       response_body,
       issue_type,
       issue_id,
       error_tags_keys,
       error_tags_values,
       message_id,
       _timestamp
FROM experimental.events
WHERE datetime >= now() - INTERVAL 7 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS experimental.resources_l7d_mv
            ENGINE = ReplacingMergeTree(_timestamp)
                PARTITION BY toYYYYMM(datetime)
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

CREATE MATERIALIZED VIEW IF NOT EXISTS experimental.sessions_l7d_mv
            ENGINE = ReplacingMergeTree(_timestamp)
                PARTITION BY toYYYYMMDD(datetime)
                ORDER BY (project_id, datetime, session_id)
                TTL datetime + INTERVAL 7 DAY
                SETTINGS index_granularity = 512
            POPULATE
AS
SELECT session_id,
       project_id,
       tracker_version,
       rev_id,
       user_uuid,
       user_os,
       user_os_version,
       user_browser,
       user_browser_version,
       user_device,
       user_device_type,
       user_country,
       platform,
       datetime,
       duration,
       pages_count,
       events_count,
       errors_count,
       utm_source,
       utm_medium,
       utm_campaign,
       user_id,
       user_anonymous_id,
       metadata_1,
       metadata_2,
       metadata_3,
       metadata_4,
       metadata_5,
       metadata_6,
       metadata_7,
       metadata_8,
       metadata_9,
       metadata_10,
       issue_types,
       referrer,
       base_referrer,
       issue_score,
       _timestamp
FROM experimental.sessions
WHERE datetime >= now() - INTERVAL 7 DAY
  AND isNotNull(duration)
  AND duration > 0;

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
       user_id,
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