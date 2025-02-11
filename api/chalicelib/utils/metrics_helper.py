def get_step_size(startTimestamp, endTimestamp, density, decimal=False, factor=1000):
    step_size = (endTimestamp // factor - startTimestamp // factor)
    if density <= 1:
        return step_size
    if decimal:
        return step_size / density
    return step_size // density
