\set previous_version 'v1.5.0-ee'
\set next_version 'v1.5.1-ee'
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

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif