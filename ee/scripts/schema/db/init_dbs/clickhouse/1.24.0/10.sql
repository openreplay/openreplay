DROP TABLE IF EXISTS product_analytics.autocomplete_event_properties;
DROP TABLE IF EXISTS product_analytics.autocomplete_events;

-- changes for properties-autocomplete
DROP TABLE IF EXISTS product_analytics.autocomplete_event_properties_grouped_mv;
DROP TABLE IF EXISTS product_analytics.autocomplete_event_dproperties_grouped_mv;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 10;
