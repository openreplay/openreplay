import schemas


def get_col(perf: schemas.PerformanceEventType):
    return {
        schemas.PerformanceEventType.location_dom_complete: {"column": "dom_building_time", "extraJoin": None},
        schemas.PerformanceEventType.location_ttfb: {"column": "ttfb", "extraJoin": None},
        schemas.PerformanceEventType.location_avg_cpu_load: {"column": "avg_cpu", "extraJoin": "events.performance"},
        # schemas.PerformanceEventType.location_largest_contentful_paint_time: "timestamp"
    }.get(perf)
