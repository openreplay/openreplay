\set previous_version 'v1.6.0'
\set next_version 'v1.7.0'
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

ALTER TABLE IF EXISTS dashboards
    ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';



ALTER TABLE users
    DROP COLUMN IF EXISTS appearance;

ALTER TABLE basic_authentication
    DROP COLUMN IF EXISTS generated_password;

ALTER TABLE tenants
    DROP COLUMN IF EXISTS edition;

ALTER TABLE dashboards
    ALTER COLUMN user_id DROP NOT NULL;

DO
$$
    BEGIN
        IF EXISTS(SELECT *
                  FROM information_schema.columns
                  WHERE table_name = 'tenants'
                    and column_name = 'user_id')
        THEN
            ALTER TABLE tenants
                RENAME COLUMN user_id TO tenant_key;
        END IF;
    END
$$;

ALTER TABLE IF EXISTS events.resources
    DROP CONSTRAINT IF EXISTS resources_pkey;

ALTER TABLE IF EXISTS events.resources
    ADD CONSTRAINT resources_pk
        PRIMARY KEY (session_id, message_id, timestamp);

COMMIT;
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_unique_project_id_md5value_type_idx ON autocomplete (project_id, md5(value), type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS projects_project_id_deleted_at_n_idx ON public.projects (project_id) WHERE deleted_at IS NULL;
ALTER TYPE metric_type ADD VALUE IF NOT EXISTS 'funnel';

INSERT INTO metrics (name, category, default_config, is_predefined, is_template, is_public, predefined_key, metric_type,
                     view_type)
VALUES ('Captured sessions', 'web vitals', '{
  "col": 1,
  "row": 1,
  "position": 0
}', true, true, true, 'count_sessions', 'predefined', 'overview'),
       ('Request Load Time', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_request_load_time', 'predefined', 'overview'),
       ('Page Load Time', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_page_load_time', 'predefined', 'overview'),
       ('Image Load Time', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_image_load_time', 'predefined', 'overview'),
       ('DOM Content Load Start', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_dom_content_load_start', 'predefined', 'overview'),
       ('First Meaningful paint', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_first_contentful_pixel', 'predefined', 'overview'),
       ('No. of Visited Pages', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_visited_pages', 'predefined', 'overview'),
       ('Session Duration', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_session_duration', 'predefined', 'overview'),
       ('DOM Build Time', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_pages_dom_buildtime', 'predefined', 'overview'),
       ('Pages Response Time', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_pages_response_time', 'predefined', 'overview'),
       ('Response Time', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_response_time', 'predefined', 'overview'),
       ('First Paint', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_first_paint', 'predefined', 'overview'),
       ('DOM Content Loaded', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_dom_content_loaded', 'predefined', 'overview'),
       ('Time Till First byte', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_till_first_byte', 'predefined', 'overview'),
       ('Time To Interactive', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_time_to_interactive', 'predefined', 'overview'),
       ('Captured requests', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'count_requests', 'predefined', 'overview'),
       ('Time To Render', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_time_to_render', 'predefined', 'overview'),
       ('Memory Consumption', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_used_js_heap_size', 'predefined', 'overview'),
       ('CPU Load', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_cpu', 'predefined', 'overview'),
       ('Frame rate', 'web vitals', '{
         "col": 1,
         "row": 1,
         "position": 0
       }', true, true, true, 'avg_fps', 'predefined', 'overview')
ON CONFLICT (predefined_key) DO UPDATE
    SET name=excluded.name,
        category=excluded.category,
        default_config=excluded.default_config,
        is_predefined=excluded.is_predefined,
        is_template=excluded.is_template,
        is_public=excluded.is_public,
        metric_type=excluded.metric_type,
        view_type=excluded.view_type;

BEGIN;
DO
$$
    BEGIN
        IF (NOT EXISTS(SELECT 1 FROM metrics WHERE metric_type = 'funnel') AND
            EXISTS(SELECT 1 FROM funnels WHERE deleted_at ISNULL))
        THEN
            ALTER TABLE IF EXISTS metrics
                ADD COLUMN IF NOT EXISTS _funnel_filter jsonb NULL;
            WITH f_t_m AS (INSERT INTO metrics (project_id, user_id, name, metric_type, is_public, _funnel_filter)
                SELECT project_id,
                       user_id,
                       name,
                       'funnel',
                       is_public,
                       jsonb_set(filter, '{events}', COALESCE(jsonb_agg(jsonb_set(elm, '{value}',
                                                                                  CASE
                                                                                      WHEN jsonb_typeof(value -> 'value') = 'array'
                                                                                          THEN (value -> 'value')
                                                                                      ELSE to_jsonb(string_to_array(value ->> 'value', '')) END))
                                                              FILTER (WHERE value -> 'value' IS NOT NULL),
                                                              '[]')) AS filter
                FROM funnels
                         LEFT JOIN jsonb_array_elements(filter -> 'events') AS elm ON true
                WHERE deleted_at ISNULL
                GROUP BY project_id,
                         user_id,
                         name,
                         is_public, filter
                RETURNING metric_id,_funnel_filter)
            INSERT
            INTO metric_series(metric_id, name, filter, index)
            SELECT metric_id, 'Series 1', _funnel_filter, 0
            FROM f_t_m;
            ALTER TABLE IF EXISTS metrics
                DROP COLUMN IF EXISTS _funnel_filter;
        END IF;
    END
$$;
DROP INDEX IF EXISTS autocomplete_unique;
COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif