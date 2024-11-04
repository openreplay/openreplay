CREATE OR REPLACE FUNCTION openreplay_version AS() -> 'v1.21.0-ee';


DROP TABLE IF EXISTS experimental.resources_l7d_mv;

DROP TABLE IF EXISTS experimental.resources;