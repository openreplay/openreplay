def __get_step_size(startTimestamp, endTimestamp, density, decimal=False, factor=1000):
    step_size = (endTimestamp // factor - startTimestamp // factor)
    if decimal:
        return step_size / density
    return step_size // (density - 1)
