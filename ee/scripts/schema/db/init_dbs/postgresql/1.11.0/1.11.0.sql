\set previous_version 'v1.10.0-ee'
\set next_version 'v1.11.0-ee'
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

ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'mouse_thrashing';

LOCK TABLE ONLY events.inputs IN ACCESS EXCLUSIVE MODE;
ALTER TABLE IF EXISTS events.inputs
    ADD COLUMN IF NOT EXISTS duration   integer NULL,
    ADD COLUMN IF NOT EXISTS hesitation integer NULL;

LOCK TABLE ONLY events.clicks IN ACCESS EXCLUSIVE MODE;
ALTER TABLE IF EXISTS events.clicks
    ADD COLUMN IF NOT EXISTS hesitation integer NULL;

LOCK TABLE ONLY public.projects IN ACCESS EXCLUSIVE MODE;
ALTER TABLE IF EXISTS public.projects
    ALTER COLUMN gdpr SET DEFAULT '{
      "maskEmails": true,
      "sampleRate": 33,
      "maskNumbers": false,
      "defaultInputMode": "obscured"
    }'::jsonb;

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif