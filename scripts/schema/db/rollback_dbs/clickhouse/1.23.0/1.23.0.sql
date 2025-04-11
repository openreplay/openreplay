CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.22.0';


DROP TABLE IF EXISTS experimental.user_viewed_sessions;

DROP TABLE IF EXISTS product_analytics.event_properties;