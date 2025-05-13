from typing import Union
from enum import Enum
import schemas


def get_sql_operator(op: Union[schemas.SearchEventOperator, schemas.ClickEventExtraOperator, schemas.MathOperator]):
    return {
        schemas.SearchEventOperator.IS: "=",
        schemas.SearchEventOperator.ON: "=",
        schemas.SearchEventOperator.ON_ANY: "IN",
        schemas.SearchEventOperator.IS_NOT: "!=",
        schemas.SearchEventOperator.NOT_ON: "!=",
        schemas.SearchEventOperator.CONTAINS: "ILIKE",
        schemas.SearchEventOperator.NOT_CONTAINS: "NOT ILIKE",
        schemas.SearchEventOperator.STARTS_WITH: "ILIKE",
        schemas.SearchEventOperator.ENDS_WITH: "ILIKE",
        # this is not used as an operator, it is used in order to maintain a valid value for conditions
        schemas.SearchEventOperator.PATTERN: "regex",

        # Selector operators:
        schemas.ClickEventExtraOperator.IS: "=",
        schemas.ClickEventExtraOperator.IS_NOT: "!=",
        schemas.ClickEventExtraOperator.CONTAINS: "ILIKE",
        schemas.ClickEventExtraOperator.NOT_CONTAINS: "NOT ILIKE",
        schemas.ClickEventExtraOperator.STARTS_WITH: "ILIKE",
        schemas.ClickEventExtraOperator.ENDS_WITH: "ILIKE",

        schemas.MathOperator.GREATER: ">",
        schemas.MathOperator.GREATER_EQ: ">=",
        schemas.MathOperator.LESS: "<",
        schemas.MathOperator.LESS_EQ: "<=",
    }.get(op, "=")


def is_negation_operator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator.IS_NOT,
                  schemas.SearchEventOperator.NOT_ON,
                  schemas.SearchEventOperator.NOT_CONTAINS,
                  schemas.ClickEventExtraOperator.IS_NOT,
                  schemas.ClickEventExtraOperator.NOT_CONTAINS]


def reverse_sql_operator(op):
    return "=" if op == "!=" else "!=" if op == "=" else "ILIKE" if op == "NOT ILIKE" else "NOT ILIKE"


def multi_conditions(condition, values, value_key="value", is_not=False):
    query = []
    for i in range(len(values)):
        k = f"{value_key}_{i}"
        query.append(condition.replace(value_key, k))
    return "(" + (" AND " if is_not else " OR ").join(query) + ")"


def multi_values(values, value_key="value", data_type: schemas.PropertyType | None = None):
    query_values = {}
    if values is not None and isinstance(values, list):
        for i in range(len(values)):
            k = f"{value_key}_{i}"
            query_values[k] = values[i].value if isinstance(values[i], Enum) else values[i]
            if data_type:
                if data_type == schemas.PropertyType.STRING:
                    query_values[k] = str(query_values[k])

    return query_values


def isAny_opreator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator.ON_ANY, schemas.SearchEventOperator.IS_ANY]


def isUndefined_operator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator.IS_UNDEFINED]


def single_value(values):
    if values is not None and isinstance(values, list):
        for i, v in enumerate(values):
            if isinstance(v, Enum):
                values[i] = v.value
    return values
