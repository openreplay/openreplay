import re


def filter_sql_where_statement(sql_query):
    m = re.search('(?<=WHERE).*\n', sql_query)
    if m:
        return m.group(0)
    else:
        return None

