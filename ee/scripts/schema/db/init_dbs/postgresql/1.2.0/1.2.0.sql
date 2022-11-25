BEGIN;
CREATE TYPE user_origin AS ENUM ('saml');
ALTER TABLE public.users
    ADD COLUMN origin      user_origin NULL DEFAULT NULL,
    ADD COLUMN internal_id text        NULL DEFAULT NULL;
COMMIT;