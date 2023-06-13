\set previous_version 'v1.9.0'
\set next_version 'v1.10.0'
SELECT openreplay_version()                       AS current_version,
       openreplay_version() = :'previous_version' AS valid_previous,
       openreplay_version() = :'next_version'     AS is_next
\gset

\if :valid_previous
\echo valid previous DB version :'previous_version', starting DB upgrade to :'next_version'
BEGIN;
SELECT format($fn_def$
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT '%1$s'
$$ LANGUAGE sql IMMUTABLE;
$fn_def$, :'next_version')
\gexec

--
-- Backup dashboard & search data:
DO
$$
    BEGIN
        IF NOT (SELECT EXISTS(SELECT schema_name
                              FROM information_schema.schemata
                              WHERE schema_name = 'backup_v1_10_0')) THEN
            CREATE SCHEMA backup_v1_10_0;
            CREATE TABLE backup_v1_10_0.dashboards
            (
                dashboard_id integer,
                project_id   integer,
                user_id      integer,
                name         text      NOT NULL,
                description  text      NOT NULL DEFAULT '',
                is_public    boolean   NOT NULL DEFAULT TRUE,
                is_pinned    boolean   NOT NULL DEFAULT FALSE,
                created_at   timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
                deleted_at   timestamp NULL     DEFAULT NULL
            );
            CREATE TABLE backup_v1_10_0.dashboard_widgets
            (
                widget_id    integer,
                dashboard_id integer,
                metric_id    integer,
                user_id      integer,
                created_at   timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
                config       jsonb     NOT NULL DEFAULT '{}'::jsonb
            );
            CREATE TABLE backup_v1_10_0.searches
            (
                search_id  integer,
                project_id integer,
                user_id    integer,
                name       text    not null,
                filter     jsonb   not null,
                created_at timestamp        default timezone('utc'::text, now()) not null,
                deleted_at timestamp,
                is_public  boolean NOT NULL DEFAULT False
            );
            CREATE TABLE backup_v1_10_0.metrics
            (
                metric_id      integer,
                project_id     integer,
                user_id        integer,
                name           text      NOT NULL,
                is_public      boolean   NOT NULL DEFAULT FALSE,
                active         boolean   NOT NULL DEFAULT TRUE,
                created_at     timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
                deleted_at     timestamp,
                edited_at      timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
                metric_type    text      NOT NULL,
                view_type      text      NOT NULL,
                metric_of      text      NOT NULL DEFAULT 'sessionCount',
                metric_value   text[]    NOT NULL DEFAULT '{}'::text[],
                metric_format  text,
                category       text      NULL     DEFAULT 'custom',
                is_pinned      boolean   NOT NULL DEFAULT FALSE,
                is_predefined  boolean   NOT NULL DEFAULT FALSE,
                is_template    boolean   NOT NULL DEFAULT FALSE,
                predefined_key text      NULL     DEFAULT NULL,
                default_config jsonb     NOT NULL
            );
            CREATE TABLE backup_v1_10_0.metric_series
            (
                series_id  integer,
                metric_id  integer,
                index      integer                                        NOT NULL,
                name       text                                           NULL,
                filter     jsonb                                          NOT NULL,
                created_at timestamp DEFAULT timezone('utc'::text, now()) NOT NULL,
                deleted_at timestamp
            );

            INSERT INTO backup_v1_10_0.dashboards(dashboard_id, project_id, user_id, name, description, is_public,
                                                  is_pinned,
                                                  created_at, deleted_at)
            SELECT dashboard_id,
                   project_id,
                   user_id,
                   name,
                   description,
                   is_public,
                   is_pinned,
                   created_at,
                   deleted_at
            FROM public.dashboards
            ORDER BY dashboard_id;

            INSERT INTO backup_v1_10_0.metrics(metric_id, project_id, user_id, name, is_public, active, created_at,
                                               deleted_at, edited_at, metric_type, view_type, metric_of, metric_value,
                                               metric_format, category, is_pinned, is_predefined, is_template,
                                               predefined_key, default_config)
            SELECT metric_id,
                   project_id,
                   user_id,
                   name,
                   is_public,
                   active,
                   created_at,
                   deleted_at,
                   edited_at,
                   metric_type,
                   view_type,
                   metric_of,
                   metric_value,
                   metric_format,
                   category,
                   is_pinned,
                   is_predefined,
                   is_template,
                   predefined_key,
                   default_config
            FROM public.metrics
            ORDER BY metric_id;

            INSERT INTO backup_v1_10_0.metric_series(series_id, metric_id, index, name, filter, created_at, deleted_at)
            SELECT series_id, metric_id, index, name, filter, created_at, deleted_at
            FROM public.metric_series
            ORDER BY series_id;

            INSERT INTO backup_v1_10_0.dashboard_widgets(widget_id, dashboard_id, metric_id, user_id, created_at, config)
            SELECT widget_id, dashboard_id, metric_id, user_id, created_at, config
            FROM public.dashboard_widgets
            ORDER BY widget_id;

            INSERT INTO backup_v1_10_0.searches(search_id, project_id, user_id, name, filter, created_at, deleted_at,
                                                is_public)
            SELECT search_id,
                   project_id,
                   user_id,
                   name,
                   filter,
                   created_at,
                   deleted_at,
                   is_public
            FROM public.searches
            ORDER BY search_id;
        END IF;
    END
