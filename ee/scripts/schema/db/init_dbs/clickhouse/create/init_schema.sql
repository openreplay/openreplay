CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.25.0-ee';
CREATE DATABASE IF NOT EXISTS experimental;

CREATE TABLE IF NOT EXISTS experimental.sessions
(
    session_id           UInt64,
    project_id           UInt16,
    tracker_version      LowCardinality(String),
    rev_id               LowCardinality(Nullable(String)),
    user_uuid            UUID,
    user_os              LowCardinality(String),
    user_os_version      LowCardinality(Nullable(String)),
    user_browser         LowCardinality(String),
    user_browser_version LowCardinality(Nullable(String)),
    user_device          Nullable(String),
    user_device_type     Enum8('other'=0, 'desktop'=1, 'mobile'=2,'tablet'=3),
    user_country         Enum8('UN'=-128, 'RW'=-127, 'SO'=-126, 'YE'=-125, 'IQ'=-124, 'SA'=-123, 'IR'=-122, 'CY'=-121, 'TZ'=-120, 'SY'=-119, 'AM'=-118, 'KE'=-117, 'CD'=-116, 'DJ'=-115, 'UG'=-114, 'CF'=-113, 'SC'=-112, 'JO'=-111, 'LB'=-110, 'KW'=-109, 'OM'=-108, 'QA'=-107, 'BH'=-106, 'AE'=-105, 'IL'=-104, 'TR'=-103, 'ET'=-102, 'ER'=-101, 'EG'=-100, 'SD'=-99, 'GR'=-98, 'BI'=-97, 'EE'=-96, 'LV'=-95, 'AZ'=-94, 'LT'=-93, 'SJ'=-92, 'GE'=-91, 'MD'=-90, 'BY'=-89, 'FI'=-88, 'AX'=-87, 'UA'=-86, 'MK'=-85, 'HU'=-84, 'BG'=-83, 'AL'=-82, 'PL'=-81, 'RO'=-80, 'XK'=-79, 'ZW'=-78, 'ZM'=-77, 'KM'=-76, 'MW'=-75, 'LS'=-74, 'BW'=-73, 'MU'=-72, 'SZ'=-71, 'RE'=-70, 'ZA'=-69, 'YT'=-68, 'MZ'=-67, 'MG'=-66, 'AF'=-65, 'PK'=-64, 'BD'=-63, 'TM'=-62, 'TJ'=-61, 'LK'=-60, 'BT'=-59, 'IN'=-58, 'MV'=-57, 'IO'=-56, 'NP'=-55, 'MM'=-54, 'UZ'=-53, 'KZ'=-52, 'KG'=-51, 'TF'=-50, 'HM'=-49, 'CC'=-48, 'PW'=-47, 'VN'=-46, 'TH'=-45, 'ID'=-44, 'LA'=-43, 'TW'=-42, 'PH'=-41, 'MY'=-40, 'CN'=-39, 'HK'=-38, 'BN'=-37, 'MO'=-36, 'KH'=-35, 'KR'=-34, 'JP'=-33, 'KP'=-32, 'SG'=-31, 'CK'=-30, 'TL'=-29, 'RU'=-28, 'MN'=-27, 'AU'=-26, 'CX'=-25, 'MH'=-24, 'FM'=-23, 'PG'=-22, 'SB'=-21, 'TV'=-20, 'NR'=-19, 'VU'=-18, 'NC'=-17, 'NF'=-16, 'NZ'=-15, 'FJ'=-14, 'LY'=-13, 'CM'=-12, 'SN'=-11, 'CG'=-10, 'PT'=-9, 'LR'=-8, 'CI'=-7, 'GH'=-6, 'GQ'=-5, 'NG'=-4, 'BF'=-3, 'TG'=-2, 'GW'=-1, 'MR'=0, 'BJ'=1, 'GA'=2, 'SL'=3, 'ST'=4, 'GI'=5, 'GM'=6, 'GN'=7, 'TD'=8, 'NE'=9, 'ML'=10, 'EH'=11, 'TN'=12, 'ES'=13, 'MA'=14, 'MT'=15, 'DZ'=16, 'FO'=17, 'DK'=18, 'IS'=19, 'GB'=20, 'CH'=21, 'SE'=22, 'NL'=23, 'AT'=24, 'BE'=25, 'DE'=26, 'LU'=27, 'IE'=28, 'MC'=29, 'FR'=30, 'AD'=31, 'LI'=32, 'JE'=33, 'IM'=34, 'GG'=35, 'SK'=36, 'CZ'=37, 'NO'=38, 'VA'=39, 'SM'=40, 'IT'=41, 'SI'=42, 'ME'=43, 'HR'=44, 'BA'=45, 'AO'=46, 'NA'=47, 'SH'=48, 'BV'=49, 'BB'=50, 'CV'=51, 'GY'=52, 'GF'=53, 'SR'=54, 'PM'=55, 'GL'=56, 'PY'=57, 'UY'=58, 'BR'=59, 'FK'=60, 'GS'=61, 'JM'=62, 'DO'=63, 'CU'=64, 'MQ'=65, 'BS'=66, 'BM'=67, 'AI'=68, 'TT'=69, 'KN'=70, 'DM'=71, 'AG'=72, 'LC'=73, 'TC'=74, 'AW'=75, 'VG'=76, 'VC'=77, 'MS'=78, 'MF'=79, 'BL'=80, 'GP'=81, 'GD'=82, 'KY'=83, 'BZ'=84, 'SV'=85, 'GT'=86, 'HN'=87, 'NI'=88, 'CR'=89, 'VE'=90, 'EC'=91, 'CO'=92, 'PA'=93, 'HT'=94, 'AR'=95, 'CL'=96, 'BO'=97, 'PE'=98, 'MX'=99, 'PF'=100, 'PN'=101, 'KI'=102, 'TK'=103, 'TO'=104, 'WF'=105, 'WS'=106, 'NU'=107, 'MP'=108, 'GU'=109, 'PR'=110, 'VI'=111, 'UM'=112, 'AS'=113, 'CA'=114, 'US'=115, 'PS'=116, 'RS'=117, 'AQ'=118, 'SX'=119, 'CW'=120, 'BQ'=121, 'SS'=122,'BU'=123, 'VD'=124, 'YD'=125, 'DD'=126),
    user_city            LowCardinality(String),
    user_state           LowCardinality(String),
    platform             Enum8('web'=1,'mobile'=2) DEFAULT 'web',
    datetime             DateTime,
    timezone             LowCardinality(Nullable(String)),
    duration             UInt32,
    pages_count          UInt16,
    events_count         UInt16,
    errors_count         UInt16,
    utm_source           Nullable(String),
    utm_medium           Nullable(String),
    utm_campaign         Nullable(String),
    user_id              Nullable(String),
    user_anonymous_id    Nullable(String),
    issue_types          Array(LowCardinality(String)),
    referrer             Nullable(String),
    base_referrer        Nullable(String) MATERIALIZED lower(concat(domain(referrer), path(referrer))),
    screen_width         Nullable(Int16),
    screen_height        Nullable(Int16),
    metadata_1           Nullable(String),
    metadata_2           Nullable(String),
    metadata_3           Nullable(String),
    metadata_4           Nullable(String),
    metadata_5           Nullable(String),
    metadata_6           Nullable(String),
    metadata_7           Nullable(String),
    metadata_8           Nullable(String),
    metadata_9           Nullable(String),
    metadata_10          Nullable(String),
    is_vault             BOOL                      DEFAULT FALSE,
    _timestamp           DateTime                  DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMMDD(datetime)
      ORDER BY (project_id, datetime, session_id)
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
      ORDER BY (project_id, user_id, session_id);

CREATE TABLE IF NOT EXISTS experimental.user_viewed_sessions
(
    project_id UInt16,
    user_id    UInt32,
    session_id UInt64,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, session_id);

CREATE TABLE IF NOT EXISTS experimental.user_viewed_errors
(
    project_id UInt16,
    user_id    UInt32,
    error_id   String,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, error_id);

CREATE TABLE IF NOT EXISTS experimental.issues
(
    project_id     UInt16,
    issue_id       String,
    type           Enum8('click_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19,'mouse_thrashing'=20,'app_crash'=21,'incident'=22),
    context_string String,
    context_keys   Array(String),
    context_values Array(Nullable(String)),
    _timestamp     DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, issue_id, type);


-- CREATE MATERIALIZED VIEW IF NOT EXISTS experimental.js_errors_sessions_mv
--             ENGINE = ReplacingMergeTree(_timestamp)
--                 PARTITION BY toYYYYMM(datetime)
--                 ORDER BY (project_id, datetime, event_type, error_id, session_id)
--                 TTL _timestamp + INTERVAL 35 DAY
--             POPULATE
-- AS
-- SELECT session_id,
--        project_id,
--        events.datetime         AS datetime,
--        event_type,
--        assumeNotNull(error_id) AS error_id,
--        source,
--        name,
--        message,
--        error_tags_keys,
--        error_tags_values,
--        message_id,
--        user_id,
--        user_browser,
--        user_browser_version,
--        user_os,
--        user_os_version,
--        user_device_type,
--        user_device,
--        user_country,
--        _timestamp
-- FROM experimental.events
--          INNER JOIN experimental.sessions USING (session_id)
-- WHERE event_type = 'ERROR'
--   AND source = 'js_exception';


CREATE TABLE IF NOT EXISTS experimental.sessions_feature_flags
(
    session_id      UInt64,
    project_id      UInt16,
    feature_flag_id UInt16,
    condition_id    UInt16,
    datetime        DateTime,
    _timestamp      DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(datetime)
      ORDER BY (project_id, datetime, session_id, feature_flag_id, condition_id);

CREATE TABLE IF NOT EXISTS experimental.ios_events
(
    session_id     UInt64,
    project_id     UInt16,
    event_type     Enum8('TAP'=0, 'INPUT'=1, 'SWIPE'=2, 'VIEW'=3,'REQUEST'=4,'CRASH'=5,'CUSTOM'=6, 'STATEACTION'=8, 'ISSUE'=9),
    datetime       DateTime,
    label          Nullable(String),
    name           Nullable(String),
    payload        Nullable(String),
    level          Nullable(Enum8('info'=0, 'error'=1)) DEFAULT if(event_type == 'CUSTOM', 'info', null),
    context        Nullable(Enum8('unknown'=0, 'self'=1, 'same-origin-ancestor'=2, 'same-origin-descendant'=3, 'same-origin'=4, 'cross-origin-ancestor'=5, 'cross-origin-descendant'=6, 'cross-origin-unreachable'=7, 'multiple-contexts'=8)),
    url            Nullable(String),
    url_host       Nullable(String) MATERIALIZED lower(domain(url)),
    url_path       Nullable(String),
    url_hostpath   Nullable(String) MATERIALIZED concat(url_host, url_path),
    request_start  Nullable(UInt16),
    response_start Nullable(UInt16),
    response_end   Nullable(UInt16),
    method         Nullable(Enum8('GET' = 0, 'HEAD' = 1, 'POST' = 2, 'PUT' = 3, 'DELETE' = 4, 'CONNECT' = 5, 'OPTIONS' = 6, 'TRACE' = 7, 'PATCH' = 8)),
    status         Nullable(UInt16),
    duration       Nullable(UInt16),
    success        Nullable(UInt8),
    request_body   Nullable(String),
    response_body  Nullable(String),
    issue_type     Nullable(Enum8('tap_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19,'mouse_thrashing'=20,'app_crash'=21)),
    issue_id       Nullable(String),
    transfer_size  Nullable(UInt32),
    direction      Nullable(String),
    reason         Nullable(String),
    stacktrace     Nullable(String),
    message_id     UInt64                               DEFAULT 0,
    _timestamp     DateTime                             DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(datetime)
      ORDER BY (project_id, datetime, event_type, session_id, message_id);


SET allow_experimental_json_type = 1;
SET enable_json_type = 1;

CREATE DATABASE IF NOT EXISTS product_analytics;

-- The table of identified users
CREATE TABLE IF NOT EXISTS product_analytics.users
(
    project_id           UInt16,
    "$user_id"           String,
    "$email"             String DEFAULT '',
    "$name"              String DEFAULT '',
    "$first_name"        String DEFAULT '',
    "$last_name"         String DEFAULT '',
    "$phone"             String DEFAULT '',
    "$avatar"            String DEFAULT '',
    "$created_at"        DateTime DEFAULT now(),
    properties           JSON DEFAULT '{}',
    group_id1            Array(String) DEFAULT [],
    group_id2            Array(String) DEFAULT [],
    group_id3            Array(String) DEFAULT [],
    group_id4            Array(String) DEFAULT [],
    group_id5            Array(String) DEFAULT [],
    group_id6            Array(String) DEFAULT [],

    "$sdk_edition"       LowCardinality(String),
    "$sdk_version"       LowCardinality(String),
    "$current_url"       String DEFAULT '',
    "$current_path"      String MATERIALIZED path("$current_url"),
    "$initial_referrer"  String DEFAULT '',
    "$referring_domain"  String DEFAULT '',
    initial_utm_source   String DEFAULT '',
    initial_utm_medium   String DEFAULT '',
    initial_utm_campaign String DEFAULT '',
    "$country"           Enum8('UN'=-128, 'RW'=-127, 'SO'=-126, 'YE'=-125, 'IQ'=-124, 'SA'=-123, 'IR'=-122, 'CY'=-121, 'TZ'=-120, 'SY'=-119, 'AM'=-118, 'KE'=-117, 'CD'=-116, 'DJ'=-115, 'UG'=-114, 'CF'=-113, 'SC'=-112, 'JO'=-111, 'LB'=-110, 'KW'=-109, 'OM'=-108, 'QA'=-107, 'BH'=-106, 'AE'=-105, 'IL'=-104, 'TR'=-103, 'ET'=-102, 'ER'=-101, 'EG'=-100, 'SD'=-99, 'GR'=-98, 'BI'=-97, 'EE'=-96, 'LV'=-95, 'AZ'=-94, 'LT'=-93, 'SJ'=-92, 'GE'=-91, 'MD'=-90, 'BY'=-89, 'FI'=-88, 'AX'=-87, 'UA'=-86, 'MK'=-85, 'HU'=-84, 'BG'=-83, 'AL'=-82, 'PL'=-81, 'RO'=-80, 'XK'=-79, 'ZW'=-78, 'ZM'=-77, 'KM'=-76, 'MW'=-75, 'LS'=-74, 'BW'=-73, 'MU'=-72, 'SZ'=-71, 'RE'=-70, 'ZA'=-69, 'YT'=-68, 'MZ'=-67, 'MG'=-66, 'AF'=-65, 'PK'=-64, 'BD'=-63, 'TM'=-62, 'TJ'=-61, 'LK'=-60, 'BT'=-59, 'IN'=-58, 'MV'=-57, 'IO'=-56, 'NP'=-55, 'MM'=-54, 'UZ'=-53, 'KZ'=-52, 'KG'=-51, 'TF'=-50, 'HM'=-49, 'CC'=-48, 'PW'=-47, 'VN'=-46, 'TH'=-45, 'ID'=-44, 'LA'=-43, 'TW'=-42, 'PH'=-41, 'MY'=-40, 'CN'=-39, 'HK'=-38, 'BN'=-37, 'MO'=-36, 'KH'=-35, 'KR'=-34, 'JP'=-33, 'KP'=-32, 'SG'=-31, 'CK'=-30, 'TL'=-29, 'RU'=-28, 'MN'=-27, 'AU'=-26, 'CX'=-25, 'MH'=-24, 'FM'=-23, 'PG'=-22, 'SB'=-21, 'TV'=-20, 'NR'=-19, 'VU'=-18, 'NC'=-17, 'NF'=-16, 'NZ'=-15, 'FJ'=-14, 'LY'=-13, 'CM'=-12, 'SN'=-11, 'CG'=-10, 'PT'=-9, 'LR'=-8, 'CI'=-7, 'GH'=-6, 'GQ'=-5, 'NG'=-4, 'BF'=-3, 'TG'=-2, 'GW'=-1, 'MR'=0, 'BJ'=1, 'GA'=2, 'SL'=3, 'ST'=4, 'GI'=5, 'GM'=6, 'GN'=7, 'TD'=8, 'NE'=9, 'ML'=10, 'EH'=11, 'TN'=12, 'ES'=13, 'MA'=14, 'MT'=15, 'DZ'=16, 'FO'=17, 'DK'=18, 'IS'=19, 'GB'=20, 'CH'=21, 'SE'=22, 'NL'=23, 'AT'=24, 'BE'=25, 'DE'=26, 'LU'=27, 'IE'=28, 'MC'=29, 'FR'=30, 'AD'=31, 'LI'=32, 'JE'=33, 'IM'=34, 'GG'=35, 'SK'=36, 'CZ'=37, 'NO'=38, 'VA'=39, 'SM'=40, 'IT'=41, 'SI'=42, 'ME'=43, 'HR'=44, 'BA'=45, 'AO'=46, 'NA'=47, 'SH'=48, 'BV'=49, 'BB'=50, 'CV'=51, 'GY'=52, 'GF'=53, 'SR'=54, 'PM'=55, 'GL'=56, 'PY'=57, 'UY'=58, 'BR'=59, 'FK'=60, 'GS'=61, 'JM'=62, 'DO'=63, 'CU'=64, 'MQ'=65, 'BS'=66, 'BM'=67, 'AI'=68, 'TT'=69, 'KN'=70, 'DM'=71, 'AG'=72, 'LC'=73, 'TC'=74, 'AW'=75, 'VG'=76, 'VC'=77, 'MS'=78, 'MF'=79, 'BL'=80, 'GP'=81, 'GD'=82, 'KY'=83, 'BZ'=84, 'SV'=85, 'GT'=86, 'HN'=87, 'NI'=88, 'CR'=89, 'VE'=90, 'EC'=91, 'CO'=92, 'PA'=93, 'HT'=94, 'AR'=95, 'CL'=96, 'BO'=97, 'PE'=98, 'MX'=99, 'PF'=100, 'PN'=101, 'KI'=102, 'TK'=103, 'TO'=104, 'WF'=105, 'WS'=106, 'NU'=107, 'MP'=108, 'GU'=109, 'PR'=110, 'VI'=111, 'UM'=112, 'AS'=113, 'CA'=114, 'US'=115, 'PS'=116, 'RS'=117, 'AQ'=118, 'SX'=119, 'CW'=120, 'BQ'=121, 'SS'=122,'BU'=123, 'VD'=124, 'YD'=125, 'DD'=126, ''=127) DEFAULT '',
    "$state"             LowCardinality(String) DEFAULT '',
    "$city"              LowCardinality(String) DEFAULT '',
    "$or_api_endpoint"   LowCardinality(String),
    "$timezone"          Int8 DEFAULT 0 COMMENT 'timezone will be x10 in order to take into consideration countries with tz=N,5H',

    "$first_event_at"    DateTime DEFAULT '1970-01-01 00:00:00',
    "$last_seen"         DateTime DEFAULT now() COMMENT 'the last time the person was identified',

    _deleted_at          DateTime DEFAULT '1970-01-01 00:00:00',
    _is_deleted          UInt8 DEFAULT 0,
    _timestamp           DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp, _is_deleted)
      ORDER BY (project_id, "$user_id")
      PARTITION BY toYYYYMM(_timestamp)
      TTL _deleted_at + INTERVAL 1 DAY DELETE WHERE _deleted_at != '1970-01-01 00:00:00'
      SETTINGS allow_experimental_json_type = 1, enable_json_type = 1;


CREATE TABLE IF NOT EXISTS product_analytics.devices
(
    project_id         UInt16,
    "$device_id"       String,
    "$device"          String                 DEFAULT '',
    "$screen_height"   UInt16                 DEFAULT 0,
    "$screen_width"    UInt16                 DEFAULT 0,
    "$os"              LowCardinality(String) DEFAULT '',
    "$os_version"      LowCardinality(String) DEFAULT '',
    "$browser"         LowCardinality(String) DEFAULT '',
    "$browser_version" String                 DEFAULT '',

    _deleted_at        DateTime               DEFAULT '1970-01-01 00:00:00',
    _timestamp         DateTime               DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, "$device_id")
      TTL _deleted_at + INTERVAL 1 DAY DELETE WHERE _deleted_at != '1970-01-01 00:00:00';

-- This table is used in order to identify all devices used by a specific user
CREATE TABLE IF NOT EXISTS product_analytics.user_devices
(
    project_id   UInt16,
    "$device_id" String,
    "$user_id"   String,

    _deleted_at  DateTime DEFAULT '1970-01-01 00:00:00',
    _is_deleted  UInt8    DEFAULT 0,
    _timestamp   DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp, _is_deleted)
      ORDER BY (project_id, "$device_id", "$user_id")
      TTL _deleted_at + INTERVAL 1 DAY DELETE WHERE _deleted_at != '1970-01-01 00:00:00';


-- This table is used in order to relate a distinct_id to an identified user.
-- The data in this table will be used to propagate changes of user_id in events table
CREATE TABLE IF NOT EXISTS product_analytics.users_distinct_id
(
    project_id  UInt16,
    distinct_id String COMMENT 'this is the event\'s distinct_id',
    "$user_id"  String,

    _deleted_at DateTime DEFAULT '1970-01-01 00:00:00',
    _is_deleted UInt8    DEFAULT 0,
    _timestamp  DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp, _is_deleted)
      ORDER BY (project_id, distinct_id)
      PARTITION BY toMonday(_timestamp)
      TTL _deleted_at WHERE _deleted_at != '1970-01-01 00:00:00';


CREATE TABLE IF NOT EXISTS product_analytics.events
(
    project_id                  UInt16,
    event_id                    UUID,
    "$event_name"               String,
    created_at                  DateTime64,
    distinct_id                 String,
    "$user_id"                  String,
    "$device_id"                String,
    session_id                  UInt64 DEFAULT 0,
    "$time"                     UInt32 DEFAULT 0 COMMENT 'the time of the event in EPOCH, if not provided, the time of arrival to the server',
    "$source"                   LowCardinality(String) DEFAULT '' COMMENT 'the name of the integration that sent the event',
    "$duration_s"               UInt16 DEFAULT 0 COMMENT 'the duration from session-start in seconds',
    properties                  JSON DEFAULT '{}',
    "$properties"               JSON DEFAULT '{}' COMMENT 'these properties belongs to the auto-captured events',
    description                 String DEFAULT '',
    group_id1                   Array(String) DEFAULT [],
    group_id2                   Array(String) DEFAULT [],
    group_id3                   Array(String) DEFAULT [],
    group_id4                   Array(String) DEFAULT [],
    group_id5                   Array(String) DEFAULT [],
    group_id6                   Array(String) DEFAULT [],

    "$auto_captured"            BOOL DEFAULT FALSE,
    "$sdk_edition"              LowCardinality(String),
    "$sdk_version"              LowCardinality(String),
    "$os"                       LowCardinality(String) DEFAULT '',
    "$os_version"               LowCardinality(String) DEFAULT '',
    "$browser"                  LowCardinality(String) DEFAULT '',
    "$browser_version"          String DEFAULT '',
    "$device"                   LowCardinality(String) DEFAULT '' COMMENT 'in session, it is platform; web/mobile',
    "$screen_height"            UInt16 DEFAULT 0,
    "$screen_width"             UInt16 DEFAULT 0,
    "$current_url"              String DEFAULT '',
    "$current_path"             String MATERIALIZED path("$current_url"),
    "$initial_referrer"         String DEFAULT '',
    "$referring_domain"         String DEFAULT '',
    "$referrer"                 String DEFAULT '',
    "$initial_referring_domain" String DEFAULT '',
    "$search_engine"            LowCardinality(String) DEFAULT '',
    "$search_engine_keyword"    String DEFAULT '',
    "utm_source"                String DEFAULT '',
    "utm_medium"                String DEFAULT '',
    "utm_campaign"              String DEFAULT '',
    "$country"                  Enum8('UN'=-128, 'RW'=-127, 'SO'=-126, 'YE'=-125, 'IQ'=-124, 'SA'=-123, 'IR'=-122, 'CY'=-121, 'TZ'=-120, 'SY'=-119, 'AM'=-118, 'KE'=-117, 'CD'=-116, 'DJ'=-115, 'UG'=-114, 'CF'=-113, 'SC'=-112, 'JO'=-111, 'LB'=-110, 'KW'=-109, 'OM'=-108, 'QA'=-107, 'BH'=-106, 'AE'=-105, 'IL'=-104, 'TR'=-103, 'ET'=-102, 'ER'=-101, 'EG'=-100, 'SD'=-99, 'GR'=-98, 'BI'=-97, 'EE'=-96, 'LV'=-95, 'AZ'=-94, 'LT'=-93, 'SJ'=-92, 'GE'=-91, 'MD'=-90, 'BY'=-89, 'FI'=-88, 'AX'=-87, 'UA'=-86, 'MK'=-85, 'HU'=-84, 'BG'=-83, 'AL'=-82, 'PL'=-81, 'RO'=-80, 'XK'=-79, 'ZW'=-78, 'ZM'=-77, 'KM'=-76, 'MW'=-75, 'LS'=-74, 'BW'=-73, 'MU'=-72, 'SZ'=-71, 'RE'=-70, 'ZA'=-69, 'YT'=-68, 'MZ'=-67, 'MG'=-66, 'AF'=-65, 'PK'=-64, 'BD'=-63, 'TM'=-62, 'TJ'=-61, 'LK'=-60, 'BT'=-59, 'IN'=-58, 'MV'=-57, 'IO'=-56, 'NP'=-55, 'MM'=-54, 'UZ'=-53, 'KZ'=-52, 'KG'=-51, 'TF'=-50, 'HM'=-49, 'CC'=-48, 'PW'=-47, 'VN'=-46, 'TH'=-45, 'ID'=-44, 'LA'=-43, 'TW'=-42, 'PH'=-41, 'MY'=-40, 'CN'=-39, 'HK'=-38, 'BN'=-37, 'MO'=-36, 'KH'=-35, 'KR'=-34, 'JP'=-33, 'KP'=-32, 'SG'=-31, 'CK'=-30, 'TL'=-29, 'RU'=-28, 'MN'=-27, 'AU'=-26, 'CX'=-25, 'MH'=-24, 'FM'=-23, 'PG'=-22, 'SB'=-21, 'TV'=-20, 'NR'=-19, 'VU'=-18, 'NC'=-17, 'NF'=-16, 'NZ'=-15, 'FJ'=-14, 'LY'=-13, 'CM'=-12, 'SN'=-11, 'CG'=-10, 'PT'=-9, 'LR'=-8, 'CI'=-7, 'GH'=-6, 'GQ'=-5, 'NG'=-4, 'BF'=-3, 'TG'=-2, 'GW'=-1, 'MR'=0, 'BJ'=1, 'GA'=2, 'SL'=3, 'ST'=4, 'GI'=5, 'GM'=6, 'GN'=7, 'TD'=8, 'NE'=9, 'ML'=10, 'EH'=11, 'TN'=12, 'ES'=13, 'MA'=14, 'MT'=15, 'DZ'=16, 'FO'=17, 'DK'=18, 'IS'=19, 'GB'=20, 'CH'=21, 'SE'=22, 'NL'=23, 'AT'=24, 'BE'=25, 'DE'=26, 'LU'=27, 'IE'=28, 'MC'=29, 'FR'=30, 'AD'=31, 'LI'=32, 'JE'=33, 'IM'=34, 'GG'=35, 'SK'=36, 'CZ'=37, 'NO'=38, 'VA'=39, 'SM'=40, 'IT'=41, 'SI'=42, 'ME'=43, 'HR'=44, 'BA'=45, 'AO'=46, 'NA'=47, 'SH'=48, 'BV'=49, 'BB'=50, 'CV'=51, 'GY'=52, 'GF'=53, 'SR'=54, 'PM'=55, 'GL'=56, 'PY'=57, 'UY'=58, 'BR'=59, 'FK'=60, 'GS'=61, 'JM'=62, 'DO'=63, 'CU'=64, 'MQ'=65, 'BS'=66, 'BM'=67, 'AI'=68, 'TT'=69, 'KN'=70, 'DM'=71, 'AG'=72, 'LC'=73, 'TC'=74, 'AW'=75, 'VG'=76, 'VC'=77, 'MS'=78, 'MF'=79, 'BL'=80, 'GP'=81, 'GD'=82, 'KY'=83, 'BZ'=84, 'SV'=85, 'GT'=86, 'HN'=87, 'NI'=88, 'CR'=89, 'VE'=90, 'EC'=91, 'CO'=92, 'PA'=93, 'HT'=94, 'AR'=95, 'CL'=96, 'BO'=97, 'PE'=98, 'MX'=99, 'PF'=100, 'PN'=101, 'KI'=102, 'TK'=103, 'TO'=104, 'WF'=105, 'WS'=106, 'NU'=107, 'MP'=108, 'GU'=109, 'PR'=110, 'VI'=111, 'UM'=112, 'AS'=113, 'CA'=114, 'US'=115, 'PS'=116, 'RS'=117, 'AQ'=118, 'SX'=119, 'CW'=120, 'BQ'=121, 'SS'=122,'BU'=123, 'VD'=124, 'YD'=125, 'DD'=126, ''=127) DEFAULT '',
    "$state"                    LowCardinality(String) DEFAULT '',
    "$city"                     LowCardinality(String) DEFAULT '',
    "$or_api_endpoint"          LowCardinality(String),
    "$timezone"                 Int8 DEFAULT 0 COMMENT 'timezone will be x10 in order to take into consideration countries with tz=N,5H',
    issue_type                  Enum8(''=0,'click_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19,'mouse_thrashing'=20,'app_crash'=21,'incident'=22) DEFAULT '',
    issue_id                    String DEFAULT '',
    error_id                    String DEFAULT '',
    -- Created by the backend
    is_vault                    BOOL DEFAULT FALSE,
    "$tags"                     Array(String) DEFAULT [] COMMENT 'tags are used to filter events',
    "$import"                   BOOL DEFAULT FALSE,
    _deleted_at                 DateTime DEFAULT '1970-01-01 00:00:00',
    _timestamp                  DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, "$event_name", created_at, session_id)
      TTL _deleted_at + INTERVAL 1 DAY DELETE WHERE _deleted_at != '1970-01-01 00:00:00' AND NOT is_vault
      SETTINGS allow_experimental_json_type = 1, enable_json_type = 1;

-- The list of events that should not be ingested,
-- according to a specific event_name and optional properties
CREATE TABLE IF NOT EXISTS product_analytics.dropped_events
(
    project_id UInt16,
    event_name String,
    created_at DateTime64,
    -- conditions = {prop_name:{"operator":"less","value":"XYZ"}}
    -- example: {"person_id":{"operator":"equal","value":"taha"},"_country":{"operator":"equal","value":"FR"}}
    conditions JSON     DEFAULT '{}' COMMENT 'properties will have all constraints',

    _sign      Int8     DEFAULT 1,
    _timestamp DateTime DEFAULT now()
) ENGINE = CollapsingMergeTree(_sign)
      ORDER BY (project_id, event_name)
      SETTINGS allow_experimental_json_type = 1, enable_json_type = 1;

-- The list of properties that should not be ingested in ALL events,
-- according to a specific rule
CREATE TABLE IF NOT EXISTS product_analytics.dropped_properties
(
    project_id    UInt16,
    property_name String,
    created_at    DateTime64,
    -- example: {"operator":"equal","value":"taha"}
    conditions    JSON     DEFAULT '{}' COMMENT 'in the form {"operator":"less","value":"XYZ"}',

    _sign         Int8     DEFAULT 1,
    _timestamp    DateTime DEFAULT now()
) ENGINE = CollapsingMergeTree(_sign)
      ORDER BY (project_id, property_name)
      SETTINGS allow_experimental_json_type = 1, enable_json_type = 1;


-- The list of events that should be hidden in the UI
CREATE TABLE IF NOT EXISTS product_analytics.hidden_events
(
    project_id UInt16,
    event_name String,
    created_at DateTime64,

    _sign      Int8     DEFAULT 1,
    _timestamp DateTime DEFAULT now()
) ENGINE = CollapsingMergeTree(_sign)
      ORDER BY (project_id, event_name);

-- The list of properties that should be hidden in the UI
CREATE TABLE IF NOT EXISTS product_analytics.hidden_properties
(
    project_id    UInt16,
    property_name String,
    created_at    DateTime64,

    _sign         Int8     DEFAULT 1,
    _timestamp    DateTime DEFAULT now()
) ENGINE = CollapsingMergeTree(_sign)
      ORDER BY (project_id, property_name);

-- The list created event's tags
CREATE TABLE IF NOT EXISTS product_analytics.tags
(
    project_id UInt16,
    tag_name   String,
    created_at DateTime64,

    _sign      Int8     DEFAULT 1,
    _timestamp DateTime DEFAULT now()
) ENGINE = CollapsingMergeTree(_sign)
      ORDER BY (project_id, tag_name, created_at);


-- A  group of events related with an OR condition
CREATE TABLE IF NOT EXISTS product_analytics.actions
(
    project_id      UInt16,
    action_id       UUID     DEFAULT generateUUIDv4(),
    name            String,
    created_at      DateTime DEFAULT now(),
    created_by      UInt16 COMMENT 'the OpenReplay user who created this action',
    visibility      String   DEFAULT 'no' COMMENT 'no/read-only/read-write',
    last_queried_by UInt16 COMMENT 'the OpenReplay user who last queried this action',
    -- definition is the list of filter to use in this action, should have the form:
    -- {event_name String, filter JSON COMMENT 'the filter to apply to the selected event_name'}
    definition      Array(JSON),
    _sign           Int8     DEFAULT 1,
    _timestamp      DateTime DEFAULT now()
) ENGINE = CollapsingMergeTree(_sign)
      ORDER BY (project_id, action_id)
      SETTINGS allow_experimental_json_type = 1, enable_json_type = 1;

-- A cohort is a group of events-properties during a specific time period,
-- related with an AND condition to identify users
CREATE TABLE IF NOT EXISTS product_analytics.cohorts
(
    project_id  UInt16,
    cohort_id   UUID     DEFAULT generateUUIDv4(),
    name        String,
    description String   DEFAULT '',
    created_at  DateTime64,
    created_by  UInt16 COMMENT 'the OpenReplay user who created this custom event',
    visibility  String   DEFAULT 'no' COMMENT 'if this custom event is public to the team: no/read-only/read-write',
    -- definition is the list of filter to use in this cohort during a specific time period, should have the form:
    -- {filter JSON COMMENT 'the filter to apply to the selected event_name',time_range  LowCardinality(String)}
    definition  Array(JSON),
    count       UInt32   DEFAULT 0 COMMENT 'the number of users in this cohort',

    _sign       Int8     DEFAULT 1,
    _timestamp  DateTime DEFAULT now()
) ENGINE = CollapsingMergeTree(_sign)
      ORDER BY (project_id, cohort_id)
      SETTINGS allow_experimental_json_type = 1, enable_json_type = 1;

-- Mapping between group_id and group_key
CREATE TABLE IF NOT EXISTS product_analytics.groups
(
    project_id              UInt16,
    group_key1              String        DEFAULT '',
    group_key1_display_name String        DEFAULT '',
    group_key1_properties   Array(String) DEFAULT [],
    group_key2              String        DEFAULT '',
    group_key2_display_name String        DEFAULT '',
    group_key2_properties   Array(String) DEFAULT [],
    group_key3              String        DEFAULT '',
    group_key3_display_name String        DEFAULT '',
    group_key3_properties   Array(String) DEFAULT [],
    group_key4              String        DEFAULT '',
    group_key4_display_name String        DEFAULT '',
    group_key4_properties   Array(String) DEFAULT [],
    group_key5              String        DEFAULT '',
    group_key5_display_name String        DEFAULT '',
    group_key5_properties   Array(String) DEFAULT [],
    group_key6              String        DEFAULT '',
    group_key6_display_name String        DEFAULT '',
    group_key6_properties   Array(String) DEFAULT [],

    created_at              DateTime64,
    _timestamp              DateTime      DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id);

-- The list of property-values of a specific group key-id
CREATE TABLE IF NOT EXISTS product_analytics.group_properties
(
    project_id UInt16,
    group_key  String   DEFAULT '',
    group_id   String   DEFAULT '',
    -- example: group_key: color, group_id: red properties: {"hex":"#123","name":"magenta"}
    properties JSON     DEFAULT '{}',

    created_at DateTime64,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, group_key, group_id)
      SETTINGS allow_experimental_json_type = 1, enable_json_type = 1;


-- The full list of events
-- Experimental: This table is filled by an incremental materialized view
CREATE TABLE IF NOT EXISTS product_analytics.all_events
(
    project_id          UInt16,
    auto_captured       BOOL     DEFAULT FALSE,
    event_name          String,
    event_count_l30days UInt32   DEFAULT 0,
    query_count_l30days UInt32   DEFAULT 0,

    created_at          DateTime64,
    _timestamp          DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, auto_captured, event_name);

CREATE TABLE IF NOT EXISTS product_analytics.all_events_customized
(
    project_id    UInt16,
    auto_captured BOOL                   DEFAULT FALSE,
    event_name    String,
    display_name  String                 DEFAULT '',
    description   String                 DEFAULT '',
    status        LowCardinality(String) DEFAULT 'visible' COMMENT 'visible/hidden/dropped',

    created_at    DateTime64,
    _deleted_at   Nullable(DateTime64),
    _is_deleted   BOOL                   DEFAULT FALSE,
    _timestamp    DateTime               DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp, _is_deleted)
      ORDER BY (project_id, auto_captured, event_name);

CREATE OR REPLACE FUNCTION or_event_display_name AS(event_name)->multiIf(
        event_name == 'CLICK', 'Click',
        event_name == 'INPUT', 'Text Input',
        event_name == 'LOCATION', 'Page View',
        event_name == 'ERROR', 'Error',
        event_name == 'REQUEST', 'Network Request',
        event_name == 'PERFORMANCE', 'Performance',
        event_name == 'ISSUE', 'Issue',
        event_name == 'INCIDENT', 'Incident',
        event_name == 'TAG_TRIGGER', 'Tag',
        '');

CREATE OR REPLACE FUNCTION or_event_description AS(event_name)->multiIf(
        event_name == 'CLICK',
        'Represents a user click on a webpage element. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "CLICK".\n\nContains element selector, text content, …, timestamp.',
        event_name == 'INPUT',
        'Represents text input by a user in form fields or editable elements. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "INPUT".\n\nContains the element selector, ….. and timestamp (actual text content may be masked for privacy).',
        event_name == 'LOCATION',
        'Represents a page navigation or URL change within your application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "LOCATION".\n\nContains the full URL, …. referrer information, UTM parameters and timestamp.',
        event_name == 'ERROR',
        'Represents JavaScript errors and console error messages captured from the application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "error".\n\nContains error message,…., and timestamp.',
        event_name == 'REQUEST',
        'Represents HTTP/HTTPS network activity from the application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "fetch".\n\nContains URL, method, status code, duration, and timestamp',
        ''
                                                                );

-- The full list of event-properties (used to tell which property belongs to which event)
-- Experimental: This table is filled by an incremental materialized view
CREATE TABLE IF NOT EXISTS product_analytics.event_properties
(
    project_id             UInt16,
    event_name             String,
    property_name          String,
    value_type             String,
    auto_captured_event    BOOL,
    auto_captured_property BOOL,

    created_at             DateTime64,
    _timestamp             DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, event_name, property_name, value_type, auto_captured_event, auto_captured_property);


-- The full list of properties (events and users)
-- Experimental: This table is filled by an incremental materialized view
CREATE TABLE IF NOT EXISTS product_analytics.all_properties
(
    project_id        UInt16,
    source            Enum8('sessions'=0,'users'=1,'events'=2),
    property_name     String,
    is_event_property BOOL,
    auto_captured     BOOL,
    data_count        UInt32   DEFAULT 1,
    query_count       UInt32   DEFAULT 0,

    created_at        DateTime64,
    _timestamp        DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, source, property_name, is_event_property, auto_captured);

CREATE TABLE IF NOT EXISTS product_analytics.all_properties_customized
(
    project_id    UInt16,
    source        Enum8('sessions'=0,'users'=1,'events'=2),
    property_name String,
    auto_captured BOOL,
    display_name  String                 DEFAULT '',
    description   String                 DEFAULT '',
    status        LowCardinality(String) DEFAULT 'visible' COMMENT 'visible/hidden/dropped',

    created_at    DateTime64,
    _deleted_at   Nullable(DateTime64),
    _is_deleted   BOOL                   DEFAULT FALSE,
    _timestamp    DateTime               DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp, _is_deleted)
      ORDER BY (project_id, source, property_name, auto_captured);

CREATE OR REPLACE FUNCTION or_property_display_name AS(property_name)->multiIf(
        property_name == 'label', 'Label',
        property_name == 'hesitation_time', 'Hesitation Time',
        property_name == 'name', 'Name',
        property_name == 'payload', 'Payload',
        property_name == 'level', 'Level',
        property_name == 'source', 'Source',
        property_name == 'duration', 'Duration',
        property_name == 'context', 'Context',
        property_name == 'url_host', 'Hostname',
        property_name == 'url_path', 'Path',
        property_name == 'url_hostpath', 'URL Host and Path',
        property_name == 'request_start', 'Request Start',
        property_name == 'response_start', 'Response Start',
        property_name == 'response_end', 'Response End',
        property_name == 'dom_content_loaded_event_start', 'DOM Content Loaded Event Start',
        property_name == 'dom_content_loaded_event_end', 'DOM Content Loaded Event End',
        property_name == 'load_event_start', 'Load Event Start',
        property_name == 'load_event_end', 'Load Event End',
        property_name == 'first_paint', 'First Paint',
        property_name == 'first_contentful_paint_time', 'First Contentful-paint Time',
        property_name == 'speed_index', 'Speed Index',
        property_name == 'visually_complete', 'Visually Complete',
        property_name == 'time_to_interactive', 'Time To Interactive',
        property_name == 'ttfb', 'Time To First Byte',
        property_name == 'ttlb', 'Time To Last Byte',
        property_name == 'response_time', 'Response Time',
        property_name == 'dom_building_time', 'DOM Building Time',
        property_name == 'dom_content_loaded_event_time', 'DOM Content Loaded Event Time',
        property_name == 'load_event_time', 'Load Event Time',
        property_name == 'min_fps', 'Minimum Frame Rate',
        property_name == 'avg_fps', 'Average Frame Rate',
        property_name == 'max_fps', 'Maximum Frame Rate',
        property_name == 'min_cpu', 'Minimum CPU',
        property_name == 'avg_cpu', 'Average CPU',
        property_name == 'max_cpu', 'Maximum CPU',
        property_name == 'min_total_js_heap_size', 'Minimum Total JS Heap Size',
        property_name == 'avg_total_js_heap_size', 'Average Total JS Heap Size',
        property_name == 'max_total_js_heap_size', 'Maximum Total JS Heap Size',
        property_name == 'min_used_js_heap_size', 'Minimum Used JS Heap Size',
        property_name == 'avg_used_js_heap_size', 'Average Used JS Heap Size',
        property_name == 'max_used_js_heap_size', 'Maximum Used JS Heap Size',
        property_name == 'success', 'Success',
        property_name == 'request_body', 'Request Body',
        property_name == 'response_body', 'Response Body',
        property_name == 'transfer_size', 'Transfer Size',
        property_name == 'selector', 'CSS Selector',
        property_name == 'normalized_x', 'Normalized X',
        property_name == 'normalized_y', 'Normalized Y',
        property_name == 'message_id', 'Message ID',
        property_name == 'cls', 'Cumulative Layout Shift',
        property_name == 'lcp', 'Largest Contentful Paint',
        property_name == 'issue_type', 'Issue Type',
        property_name == 'url', 'URL',
        property_name == 'user_device', 'Device',
        property_name == 'user_device_type', 'Platform',
        property_name == 'message', 'Error Message',
        property_name == 'method', 'HTTP Method',
        property_name == 'status', 'Status Code',
        property_name == 'userState', 'State/Province',
        property_name == 'incident', 'Incident Reported By User',
        property_name == 'page_title', 'Page Title',
        '');

CREATE OR REPLACE FUNCTION or_property_visibility AS(property_name)->multiIf(
        property_name == 'label', 'visible',
        property_name == 'tag_id', 'hidden',
        property_name == 'inp', 'hidden',
        property_name == 'web_vitals', 'hidden',
        property_name = 'duration', 'visible',
        property_name = 'avg_cpu', 'hidden',
        property_name = 'avg_fps', 'hidden',
        property_name = 'avg_total_js_heap_size', 'hidden',
        property_name = 'avg_used_js_heap_size', 'hidden',
        property_name = 'dom_building_time', 'hidden',
        property_name = 'dom_content_loaded_event_end', 'hidden',
        property_name = 'dom_content_loaded_event_start', 'hidden',
        property_name = 'dom_content_loaded_event_time', 'hidden',
        property_name = 'first_paint', 'hidden',
        property_name = 'load_event_end', 'hidden',
        property_name = 'load_event_start', 'hidden',
        property_name = 'load_event_time', 'hidden',
        property_name = 'url_hostpath', 'hidden',
        property_name = 'visually_complete', 'hidden',
        property_name = 'time_to_interactive', 'hidden',
        property_name = 'ttlb', 'hidden',
        property_name = 'transfer_size', 'hidden',
        property_name = 'source', 'hidden',
        property_name = 'request_start', 'hidden',
        property_name = 'response_end', 'hidden',
        property_name = 'response_start', 'hidden',
        property_name = 'response_time', 'hidden',
        property_name = 'normalized_x', 'visible',
        property_name = 'normalized_y', 'visible',
        property_name = 'max_total_js_heap_size', 'hidden',
        property_name = 'min_total_js_heap_size', 'hidden',
        property_name = 'userAnonymousId', 'hidden',
        property_name = 'user_device', 'hidden',
        'visible');

-- Autocomplete

CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_events_grouped
(
    project_id UInt16,
    value      String COMMENT 'The $event_name',
    data_count AggregateFunction(sum, UInt16) COMMENT 'The number of appearance during the past month',
    _timestamp DateTime DEFAULT now()
) ENGINE = AggregatingMergeTree()
      ORDER BY (project_id, value)
      PARTITION BY toYYYYMM(_timestamp)
      TTL _timestamp + INTERVAL 1 MONTH;


CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_event_properties_grouped
(
    project_id    UInt16,
    event_name    String COMMENT 'The $event_name',
    property_name String,
    value         String COMMENT 'The property-value as a string',
    data_count    AggregateFunction(sum, UInt16) COMMENT 'The number of appearance during the past month',
    _timestamp    DateTime DEFAULT now()
) ENGINE = AggregatingMergeTree()
      ORDER BY (project_id, event_name, property_name, value)
      PARTITION BY toYYYYMM(_timestamp)
      TTL _timestamp + INTERVAL 1 MONTH;


CREATE TABLE IF NOT EXISTS experimental.parsed_errors
(
    project_id           UInt16,
    error_id             String,
    stacktrace           String,
    stacktrace_parsed_at DateTime DEFAULT now(),
    is_deleted           UInt8
) ENGINE = ReplacingMergeTree(stacktrace_parsed_at, is_deleted)
      ORDER BY (project_id, error_id);


-- Autocomplete for all values not related to events (browser/metadata/country/...)
CREATE TABLE IF NOT EXISTS product_analytics.autocomplete_simple
(
    project_id    UInt16,
    auto_captured bool,
    source        Enum8('sessions'=0,'users'=1,'events'=2),
    name          LowCardinality(String),
    value         String,
    data_count    AggregateFunction(sum, UInt16) COMMENT 'The number of appearance during the past month',
    _timestamp    DateTime
) ENGINE = AggregatingMergeTree()
      ORDER BY (project_id, auto_captured, source, name, value)
      PARTITION BY toYYYYMM(_timestamp)
      TTL _timestamp + INTERVAL 1 MONTH;

CREATE TABLE IF NOT EXISTS product_analytics.user_properties
(
    project_id             UInt16,
    user_id                String,
    property_name          String,
    value_type             String,
    auto_captured_property BOOL,

    _timestamp             DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      PARTITION BY toYYYYMM(_timestamp)
      ORDER BY (project_id, user_id, property_name, value_type, auto_captured_property);

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


-- =====================================================================================
-- MATERIALIZED VIEWS
-- All materialized views are placed at the end of the script to ensure
-- all referenced tables and functions exist before the views are created.
-- =====================================================================================

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
       user_city,
       user_state,
       platform,
       datetime,
       timezone,
       duration,
       pages_count,
       events_count,
       errors_count,
       utm_source,
       utm_medium,
       utm_campaign,
       user_id,
       user_anonymous_id,
       issue_types,
       referrer,
       base_referrer,
       screen_width,
       screen_height,
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
       _timestamp
FROM experimental.sessions
WHERE datetime >= now() - INTERVAL 7 DAY
  AND isNotNull(duration)
  AND duration > 0;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.all_events_extractor_mv
    TO product_analytics.all_events AS
SELECT project_id,
       `$auto_captured` AS auto_captured,
       `$event_name`    AS event_name,
       created_at       AS created_at,
       FALSE            AS _edited_by_user
FROM product_analytics.events
GROUP BY ALL;

-- Incremental materialized view to fill event_properties using $properties & properties
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.event_dproperties_extractor_mv
    TO product_analytics.event_properties AS
SELECT project_id,
       `$event_name`    AS event_name,
       a.1              AS property_name,
       a.2              AS value_type,
       `$auto_captured` AS auto_captured_event,
       TRUE             AS auto_captured_property,
       created_at
FROM product_analytics.events
         ARRAY JOIN JSONAllPathsWithTypes(`$properties`) AS a
GROUP BY ALL;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.event_properties_extractor_mv
    TO product_analytics.event_properties AS
SELECT project_id,
       `$event_name`    AS event_name,
       a.1              AS property_name,
       a.2              AS value_type,
       `$auto_captured` AS auto_captured_event,
       FALSE            AS auto_captured_property,
       created_at
FROM product_analytics.events
         ARRAY JOIN JSONAllPathsWithTypes(`properties`) AS a
GROUP BY ALL;

-- Incremental materialized view to fill all_properties
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.events_all_properties_extractor_mv
    TO product_analytics.all_properties AS
SELECT project_id,
       'events'                    AS source,
       property_name,
       TRUE                        AS is_event_property,
       auto_captured_property      AS auto_captured,
       0                           AS data_count,
       0                           AS query_count,
       event_properties.created_at AS created_at,
       FALSE                       AS _edited_by_user
FROM product_analytics.event_properties;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.users_all_properties_extractor_mv
    TO product_analytics.all_properties AS
SELECT project_id,
       'users'                AS source,
       property_name,
       FALSE                  AS is_event_property,
       auto_captured_property AS auto_captured,
       0                      AS data_count,
       0                      AS query_count,
       _timestamp             AS created_at,
       FALSE                  AS _edited_by_user
FROM product_analytics.user_properties;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_events_grouped_mv
    TO product_analytics.autocomplete_events_grouped AS
SELECT project_id,
       `$event_name`         AS value,
       sumState(toUInt16(1)) AS data_count
FROM product_analytics.events
WHERE value != ''
GROUP BY ALL;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_event_properties_grouped_mv
    TO product_analytics.autocomplete_event_properties_grouped AS
SELECT project_id,
       `$event_name`         AS event_name,
       a.1                   AS property_name,
       a.2                   AS value,
       sumState(toUInt16(1)) AS data_count
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeysAndValues(toString(`properties`), 'String') AS a
WHERE length(a.1) > 0
  AND isNull(toFloat64OrNull(a.1))
GROUP BY ALL;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_event_dproperties_grouped_mv
    TO product_analytics.autocomplete_event_properties_grouped AS
SELECT project_id,
       `$event_name`         AS event_name,
       a.1                   AS property_name,
       a.2                   AS value,
       sumState(toUInt16(1)) AS data_count
FROM product_analytics.events
         ARRAY JOIN JSONExtractKeysAndValues(toString(`$properties`), 'String') AS a
WHERE length(a.1) > 0
  AND isNull(toFloat64OrNull(a.1))
GROUP BY ALL;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_sessions_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       t.3                   AS auto_captured,
       'sessions'            AS source,
       t.1                   AS name,
       toString(t.2)         AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM experimental.sessions
         ARRAY JOIN
     [--(name,column,auto-captured)
         ('user_browser', user_browser, TRUE),
         ('user_browser_version', user_browser_version, TRUE),
         ('user_country', user_country, TRUE),
         ('user_state', user_state, TRUE),
         ('user_city', user_city, TRUE),
         ('user_device', user_device, TRUE),
         ('rev_id', rev_id, TRUE),
         ('referrer', referrer, TRUE),
         ('utm_source', utm_source, TRUE),
         ('utm_medium', utm_medium, TRUE),
         ('utm_campaign', utm_campaign, TRUE),
         ('user_id', user_id, FALSE),
         ('user_anonymous_id', user_anonymous_id, FALSE),
         ('metadata_1', metadata_1, FALSE),
         ('metadata_2', metadata_2, FALSE),
         ('metadata_3', metadata_3, FALSE),
         ('metadata_4', metadata_4, FALSE),
         ('metadata_5', metadata_5, FALSE),
         ('metadata_6', metadata_6, FALSE),
         ('metadata_7', metadata_7, FALSE),
         ('metadata_8', metadata_8, FALSE),
         ('metadata_9', metadata_9, FALSE),
         ('metadata_10', metadata_10, FALSE)
         ] AS t
WHERE isNotNull(t.2)
  AND notEmpty(toString(t.2))
GROUP BY ALL;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.user_properties_extractor_mv
    TO product_analytics.user_properties AS
SELECT project_id,
       `$user_id` AS user_id,
       a.1        AS property_name,
       a.2        AS value_type,
       FALSE      AS auto_captured_property
FROM product_analytics.users
         ARRAY JOIN JSONAllPathsWithTypes(`properties`) AS a
GROUP BY ALL;

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

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_events_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       t.3                   AS auto_captured,
       'events'              AS source,
       t.1                   AS name,
       toString(t.2)         AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM product_analytics.events
         ARRAY JOIN
     [--(name,column,auto-captured)
         ('$user_id', "$user_id", FALSE),
         ('$sdk_edition', "$sdk_edition", TRUE),
         ('$sdk_version', "$sdk_version", TRUE),
         ('$current_url', "$current_url", TRUE),
         ('$current_path', "$current_path", TRUE),
         ('$initial_referrer', "$initial_referrer", TRUE),
         ('$referring_domain', "$referring_domain", TRUE),
         ('$country', "$country", TRUE),
         ('$state', "$state", TRUE),
         ('$city', "$city", TRUE),
         ('$or_api_endpoint', "$or_api_endpoint", TRUE)
         ] AS t
WHERE isNotNull(t.2)
  AND notEmpty(toString(t.2))
GROUP BY ALL;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_users_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       t.3                   AS auto_captured,
       'users'               AS source,
       t.1                   AS name,
       toString(t.2)         AS value,
       sumState(toUInt16(1)) AS data_count,
       _timestamp
FROM product_analytics.users
         ARRAY JOIN
     [--(name,column,auto-captured)
         ('$user_id', "$user_id", FALSE),
         ('$email', "$email", FALSE),
         ('$name', "$name", FALSE),
         ('$first_name', "$first_name", FALSE),
         ('$last_name', "$last_name", FALSE),
         ('$phone', "$phone", FALSE),
         ('$sdk_edition', "$sdk_edition", TRUE),
         ('$sdk_version', "$sdk_version", TRUE),
         ('$current_url', "$current_url", TRUE),
         ('$current_path', "$current_path", TRUE),
         ('$initial_referrer', "$initial_referrer", TRUE),
         ('$referring_domain', "$referring_domain", TRUE),
         ('initial_utm_source', initial_utm_source, TRUE),
         ('initial_utm_medium', initial_utm_medium, TRUE),
         ('initial_utm_campaign', initial_utm_campaign, TRUE),
         ('$country', "$country", TRUE),
         ('$state', "$state", TRUE),
         ('$city', "$city", TRUE),
         ('$or_api_endpoint', "$or_api_endpoint", TRUE)
         ] AS t
WHERE isNotNull(t.2)
  AND notEmpty(toString(t.2))
GROUP BY ALL;
