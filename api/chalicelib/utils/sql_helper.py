from typing import Union
from enum import Enum
import schemas


def get_sql_operator(op: Union[schemas.SearchEventOperator, schemas.ClickEventExtraOperator, schemas.MathOperator]):
    if isinstance(op, Enum):
        op = op.value
    return {
        schemas.SearchEventOperator.IS.value: "=",
        schemas.SearchEventOperator.ON.value: "=",
        schemas.SearchEventOperator.ON_ANY.value: "IN",
        schemas.SearchEventOperator.IS_NOT.value: "!=",
        schemas.SearchEventOperator.NOT_ON.value: "!=",
        schemas.SearchEventOperator.CONTAINS.value: "ILIKE",
        schemas.SearchEventOperator.NOT_CONTAINS.value: "NOT ILIKE",
        schemas.SearchEventOperator.STARTS_WITH.value: "ILIKE",
        schemas.SearchEventOperator.ENDS_WITH.value: "ILIKE",
        # Selector operators:
        schemas.ClickEventExtraOperator.IS.value: "=",
        schemas.ClickEventExtraOperator.IS_NOT.value: "!=",
        schemas.ClickEventExtraOperator.CONTAINS.value: "ILIKE",
        schemas.ClickEventExtraOperator.NOT_CONTAINS.value: "NOT ILIKE",
        schemas.ClickEventExtraOperator.STARTS_WITH.value: "ILIKE",
        schemas.ClickEventExtraOperator.ENDS_WITH.value: "ILIKE",

        schemas.MathOperator.GREATER.value: ">",
        schemas.MathOperator.GREATER_EQ.value: ">=",
        schemas.MathOperator.LESS.value: "<",
        schemas.MathOperator.LESS_EQ.value: "<=",
    }.get(op, "=")


def is_negation_operator(op: schemas.SearchEventOperator):
    if isinstance(op, Enum):
        op = op.value
    return op in [schemas.SearchEventOperator.IS_NOT.value,
                  schemas.SearchEventOperator.NOT_ON.value,
                  schemas.SearchEventOperator.NOT_CONTAINS.value,
                  schemas.ClickEventExtraOperator.IS_NOT.value,
                  schemas.ClickEventExtraOperator.NOT_CONTAINS.value]


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
            query_values[k] = values[i].value if isinstance(values[i], Enum) else values[i]
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

