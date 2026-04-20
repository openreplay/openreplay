SELECT throwIf((SELECT openreplay_migration_state()) != 3, 'Previous step is not done') AS check;

DROP TABLE IF EXISTS product_analytics.all_events;
CREATE TABLE IF NOT EXISTS product_analytics.all_events
(
    project_id          UInt16,
    auto_captured       BOOL     DEFAULT FALSE,
    event_name          String,
    display_name        String   DEFAULT '',
    description         String   DEFAULT '',
    event_count_l30days UInt32   DEFAULT 0,
    query_count_l30days UInt32   DEFAULT 0,

    created_at          DateTime64,
    _edited_by_user     BOOL     DEFAULT FALSE,
    _timestamp          DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
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
        'Represents a user click on a webpage element. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "CLICK".

Contains element selector, text content, …, timestamp.',
        event_name == 'INPUT',
        'Represents text input by a user in form fields or editable elements. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "INPUT".

Contains the element selector, ….. and timestamp (actual text content may be masked for privacy).',
        event_name == 'LOCATION',
        'Represents a page navigation or URL change within your application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "LOCATION".

Contains the full URL, …. referrer information, UTM parameters and timestamp.',
        event_name == 'ERROR',
        'Represents JavaScript errors and console error messages captured from the application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "error".

Contains error message,…., and timestamp.',
        event_name == 'REQUEST',
        'Represents HTTP/HTTPS network activity from the application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "fetch".

Contains URL, method, status code, duration, and timestamp',
        '');



CREATE MATERIALIZED VIEW IF NOT EXISTS product_analytics.all_events_extractor_mv
    TO product_analytics.all_events AS
SELECT project_id,
       `$auto_captured`                     AS auto_captured,
       `$event_name`                        AS event_name,
       created_at                           AS created_at,
       or_event_display_name(`$event_name`) AS display_name,
       or_event_description(`$event_name`)  AS description,
       FALSE                                AS _edited_by_user
FROM product_analytics.events
GROUP BY ALL;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 4;
