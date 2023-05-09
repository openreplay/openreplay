import schemas
from chalicelib.core import metadata
from chalicelib.utils import args_transformer
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.metrics_helper import __get_step_size
from typing import Any, List, Union, Dict, Optional
import json


def get_all(project_id: int, user_id: int, data: Any) -> Dict[str, Any]:
    """
    Get all feature flags and their total count.
    """
    constraints = [
        "feature_flags.project_id = %(project_id)s",
        "feature_flags.deleted_at IS NULL",
        "feature_flags.created_by = %(user_id)s",
    ]
    params = {
        "project_id": project_id,
        "user_id": user_id,
        "offset": (data.page - 1) * data.limit,
        "limit": data.limit,
    }

    columns = (
        "feature_flag_id",
        "name",
        "flag_key",
        "description",
        "flag_type",
        "is_persist",
        "is_active",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )

    if data.query is not None and len(data.query) > 0:
        constraints.append("(name ILIKE %(query)s)")
        params["query"] = helper.values_for_operator(value=data.query,
                                                     op=schemas.SearchEventOperator._contains)

    count_sql = f"""
        SELECT COUNT(*) FROM feature_flags WHERE {" AND ".join(constraints)}
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(count_sql, params)
        cur.execute(query)
        result = cur.fetchone()
        print(result)
        total_count = 0 if result is None else result["count"]

    if total_count > 0:
        sql = f"""
            SELECT {", ".join(columns)}
            FROM feature_flags
            WHERE {" AND ".join(constraints)}
            ORDER BY created_at {data.order.value}
            LIMIT %(limit)s OFFSET %(offset)s
        """

        with pg_client.PostgresClient() as cur:
            query = cur.mogrify(sql, params)
            cur.execute(query)
            rows = cur.fetchall()

        rows = helper.list_to_camel_case(rows)
        for row in rows:
            row["createdAt"] = TimeUTC.datetime_to_timestamp(row["createdAt"])
            row["updatedAt"] = TimeUTC.datetime_to_timestamp(row["updatedAt"])
    else:
        rows = []

    return {"records": rows, "total": total_count}


def get_feature_flag(feature_flag_id: int) -> Optional[Dict[str, Any]]:
    """
    Get a single feature flag by its ID.
    """
    feature_flag_columns = (
        "feature_flag_id",
        "name",
        "flag_key",
        "description",
        "flag_type",
        "is_persist",
        "is_active",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )

    conditions_columns = (
        "id",
        "name",
        "rollout_percentage",
        "conditions",
    )

    feature_flag_sql = f"""
        SELECT {", ".join(feature_flag_columns)}
        FROM feature_flags
        WHERE feature_flag_id = %(feature_flag_id)s
        AND deleted_at IS NULL
    """

    conditions_sql = f"""
        SELECT {", ".join(conditions_columns)}
        FROM feature_flags_conditions
        WHERE feature_flag_id = %(feature_flag_id)s
    """

    with pg_client.PostgresClient() as cur:
        feature_flag_query = cur.mogrify(feature_flag_sql, {"feature_flag_id": feature_flag_id})
        cur.execute(feature_flag_query)
        feature_flag_row = cur.fetchone()

        if feature_flag_row is None:
            return None

        feature_flag_row["created_at"] = TimeUTC.datetime_to_timestamp(feature_flag_row["created_at"])
        feature_flag_row["updated_at"] = TimeUTC.datetime_to_timestamp(feature_flag_row["updated_at"])

        conditions_query = cur.mogrify(conditions_sql, {"feature_flag_id": feature_flag_id})
        cur.execute(conditions_query)
        conditions_rows = cur.fetchall()

    conditions = []
    for conditions_row in conditions_rows:
        conditions_row["conditions"] = json.loads(conditions_row["conditions"])
        conditions.append(helper.dict_to_camel_case(conditions_row))

    feature_flag_row["conditions"] = conditions

    return helper.dict_to_camel_case(feature_flag_row)


def create_feature_flag(feature_flag: dict, project_id: int, user_id: int) -> dict:
    """
    Create a new feature flag and return its data.
    """
    columns = (
        "feature_flag_id",
        "name",
        "flag_key",
        "description",
        "flag_type",
        "is_persist",
        "is_active",
        "created_by",
        "updated_by",
        "created_at",
        "updated_at"
    )

    sql = f"""
        INSERT INTO feature_flags
        (project_id, name, flag_key, description, flag_type, is_persist, is_active, created_by, updated_by)
        VALUES (%(project_id)s, %(name)s, %(flag_key)s, %(description)s, %(flag_type)s, %(is_persist)s,
        %(is_active)s, %(created_by)s, %(updated_by)s)
        RETURNING {", ".join(columns)}
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"project_id": project_id, "created_by": user_id, **feature_flag})
        cur.execute(query)
        row = cur.fetchone()

    row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
    row["updated_at"] = TimeUTC.datetime_to_timestamp(row["updated_at"])

    return helper.dict_to_camel_case(row)


def create_conditions(feature_flag_id: int, conditions: List[schemas.FeatureFlagCondition]) -> List[Dict[str, Any]]:
    """
    Create new feature flag conditions and return their data.
    """
    rows = []

    for condition in conditions:
        columns = (
            "feature_flag_id",
            "name",
            "rollout_percentage",
            "conditions"
        )

        sql = f"""
            INSERT INTO feature_flags_conditions
            ({", ".join(columns)})
            VALUES (%(feature_flag_id)s, %(name)s, %(rollout_percentage)s, %(conditions)s)
            RETURNING {", ".join(columns)}, id
        """

        with pg_client.PostgresClient() as cur:
            query = cur.mogrify(sql, {
                "feature_flag_id": feature_flag_id,
                "name": condition['name'],
                "rollout_percentage": condition['rollout_percentage'],
                "conditions": json.dumps(condition['conditions']),
            })
            cur.execute(query)
            row = cur.fetchone()

        row["conditions"] = json.loads(row["conditions"])
        rows.append(helper.dict_to_camel_case(row))

    return rows


def create(feature_flag: schemas.FeatureFlagSchema, project_id: int, user_id: int) -> dict:
    """
    Create a new feature flag.
    """
    # Convert the FeatureFlagSchema instance to a dictionary.
    feature_flag_dict = feature_flag.dict()

    # Create the feature flag.
    new_feature_flag = create_feature_flag(feature_flag_dict, project_id, user_id)

    # Create the conditions.
    conditions = create_conditions(new_feature_flag["featureFlagId"], feature_flag_dict["conditions"])
    new_feature_flag["conditions"] = conditions

    return new_feature_flag


def update_feature_flag(feature_flag_id: int, feature_flag: Dict[str, Any], user_id: int) -> Dict[str, Any]:
    """
    Update an existing feature flag and return its updated data.
    """
    columns = (
        "name",
        "flag_key",
        "description",
        "flag_type",
        "is_persist",
        "is_active",
        "updated_by",
    )

    sql = f"""
        UPDATE feature_flags
        SET {", ".join(f"{column} = %({column})s" for column in columns)}
        WHERE feature_flag_id = %(feature_flag_id)s
        RETURNING feature_flag_id, {", ".join(columns)}, created_at, updated_at
    """

    with pg_client.PostgresClient() as cur:
        feature_flag["feature_flag_id"] = feature_flag_id
        feature_flag["updated_by"] = user_id
        query = cur.mogrify(sql, feature_flag)
        cur.execute(query)
        row = cur.fetchone()

    row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
    row["updated_at"] = TimeUTC.datetime_to_timestamp(row["updated_at"])

    return helper.dict_to_camel_case(row)
