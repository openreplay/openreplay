\set previous_version 'v1.14.0'
\set next_version 'v1.15.0'
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
ALTER TABLE IF EXISTS events_common.requests
    ADD COLUMN IF NOT EXISTS transfer_size bigint NULL;

ALTER TABLE IF EXISTS public.sessions
    ADD COLUMN IF NOT EXISTS timezone text NULL;

ALTER TABLE IF EXISTS public.projects
    ADD COLUMN IF NOT EXISTS platform public.platform NOT NULL DEFAULT 'web';

CREATE TABLE IF NOT EXISTS public.crashes_ios
(
    crash_ios_id text    NOT NULL PRIMARY KEY,
    project_id   integer NOT NULL REFERENCES public.projects (project_id) ON DELETE CASCADE,
    name         text    NOT NULL,
    reason       text    NOT NULL,
    stacktrace   text    NOT NULL
);
CREATE INDEX IF NOT EXISTS crashes_ios_project_id_crash_ios_id_idx ON public.crashes_ios (project_id, crash_ios_id);
CREATE INDEX IF NOT EXISTS crashes_ios_project_id_idx ON public.crashes_ios (project_id);

CREATE TABLE IF NOT EXISTS events_common.crashes
(
    session_id   bigint  NOT NULL REFERENCES public.sessions (session_id) ON DELETE CASCADE,
    timestamp    bigint  NOT NULL,
    seq_index    integer NOT NULL,
    crash_ios_id text    NULL REFERENCES public.crashes_ios (crash_ios_id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, timestamp, seq_index)
);
CREATE INDEX IF NOT EXISTS crashes_crash_ios_id_timestamp_idx ON events_common.crashes (crash_ios_id, timestamp);
CREATE INDEX IF NOT EXISTS crashes_timestamp_idx ON events_common.crashes (timestamp);


CREATE SCHEMA IF NOT EXISTS events_ios;

CREATE TABLE IF NOT EXISTS events_ios.views
(
    session_id bigint  NOT NULL REFERENCES public.sessions (session_id) ON DELETE CASCADE,
    timestamp  bigint  NOT NULL,
    seq_index  integer NOT NULL,
    name       text    NOT NULL,
    PRIMARY KEY (session_id, timestamp, seq_index)
);

CREATE TABLE IF NOT EXISTS events_ios.taps
(
    session_id bigint  NOT NULL REFERENCES public.sessions (session_id) ON DELETE CASCADE,
    timestamp  bigint  NOT NULL,
    seq_index  integer NOT NULL,
    label      text    NOT NULL,
    PRIMARY KEY (session_id, timestamp, seq_index)
);
CREATE INDEX IF NOT EXISTS taps_session_id_idx ON events_ios.taps (session_id);
CREATE INDEX IF NOT EXISTS taps_label_idx ON events_ios.taps (label);
CREATE INDEX IF NOT EXISTS taps_label_gin_idx ON events_ios.taps USING GIN (label gin_trgm_ops);
CREATE INDEX IF NOT EXISTS taps_timestamp_idx ON events_ios.taps (timestamp);
CREATE INDEX IF NOT EXISTS taps_label_session_id_timestamp_idx ON events_ios.taps (label, session_id, timestamp);
CREATE INDEX IF NOT EXISTS taps_session_id_timestamp_idx ON events_ios.taps (session_id, timestamp);


CREATE TABLE IF NOT EXISTS events_ios.inputs
(
    session_id bigint  NOT NULL REFERENCES public.sessions (session_id) ON DELETE CASCADE,
    timestamp  bigint  NOT NULL,
    seq_index  integer NOT NULL,
    label      text    NOT NULL,
    PRIMARY KEY (session_id, timestamp, seq_index)
);
CREATE INDEX IF NOT EXISTS inputs_session_id_idx ON events_ios.inputs (session_id);
CREATE INDEX IF NOT EXISTS inputs_label_gin_idx ON events_ios.inputs USING GIN (label gin_trgm_ops);
CREATE INDEX IF NOT EXISTS inputs_timestamp_idx ON events_ios.inputs (timestamp);
CREATE INDEX IF NOT EXISTS inputs_label_session_id_timestamp_idx ON events_ios.inputs (label, session_id, timestamp);


CREATE TABLE IF NOT EXISTS events_ios.swipes
(
    session_id bigint  NOT NULL REFERENCES public.sessions (session_id) ON DELETE CASCADE,
    timestamp  bigint  NOT NULL,
    seq_index  integer NOT NULL,
    label      text    NOT NULL,
    direction  text    NOT NULL,
    x          integer DEFAULT NULL,
    y          integer DEFAULT NULL,
    PRIMARY KEY (session_id, timestamp, seq_index)
);
CREATE INDEX IF NOT EXISTS swipes_session_id_idx ON events_ios.swipes (session_id);
CREATE INDEX IF NOT EXISTS swipes_label_gin_idx ON events_ios.swipes USING GIN (label gin_trgm_ops);
CREATE INDEX IF NOT EXISTS swipes_timestamp_idx ON events_ios.swipes (timestamp);
CREATE INDEX IF NOT EXISTS swipes_label_session_id_timestamp_idx ON events_ios.swipes (label, session_id, timestamp);

ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'tap_rage';

ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS jwt_refresh_jti integer                     NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS jwt_refresh_iat timestamp without time zone NULL DEFAULT NULL;

ALTER TABLE IF EXISTS events.clicks
    ADD COLUMN IF NOT EXISTS x integer DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS y integer DEFAULT NULL;


ALTER TABLE IF EXISTS public.metrics
    ADD COLUMN IF NOT EXISTS card_info jsonb NULL;

ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT NULL;

--To fix array-gdpr
UPDATE public.projects
SET gdpr=(SELECT *
          FROM (SELECT jsonb_array_elements(gdpr) AS g) AS ra
          WHERE jsonb_typeof(g) = 'object'
          LIMIT 1)
WHERE jsonb_typeof(gdpr) = 'array';

ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'app_crash';

UPDATE metrics
SET default_config='{
  "col": 4,
  "row": 2,
  "position": 0
}'::jsonb
WHERE metric_type = 'pathAnalysis';

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif