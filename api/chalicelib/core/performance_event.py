import schemas


def get_col(perf: schemas.PerformanceEventType):
    return {
        schemas.PerformanceEventType.location_dom_complete: "dom_building_time",
        schemas.PerformanceEventType.ttfb: "ttfb",
        # schemas.PerformanceEventType.location_largest_contentful_paint_time: "timestamp"
    }.get(perf)
