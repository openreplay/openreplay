BEGIN;
CREATE INDEX pages_ttfb_idx ON events.pages (ttfb) WHERE ttfb > 0;
COMMIT;