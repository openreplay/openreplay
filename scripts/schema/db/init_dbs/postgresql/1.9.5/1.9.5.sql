BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.9.5'
$$ LANGUAGE sql IMMUTABLE;

DELETE
FROM metrics
WHERE is_predefined
  AND is_template;

UPDATE metrics_clone
SET metric_of=CASE
                  WHEN metric_of = 'USEROS' THEN 'userOS'
                  WHEN metric_of = 'USERBROWSER' THEN 'userBrowser'
                  WHEN metric_of = 'USERDEVICE' THEN 'userDevice'
                  WHEN metric_of = 'USERCOUNTRY' THEN 'userCountry'
                  WHEN metric_of = 'USERID' THEN 'userId'
                  WHEN metric_of = 'ISSUE' THEN 'issue'
                  WHEN metric_of = 'LOCATION' THEN 'location'
                  WHEN metric_of = 'SESSIONS' THEN 'sessions'
                  WHEN metric_of = 'js_exception' THEN 'jsException'
                  WHEN metric_of = 'sessionCount' THEN 'sessionCount'
    END
WHERE NOT is_predefined;

-- 1. pre transform structure
ALTER TABLE IF EXISTS metrics_clone
    ALTER COLUMN metric_type TYPE text,
    ALTER COLUMN view_type TYPE text,
    ADD COLUMN IF NOT EXISTS o_metric_id INTEGER,
    ADD COLUMN IF NOT EXISTS o_widget_id INTEGER;

-- 2. insert predefined metrics related to dashboards as custom metrics
INSERT INTO metrics_clone(project_id, user_id, name, metric_type, view_type, metric_of, metric_value, metric_format,
                          default_config, o_metric_id, o_widget_id)
SELECT dashboards.project_id,
       dashboard_widgets.user_id,
       metrics_clone.name,
       left(category, 1) || right(replace(initcap(category), ' ', ''), -1)             AS metric_type,
       'chart'                                                                         AS view_type,
       left(predefined_key, 1) || right(replace(initcap(predefined_key), '_', ''), -1) AS metric_of,
       metric_value,
       metric_format,
       default_config,
       metrics_clone.metric_id,
       dashboard_widgets.widget_id
FROM metrics_clone
         INNER JOIN dashboard_widgets USING (metric_id)
         INNER JOIN dashboards USING (dashboard_id)
WHERE is_predefined;

-- 3. update widgets
UPDATE dashboard_widgets
SET metric_id=metrics_clone.metric_id
FROM metrics_clone
WHERE metrics_clone.o_widget_id IS NOT NULL
  AND dashboard_widgets.widget_id = metrics_clone.o_widget_id;

-- 4. delete predefined metrics
DELETE
FROM metrics_clone
WHERE is_predefined;

ALTER TABLE IF EXISTS metrics_clone
    DROP COLUMN IF EXISTS active,
    DROP COLUMN IF EXISTS is_predefined,
    DROP COLUMN IF EXISTS is_template,
    DROP COLUMN IF EXISTS category,
    DROP COLUMN IF EXISTS o_metric_id,
    DROP COLUMN IF EXISTS o_widget_id,
    DROP CONSTRAINT IF EXISTS null_project_id_for_template_only,
    DROP CONSTRAINT IF EXISTS metrics_clone_unique_key;

DROP TYPE IF EXISTS metric_type;
DROP TYPE IF EXISTS metric_view_type;

COMMIT;