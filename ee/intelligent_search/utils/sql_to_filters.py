import re


def filter_sql_where_statement(sql_query):
    m = re.search('(?<=WHERE).*\n', sql_query)
    if m:
        return m.group(0)
    else:
        return None

def get_filter_values(where_statement):
    statement_tree = list()
    last_parentheses = 0
    depth = 0
    for i, c in enumerate(where_statement):
        if c == '(':
            if i != 0:
                leaf = where_statement[last_parentheses+1:i]
                statement_tree.append((depth, leaf))
            depth +=1
            last_parentheses = i
        elif c == ')':
            leaf = where_statement[last_parentheses+1:i]
            statement_tree.append((depth, leaf))
            last_parentheses = i
            depth -= 1
    if last_parentheses == 0:
        return [(0,where_statement)]
    else:
        statement_tree.append((0, where_statement[last_parentheses+1:len(where_statement)]))
        return statement_tree