$$ LANGUAGE plpgsql;

ALTER TYPE webhook_type ADD VALUE IF NOT EXISTS 'msteams';

UPDATE metrics
SET is_public= TRUE;

CREATE OR REPLACE FUNCTION get_global_key(key text)
    RETURNS text AS
$$
DECLARE
    events_map CONSTANT JSONB := '{
          "SESSIONS": "sessions",
          "sessionCount": "sessionCount",
          "CLICK": "click",
          "INPUT": "input",
          "LOCATION": "location",
          "CUSTOM": "custom",
          "REQUEST": "request",
          "FETCH": "fetch",
          "GRAPHQL": "graphql",
          "STATEACTION": "stateAction",
          "ERROR": "error",
          "CLICK_IOS": "clickIos",
          "INPUT_IOS": "inputIos",
          "VIEW_IOS": "viewIos",
          "CUSTOM_IOS": "customIos",
          "REQUEST_IOS": "requestIos",
          "ERROR_IOS": "errorIos",
          "DOM_COMPLETE": "domComplete",
          "LARGEST_CONTENTFUL_PAINT_TIME": "largestContentfulPaintTime",
          "TIME_BETWEEN_EVENTS": "timeBetweenEvents",
          "TTFB": "ttfb",
          "AVG_CPU_LOAD": "avgCpuLoad",
          "AVG_MEMORY_USAGE": "avgMemoryUsage",
          "FETCH_FAILED": "fetchFailed",
          "FETCH_URL": "fetchUrl",
          "FETCH_STATUS_CODE": "fetchStatusCode",
          "FETCH_METHOD": "fetchMethod",
          "FETCH_DURATION": "fetchDuration",
          "FETCH_REQUEST_BODY": "fetchRequestBody",
          "FETCH_RESPONSE_BODY": "fetchResponseBody",
          "GRAPHQL_NAME": "graphqlName",
          "GRAPHQL_METHOD": "graphqlMethod",
          "GRAPHQL_REQUEST_BODY": "graphqlRequestBody",
          "GRAPHQL_RESPONSE_BODY": "graphqlResponseBody",
          "USEROS": "userOs",
          "USERBROWSER": "userBrowser",
          "USERDEVICE": "userDevice",
          "USERCOUNTRY": "userCountry",
          "USERID": "userId",
          "USERANONYMOUSID": "userAnonymousId",
          "REFERRER": "referrer",
          "REVID": "revId",
          "USEROS_IOS": "userOsIos",
          "USERDEVICE_IOS": "userDeviceIos",
          "USERCOUNTRY_IOS": "userCountryIos",
          "USERID_IOS": "userIdIos",
          "USERANONYMOUSID_IOS": "userAnonymousIdIos",
          "REVID_IOS": "revIdIos",
          "DURATION": "duration",
          "PLATFORM": "platform",
          "METADATA": "metadata",
          "ISSUE": "issue",
          "EVENTS_COUNT": "eventsCount",
          "UTM_SOURCE": "utmSource",
          "UTM_MEDIUM": "utmMedium",
          "UTM_CAMPAIGN": "utmCampaign"
        }';
BEGIN
    RETURN jsonb_extract_path(events_map, key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE IF EXISTS metrics
    ALTER COLUMN metric_type TYPE text,
    ALTER COLUMN metric_type SET DEFAULT 'timeseries',
    ALTER COLUMN view_type TYPE text,
    ALTER COLUMN view_type SET DEFAULT 'lineChart',
    ADD COLUMN IF NOT EXISTS thumbnail text;

DO
$$
    BEGIN
        IF EXISTS(SELECT column_name
                  FROM information_schema.columns
                  WHERE table_name = 'metrics'
                    AND column_name = 'is_predefined'
                    AND table_schema = 'public') THEN
            -- 0. change metric_of
            UPDATE metrics
            SET metric_of=coalesce(replace(get_global_key(metric_of), '"', ''),
                                   left(metric_of, 1) || right(replace(initcap(metric_of), '_', ''), -1))
            WHERE not is_predefined;

            -- 1. pre transform structure
            ALTER TABLE IF EXISTS metrics
                ADD COLUMN IF NOT EXISTS o_metric_id INTEGER,
                ADD COLUMN IF NOT EXISTS o_widget_id INTEGER;

            -- 2. insert predefined metrics related to dashboards as custom metrics
            INSERT INTO metrics(project_id, user_id, name, metric_type, view_type, metric_of, metric_value,
                                metric_format, default_config, is_public, o_metric_id, o_widget_id)
            SELECT dashboards.project_id,
                   dashboard_widgets.user_id,
                   metrics.name,
                   left(category, 1) || right(replace(initcap(category), ' ', ''), -1)             AS metric_type,
                   'chart'                                                                         AS view_type,
                   left(predefined_key, 1) || right(replace(initcap(predefined_key), '_', ''), -1) AS metric_of,
                   metric_value,
                   metric_format,
                   default_config,
                   TRUE                                                                            AS is_public,
                   metrics.metric_id,
                   dashboard_widgets.widget_id
            FROM metrics
                     INNER JOIN dashboard_widgets USING (metric_id)
                     INNER JOIN dashboards USING (dashboard_id)
            WHERE is_predefined;

            -- 3. update widgets
            UPDATE dashboard_widgets
            SET metric_id=metrics.metric_id
            FROM metrics
            WHERE metrics.o_widget_id IS NOT NULL
              AND dashboard_widgets.widget_id = metrics.o_widget_id;

            -- 4. delete predefined metrics
            DELETE
            FROM metrics
            WHERE is_predefined;

            ALTER TABLE IF EXISTS metrics
                DROP COLUMN IF EXISTS active,
                DROP COLUMN IF EXISTS is_predefined,
                DROP COLUMN IF EXISTS predefined_key,
                DROP COLUMN IF EXISTS is_template,
                DROP COLUMN IF EXISTS category,
                DROP COLUMN IF EXISTS o_metric_id,
                DROP COLUMN IF EXISTS o_widget_id,
                DROP CONSTRAINT IF EXISTS null_project_id_for_template_only,
                DROP CONSTRAINT IF EXISTS metrics_unique_key,
                DROP CONSTRAINT IF EXISTS unique_key;

        END IF;
    END;
$$
LANGUAGE plpgsql;

DROP TYPE IF EXISTS metric_type;
DROP TYPE IF EXISTS metric_view_type;

ALTER TABLE IF EXISTS events.clicks
    ADD COLUMN IF NOT EXISTS path text;

DROP INDEX IF EXISTS events.clicks_url_gin_idx;
DROP INDEX IF EXISTS events.inputs_label_value_idx;
DROP INDEX IF EXISTS events.inputs_label_idx;
DROP INDEX IF EXISTS events.pages_base_path_idx;
DROP INDEX IF EXISTS events.pages_base_path_idx1;
DROP INDEX IF EXISTS events.pages_base_path_idx2;
DROP INDEX IF EXISTS events.pages_base_referrer_gin_idx1;
DROP INDEX IF EXISTS events.pages_base_referrer_gin_idx2;
DROP INDEX IF EXISTS events.resources_url_gin_idx;
DROP INDEX IF EXISTS events.resources_url_idx;
DROP INDEX IF EXISTS events.resources_url_hostpath_idx;
DROP INDEX IF EXISTS events.resources_session_id_timestamp_idx;
DROP INDEX IF EXISTS events.resources_duration_durationgt0_idx;
DROP INDEX IF EXISTS events.state_actions_name_idx;
DROP INDEX IF EXISTS events_common.requests_query_nn_idx;
DROP INDEX IF EXISTS events_common.requests_host_nn_idx;
DROP INDEX IF EXISTS events_common.issues_context_string_gin_idx;
DROP INDEX IF EXISTS public.sessions_user_country_gin_idx;
DROP INDEX IF EXISTS public.sessions_user_browser_gin_idx;
DROP INDEX IF EXISTS public.sessions_user_os_gin_idx;
DROP INDEX IF EXISTS public.issues_context_string_gin_idx;


ALTER TABLE IF EXISTS projects
    ADD COLUMN IF NOT EXISTS beacon_size integer NOT NULL DEFAULT 0;

-- To migrate saved search data

SET client_min_messages TO NOTICE;
CREATE OR REPLACE FUNCTION get_new_event_key(key text)
    RETURNS text AS
$$
DECLARE
    events_map CONSTANT JSONB := '{
          "CLICK": "click",
          "INPUT": "input",
          "LOCATION": "location",
          "CUSTOM": "custom",
          "REQUEST": "request",
          "FETCH": "fetch",
          "GRAPHQL": "graphql",
          "STATEACTION": "stateAction",
          "ERROR": "error",
          "CLICK_IOS": "clickIos",
          "INPUT_IOS": "inputIos",
          "VIEW_IOS": "viewIos",
          "CUSTOM_IOS": "customIos",
          "REQUEST_IOS": "requestIos",
          "ERROR_IOS": "errorIos",
          "DOM_COMPLETE": "domComplete",
          "LARGEST_CONTENTFUL_PAINT_TIME": "largestContentfulPaintTime",
          "TIME_BETWEEN_EVENTS": "timeBetweenEvents",
          "TTFB": "ttfb",
          "AVG_CPU_LOAD": "avgCpuLoad",
          "AVG_MEMORY_USAGE": "avgMemoryUsage",
          "FETCH_FAILED": "fetchFailed"
        }';
