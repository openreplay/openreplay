BEGIN;
CREATE TABLE traces
(
    user_id     integer NULL REFERENCES users (user_id) ON DELETE CASCADE,
    tenant_id   integer NOT NULL REFERENCES tenants (tenant_id) ON DELETE CASCADE,
    created_at  bigint  NOT NULL DEFAULT (EXTRACT(EPOCH FROM now() at time zone 'utc') * 1000)::bigint,
    auth        text    NULL,
    action      text    NOT NULL,
    method      text    NOT NULL,
    path_format text    NOT NULL,
    endpoint    text    NOT NULL,
    payload     jsonb   NULL,
    parameters  jsonb   NULL,
    status      int     NULL
);
CREATE INDEX traces_user_id_idx ON traces (user_id);
CREATE INDEX traces_tenant_id_idx ON traces (tenant_id);

COMMIT;