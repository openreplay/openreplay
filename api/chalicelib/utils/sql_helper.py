from typing import Union

import schemas


def get_sql_operator(op: Union[schemas.SearchEventOperator, schemas.ClickEventExtraOperator]):
    return {
        schemas.SearchEventOperator._is: "=",
        schemas.SearchEventOperator._is_any: "IN",
        schemas.SearchEventOperator._on: "=",
        schemas.SearchEventOperator._on_any: "IN",
        schemas.SearchEventOperator._is_not: "!=",
        schemas.SearchEventOperator._not_on: "!=",
        schemas.SearchEventOperator._contains: "ILIKE",
        schemas.SearchEventOperator._not_contains: "NOT ILIKE",
        schemas.SearchEventOperator._starts_with: "ILIKE",
        schemas.SearchEventOperator._ends_with: "ILIKE",
    }.get(op, "=")


def is_negation_operator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator._is_not,
                  schemas.SearchEventOperator._not_on,
                  schemas.SearchEventOperator._not_contains]


def reverse_sql_operator(op):
    return "=" if op == "!=" else "!=" if op == "=" else "ILIKE" if op == "NOT ILIKE" else "NOT ILIKE"


def multi_conditions(condition, values, value_key="value", is_not=False):
    query = []
    for i in range(len(values)):
        k = f"{value_key}_{i}"
        query.append(condition.replace(value_key, k))
    return "(" + (" AND " if is_not else " OR ").join(query) + ")"


def multi_values(values, value_key="value"):
    query_values = {}
    if values is not None and isinstance(values, list):
        for i in range(len(values)):
            k = f"{value_key}_{i}"
            query_values[k] = values[i]
    return query_values


def isAny_opreator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator._on_any, schemas.SearchEventOperator._is_any]


def isUndefined_operator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator._is_undefined]
