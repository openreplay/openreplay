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

COMMIT;