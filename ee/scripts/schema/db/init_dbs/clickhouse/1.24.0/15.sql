DROP TABLE IF EXISTS product_analytics.all_properties_old;
RENAME TABLE product_analytics.all_properties TO product_analytics.all_properties_old;
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 15;
