BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.10.0'
$$ LANGUAGE sql IMMUTABLE;

ALTER TYPE webhook_type ADD VALUE IF NOT EXISTS 'msteams';

UPDATE metrics
SET is_public= TRUE;

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
                    and column_name = 'is_predefined') THEN

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

-- To migrate saved search data
-- SET client_min_messages TO NOTICE;
DO
$$
    DECLARE
        row                  RECORD;
        events_att           JSONB;
        filters_att          JSONB;
        element              JSONB;
        new_value            TEXT;
        new_array            JSONB[];
        changed              BOOLEAN;
        planned_update       JSONB[];
        events_map  CONSTANT JSONB := '{
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
        planned_update := '{}'::jsonb[];
        FOR row IN SELECT * FROM _search
            LOOP
                raise notice 'original: %',row.filter -> 'events';
                changed := FALSE;
                -- Transform events attribute
                events_att := row.filter -> 'events';
                IF events_att IS NOT NULL THEN
                    new_array := '{}'::jsonb[];
                    FOR element IN SELECT jsonb_array_elements(events_att)
                        LOOP
                            new_value := jsonb_extract_path(events_map, element ->> 'type');
                            if new_value IS NULL THEN
                                raise exception 'event-type not found: %',element ->> 'type';
                            END IF;
                            new_value := replace(new_value, '"', '');
                            element := element || jsonb_build_object('type', new_value);
                            new_array := array_append(new_array, element);
                        END LOOP;
                    IF array_length(new_array, 1) > 0 THEN
                        changed := TRUE;
                        row.filter := row.filter || jsonb_build_object('events', new_array);
                    END IF;
                END IF;
                raise notice 'new     : %',row.filter -> 'events';
                raise notice 'original: %',row.filter -> 'filters';
                -- Transform filters attribute
                filters_att := row.filter -> 'filters';
                IF filters_att IS NOT NULL THEN
                    new_array := '{}'::jsonb;
                    FOR element IN SELECT jsonb_array_elements(filters_att)
                        LOOP
                            new_value := jsonb_extract_path(filters_map, element ->> 'type');
                            if new_value IS NULL THEN
                                raise exception 'filter-type not found: %',element ->> 'type';
                            END IF;
                            new_value := replace(new_value, '"', '');
                            element := element || jsonb_build_object('type', new_value);
                            new_array := array_append(new_array, element);
                        END LOOP;
                    IF array_length(new_array, 1) > 0 THEN
                        changed := TRUE;
                        row.filter := row.filter || jsonb_build_object('filters', new_array);
                    END IF;
                END IF;
                raise notice 'new     : %',row.filter -> 'filters';
                raise notice 'changed: %',changed;
                raise notice '-------------------';
                IF changed THEN
                    planned_update := array_append(planned_update,
                                                   jsonb_build_object('id', row._search_id, 'change', row.filter));
                END IF;
            END LOOP;
        IF array_length(planned_update, 1) > 0 THEN
            raise notice 'must update % elements',array_length(planned_update, 1);
--             raise notice 'must update %',planned_update;
            UPDATE _search
            SET n_filter=changes.change -> 'change'
            FROM (SELECT unnest(planned_update)) AS changes(change)
            WHERE _search_id = (changes.change -> 'id')::integer;
            raise notice 'update done';
        END IF;
    END ;
$$
LANGUAGE plpgsql;


COMMIT;

CREATE INDEX CONCURRENTLY IF NOT EXISTS clicks_selector_idx ON events.clicks (selector);
CREATE INDEX CONCURRENTLY IF NOT EXISTS clicks_path_idx ON events.clicks (path);
CREATE INDEX CONCURRENTLY IF NOT EXISTS clicks_path_gin_idx ON events.clicks USING GIN (path gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS issues_project_id_issue_id_idx ON public.issues (project_id, issue_id);