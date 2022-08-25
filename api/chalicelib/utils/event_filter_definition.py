class Event:
    def __init__(self, ui_type, table, column):
        self.ui_type = ui_type
        self.table = table
        self.column = column


class SupportedFilter:
    def __init__(self, get, query):
        self.get = get
        self.query = query
