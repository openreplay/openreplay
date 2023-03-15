BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.11.0-ee'
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE events.inputs
    ADD COLUMN duration   integer NULL,
    ADD COLUMN hesitation integer NULL;

ALTER TABLE public.projects
    ALTER COLUMN gdpr SET DEFAULT '{
      "maskEmails": true,
      "sampleRate": 33,
      "maskNumbers": false,
      "defaultInputMode": "obscured"
    }'::jsonb;

ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'mouse_thrashing';

ALTER TABLE events.clicks
    ADD COLUMN hesitation integer NULL;

COMMIT;