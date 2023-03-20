DO
$$
    DECLARE
        previous_version CONSTANT text := 'v1.5.0-ee';
        next_version     CONSTANT text := 'v1.5.1-ee';
    BEGIN
        IF (SELECT openreplay_version()) = previous_version THEN
            raise notice 'valid previous DB version';
        ELSEIF (SELECT openreplay_version()) = next_version THEN
            raise notice 'new version detected, nothing to do';
        ELSE
            RAISE EXCEPTION 'upgrade to % failed, invalid previous version, expected %, got %', next_version,previous_version,(SELECT openreplay_version());
        END IF;
    END ;
$$
LANGUAGE plpgsql;

BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.5.1-ee'
$$ LANGUAGE sql IMMUTABLE;

COMMIT;

ALTER TYPE country ADD VALUE IF NOT EXISTS 'AC';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'AN';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'BU';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'CP';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'CS';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'CT';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'DD';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'DG';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'DY';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'EA';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'FQ';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'FX';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'HV';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'IC';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'JT';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'MI';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'NH';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'NQ';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'NT';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'PC';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'PU';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'PZ';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'RH';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'SU';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'TA';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'TP';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'VD';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'WK';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'YD';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'YU';
ALTER TYPE country ADD VALUE IF NOT EXISTS 'ZR';