BEGIN
    RETURN jsonb_extract_path(events_map, key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;


CREATE OR REPLACE FUNCTION get_new_event_filter_key(key text)
    RETURNS text AS
$$
DECLARE
    event_filters_map CONSTANT JSONB := '{
          "FETCH_URL": "fetchUrl",
          "FETCH_STATUS_CODE": "fetchStatusCode",
          "FETCH_METHOD": "fetchMethod",
          "FETCH_DURATION": "fetchDuration",
          "FETCH_REQUEST_BODY": "fetchRequestBody",
          "FETCH_RESPONSE_BODY": "fetchResponseBody",
          "GRAPHQL_NAME": "graphqlName",
          "GRAPHQL_METHOD": "graphqlMethod",
          "GRAPHQL_REQUEST_BODY": "graphqlRequestBody",
          "GRAPHQL_RESPONSE_BODY": "graphqlResponseBody"
        }';
BEGIN
    RETURN jsonb_extract_path(event_filters_map, key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_new_filter_key(key text)
    RETURNS text AS
$$
DECLARE
    filters_map CONSTANT JSONB := '{
          "USEROS": "userOs",
          "USERBROWSER": "userBrowser",
          "USERDEVICE": "userDevice",
          "USERCOUNTRY": "userCountry",
          "USERID": "userId",
          "USERANONYMOUSID": "userAnonymousId",
          "REFERRER": "referrer",
          "REVID": "revId",
          "USEROS_IOS": "userOsIos",
          "USERDEVICE_IOS": "userDeviceIos",
          "USERCOUNTRY_IOS": "userCountryIos",
          "USERID_IOS": "userIdIos",
          "USERANONYMOUSID_IOS": "userAnonymousIdIos",
          "REVID_IOS": "revIdIos",
          "DURATION": "duration",
          "PLATFORM": "platform",
          "METADATA": "metadata",
          "ISSUE": "issue",
          "EVENTS_COUNT": "eventsCount",
          "UTM_SOURCE": "utmSource",
          "UTM_MEDIUM": "utmMedium",
          "UTM_CAMPAIGN": "utmCampaign"
        }';
