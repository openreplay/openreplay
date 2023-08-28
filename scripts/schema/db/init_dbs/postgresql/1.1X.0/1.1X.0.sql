CREATE SCHEMA IF NOT EXISTS events_ios;

CREATE TABLE IF NOT EXISTS events_ios.views
(
    session_id bigint  NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    timestamp  bigint  NOT NULL,
    seq_index  integer NOT NULL,
    name       text    NOT NULL,
    PRIMARY KEY (session_id, timestamp, seq_index)
);

CREATE TABLE IF NOT EXISTS events_ios.taps
(
    session_id bigint  NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
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
    session_id bigint  NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    timestamp  bigint  NOT NULL,
    seq_index  integer NOT NULL,
    label      text    NOT NULL,
    PRIMARY KEY (session_id, timestamp, seq_index)
);
CREATE INDEX IF NOT EXISTS inputs_session_id_idx ON events_ios.inputs (session_id);
CREATE INDEX IF NOT EXISTS inputs_label_gin_idx ON events_ios.inputs USING GIN (label gin_trgm_ops);
CREATE INDEX IF NOT EXISTS inputs_timestamp_idx ON events_ios.inputs (timestamp);
CREATE INDEX IF NOT EXISTS inputs_label_session_id_timestamp_idx ON events_ios.inputs (label, session_id, timestamp);


CREATE TABLE IF NOT EXISTS public.crashes_ios
(
    crash_id   text    NOT NULL PRIMARY KEY,
    project_id integer NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
    name       text    NOT NULL,
    reason     text    NOT NULL,
    stacktrace text    NOT NULL
);
CREATE INDEX IF NOT EXISTS crashes_ios_project_id_crash_id_idx ON public.crashes_ios (project_id, crash_id);
CREATE INDEX IF NOT EXISTS crashes_ios_project_id_idx ON public.crashes_ios (project_id);

CREATE TABLE IF NOT EXISTS events_ios.crashes
(
    session_id bigint  NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    timestamp  bigint  NOT NULL,
    seq_index  integer NOT NULL,
    crash_id   text    NOT NULL REFERENCES public.crashes_ios (crash_id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, timestamp, seq_index)
);
CREATE INDEX IF NOT EXISTS crashes_crash_id_timestamp_idx ON events_ios.crashes (crash_id, timestamp);
CREATE INDEX IF NOT EXISTS crashes_timestamp_idx ON events_ios.crashes (timestamp);


CREATE TABLE IF NOT EXISTS events_ios.swipes
(
    session_id bigint  NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
    timestamp  bigint  NOT NULL,
    seq_index  integer NOT NULL,
    label      text    NOT NULL,
    direction  text    NOT NULL,
    PRIMARY KEY (session_id, timestamp, seq_index)
);
CREATE INDEX IF NOT EXISTS swipes_session_id_idx ON events_ios.swipes (session_id);
CREATE INDEX IF NOT EXISTS swipes_label_gin_idx ON events_ios.swipes USING GIN (label gin_trgm_ops);
CREATE INDEX IF NOT EXISTS swipes_timestamp_idx ON events_ios.swipes (timestamp);
CREATE INDEX IF NOT EXISTS swipes_label_session_id_timestamp_idx ON events_ios.swipes (label, session_id, timestamp);
