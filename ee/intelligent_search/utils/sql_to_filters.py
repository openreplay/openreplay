import re


def filter_sql_where_statement2(sql_query):
    m = re.search('(?<=[W,w][H,h][E,e][R,r][E,e])[^;]*;', sql_query)
    if m:
        return m.group(0).replace('->','.')
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

def filter_substatement(where_statement):
    ...

def filter_code_markdown(text_response):
    m = re.finditer('```', text_response)
    try:
        pos1 = next(m).end()
        pos2 = next(m).start()
        return text_response[pos1:pos2]
    except Exception:
        return None

def filter_sql_where_statement(sql_query):
    sql_query = sql_query.replace('\n','  ')
    m = re.search('[S,s][E,e][L,l][E,e][C,c][T,t]', sql_query)
    if m:
        return filter_sql_where_statement2(sql_query[m.end():])
    else:
        print('[INFO] This None arrived')
        return None

