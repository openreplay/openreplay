SELECT throwIf((SELECT openreplay_migration_state()) != 12, 'Previous step is not done') AS check;
DROP TABLE IF EXISTS product_analytics.autocomplete_events_mv;

-- changes for sample-values:
DROP TABLE IF EXISTS product_analytics.property_dvalues_sampler_mv;
DROP TABLE IF EXISTS product_analytics.property_values_sampler_mv;
DROP TABLE IF EXISTS product_analytics.property_values_samples;


CREATE OR REPLACE FUNCTION or_property_visibility AS(property_name)->multiIf(
        property_name == 'label', 'visible',
        property_name == 'tag_id', 'hidden',
        property_name == 'inp', 'hidden',
        property_name == 'web_vitals', 'hidden',
        property_name = 'duration', 'visible',
        property_name = 'avg_cpu', 'hidden',
        property_name = 'avg_fps', 'hidden',
        property_name = 'avg_total_js_heap_size', 'hidden',
        property_name = 'avg_used_js_heap_size', 'hidden',
        property_name = 'dom_building_time', 'hidden',
        property_name = 'dom_content_loaded_event_end', 'hidden',
        property_name = 'dom_content_loaded_event_start', 'hidden',
        property_name = 'dom_content_loaded_event_time', 'hidden',
        property_name = 'first_paint', 'hidden',
        property_name = 'load_event_end', 'hidden',
        property_name = 'load_event_start', 'hidden',
        property_name = 'load_event_time', 'hidden',
        property_name = 'url_hostpath', 'hidden',
        property_name = 'visually_complete', 'hidden',
        property_name = 'time_to_interactive', 'hidden',
        property_name = 'ttlb', 'hidden',
        property_name = 'transfer_size', 'hidden',
        property_name = 'source', 'hidden',
        property_name = 'request_start', 'hidden',
        property_name = 'response_end', 'hidden',
        property_name = 'response_start', 'hidden',
        property_name = 'response_time', 'hidden',
        property_name = 'normalized_x', 'visible',
        property_name = 'normalized_y', 'visible',
        property_name = 'max_total_js_heap_size', 'hidden',
        property_name = 'min_total_js_heap_size', 'hidden',
        property_name = 'userAnonymousId', 'hidden',
        property_name = 'user_device', 'hidden',
        'visible');
CREATE OR REPLACE FUNCTION openreplay_migration_state AS() -> 13;
