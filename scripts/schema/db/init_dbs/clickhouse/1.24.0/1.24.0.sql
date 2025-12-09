CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.24.0';

DROP TABLE IF EXISTS product_analytics.users;
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
      TTL _deleted_at + INTERVAL 1 DAY DELETE WHERE _deleted_at != '1970-01-01 00:00:00'
      SETTINGS allow_experimental_json_type = 1, enable_json_type = 1;



DROP TABLE IF EXISTS product_analytics.user_devices;
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



DROP TABLE IF EXISTS product_analytics.users_distinct_id;
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
      TTL _deleted_at;


ALTER TABLE product_analytics.events
    RENAME COLUMN "$user_id" TO "_$user_id",
    DROP COLUMN "_$user_id",
    ADD COLUMN "$user_id" String AFTER distinct_id;
ALTER TABLE product_analytics.events
    MODIFY COLUMN "$device_id" String AFTER "$user_id";

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_browser_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_browser_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE           AS auto_captured,
       'session'      AS source,
       'user_browser' AS name,
       user_browser   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_browser)
  AND notEmpty(user_browser);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_country_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_country_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE                   AS auto_captured,
       'session'              AS source,
       'user_country'         AS name,
       toString(user_country) AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_country)
  AND notEmpty(toString(user_country));

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_state_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_state_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE         AS auto_captured,
       'session'    AS source,
       'user_state' AS name,
       user_state   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_state)
  AND notEmpty(user_state);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_city_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_city_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE        AS auto_captured,
       'session'   AS source,
       'user_city' AS name,
       user_city   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_city)
  AND notEmpty(user_city);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_device_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_device_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE          AS auto_captured,
       'session'     AS source,
       'user_device' AS name,
       user_device   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_device)
  AND notEmpty(user_device);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_rev_id_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_rev_id_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE      AS auto_captured,
       'session' AS source,
       'rev_id'  AS name,
       rev_id    AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(rev_id)
  AND notEmpty(rev_id);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_referrer_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_referrer_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE       AS auto_captured,
       'session'  AS source,
       'referrer' AS name,
       referrer   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(referrer)
  AND notEmpty(referrer);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_utm_source_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_utm_source_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE         AS auto_captured,
       'session'    AS source,
       'utm_source' AS name,
       referrer     AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(utm_source)
  AND notEmpty(utm_source);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_utm_medium_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_utm_medium_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE         AS auto_captured,
       'session'    AS source,
       'utm_medium' AS name,
       referrer     AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(utm_medium)
  AND notEmpty(utm_medium);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_utm_campaign_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_utm_campaign_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       TRUE           AS auto_captured,
       'session'      AS source,
       'utm_campaign' AS name,
       referrer       AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(utm_campaign)
  AND notEmpty(utm_campaign);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_id_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_id_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE     AS auto_captured,
       'session' AS source,
       'user_id' AS name,
       user_id   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_id)
  AND notEmpty(user_id);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_user_anonymous_id_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_user_anonymous_id_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE               AS auto_captured,
       'session'           AS source,
       'user_anonymous_id' AS name,
       user_anonymous_id   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(user_anonymous_id)
  AND notEmpty(user_anonymous_id);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_1_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_1_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_1' AS name,
       metadata_1   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_1)
  AND notEmpty(metadata_1);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_2_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_2_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_2' AS name,
       metadata_2   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_2)
  AND notEmpty(metadata_2);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_3_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_3_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_3' AS name,
       metadata_3   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_3)
  AND notEmpty(metadata_3);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_4_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_4_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_4' AS name,
       metadata_4   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_4)
  AND notEmpty(metadata_4);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_5_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_5_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_5' AS name,
       metadata_5   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_5)
  AND notEmpty(metadata_5);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_6_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_6_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_6' AS name,
       metadata_6   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_6)
  AND notEmpty(metadata_6);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_7_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_7_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_7' AS name,
       metadata_7   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_7)
  AND notEmpty(metadata_7);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_8_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_8_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_8' AS name,
       metadata_8   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_8)
  AND notEmpty(metadata_8);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_9_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_9_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE        AS auto_captured,
       'session'    AS source,
       'metadata_9' AS name,
       metadata_9   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_9)
  AND notEmpty(metadata_9);

DROP TABLE IF EXISTS product_analytics.autocomplete_simple_metadata_10_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.autocomplete_simple_metadata_10_mv
    TO product_analytics.autocomplete_simple AS
SELECT project_id,
       FALSE         AS auto_captured,
       'session'     AS source,
       'metadata_10' AS name,
       metadata_10   AS value,
       _timestamp
FROM experimental.sessions
WHERE isNotNull(metadata_10)
  AND notEmpty(metadata_10);

DROP TABLE IF EXISTS product_analytics.property_dvalues_sampler_mv;
DROP TABLE IF EXISTS product_analytics.property_values_sampler_mv;
DROP TABLE IF EXISTS product_analytics.event_dproperties_extractor_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_event_properties_grouped_mv;

DROP TABLE IF EXISTS product_analytics.event_dproperties_extractor_mv SYNC;
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

DROP TABLE IF EXISTS product_analytics.event_properties_extractor_mv SYNC;
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