BEGIN
    RETURN jsonb_extract_path(filters_map, key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO
$$
    DECLARE
        row               RECORD;
        events_att        JSONB;
        event_filters_att JSONB;
        filters_att       JSONB;
        element           JSONB;
        s_element         JSONB;
        new_value         TEXT;
        new_events        JSONB[];
        new_filters       JSONB[];
        new_event_filters JSONB[];
        changed           BOOLEAN;
        planned_update    JSONB[];
    BEGIN
        planned_update := '{}'::jsonb[];
        FOR row IN SELECT * FROM searches
            LOOP
                -- Transform events attributes
                events_att := row.filter -> 'events';
                IF events_att IS NOT NULL THEN
                    new_events := '{}'::jsonb[];
                    FOR element IN SELECT jsonb_array_elements(events_att)
                        LOOP
                            changed := FALSE;
                            new_value := get_new_event_key(element ->> 'type');
                            if new_value IS NOT NULL THEN
                                changed := TRUE;
                                new_value := replace(new_value, '"', '');
                                element := element || jsonb_build_object('type', new_value);
                            END IF;
                            -- Transform event's sub-filters attributes
                            event_filters_att := element -> 'filters';
                            new_event_filters := '{}'::jsonb[];
                            IF event_filters_att IS NOT NULL AND jsonb_array_length(event_filters_att) > 0 THEN
                                FOR s_element IN SELECT jsonb_array_elements(event_filters_att)
                                    LOOP
                                        new_value := get_new_event_filter_key(s_element ->> 'type');
                                        if new_value IS NOT NULL THEN
                                            changed := TRUE;
                                            new_value := replace(new_value, '"', '');
                                            s_element := s_element || jsonb_build_object('type', new_value);
                                            new_event_filters := array_append(new_event_filters, s_element);
                                        END IF;
                                    END LOOP;
                                element := element || jsonb_build_object('filters', new_event_filters);
                            END IF;
                            IF changed THEN
                                new_events := array_append(new_events, element);
                            END IF;
                        END LOOP;
                    IF array_length(new_events, 1) > 0 THEN
                        row.filter := row.filter || jsonb_build_object('events', new_events);
                    END IF;
                END IF;

                -- Transform filters attributes
                filters_att := row.filter -> 'filters';
                IF filters_att IS NOT NULL THEN
                    new_filters := '{}'::jsonb;
                    FOR element IN SELECT jsonb_array_elements(filters_att)
                        LOOP
                            new_value := get_new_filter_key(element ->> 'type');
                            if new_value IS NOT NULL THEN
                                new_value := replace(new_value, '"', '');
                                element := element || jsonb_build_object('type', new_value);
                                new_filters := array_append(new_filters, element);
                            END IF;
                        END LOOP;
                    IF array_length(new_filters, 1) > 0 THEN
                        row.filter := row.filter || jsonb_build_object('filters', new_filters);
                    END IF;
                END IF;

                IF array_length(new_events, 1) > 0 OR array_length(new_filters, 1) > 0 THEN
                    planned_update := array_append(planned_update,
                                                   jsonb_build_object('id', row.search_id, 'change', row.filter));
                END IF;
            END LOOP;

        -- Update saved search
        IF array_length(planned_update, 1) > 0 THEN
            raise notice 'must update % elements',array_length(planned_update, 1);

            UPDATE searches
            SET filter=changes.change -> 'change'
            FROM (SELECT unnest(planned_update)) AS changes(change)
            WHERE search_id = (changes.change -> 'id')::integer;
            raise notice 'update done';
        ELSE
            raise notice 'nothing to update';
        END IF;
    END ;
$$
LANGUAGE plpgsql;


-- To migrate metric_series data
DO
$$
    DECLARE
        row               RECORD;
        events_att        JSONB;
        event_filters_att JSONB;
        filters_att       JSONB;
        element           JSONB;
        s_element         JSONB;
        new_value         TEXT;
        new_events        JSONB[];
        new_filters       JSONB[];
        new_event_filters JSONB[];
        changed           BOOLEAN;
        planned_update    JSONB[];
    BEGIN
        planned_update := '{}'::jsonb[];
        FOR row IN SELECT * FROM metric_series
            LOOP
                -- Transform events attributes
                events_att := row.filter -> 'events';
                IF events_att IS NOT NULL THEN
                    new_events := '{}'::jsonb[];
                    FOR element IN SELECT jsonb_array_elements(events_att)
                        LOOP
                            changed := FALSE;
                            new_value := get_new_event_key(element ->> 'type');
                            if new_value IS NOT NULL THEN
                                changed := TRUE;
                                new_value := replace(new_value, '"', '');
                                element := element || jsonb_build_object('type', new_value);
                            END IF;
                            -- Transform event's sub-filters attributes
                            event_filters_att := element -> 'filters';
                            new_event_filters := '{}'::jsonb[];
                            IF event_filters_att IS NOT NULL AND jsonb_array_length(event_filters_att) > 0 THEN
                                FOR s_element IN SELECT jsonb_array_elements(event_filters_att)
                                    LOOP
                                        new_value := get_new_event_filter_key(s_element ->> 'type');
                                        if new_value IS NOT NULL THEN
                                            changed := TRUE;
                                            new_value := replace(new_value, '"', '');
                                            s_element := s_element || jsonb_build_object('type', new_value);
                                            new_event_filters := array_append(new_event_filters, s_element);
                                        END IF;
                                    END LOOP;
                                element := element || jsonb_build_object('filters', new_event_filters);
                            END IF;
                            IF changed THEN
                                new_events := array_append(new_events, element);
                            END IF;
                        END LOOP;
                    IF array_length(new_events, 1) > 0 THEN
                        row.filter := row.filter || jsonb_build_object('events', new_events);
                    END IF;
                END IF;

                -- Transform filters attributes
                filters_att := row.filter -> 'filters';
                IF filters_att IS NOT NULL THEN
                    new_filters := '{}'::jsonb;
                    FOR element IN SELECT jsonb_array_elements(filters_att)
                        LOOP
                            new_value := get_new_filter_key(element ->> 'type');
                            if new_value IS NOT NULL THEN
                                new_value := replace(new_value, '"', '');
                                element := element || jsonb_build_object('type', new_value);
                                new_filters := array_append(new_filters, element);
                            END IF;
                        END LOOP;
                    IF array_length(new_filters, 1) > 0 THEN
                        row.filter := row.filter || jsonb_build_object('filters', new_filters);
                    END IF;
                END IF;

                IF array_length(new_events, 1) > 0 OR array_length(new_filters, 1) > 0 THEN
                    planned_update := array_append(planned_update,
                                                   jsonb_build_object('id', row.series_id, 'change', row.filter));
                END IF;
            END LOOP;

        -- Update metric_series
        IF array_length(planned_update, 1) > 0 THEN
            raise notice 'must update % elements',array_length(planned_update, 1);

            UPDATE metric_series
            SET filter=changes.change -> 'change'
            FROM (SELECT unnest(planned_update)) AS changes(change)
            WHERE series_id = (changes.change -> 'id')::integer;
            raise notice 'update done';
        ELSE
            raise notice 'nothing to update';
        END IF;
    END ;
$$
LANGUAGE plpgsql;

DROP FUNCTION get_new_filter_key;
DROP FUNCTION get_new_event_filter_key;
DROP FUNCTION get_new_event_key;
DROP FUNCTION get_global_key;

DROP TABLE IF EXISTS public.funnels;
ALTER TABLE IF EXISTS public.metrics
    ADD COLUMN IF NOT EXISTS data jsonb NULL;
COMMIT;

CREATE INDEX CONCURRENTLY IF NOT EXISTS clicks_selector_idx ON events.clicks (selector);
CREATE INDEX CONCURRENTLY IF NOT EXISTS clicks_path_idx ON events.clicks (path);
CREATE INDEX CONCURRENTLY IF NOT EXISTS clicks_path_gin_idx ON events.clicks USING GIN (path gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS issues_project_id_issue_id_idx ON public.issues (project_id, issue_id);

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif