SELECT throwIf((SELECT openreplay_migration_state()) != 10, 'Previous step is not done') AS check;

ALTER TABLE experimental.events
    MODIFY COLUMN issue_type Nullable(Enum8('click_rage'=1,'dead_click'=2,'excessive_scrolling'=3,'bad_request'=4,'missing_resource'=5,'memory'=6,'cpu'=7,'slow_resource'=8,'slow_page_load'=9,'crash'=10,'ml_cpu'=11,'ml_memory'=12,'ml_dead_click'=13,'ml_click_rage'=14,'ml_mouse_thrashing'=15,'ml_excessive_scrolling'=16,'ml_slow_resources'=17,'custom'=18,'js_exception'=19,'mouse_thrashing'=20,'app_crash'=21,'incident'=22));
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 11;
