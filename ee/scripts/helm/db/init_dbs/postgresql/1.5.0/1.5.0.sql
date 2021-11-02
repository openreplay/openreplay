BEGIN;
CREATE TABLE traces
(
    user_id     text                        NOT NULL DEFAULT generate_api_key(20),
    created_at  timestamp without time zone NOT NULL DEFAULT (now() at time zone 'utc'),
    action      text                        NOT NULL,
    method      text                        NOT NULL,
    path_format text                        NOT NULL,
    endpoint    text                        NOT NULL,
    payload     jsonb                       NULL,
    parameters  jsonb                       NULL,
    status      int                         NULL
);
COMMIT;