import schemas


def get_col(perf: schemas.PerformanceEventType):
    return {
        schemas.PerformanceEventType.LOCATION_DOM_COMPLETE: {"column": "dom_building_time", "extraJoin": None},
        schemas.PerformanceEventType.LOCATION_TTFB: {"column": "ttfb", "extraJoin": None},
        schemas.PerformanceEventType.LOCATION_AVG_CPU_LOAD: {"column": "avg_cpu", "extraJoin": "events.performance"},
        schemas.PerformanceEventType.LOCATION_AVG_MEMORY_USAGE: {"column": "avg_used_js_heap_size",
                                                                 "extraJoin": "events.performance"},
        schemas.PerformanceEventType.FETCH_FAILED: {"column": "success", "extraJoin": None},
        # schemas.PerformanceEventType.fetch_duration: {"column": "duration", "extraJoin": None},
        schemas.PerformanceEventType.LOCATION_LARGEST_CONTENTFUL_PAINT_TIME: {"column": "first_contentful_paint_time",
                                                                              "extraJoin": None}
    }.get(perf)
