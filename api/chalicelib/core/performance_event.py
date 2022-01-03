import schemas


def get_col(perf: schemas.PerformanceEventType):
    return {
        schemas.PerformanceEventType.location_dom_complete: {"column": "dom_building_time", "extraJoin": None},
        schemas.PerformanceEventType.location_ttfb: {"column": "ttfb", "extraJoin": None},
        schemas.PerformanceEventType.location_avg_cpu_load: {"column": "avg_cpu", "extraJoin": "events.performance"},
        schemas.PerformanceEventType.location_avg_memory_usage: {"column": "avg_used_js_heap_size",
                                                                 "extraJoin": "events.performance"},
        schemas.PerformanceEventType.fetch_failed: {"column": "success", "extraJoin": None},
        # schemas.PerformanceEventType.fetch_duration: {"column": "duration", "extraJoin": None},
        schemas.PerformanceEventType.location_largest_contentful_paint_time: {"column": "first_contentful_paint_time",
                                                                              "extraJoin": None}
    }.get(perf)
