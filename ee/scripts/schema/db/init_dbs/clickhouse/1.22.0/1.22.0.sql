SELECT 1
FROM (SELECT throwIf(platform = 'ios', 'IOS sessions found')
      FROM experimental.sessions) AS raw
LIMIT 1;

SELECT 1
FROM (SELECT throwIf(platform = 'android', 'Android sessions found')
      FROM experimental.sessions) AS raw
LIMIT 1;

ALTER TABLE experimental.sessions
    MODIFY COLUMN platform Enum8('web'=1,'mobile'=2) DEFAULT 'web';

CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.22.0-ee';

SET allow_experimental_json_type = 1;

CREATE DATABASE IF NOT EXISTS product_analytics;

-- The table of identified users
CREATE TABLE IF NOT EXISTS product_analytics.users
(
    project_id           UInt16,
    "$distinct_id"       UInt16,
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
    _timestamp           DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, "$distinct_id")
      TTL _deleted_at + INTERVAL 1 DAY DELETE WHERE _deleted_at != '1970-01-01 00:00:00';


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
    user_id      UInt16 COMMENT 'if 0: the person has been deleted, and should set user_id to 0 in the events table',

    _deleted_at  DateTime DEFAULT '1970-01-01 00:00:00',
    _timestamp   DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, "$device_id", user_id)
      TTL _deleted_at + INTERVAL 1 DAY DELETE WHERE _deleted_at != '1970-01-01 00:00:00';


-- This table is used in order to relate a distinct_id to an identified user.
-- The data in this table will be used to propagate changes of user_id in events table
CREATE TABLE IF NOT EXISTS product_analytics.users_distinct_id
(
    project_id  UInt16,
    distinct_id String COMMENT 'this is the event\'s distinct_id',
    user_id     UInt16 COMMENT 'if 0: the person has been deleted, and should set user_id to 0 in the events table',

    _timestamp  DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, distinct_id);


CREATE TABLE IF NOT EXISTS product_analytics.events
(
    project_id                  UInt16,
    event_id                    UUID,
    "$event_name"               String,
    created_at                  DateTime64,
    distinct_id                 String,
    "$user_id"                  UInt16 DEFAULT 0,
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
    "$device_id"                String,
    "$os"                       LowCardinality(String) DEFAULT '',
    "$os_version"               LowCardinality(String) DEFAULT '',
    "$browser"                  LowCardinality(String) DEFAULT '',
    "$browser_version"          String DEFAULT '',
    "$device"                   LowCardinality(String) DEFAULT '' COMMENT 'in session, it is platform; web/mobile',
    "$screen_height"            UInt16 DEFAULT 0,
    "$screen_width"             UInt16 DEFAULT 0,
    "$current_url"              String DEFAULT '',
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
    issue_type                  Enum8(''=0,'click_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19,'mouse_thrashing'=20,'app_crash'=21) DEFAULT '',
    issue_id                    String DEFAULT '',
    error_id                    String DEFAULT '',
    -- Created by the backend
    "$tags"                     Array(String) DEFAULT [] COMMENT 'tags are used to filter events',
    "$import"                   BOOL DEFAULT FALSE,
    _deleted_at                 DateTime DEFAULT '1970-01-01 00:00:00',
    _timestamp                  DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, "$event_name", created_at, session_id)
      TTL _deleted_at + INTERVAL 1 DAY DELETE WHERE _deleted_at != '1970-01-01 00:00:00';

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
      ORDER BY (project_id, event_name);

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
      ORDER BY (project_id, property_name);


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
      ORDER BY (project_id, action_id);

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
      ORDER BY (project_id, cohort_id);

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
      ORDER BY (project_id, group_key, group_id);


-- The full list of events
CREATE TABLE IF NOT EXISTS product_analytics.all_events
(
    project_id          UInt16,
    event_name          String,
    display_name        String   DEFAULT '',
    description         String   DEFAULT '',
    event_count_l30days UInt32   DEFAULT 0,
    query_count_l30days UInt32   DEFAULT 0,

    created_at          DateTime64,
    _timestamp          DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, event_name);


-- The full list of properties (events and users)
CREATE TABLE IF NOT EXISTS product_analytics.all_properties
(
    project_id        UInt16,
    property_name     String,
    is_event_property BOOL,
    display_name      String   DEFAULT '',
    description       String   DEFAULT '',
    status            String   DEFAULT 'visible' COMMENT 'visible/hidden/dropped',
    data_count        UInt32   DEFAULT 1,
    query_count       UInt32   DEFAULT 0,

    created_at        DateTime64,
    _timestamp        DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
      ORDER BY (project_id, property_name, is_event_property);


DROP TABLE IF EXISTS experimental.events_l7d_mv;