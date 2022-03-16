class Event:
    def __init__(self, ui_type, table, column):
        self.ui_type = ui_type
        self.table = table
        self.column = column


class SupportedFilter:
    def __init__(self, get, query, change_by_length):
        self.get = get
        self.query = query
        self.change_by_length = change_by_length
