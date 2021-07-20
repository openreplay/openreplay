BEGIN;
CREATE INDEX pages_first_contentful_paint_time_idx ON events.pages (first_contentful_paint_time) WHERE first_contentful_paint_time>0;
CREATE INDEX pages_dom_content_loaded_time_idx ON events.pages (dom_content_loaded_time) WHERE dom_content_loaded_time>0;
CREATE INDEX pages_first_paint_time_idx ON events.pages (first_paint_time) WHERE first_paint_time > 0;
CREATE INDEX pages_ttfb_idx ON events.pages (ttfb) WHERE ttfb > 0;
CREATE INDEX pages_time_to_interactive_idx ON events.pages (time_to_interactive) WHERE time_to_interactive > 0;
COMMIT;