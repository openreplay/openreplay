BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.7.0'
$$ LANGUAGE sql IMMUTABLE;


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

COMMIT;

ALTER TYPE metric_type ADD VALUE IF NOT EXISTS 'predefined';

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