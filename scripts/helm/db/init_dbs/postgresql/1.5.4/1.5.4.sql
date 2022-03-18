BEGIN;
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT 'v1.5.4'
$$ LANGUAGE sql IMMUTABLE;


COMMIT;

CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_clickonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'CLICK';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_customonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'CUSTOM';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_graphqlonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'GRAPHQL';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_inputonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'INPUT';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_locationonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'LOCATION';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_referreronly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'REFERRER';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_requestonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'REQUEST';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_revidonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'REVID';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_stateactiononly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'STATEACTION';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_useranonymousidonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'USERANONYMOUSID';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_userbrowseronly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'USERBROWSER';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_usercountryonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'USERCOUNTRY';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_userdeviceonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'USERDEVICE';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_useridonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'USERID';
CREATE INDEX CONCURRENTLY IF NOT EXISTS autocomplete_value_userosonly_gin_idx ON public.autocomplete USING GIN (value gin_trgm_ops) WHERE type = 'USEROS';
