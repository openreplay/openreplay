CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.25.0';

ALTER TABLE product_analytics.all_events
    ADD COLUMN status LowCardinality(String) DEFAULT 'visible' COMMENT 'visible/hidden/dropped' AFTER description;