class Event:
    def __init__(self, ui_type, table, column):
        self.ui_type = ui_type
        self.table = table
        self.column = column


class SupportedFilter:
    def __init__(self, get, query, value_limit, starts_with, starts_limit, ignore_if_starts_with):
        self.get = get
        self.query = query
        self.valueLimit = value_limit
        self.startsWith = starts_with
        self.startsLimit = starts_limit
        self.ignoreIfStartsWith = ignore_if_starts_with
