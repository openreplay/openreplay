BEGIN;
-- Schemas and functions definitions:
CREATE SCHEMA IF NOT EXISTS events_common;
CREATE SCHEMA IF NOT EXISTS events;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.14.0-ee'
$$ LANGUAGE sql IMMUTABLE;


CREATE OR REPLACE FUNCTION generate_api_key(length integer) RETURNS text AS
$$
declare
    chars  text[]  := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z}';
    result text    := '';
    i      integer := 0;
begin
    if length < 0 then
        raise exception 'Given length cannot be less than 0';
    end if;
    for i in 1..length
        loop
            result := result || chars[1 + random() * (array_length(chars, 1) - 1)];
        end loop;
    return result;
end;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION events.funnel(steps integer[], m integer) RETURNS boolean AS
$$
DECLARE
    step integer;
    c    integer := 0;
BEGIN
    FOREACH step IN ARRAY steps
        LOOP
            IF step + c = 0 THEN
                IF c = 0 THEN
                    RETURN false;
                END IF;
                c := 0;
                CONTINUE;
            END IF;
            IF c + 1 = step THEN
                c := step;
            END IF;
        END LOOP;
    RETURN c = m;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


CREATE OR REPLACE FUNCTION notify_integration() RETURNS trigger AS
$$
BEGIN
    IF NEW IS NULL THEN
        PERFORM pg_notify('integration',
                          jsonb_build_object('project_id', OLD.project_id, 'provider', OLD.provider, 'options',
                                             null)::text);
    ELSIF (OLD IS NULL) OR (OLD.options <> NEW.options) THEN
        PERFORM pg_notify('integration', row_to_json(NEW)::text);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION notify_alert() RETURNS trigger AS
$$
DECLARE
    clone jsonb;
BEGIN
    clone = to_jsonb(NEW);
    clone = jsonb_set(clone, '{created_at}', to_jsonb(CAST(EXTRACT(epoch FROM NEW.created_at) * 1000 AS BIGINT)));
    IF NEW.deleted_at NOTNULL THEN
        clone = jsonb_set(clone, '{deleted_at}', to_jsonb(CAST(EXTRACT(epoch FROM NEW.deleted_at) * 1000 AS BIGINT)));
    END IF;
    PERFORM pg_notify('alert', clone::text);
    RETURN NEW;
END ;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION notify_project() RETURNS trigger AS
$$
BEGIN
    PERFORM pg_notify('project', row_to_json(NEW)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- All tables and types:

DO
$$
    BEGIN
        IF (with to_check (name) as (values ('alerts'),
                                            ('announcements'),
                                            ('assigned_sessions'),
                                            ('autocomplete'),
                                            ('basic_authentication'),
                                            ('dashboards'),
                                            ('dashboard_widgets'),
                                            ('errors'),
                                            ('integrations'),
                                            ('issues'),
                                            ('jira_cloud'),
                                            ('jobs'),
                                            ('metric_series'),
                                            ('metrics'),
                                            ('notifications'),
                                            ('oauth_authentication'),
                                            ('projects'),
                                            ('roles'),
                                            ('roles_projects'),
                                            ('searches'),
                                            ('sessions'),
                                            ('tenants'),
                                            ('traces'),
                                            ('user_favorite_errors'),
                                            ('user_favorite_sessions'),
                                            ('user_viewed_errors'),
                                            ('user_viewed_sessions'),
                                            ('users'),
                                            ('webhooks'),
                                            ('sessions_notes'),
                                            ('assist_records'),
                                            ('projects_stats'),
                                            ('frontend_signals'),
                                            ('feature_flags'),
                                            ('feature_flags_conditions'),
                                            ('sessions_feature_flags'))
            select bool_and(exists(select *
                                   from information_schema.tables t
                                   where table_schema = 'public'
                                     AND table_name = to_check.name)) as all_present
            from to_check) THEN
            raise notice 'All public schema tables exists';
        ELSE
            raise notice 'Some or all public schema tables are missing, creating missing tables';

            CREATE TABLE IF NOT EXISTS tenants
            (
                tenant_id      integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                tenant_key     text                        NOT NULL DEFAULT generate_api_key(20),
                name           text                        NOT NULL,
                api_key        text UNIQUE                          DEFAULT generate_api_key(20) NOT NULL,
                created_at     timestamp without time zone NOT NULL DEFAULT (now() at time zone 'utc'),
                deleted_at     timestamp without time zone NULL     DEFAULT NULL,
                license        text                        NULL,
                opt_out        bool                        NOT NULL DEFAULT FALSE,
                t_projects     integer                     NOT NULL DEFAULT 1,
                t_sessions     bigint                      NOT NULL DEFAULT 0,
                t_users        integer                     NOT NULL DEFAULT 1,
                t_integrations integer                     NOT NULL DEFAULT 0,
                last_telemetry bigint                      NOT NULL DEFAULT CAST(EXTRACT(epoch FROM date_trunc('day', now())) * 1000 AS BIGINT)
            );


            CREATE TABLE IF NOT EXISTS roles
            (
                role_id      integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                tenant_id    integer   NOT NULL REFERENCES tenants (tenant_id) ON DELETE CASCADE,
                name         text      NOT NULL,
                description  text               DEFAULT NULL,
                permissions  text[]    NOT NULL DEFAULT '{}',
                protected    bool      NOT NULL DEFAULT FALSE,
                all_projects bool      NOT NULL DEFAULT TRUE,
                created_at   timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
                deleted_at   timestamp NULL     DEFAULT NULL
            );

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'user_role') THEN
                CREATE TYPE user_role AS ENUM ('owner','admin','member');
            END IF;


            CREATE TABLE IF NOT EXISTS users
            (
                user_id       integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                tenant_id     integer                     NOT NULL REFERENCES tenants (tenant_id) ON DELETE CASCADE,
                email         text                        NOT NULL UNIQUE,
                role          user_role                   NOT NULL DEFAULT 'member',
                name          text                        NOT NULL,
                created_at    timestamp without time zone NOT NULL DEFAULT (now() at time zone 'utc'),
                deleted_at    timestamp without time zone NULL     DEFAULT NULL,
                api_key       text UNIQUE                          DEFAULT generate_api_key(20) NOT NULL,
                jwt_iat       timestamp without time zone NULL     DEFAULT NULL,
                data          jsonb                       NOT NULL DEFAULT'{}'::jsonb,
                weekly_report boolean                     NOT NULL DEFAULT TRUE,
                origin        text                        NULL     DEFAULT NULL,
                role_id       integer                     REFERENCES roles (role_id) ON DELETE SET NULL,
                internal_id   text                        NULL     DEFAULT NULL
            );
            CREATE INDEX IF NOT EXISTS users_tenant_id_deleted_at_N_idx ON users (tenant_id) WHERE deleted_at ISNULL;
            CREATE INDEX IF NOT EXISTS users_name_gin_idx ON users USING GIN (name gin_trgm_ops);


            CREATE TABLE IF NOT EXISTS basic_authentication
            (
                user_id              integer                     NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
                password             text                             DEFAULT NULL,
                invitation_token     text                        NULL DEFAULT NULL,
                invited_at           timestamp without time zone NULL DEFAULT NULL,
                change_pwd_token     text                        NULL DEFAULT NULL,
                change_pwd_expire_at timestamp without time zone NULL DEFAULT NULL,
                changed_at           timestamp,
                UNIQUE (user_id)
            );

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'oauth_provider') THEN
                CREATE TYPE oauth_provider AS ENUM ('jira','github');
            END IF;

            CREATE TABLE IF NOT EXISTS oauth_authentication
            (
                user_id          integer        NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
                provider         oauth_provider NOT NULL,
                provider_user_id text           NOT NULL,
                token            text           NOT NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS oauth_authentication_unique_user_id_provider_idx ON oauth_authentication (user_id, provider);

            CREATE TABLE IF NOT EXISTS projects
            (
                project_id                integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                project_key               varchar(20)                 NOT NULL UNIQUE DEFAULT generate_api_key(20),
                tenant_id                 integer                     NOT NULL REFERENCES tenants (tenant_id) ON DELETE CASCADE,
                name                      text                        NOT NULL,
                active                    boolean                     NOT NULL,
                sample_rate               smallint                    NOT NULL        DEFAULT 100 CHECK (sample_rate >= 0 AND sample_rate <= 100),
                created_at                timestamp without time zone NOT NULL        DEFAULT (now() at time zone 'utc'),
                deleted_at                timestamp without time zone NULL            DEFAULT NULL,
                max_session_duration      integer                     NOT NULL        DEFAULT 7200000,
                metadata_1                text                                        DEFAULT NULL,
                metadata_2                text                                        DEFAULT NULL,
                metadata_3                text                                        DEFAULT NULL,
                metadata_4                text                                        DEFAULT NULL,
                metadata_5                text                                        DEFAULT NULL,
                metadata_6                text                                        DEFAULT NULL,
                metadata_7                text                                        DEFAULT NULL,
                metadata_8                text                                        DEFAULT NULL,
                metadata_9                text                                        DEFAULT NULL,
                metadata_10               text                                        DEFAULT NULL,
                save_request_payloads     boolean                     NOT NULL        DEFAULT FALSE,
                gdpr                      jsonb                       NOT NULL        DEFAULT'{
                  "maskEmails": true,
                  "sampleRate": 33,
                  "maskNumbers": false,
                  "defaultInputMode": "obscured"
                }'::jsonb,
                first_recorded_session_at timestamp without time zone NULL            DEFAULT NULL,
                sessions_last_check_at    timestamp without time zone NULL            DEFAULT NULL,
                beacon_size               integer                     NOT NULL        DEFAULT 0
            );


            CREATE INDEX IF NOT EXISTS projects_tenant_id_idx ON public.projects (tenant_id);
            CREATE INDEX IF NOT EXISTS projects_project_key_idx ON public.projects (project_key);
            CREATE INDEX IF NOT EXISTS projects_project_id_deleted_at_n_idx ON public.projects (project_id) WHERE deleted_at IS NULL;
            DROP TRIGGER IF EXISTS on_insert_or_update ON projects;
            CREATE TRIGGER on_insert_or_update
                AFTER INSERT OR UPDATE
                ON projects
                FOR EACH ROW
            EXECUTE PROCEDURE notify_project();

            CREATE TABLE IF NOT EXISTS roles_projects
            (
                role_id    integer NOT NULL REFERENCES roles (role_id) ON DELETE CASCADE,
                project_id integer NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                CONSTRAINT roles_projects_pkey PRIMARY KEY (role_id, project_id)
            );
            CREATE INDEX IF NOT EXISTS roles_projects_role_id_idx ON roles_projects (role_id);
            CREATE INDEX IF NOT EXISTS roles_projects_project_id_idx ON roles_projects (project_id);


            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'webhook_type') THEN
                CREATE TYPE webhook_type AS ENUM ('webhook','slack','email','msteams');
            END IF;


            CREATE TABLE IF NOT EXISTS webhooks
            (
                webhook_id  integer generated by DEFAULT as identity
                    constraint webhooks_pkey
                        primary key,
                tenant_id   integer                                        NOT NULL
                    constraint webhooks_tenant_id_fkey
                        references tenants
                        on delete cascade,
                endpoint    text                                           NOT NULL,
                created_at  timestamp DEFAULT timezone('utc'::text, now()) NOT NULL,
                deleted_at  timestamp,
                auth_header text,
                type        webhook_type                                   NOT NULL DEFAULT 'webhook',
                index       integer   DEFAULT 0                            NOT NULL,
                name        varchar(100)
            );


            CREATE TABLE IF NOT EXISTS notifications
            (
                notification_id integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                tenant_id       integer REFERENCES tenants (tenant_id) ON DELETE CASCADE,
                user_id         integer REFERENCES users (user_id) ON DELETE CASCADE,
                title           text        NOT NULL,
                description     text        NOT NULL,
                button_text     varchar(80) NULL,
                button_url      text        NULL,
                image_url       text        NULL,
                created_at      timestamp   NOT NULL DEFAULT timezone('utc'::text, now()),
                options         jsonb       NOT NULL DEFAULT'{}'::jsonb,
                CONSTRAINT notification_tenant_xor_user CHECK ( tenant_id NOTNULL AND user_id ISNULL OR
                                                                tenant_id ISNULL AND user_id NOTNULL )
            );
            CREATE INDEX IF NOT EXISTS notifications_user_id_index ON notifications (user_id);
            CREATE INDEX IF NOT EXISTS notifications_tenant_id_index ON notifications (tenant_id);
            CREATE INDEX IF NOT EXISTS notifications_created_at_index ON notifications (created_at DESC);
            CREATE INDEX IF NOT EXISTS notifications_created_at_epoch_idx ON notifications (CAST(EXTRACT(EPOCH FROM created_at) * 1000 AS BIGINT) DESC);

            CREATE TABLE IF NOT EXISTS user_viewed_notifications
            (
                user_id         integer NOT NULL REFERENCES users (user_id) on delete cascade,
                notification_id integer NOT NULL REFERENCES notifications (notification_id) on delete cascade,
                constraint user_viewed_notifications_pkey primary key (user_id, notification_id)
            );


            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'announcement_type') THEN
                CREATE TYPE announcement_type AS ENUM ('notification','alert');
            END IF;

            CREATE TABLE IF NOT EXISTS announcements
            (
                announcement_id serial                                                      NOT NULL
                    constraint announcements_pk
                        primary key,
                title           text                                                        NOT NULL,
                description     text                                                        NOT NULL,
                button_text     varchar(30),
                button_url      text,
                image_url       text,
                created_at      timestamp         DEFAULT timezone('utc'::text, now())      NOT NULL,
                type            announcement_type DEFAULT 'notification'::announcement_type NOT NULL
            );

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'integration_provider') THEN
                CREATE TYPE integration_provider AS ENUM ('bugsnag','cloudwatch','datadog','newrelic','rollbar','sentry','stackdriver','sumologic','elasticsearch'); --,'jira','github');
            END IF;

            CREATE TABLE IF NOT EXISTS integrations
            (
                project_id   integer              NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                provider     integration_provider NOT NULL,
                options      jsonb                NOT NULL,
                request_data jsonb                NOT NULL DEFAULT'{}'::jsonb,
                PRIMARY KEY (project_id, provider)
            );

            DROP TRIGGER IF EXISTS on_insert_or_update_or_delete ON integrations;

            CREATE TRIGGER on_insert_or_update_or_delete
                AFTER INSERT OR UPDATE OR DELETE
                ON integrations
                FOR EACH ROW
            EXECUTE PROCEDURE notify_integration();


            CREATE TABLE IF NOT EXISTS jira_cloud
            (
                user_id  integer NOT NULL
                    constraint jira_cloud_pk
                        primary key
                    constraint jira_cloud_users_fkey
                        references users
                        on delete cascade,
                username text    NOT NULL,
                token    text    NOT NULL,
                url      text
            );

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'issue_type') THEN
                CREATE TYPE issue_type AS ENUM (
                    'click_rage',
                    'dead_click',
                    'excessive_scrolling',
                    'bad_request',
                    'missing_resource',
                    'memory',
                    'cpu',
                    'slow_resource',
                    'slow_page_load',
                    'crash',
                    'ml_cpu',
                    'ml_memory',
                    'ml_dead_click',
                    'ml_click_rage',
                    'ml_mouse_thrashing',
                    'ml_excessive_scrolling',
                    'ml_slow_resources',
                    'custom',
                    'js_exception',
                    'mouse_thrashing',
                    'app_crash'
                    );
            END IF;

            CREATE TABLE IF NOT EXISTS issues
            (
                issue_id       text       NOT NULL PRIMARY KEY,
                project_id     integer    NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                type           issue_type NOT NULL,
                context_string text       NOT NULL,
                context        jsonb DEFAULT NULL
            );
            CREATE INDEX IF NOT EXISTS issues_issue_id_type_idx ON issues (issue_id, type);
            CREATE INDEX IF NOT EXISTS issues_project_id_issue_id_idx ON public.issues (project_id, issue_id);
            CREATE INDEX IF NOT EXISTS issues_project_id_idx ON issues (project_id);

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'error_source') THEN
                CREATE TYPE error_source AS ENUM ('js_exception','bugsnag','cloudwatch','datadog','newrelic','rollbar','sentry','stackdriver','sumologic', 'elasticsearch');
            END IF;

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'error_status') THEN
                CREATE TYPE error_status AS ENUM ('unresolved','resolved','ignored');
            END IF;

            CREATE TABLE IF NOT EXISTS errors
            (
                error_id             text         NOT NULL PRIMARY KEY,
                project_id           integer      NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                source               error_source NOT NULL,
                name                 text                  DEFAULT NULL,
                message              text         NOT NULL,
                payload              jsonb        NOT NULL,
                status               error_status NOT NULL DEFAULT 'unresolved',
                parent_error_id      text                  DEFAULT NULL REFERENCES errors (error_id) ON DELETE SET NULL,
                stacktrace           jsonb, --to save the stacktrace and not query S3 another time
                stacktrace_parsed_at timestamp
            );
            CREATE INDEX IF NOT EXISTS errors_project_id_source_idx ON errors (project_id, source);
            CREATE INDEX IF NOT EXISTS errors_message_gin_idx ON public.errors USING GIN (message gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS errors_name_gin_idx ON public.errors USING GIN (name gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS errors_project_id_idx ON public.errors (project_id);
            CREATE INDEX IF NOT EXISTS errors_project_id_status_idx ON public.errors (project_id, status);
            CREATE INDEX IF NOT EXISTS errors_project_id_error_id_js_exception_idx ON public.errors (project_id, error_id) WHERE source = 'js_exception';
            CREATE INDEX IF NOT EXISTS errors_project_id_error_id_idx ON public.errors (project_id, error_id);
            CREATE INDEX IF NOT EXISTS errors_project_id_error_id_integration_idx ON public.errors (project_id, error_id) WHERE source != 'js_exception';
            CREATE INDEX IF NOT EXISTS errors_error_id_idx ON errors (error_id);
            CREATE INDEX IF NOT EXISTS errors_parent_error_id_idx ON errors (parent_error_id);

            CREATE TABLE IF NOT EXISTS user_favorite_errors
            (
                user_id  integer NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
                error_id text    NOT NULL REFERENCES errors (error_id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, error_id)
            );

            CREATE TABLE IF NOT EXISTS user_viewed_errors
            (
                user_id  integer NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
                error_id text    NOT NULL REFERENCES errors (error_id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, error_id)
            );
            CREATE INDEX IF NOT EXISTS user_viewed_errors_user_id_idx ON public.user_viewed_errors (user_id);
            CREATE INDEX IF NOT EXISTS user_viewed_errors_error_id_idx ON public.user_viewed_errors (error_id);

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'platform') THEN
                CREATE TYPE platform AS ENUM ('web','ios','android');
            END IF;

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'device_type') THEN
                CREATE TYPE device_type AS ENUM ('desktop','tablet','mobile','other');
            END IF;


            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'country') THEN
                CREATE TYPE country AS ENUM ('UN','RW','SO','YE','IQ','SA','IR','CY','TZ','SY','AM','KE','CD','DJ','UG','CF','SC','JO','LB','KW','OM','QA','BH','AE','IL','TR','ET','ER','EG','SD','GR','BI','EE','LV','AZ','LT','SJ','GE','MD','BY','FI','AX','UA','MK','HU','BG','AL','PL','RO','XK','ZW','ZM','KM','MW','LS','BW','MU','SZ','RE','ZA','YT','MZ','MG','AF','PK','BD','TM','TJ','LK','BT','IN','MV','IO','NP','MM','UZ','KZ','KG','TF','HM','CC','PW','VN','TH','ID','LA','TW','PH','MY','CN','HK','BN','MO','KH','KR','JP','KP','SG','CK','TL','RU','MN','AU','CX','MH','FM','PG','SB','TV','NR','VU','NC','NF','NZ','FJ','LY','CM','SN','CG','PT','LR','CI','GH','GQ','NG','BF','TG','GW','MR','BJ','GA','SL','ST','GI','GM','GN','TD','NE','ML','EH','TN','ES','MA','MT','DZ','FO','DK','IS','GB','CH','SE','NL','AT','BE','DE','LU','IE','MC','FR','AD','LI','JE','IM','GG','SK','CZ','NO','VA','SM','IT','SI','ME','HR','BA','AO','NA','SH','BV','BB','CV','GY','GF','SR','PM','GL','PY','UY','BR','FK','GS','JM','DO','CU','MQ','BS','BM','AI','TT','KN','DM','AG','LC','TC','AW','VG','VC','MS','MF','BL','GP','GD','KY','BZ','SV','GT','HN','NI','CR','VE','EC','CO','PA','HT','AR','CL','BO','PE','MX','PF','PN','KI','TK','TO','WF','WS','NU','MP','GU','PR','VI','UM','AS','CA','US','PS','RS','AQ','SX','CW','BQ','SS','AC','AN','BU','CP','CS','CT','DD','DG','DY','EA','FQ','FX','HV','IC','JT','MI','NH','NQ','NT','PC','PU','PZ','RH','SU','TA','TP','VD','WK','YD','YU','ZR');
            END IF;

            CREATE TABLE IF NOT EXISTS sessions
            (
                session_id              bigint PRIMARY KEY,
                project_id              integer      NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                tracker_version         text         NOT NULL,
                start_ts                bigint       NOT NULL,
                duration                integer      NULL,
                rev_id                  text                  DEFAULT NULL,
                platform                platform     NOT NULL DEFAULT 'web',
                is_snippet              boolean      NOT NULL DEFAULT FALSE,
                user_id                 text                  DEFAULT NULL,
                user_anonymous_id       text                  DEFAULT NULL,
                user_uuid               uuid         NOT NULL,
                user_agent              text                  DEFAULT NULL,
                user_os                 text         NOT NULL,
                user_os_version         text                  DEFAULT NULL,
                user_browser            text                  DEFAULT NULL,
                user_browser_version    text                  DEFAULT NULL,
                user_device             text         NOT NULL,
                user_device_type        device_type  NOT NULL,
                user_device_memory_size integer               DEFAULT NULL,
                user_device_heap_size   bigint                DEFAULT NULL,
                user_country            country      NOT NULL,
                user_city               text         NULL,
                user_state              text         NULL,
                pages_count             integer      NOT NULL DEFAULT 0,
                events_count            integer      NOT NULL DEFAULT 0,
                errors_count            integer      NOT NULL DEFAULT 0,
                watchdogs_score         bigint       NOT NULL DEFAULT 0,
                issue_score             bigint       NOT NULL DEFAULT 0,
                issue_types             issue_type[] NOT NULL DEFAULT '{}'::issue_type[],
                utm_source              text         NULL     DEFAULT NULL,
                utm_medium              text         NULL     DEFAULT NULL,
                utm_campaign            text         NULL     DEFAULT NULL,
                referrer                text         NULL     DEFAULT NULL,
                base_referrer           text         NULL     DEFAULT NULL,
                file_key                bytea                 DEFAULT NULL,
                metadata_1              text                  DEFAULT NULL,
                metadata_2              text                  DEFAULT NULL,
                metadata_3              text                  DEFAULT NULL,
                metadata_4              text                  DEFAULT NULL,
                metadata_5              text                  DEFAULT NULL,
                metadata_6              text                  DEFAULT NULL,
                metadata_7              text                  DEFAULT NULL,
                metadata_8              text                  DEFAULT NULL,
                metadata_9              text                  DEFAULT NULL,
                metadata_10             text                  DEFAULT NULL
            );
            CREATE INDEX IF NOT EXISTS sessions_project_id_start_ts_idx ON sessions (project_id, start_ts);
            CREATE INDEX IF NOT EXISTS sessions_project_id_user_id_idx ON sessions (project_id, user_id);
            CREATE INDEX IF NOT EXISTS sessions_project_id_user_anonymous_id_idx ON sessions (project_id, user_anonymous_id);
            CREATE INDEX IF NOT EXISTS sessions_project_id_user_device_idx ON sessions (project_id, user_device);
            CREATE INDEX IF NOT EXISTS sessions_project_id_user_country_idx ON sessions (project_id, user_country);
            CREATE INDEX IF NOT EXISTS sessions_project_id_user_city_idx ON sessions (project_id, user_city);
            CREATE INDEX IF NOT EXISTS sessions_project_id_user_state_idx ON sessions (project_id, user_state);
            CREATE INDEX IF NOT EXISTS sessions_project_id_user_browser_idx ON sessions (project_id, user_browser);
            CREATE INDEX IF NOT EXISTS sessions_project_id_metadata_1_idx ON sessions (project_id, metadata_1);
            CREATE INDEX IF NOT EXISTS sessions_project_id_metadata_2_idx ON sessions (project_id, metadata_2);
            CREATE INDEX IF NOT EXISTS sessions_project_id_metadata_3_idx ON sessions (project_id, metadata_3);
            CREATE INDEX IF NOT EXISTS sessions_project_id_metadata_4_idx ON sessions (project_id, metadata_4);
            CREATE INDEX IF NOT EXISTS sessions_project_id_metadata_5_idx ON sessions (project_id, metadata_5);
            CREATE INDEX IF NOT EXISTS sessions_project_id_metadata_6_idx ON sessions (project_id, metadata_6);
            CREATE INDEX IF NOT EXISTS sessions_project_id_metadata_7_idx ON sessions (project_id, metadata_7);
            CREATE INDEX IF NOT EXISTS sessions_project_id_metadata_8_idx ON sessions (project_id, metadata_8);
            CREATE INDEX IF NOT EXISTS sessions_project_id_metadata_9_idx ON sessions (project_id, metadata_9);
            CREATE INDEX IF NOT EXISTS sessions_project_id_metadata_10_idx ON sessions (project_id, metadata_10);
            CREATE INDEX IF NOT EXISTS sessions_project_id_watchdogs_score_idx ON sessions (project_id, watchdogs_score DESC);
            CREATE INDEX IF NOT EXISTS sessions_platform_idx ON public.sessions (platform);

            CREATE INDEX IF NOT EXISTS sessions_metadata1_gin_idx ON public.sessions USING GIN (metadata_1 gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_metadata2_gin_idx ON public.sessions USING GIN (metadata_2 gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_metadata3_gin_idx ON public.sessions USING GIN (metadata_3 gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_metadata4_gin_idx ON public.sessions USING GIN (metadata_4 gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_metadata5_gin_idx ON public.sessions USING GIN (metadata_5 gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_metadata6_gin_idx ON public.sessions USING GIN (metadata_6 gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_metadata7_gin_idx ON public.sessions USING GIN (metadata_7 gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_metadata8_gin_idx ON public.sessions USING GIN (metadata_8 gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_metadata9_gin_idx ON public.sessions USING GIN (metadata_9 gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_metadata10_gin_idx ON public.sessions USING GIN (metadata_10 gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_user_device_gin_idx ON public.sessions USING GIN (user_device gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_user_id_gin_idx ON public.sessions USING GIN (user_id gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_user_anonymous_id_gin_idx ON public.sessions USING GIN (user_anonymous_id gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_start_ts_idx ON public.sessions (start_ts) WHERE duration > 0;
            CREATE INDEX IF NOT EXISTS sessions_project_id_idx ON public.sessions (project_id) WHERE duration > 0;
            CREATE INDEX IF NOT EXISTS sessions_session_id_project_id_start_ts_idx ON sessions (session_id, project_id, start_ts) WHERE duration > 0;
            CREATE INDEX IF NOT EXISTS sessions_session_id_project_id_start_ts_durationNN_idx ON sessions (session_id, project_id, start_ts) WHERE duration IS NOT NULL;
            CREATE INDEX IF NOT EXISTS sessions_user_id_useridNN_idx ON sessions (user_id) WHERE user_id IS NOT NULL;
            CREATE INDEX IF NOT EXISTS sessions_uid_projectid_startts_sessionid_uidNN_durGTZ_idx ON sessions (user_id, project_id, start_ts, session_id) WHERE user_id IS NOT NULL AND duration > 0;
            CREATE INDEX IF NOT EXISTS sessions_utm_source_gin_idx ON public.sessions USING GIN (utm_source gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_utm_medium_gin_idx ON public.sessions USING GIN (utm_medium gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_utm_campaign_gin_idx ON public.sessions USING GIN (utm_campaign gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS sessions_base_referrer_gin_idx ON public.sessions USING GIN (base_referrer gin_trgm_ops);
            BEGIN
                ALTER TABLE public.sessions
                    ADD CONSTRAINT web_browser_constraint CHECK (
                            (sessions.platform = 'web' AND sessions.user_browser NOTNULL) OR
                            (sessions.platform != 'web' AND sessions.user_browser ISNULL));
            EXCEPTION
                WHEN duplicate_object THEN RAISE NOTICE 'Table constraint exists';
            END;
            BEGIN
                ALTER TABLE public.sessions
                    ADD CONSTRAINT web_user_browser_version_constraint CHECK (
                        sessions.platform = 'web' OR sessions.user_browser_version ISNULL);
            EXCEPTION
                WHEN duplicate_object THEN RAISE NOTICE 'Table constraint exists';
            END;
            BEGIN
                ALTER TABLE public.sessions
                    ADD CONSTRAINT web_user_agent_constraint CHECK (
                            (sessions.platform = 'web' AND sessions.user_agent NOTNULL) OR
                            (sessions.platform != 'web' AND sessions.user_agent ISNULL));
            EXCEPTION
                WHEN duplicate_object THEN RAISE NOTICE 'Table constraint already exists';
            END;
            CREATE TABLE IF NOT EXISTS user_viewed_sessions
            (
                user_id    integer NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
                session_id bigint  NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, session_id)
            );

            CREATE TABLE IF NOT EXISTS user_favorite_sessions
            (
                user_id    integer NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
                session_id bigint  NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, session_id)
            );
            CREATE INDEX IF NOT EXISTS user_favorite_sessions_user_id_session_id_idx ON user_favorite_sessions (user_id, session_id);


            CREATE TABLE IF NOT EXISTS frontend_signals
            (
                project_id integer   NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                user_id    integer   NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
                timestamp  bigint    NOT NULL,
                action     text      NOT NULL,
                source     text      NOT NULL,
                category   text      NOT NULL,
                data       jsonb     NULL,
                session_id integer   NULL REFERENCES sessions (session_id) ON DELETE SET NULL,
                created_at timestamp NOT NULL DEFAULT timezone('utc'::text, now())
            );
            CREATE INDEX IF NOT EXISTS frontend_signals_user_id_idx ON frontend_signals (user_id);


            CREATE TABLE IF NOT EXISTS assigned_sessions
            (
                session_id    bigint                                         NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                issue_id      text                                           NOT NULL,
                provider      oauth_provider                                 NOT NULL,
                created_by    integer                                        NOT NULL,
                created_at    timestamp DEFAULT timezone('utc'::text, now()) NOT NULL,
                provider_data jsonb     DEFAULT'{}'::jsonb                   NOT NULL
            );
            CREATE INDEX IF NOT EXISTS assigned_sessions_session_id_idx ON assigned_sessions (session_id);


            CREATE TABLE IF NOT EXISTS autocomplete
            (
                value      text    NOT NULL,
                type       text    NOT NULL,
                project_id integer NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE
            );

            CREATE UNIQUE INDEX IF NOT EXISTS autocomplete_unique_project_id_md5value_type_idx ON autocomplete (project_id, md5(value), type);
            CREATE INDEX IF NOT EXISTS autocomplete_project_id_idx ON autocomplete (project_id);
            CREATE INDEX IF NOT EXISTS autocomplete_type_idx ON public.autocomplete (type);

            CREATE INDEX IF NOT EXISTS autocomplete_value_clickonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'CLICK';
            CREATE INDEX IF NOT EXISTS autocomplete_value_customonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'CUSTOM';
            CREATE INDEX IF NOT EXISTS autocomplete_value_graphqlonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'GRAPHQL';
            CREATE INDEX IF NOT EXISTS autocomplete_value_inputonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'INPUT';
            CREATE INDEX IF NOT EXISTS autocomplete_value_locationonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'LOCATION';
            CREATE INDEX IF NOT EXISTS autocomplete_value_referreronly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'REFERRER';
            CREATE INDEX IF NOT EXISTS autocomplete_value_requestonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'REQUEST';
            CREATE INDEX IF NOT EXISTS autocomplete_value_revidonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'REVID';
            CREATE INDEX IF NOT EXISTS autocomplete_value_stateactiononly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'STATEACTION';
            CREATE INDEX IF NOT EXISTS autocomplete_value_useranonymousidonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'USERANONYMOUSID';
            CREATE INDEX IF NOT EXISTS autocomplete_value_userbrowseronly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'USERBROWSER';
            CREATE INDEX IF NOT EXISTS autocomplete_value_usercountryonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'USERCOUNTRY';
            CREATE INDEX IF NOT EXISTS autocomplete_value_userdeviceonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'USERDEVICE';
            CREATE INDEX IF NOT EXISTS autocomplete_value_useridonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'USERID';
            CREATE INDEX IF NOT EXISTS autocomplete_value_userosonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'USEROS';

            BEGIN
                IF NOT EXISTS(SELECT *
                              FROM pg_type typ
                              WHERE typ.typname = 'job_status') THEN
                    CREATE TYPE job_status AS ENUM ('scheduled','running','cancelled','failed','completed');
                END IF;
            END;
            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'job_action') THEN
                CREATE TYPE job_action AS ENUM ('delete_user_data');
            END IF;

            CREATE TABLE IF NOT EXISTS jobs
            (
                job_id       integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                description  text                                           NOT NULL,
                status       job_status                                     NOT NULL,
                project_id   integer                                        NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                action       job_action                                     NOT NULL,
                reference_id text                                           NOT NULL,
                created_at   timestamp DEFAULT timezone('utc'::text, now()) NOT NULL,
                updated_at   timestamp DEFAULT timezone('utc'::text, now()) NULL,
                start_at     timestamp                                      NOT NULL,
                errors       text                                           NULL
            );
            CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs (status);
            CREATE INDEX IF NOT EXISTS jobs_start_at_idx ON jobs (start_at);
            CREATE INDEX IF NOT EXISTS jobs_project_id_idx ON jobs (project_id);


            CREATE TABLE IF NOT EXISTS traces
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
            CREATE INDEX IF NOT EXISTS traces_user_id_idx ON traces (user_id);
            CREATE INDEX IF NOT EXISTS traces_tenant_id_idx ON traces (tenant_id);
            CREATE INDEX IF NOT EXISTS traces_created_at_idx ON traces (created_at);
            CREATE INDEX IF NOT EXISTS traces_action_idx ON traces (action);

            CREATE TABLE IF NOT EXISTS metrics
            (
                metric_id      integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                project_id     integer   NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                user_id        integer   REFERENCES users (user_id) ON DELETE SET NULL,
                name           text      NOT NULL,
                is_public      boolean   NOT NULL DEFAULT TRUE,
                created_at     timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
                deleted_at     timestamp,
                edited_at      timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
                metric_type    text      NOT NULL DEFAULT 'timeseries',
                view_type      text      NOT NULL DEFAULT 'lineChart',
                metric_of      text      NOT NULL DEFAULT 'sessionCount',
                metric_value   text[]    NOT NULL DEFAULT '{}'::text[],
                metric_format  text,
                thumbnail      text,
                is_pinned      boolean   NOT NULL DEFAULT FALSE,
                default_config jsonb     NOT NULL DEFAULT '{
                  "col": 2,
                  "row": 2,
                  "position": 0
                }'::jsonb,
                data           jsonb     NULL
            );
            CREATE INDEX IF NOT EXISTS metrics_user_id_is_public_idx ON public.metrics (user_id, is_public);
            CREATE TABLE IF NOT EXISTS metric_series
            (
                series_id  integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                metric_id  integer REFERENCES metrics (metric_id) ON DELETE CASCADE,
                index      integer                                        NOT NULL,
                name       text                                           NULL,
                filter     jsonb                                          NOT NULL,
                created_at timestamp DEFAULT timezone('utc'::text, now()) NOT NULL,
                deleted_at timestamp
            );
            CREATE INDEX IF NOT EXISTS metric_series_metric_id_idx ON public.metric_series (metric_id);


            CREATE TABLE dashboards
            (
                dashboard_id integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                project_id   integer   NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                user_id      integer   REFERENCES users (user_id) ON DELETE SET NULL,
                name         text      NOT NULL,
                description  text      NOT NULL DEFAULT '',
                is_public    boolean   NOT NULL DEFAULT TRUE,
                is_pinned    boolean   NOT NULL DEFAULT FALSE,
                created_at   timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
                deleted_at   timestamp NULL     DEFAULT NULL
            );

            CREATE TABLE dashboard_widgets
            (
                widget_id    integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                dashboard_id integer   NOT NULL REFERENCES dashboards (dashboard_id) ON DELETE CASCADE,
                metric_id    integer   NOT NULL REFERENCES metrics (metric_id) ON DELETE CASCADE,
                user_id      integer   NOT NULL REFERENCES users (user_id) ON DELETE SET NULL,
                created_at   timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
                config       jsonb     NOT NULL DEFAULT '{}'::jsonb
            );


            CREATE TABLE IF NOT EXISTS searches
            (
                search_id  integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                project_id integer NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                user_id    integer NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
                name       text    NOT NULL,
                filter     jsonb   NOT NULL,
                created_at timestamp        DEFAULT timezone('utc'::text, now()) NOT NULL,
                deleted_at timestamp,
                is_public  boolean NOT NULL DEFAULT False
            );

            CREATE INDEX IF NOT EXISTS searches_user_id_is_public_idx ON public.searches (user_id, is_public);
            CREATE INDEX IF NOT EXISTS searches_project_id_idx ON public.searches (project_id);

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'alert_detection_method') THEN
                CREATE TYPE alert_detection_method AS ENUM ('threshold', 'change');
            END IF;

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'alert_change_type') THEN
                CREATE TYPE alert_change_type AS ENUM ('percent', 'change');
            END IF;

            CREATE TABLE IF NOT EXISTS alerts
            (
                alert_id         integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                project_id       integer                NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                series_id        integer                NULL REFERENCES metric_series (series_id) ON DELETE CASCADE,
                name             text                   NOT NULL,
                description      text                   NULL     DEFAULT NULL,
                active           boolean                NOT NULL DEFAULT TRUE,
                detection_method alert_detection_method NOT NULL,
                change           alert_change_type      NOT NULL DEFAULT 'change',
                query            jsonb                  NOT NULL,
                deleted_at       timestamp              NULL     DEFAULT NULL,
                created_at       timestamp              NOT NULL DEFAULT timezone('utc'::text, now()),
                options          jsonb                  NOT NULL DEFAULT'{
                  "renotifyInterval": 1440
                }'::jsonb
            );
            CREATE INDEX IF NOT EXISTS alerts_project_id_idx ON alerts (project_id);
            CREATE INDEX IF NOT EXISTS alerts_series_id_idx ON alerts (series_id);

            DROP TRIGGER IF EXISTS on_insert_or_update_or_delete ON alerts;

            CREATE TRIGGER on_insert_or_update_or_delete
                AFTER INSERT OR UPDATE OR DELETE
                ON alerts
                FOR EACH ROW
            EXECUTE PROCEDURE notify_alert();

            CREATE TABLE IF NOT EXISTS sessions_notes
            (
                note_id    integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                message    text                        NOT NULL,
                created_at timestamp without time zone NOT NULL DEFAULT (now() at time zone 'utc'),
                user_id    integer                     NULL REFERENCES users (user_id) ON DELETE SET NULL,
                deleted_at timestamp without time zone NULL     DEFAULT NULL,
                tag        text                        NULL,
                session_id bigint                      NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                project_id integer                     NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                timestamp  integer                     NOT NULL DEFAULT -1,
                is_public  boolean                     NOT NULL DEFAULT FALSE
            );

            CREATE TABLE IF NOT EXISTS public.assist_records
            (
                record_id  integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                project_id integer                     NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                user_id    integer                     NOT NULL REFERENCES users (user_id) ON DELETE SET NULL,
                session_id bigint                      NOT NULL REFERENCES sessions (session_id) ON DELETE SET NULL,
                created_at bigint                      NOT NULL DEFAULT (EXTRACT(EPOCH FROM now() at time zone 'utc') * 1000)::bigint,
                deleted_at timestamp without time zone NULL     DEFAULT NULL,
                name       text                        NOT NULL,
                file_key   text                        NOT NULL,
                duration   integer                     NOT NULL
            );

            CREATE TABLE IF NOT EXISTS public.projects_stats
            (
                project_id     integer NOT NULL,
                created_at     timestamp        default (now() AT TIME ZONE 'utc'::text),
                sessions_count integer NOT NULL DEFAULT 0,
                events_count   bigint  NOT NULL DEFAULT 0,
                last_update_at timestamp        default (now() AT TIME ZONE 'utc'::text),
                primary key (project_id, created_at)
            );

            CREATE INDEX IF NOT EXISTS projects_stats_project_id_idx ON public.projects_stats (project_id);

            CREATE TABLE IF NOT EXISTS public.feature_flags
            (
                feature_flag_id integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                project_id      integer                     NOT NULL REFERENCES projects (project_id) ON DELETE CASCADE,
                flag_key        text                        NOT NULL,
                description     text                                 DEFAULT NULL,
                payload         jsonb                                DEFAULT NULL,
                flag_type       text                        NOT NULL,
                is_persist      boolean                     NOT NULL DEFAULT FALSE,
                is_active       boolean                     NOT NULL DEFAULT FALSE,
                created_by      integer                     REFERENCES users (user_id) ON DELETE SET NULL,
                updated_by      integer                     REFERENCES users (user_id) ON DELETE SET NULL,
                created_at      timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
                updated_at      timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
                deleted_at      timestamp without time zone NULL     DEFAULT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_feature_flags_project_id ON public.feature_flags (project_id);

            ALTER TABLE feature_flags
                ADD CONSTRAINT unique_project_flag_deleted UNIQUE (project_id, flag_key, deleted_at);

            CREATE TABLE IF NOT EXISTS public.feature_flags_conditions
            (
                condition_id       integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                feature_flag_id    integer NOT NULL REFERENCES feature_flags (feature_flag_id) ON DELETE CASCADE,
                name               text    NOT NULL,
                rollout_percentage integer NOT NULL,
                filters            jsonb   NOT NULL DEFAULT '[]'::jsonb
            );

            CREATE TABLE IF NOT EXISTS public.feature_flags_variants
            (
                variant_id         integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
                feature_flag_id    integer NOT NULL REFERENCES feature_flags (feature_flag_id) ON DELETE CASCADE,
                value              text    NOT NULL,
                description        text    DEFAULT NULL,
                payload            jsonb   DEFAULT NULL,
                rollout_percentage integer DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS public.sessions_feature_flags
            (
                session_id      bigint  NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                feature_flag_id integer NOT NULL REFERENCES feature_flags (feature_flag_id) ON DELETE CASCADE,
                condition_id    integer NULL REFERENCES feature_flags_conditions (condition_id) ON DELETE SET NULL
            );

            RAISE NOTICE 'Created missing public schema tables';
        END IF;
    END;

$$
LANGUAGE plpgsql;


DO
$$
    BEGIN
        IF (with to_check (name) as (values ('clicks'),
                                            ('errors'),
                                            ('graphql'),
                                            ('inputs'),
                                            ('pages'),
                                            ('performance'),
                                            ('resources'),
                                            ('state_actions'))
            select bool_and(exists(select *
                                   from information_schema.tables t
                                   where table_schema = 'events'
                                     AND table_name = to_check.name)) as all_present
            from to_check) THEN
            raise notice 'All events schema tables exists';
        ELSE
            CREATE TABLE IF NOT EXISTS events.pages
            (
                session_id                  bigint NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                message_id                  bigint NOT NULL,
                timestamp                   bigint NOT NULL,
                host                        text   NOT NULL,
                path                        text   NOT NULL,
                query                       text   NULL,
                referrer                    text    DEFAULT NULL,
                base_referrer               text    DEFAULT NULL,
                dom_building_time           integer DEFAULT NULL,
                dom_content_loaded_time     integer DEFAULT NULL,
                load_time                   integer DEFAULT NULL,
                first_paint_time            integer DEFAULT NULL,
                first_contentful_paint_time integer DEFAULT NULL,
                speed_index                 integer DEFAULT NULL,
                visually_complete           integer DEFAULT NULL,
                time_to_interactive         integer DEFAULT NULL,
                response_time               bigint  DEFAULT NULL,
                response_end                bigint  DEFAULT NULL,
                ttfb                        integer DEFAULT NULL,
                PRIMARY KEY (session_id, message_id)
            );
            CREATE INDEX IF NOT EXISTS pages_session_id_idx ON events.pages (session_id);
            CREATE INDEX IF NOT EXISTS pages_base_referrer_gin_idx ON events.pages USING GIN (base_referrer gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS pages_timestamp_idx ON events.pages (timestamp);
            CREATE INDEX IF NOT EXISTS pages_session_id_timestamp_idx ON events.pages (session_id, timestamp);
            CREATE INDEX IF NOT EXISTS pages_base_referrer_idx ON events.pages (base_referrer);
            CREATE INDEX IF NOT EXISTS pages_response_time_idx ON events.pages (response_time);
            CREATE INDEX IF NOT EXISTS pages_response_end_idx ON events.pages (response_end);
            CREATE INDEX IF NOT EXISTS pages_path_gin_idx ON events.pages USING GIN (path gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS pages_path_idx ON events.pages (path);
            CREATE INDEX IF NOT EXISTS pages_visually_complete_idx ON events.pages (visually_complete) WHERE visually_complete > 0;
            CREATE INDEX IF NOT EXISTS pages_dom_building_time_idx ON events.pages (dom_building_time) WHERE dom_building_time > 0;
            CREATE INDEX IF NOT EXISTS pages_load_time_idx ON events.pages (load_time) WHERE load_time > 0;
            CREATE INDEX IF NOT EXISTS pages_first_contentful_paint_time_idx ON events.pages (first_contentful_paint_time) WHERE first_contentful_paint_time > 0;
            CREATE INDEX IF NOT EXISTS pages_dom_content_loaded_time_idx ON events.pages (dom_content_loaded_time) WHERE dom_content_loaded_time > 0;
            CREATE INDEX IF NOT EXISTS pages_first_paint_time_idx ON events.pages (first_paint_time) WHERE first_paint_time > 0;
            CREATE INDEX IF NOT EXISTS pages_ttfb_idx ON events.pages (ttfb) WHERE ttfb > 0;
            CREATE INDEX IF NOT EXISTS pages_time_to_interactive_idx ON events.pages (time_to_interactive) WHERE time_to_interactive > 0;
            CREATE INDEX IF NOT EXISTS pages_session_id_timestamp_loadgt0NN_idx ON events.pages (session_id, timestamp) WHERE load_time > 0 AND load_time IS NOT NULL;
            CREATE INDEX IF NOT EXISTS pages_session_id_timestamp_visualgt0nn_idx ON events.pages (session_id, timestamp) WHERE visually_complete > 0 AND visually_complete IS NOT NULL;
            CREATE INDEX IF NOT EXISTS pages_timestamp_metgt0_idx ON events.pages (timestamp) WHERE response_time > 0 OR
                                                                                                    first_paint_time >
                                                                                                    0 OR
                                                                                                    dom_content_loaded_time >
                                                                                                    0 OR
                                                                                                    ttfb > 0 OR
                                                                                                    time_to_interactive >
                                                                                                    0;
            CREATE INDEX IF NOT EXISTS pages_session_id_speed_indexgt0nn_idx ON events.pages (session_id, speed_index) WHERE speed_index > 0 AND speed_index IS NOT NULL;
            CREATE INDEX IF NOT EXISTS pages_session_id_timestamp_dom_building_timegt0nn_idx ON events.pages (session_id, timestamp, dom_building_time) WHERE dom_building_time > 0 AND dom_building_time IS NOT NULL;
            CREATE INDEX IF NOT EXISTS pages_path_session_id_timestamp_idx ON events.pages (path, session_id, timestamp);
            CREATE INDEX IF NOT EXISTS pages_path_pathLNGT2_idx ON events.pages (path) WHERE length(path) > 2;
            CREATE INDEX IF NOT EXISTS pages_query_nn_idx ON events.pages (query) WHERE query IS NOT NULL;
            CREATE INDEX IF NOT EXISTS pages_query_nn_gin_idx ON events.pages USING GIN (query gin_trgm_ops) WHERE query IS NOT NULL;


            CREATE TABLE IF NOT EXISTS events.clicks
            (
                session_id bigint             NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                message_id bigint             NOT NULL,
                timestamp  bigint             NOT NULL,
                label      text    DEFAULT NULL,
                url        text    DEFAULT '' NOT NULL,
                path       text,
                selector   text    DEFAULT '' NOT NULL,
                hesitation integer DEFAULT NULL,
                PRIMARY KEY (session_id, message_id)
            );
            CREATE INDEX IF NOT EXISTS clicks_session_id_idx ON events.clicks (session_id);
            CREATE INDEX IF NOT EXISTS clicks_label_idx ON events.clicks (label);
            CREATE INDEX IF NOT EXISTS clicks_label_gin_idx ON events.clicks USING GIN (label gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS clicks_timestamp_idx ON events.clicks (timestamp);
            CREATE INDEX IF NOT EXISTS clicks_label_session_id_timestamp_idx ON events.clicks (label, session_id, timestamp);
            CREATE INDEX IF NOT EXISTS clicks_url_idx ON events.clicks (url);
            CREATE INDEX IF NOT EXISTS clicks_url_session_id_timestamp_selector_idx ON events.clicks (url, session_id, timestamp, selector);
            CREATE INDEX IF NOT EXISTS clicks_session_id_timestamp_idx ON events.clicks (session_id, timestamp);
            CREATE INDEX IF NOT EXISTS clicks_selector_idx ON events.clicks (selector);
            CREATE INDEX IF NOT EXISTS clicks_path_idx ON events.clicks (path);
            CREATE INDEX IF NOT EXISTS clicks_path_gin_idx ON events.clicks USING GIN (path gin_trgm_ops);


            CREATE TABLE IF NOT EXISTS events.inputs
            (
                session_id bigint NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                message_id bigint NOT NULL,
                timestamp  bigint NOT NULL,
                label      text    DEFAULT NULL,
                value      text    DEFAULT NULL,
                duration   integer DEFAULT NULL,
                hesitation integer DEFAULT NULL,
                PRIMARY KEY (session_id, message_id)
            );
            CREATE INDEX IF NOT EXISTS inputs_session_id_idx ON events.inputs (session_id);
            CREATE INDEX IF NOT EXISTS inputs_label_gin_idx ON events.inputs USING GIN (label gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS inputs_timestamp_idx ON events.inputs (timestamp);
            CREATE INDEX IF NOT EXISTS inputs_label_session_id_timestamp_idx ON events.inputs (label, session_id, timestamp);

            CREATE TABLE IF NOT EXISTS events.errors
            (
                session_id bigint NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                message_id bigint NOT NULL,
                timestamp  bigint NOT NULL,
                error_id   text   NOT NULL REFERENCES errors (error_id) ON DELETE CASCADE,
                PRIMARY KEY (session_id, message_id)
            );
            CREATE INDEX IF NOT EXISTS errors_session_id_idx ON events.errors (session_id);
            CREATE INDEX IF NOT EXISTS errors_timestamp_idx ON events.errors (timestamp);
            CREATE INDEX IF NOT EXISTS errors_session_id_timestamp_error_id_idx ON events.errors (session_id, timestamp, error_id);
            CREATE INDEX IF NOT EXISTS errors_error_id_timestamp_idx ON events.errors (error_id, timestamp);
            CREATE INDEX IF NOT EXISTS errors_timestamp_error_id_session_id_idx ON events.errors (timestamp, error_id, session_id);
            CREATE INDEX IF NOT EXISTS errors_error_id_timestamp_session_id_idx ON events.errors (error_id, timestamp, session_id);
            CREATE INDEX IF NOT EXISTS errors_error_id_idx ON events.errors (error_id);

            CREATE TABLE IF NOT EXISTS errors_tags
            (
                key        text                        NOT NULL,
                value      text                        NOT NULL,
                created_at timestamp without time zone NOT NULL default (now() at time zone 'utc'),
                error_id   text                        NOT NULL REFERENCES errors (error_id) ON DELETE CASCADE,
                session_id bigint                      NOT NULL,
                message_id bigint                      NOT NULL,
                FOREIGN KEY (session_id, message_id) REFERENCES events.errors (session_id, message_id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS errors_tags_error_id_idx ON errors_tags (error_id);
            CREATE INDEX IF NOT EXISTS errors_tags_session_id_idx ON errors_tags (session_id);
            CREATE INDEX IF NOT EXISTS errors_tags_message_id_idx ON errors_tags (message_id);

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'http_method') THEN
                CREATE TYPE http_method AS ENUM ('GET','HEAD','POST','PUT','DELETE','CONNECT','OPTIONS','TRACE','PATCH');
            END IF;
            CREATE TABLE IF NOT EXISTS events.graphql
            (
                session_id    bigint      NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                message_id    bigint      NOT NULL,
                timestamp     bigint      NOT NULL,
                name          text        NOT NULL,
                request_body  text        NULL,
                response_body text        NULL,
                method        http_method NULL,
                PRIMARY KEY (session_id, message_id)
            );
            CREATE INDEX IF NOT EXISTS graphql_name_idx ON events.graphql (name);
            CREATE INDEX IF NOT EXISTS graphql_name_gin_idx ON events.graphql USING GIN (name gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS graphql_timestamp_idx ON events.graphql (timestamp);
            CREATE INDEX IF NOT EXISTS graphql_request_body_nn_idx ON events.graphql (request_body) WHERE request_body IS NOT NULL;
            CREATE INDEX IF NOT EXISTS graphql_request_body_nn_gin_idx ON events.graphql USING GIN (request_body gin_trgm_ops) WHERE request_body IS NOT NULL;
            CREATE INDEX IF NOT EXISTS graphql_response_body_nn_idx ON events.graphql (response_body) WHERE response_body IS NOT NULL;
            CREATE INDEX IF NOT EXISTS graphql_response_body_nn_gin_idx ON events.graphql USING GIN (response_body gin_trgm_ops) WHERE response_body IS NOT NULL;

            CREATE TABLE IF NOT EXISTS events.state_actions
            (
                session_id bigint NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                message_id bigint NOT NULL,
                timestamp  bigint NOT NULL,
                name       text   NOT NULL,
                PRIMARY KEY (session_id, message_id)
            );
            CREATE INDEX IF NOT EXISTS state_actions_name_gin_idx ON events.state_actions USING GIN (name gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS state_actions_timestamp_idx ON events.state_actions (timestamp);

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'resource_type') THEN
                CREATE TYPE events.resource_type AS ENUM ('other', 'script', 'stylesheet', 'fetch', 'img', 'media');
            END IF;
            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'resource_method') THEN
                CREATE TYPE events.resource_method AS ENUM ('GET' , 'HEAD' , 'POST' , 'PUT' , 'DELETE' , 'CONNECT' , 'OPTIONS' , 'TRACE' , 'PATCH' );
            END IF;
            CREATE TABLE IF NOT EXISTS events.resources
            (
                session_id        bigint                 NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                message_id        bigint                 NOT NULL,
                timestamp         bigint                 NOT NULL,
                duration          bigint                 NULL,
                type              events.resource_type   NOT NULL,
                url               text                   NOT NULL,
                url_host          text                   NOT NULL,
                url_hostpath      text                   NOT NULL,
                success           boolean                NOT NULL,
                status            smallint               NULL,
                method            events.resource_method NULL,
                ttfb              bigint                 NULL,
                header_size       bigint                 NULL,
                encoded_body_size integer                NULL,
                decoded_body_size integer                NULL,
                PRIMARY KEY (session_id, message_id, timestamp)
            );
            CREATE INDEX IF NOT EXISTS resources_session_id_idx ON events.resources (session_id);
            CREATE INDEX IF NOT EXISTS resources_status_idx ON events.resources (status);
            CREATE INDEX IF NOT EXISTS resources_type_idx ON events.resources (type);
            CREATE INDEX IF NOT EXISTS resources_url_host_idx ON events.resources (url_host);
            CREATE INDEX IF NOT EXISTS resources_timestamp_idx ON events.resources (timestamp);
            CREATE INDEX IF NOT EXISTS resources_success_idx ON events.resources (success);

            CREATE INDEX IF NOT EXISTS resources_url_hostpath_gin_idx ON events.resources USING GIN (url_hostpath gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS resources_timestamp_type_durationgt0NN_idx ON events.resources (timestamp, type) WHERE duration > 0 AND duration IS NOT NULL;
            CREATE INDEX IF NOT EXISTS resources_session_id_timestamp_type_idx ON events.resources (session_id, timestamp, type);
            CREATE INDEX IF NOT EXISTS resources_timestamp_type_durationgt0NN_noFetch_idx ON events.resources (timestamp, type) WHERE duration > 0 AND duration IS NOT NULL AND type != 'fetch';
            CREATE INDEX IF NOT EXISTS resources_session_id_timestamp_url_host_fail_idx ON events.resources (session_id, timestamp, url_host) WHERE success = FALSE;
            CREATE INDEX IF NOT EXISTS resources_session_id_timestamp_url_host_firstparty_idx ON events.resources (session_id, timestamp, url_host) WHERE type IN ('fetch', 'script');
            CREATE INDEX IF NOT EXISTS resources_session_id_timestamp_duration_durationgt0NN_img_idx ON events.resources (session_id, timestamp, duration) WHERE duration > 0 AND duration IS NOT NULL AND type = 'img';
            CREATE INDEX IF NOT EXISTS resources_timestamp_session_id_idx ON events.resources (timestamp, session_id);
            CREATE INDEX IF NOT EXISTS resources_timestamp_duration_durationgt0NN_idx ON events.resources (timestamp, duration) WHERE duration > 0 AND duration IS NOT NULL;

            CREATE TABLE IF NOT EXISTS events.performance
            (
                session_id             bigint   NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                timestamp              bigint   NOT NULL,
                message_id             bigint   NOT NULL,
                host                   text     NULL DEFAULT NULL,
                path                   text     NULL DEFAULT NULL,
                query                  text     NULL DEFAULT NULL,
                min_fps                smallint NOT NULL,
                avg_fps                smallint NOT NULL,
                max_fps                smallint NOT NULL,
                min_cpu                smallint NOT NULL,
                avg_cpu                smallint NOT NULL,
                max_cpu                smallint NOT NULL,
                min_total_js_heap_size bigint   NOT NULL,
                avg_total_js_heap_size bigint   NOT NULL,
                max_total_js_heap_size bigint   NOT NULL,
                min_used_js_heap_size  bigint   NOT NULL,
                avg_used_js_heap_size  bigint   NOT NULL,
                max_used_js_heap_size  bigint   NOT NULL,
                PRIMARY KEY (session_id, message_id)
            );
            CREATE INDEX IF NOT EXISTS performance_session_id_idx ON events.performance (session_id);
            CREATE INDEX IF NOT EXISTS performance_timestamp_idx ON events.performance (timestamp);
            CREATE INDEX IF NOT EXISTS performance_session_id_timestamp_idx ON events.performance (session_id, timestamp);
            CREATE INDEX IF NOT EXISTS performance_avg_cpu_gt0_idx ON events.performance (avg_cpu) WHERE avg_cpu > 0;
            CREATE INDEX IF NOT EXISTS performance_avg_used_js_heap_size_gt0_idx ON events.performance (avg_used_js_heap_size) WHERE avg_used_js_heap_size > 0;
        END IF;
    END;
$$
LANGUAGE plpgsql;


DO
$$
    BEGIN
        IF (with to_check (name) as (values ('customs'),
                                            ('issues'),
                                            ('requests'))
            select bool_and(exists(select *
                                   from information_schema.tables t
                                   where table_schema = 'events_common'
                                     AND table_name = to_check.name)) as all_present
            from to_check) THEN
            raise notice 'All events_common schema tables exists';
        ELSE
            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'custom_level') THEN
                CREATE TYPE events_common.custom_level AS ENUM ('info','error');
            END IF;
            CREATE TABLE IF NOT EXISTS events_common.customs
            (
                session_id bigint                     NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                timestamp  bigint                     NOT NULL,
                seq_index  integer                    NOT NULL,
                name       text                       NOT NULL,
                payload    jsonb                      NOT NULL,
                level      events_common.custom_level NOT NULL DEFAULT 'info',
                PRIMARY KEY (session_id, timestamp, seq_index)
            );
            CREATE INDEX IF NOT EXISTS customs_name_idx ON events_common.customs (name);
            CREATE INDEX IF NOT EXISTS customs_name_gin_idx ON events_common.customs USING GIN (name gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS customs_timestamp_idx ON events_common.customs (timestamp);


            CREATE TABLE IF NOT EXISTS events_common.issues
            (
                session_id bigint  NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                timestamp  bigint  NOT NULL,
                seq_index  integer NOT NULL,
                issue_id   text    NOT NULL REFERENCES issues (issue_id) ON DELETE CASCADE,
                payload    jsonb DEFAULT NULL,
                PRIMARY KEY (session_id, timestamp, seq_index)
            );
            CREATE INDEX IF NOT EXISTS issues_issue_id_timestamp_idx ON events_common.issues (issue_id, timestamp);
            CREATE INDEX IF NOT EXISTS issues_timestamp_idx ON events_common.issues (timestamp);

            IF NOT EXISTS(SELECT *
                          FROM pg_type typ
                          WHERE typ.typname = 'http_method') THEN
                CREATE TYPE http_method AS ENUM ('GET','HEAD','POST','PUT','DELETE','CONNECT','OPTIONS','TRACE','PATCH');
            END IF;
            CREATE TABLE IF NOT EXISTS events_common.requests
            (
                session_id    bigint      NOT NULL REFERENCES sessions (session_id) ON DELETE CASCADE,
                timestamp     bigint      NOT NULL,
                seq_index     integer     NOT NULL,
                url           text        NOT NULL,
                duration      integer     NOT NULL,
                success       boolean     NOT NULL,
                request_body  text        NULL,
                response_body text        NULL,
                status_code   smallint    NULL,
                method        http_method NULL,
                host          text        NULL,
                path          text        NULL,
                query         text        NULL,
                PRIMARY KEY (session_id, timestamp, seq_index)
            );

            CREATE INDEX IF NOT EXISTS requests_duration_idx ON events_common.requests (duration);
            CREATE INDEX IF NOT EXISTS requests_timestamp_idx ON events_common.requests (timestamp);
            CREATE INDEX IF NOT EXISTS requests_timestamp_session_id_failed_idx ON events_common.requests (timestamp, session_id) WHERE success = FALSE;
            CREATE INDEX IF NOT EXISTS requests_request_body_nn_gin_idx ON events_common.requests USING GIN (request_body gin_trgm_ops) WHERE request_body IS NOT NULL;
            CREATE INDEX IF NOT EXISTS requests_response_body_nn_gin_idx ON events_common.requests USING GIN (response_body gin_trgm_ops) WHERE response_body IS NOT NULL;
            CREATE INDEX IF NOT EXISTS requests_status_code_nn_idx ON events_common.requests (status_code) WHERE status_code IS NOT NULL;
            CREATE INDEX IF NOT EXISTS requests_session_id_status_code_nn_idx ON events_common.requests (session_id, status_code) WHERE status_code IS NOT NULL;
            CREATE INDEX IF NOT EXISTS requests_host_nn_gin_idx ON events_common.requests USING GIN (host gin_trgm_ops) WHERE host IS NOT NULL;
            CREATE INDEX IF NOT EXISTS requests_path_nn_idx ON events_common.requests (path) WHERE path IS NOT NULL;
            CREATE INDEX IF NOT EXISTS requests_path_nn_gin_idx ON events_common.requests USING GIN (path gin_trgm_ops) WHERE path IS NOT NULL;
            CREATE INDEX IF NOT EXISTS requests_query_nn_gin_idx ON events_common.requests USING GIN (query gin_trgm_ops) WHERE query IS NOT NULL;

        END IF;
    END;
$$
LANGUAGE plpgsql;

COMMIT;
