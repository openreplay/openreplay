CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.21.0-ee';


DROP TABLE IF EXISTS experimental.resources_l7d_mv SETTINGS max_table_size_to_drop = 0;

DROP TABLE IF EXISTS experimental.resources SETTINGS max_table_size_to_drop = 0;