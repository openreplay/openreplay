import schemas
from chalicelib.core import metadata
from chalicelib.utils import args_transformer
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.metrics_helper import __get_step_size
from typing import Any, List, Union, Dict, Optional
from fastapi import HTTPException
import json


def get_all(project_id: int, user_id: int, data: Any) -> Dict[str, Any]:
    """
    Get all feature flags and their total count.
    """
    constraints = [
        "feature_flags.project_id = %(project_id)s",
        "feature_flags.deleted_at IS NULL",
        "feature_flags.created_by = %(user_id)s",
        "feature_flags.is_active = %(is_active)s"
    ]
    params = {
        "project_id": project_id,
        "user_id": user_id,
        "limit": data.limit,
        "is_active": data.is_active,
        "offset": (data.page - 1) * data.limit,
    }

    if data.user_id is not None:
        constraints.append("feature_flags.created_by=%(user_id)s")

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

    sql = f"""
        SELECT COUNT(feature_flags.feature_flag_id) OVER () AS count, {", ".join(columns)}
        FROM feature_flags
        WHERE {" AND ".join(constraints)}
        ORDER BY created_at {data.order}
        LIMIT %(limit)s OFFSET %(offset)s;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)
        rows = cur.fetchall()

    if len(rows) == 0:
        return {"total": 0, "list": []}

    results = {"total": rows[0]["count"]}

    rows = helper.list_to_camel_case(rows)
    for row in rows:
        row.pop("count")
        row["createdAt"] = TimeUTC.datetime_to_timestamp(row["createdAt"])
        row["updatedAt"] = TimeUTC.datetime_to_timestamp(row["updatedAt"])

    results["list"] = rows
    return results


def get_feature_flag(project_id: int, feature_flag_id: int) -> Optional[Dict[str, Any]]:
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

    feature_flag_sql = f"""
        SELECT {", ".join(feature_flag_columns)}
        FROM feature_flags
        WHERE feature_flag_id = %(feature_flag_id)s AND project_id = %(project_id)s
        AND deleted_at IS NULL
    """

    with pg_client.PostgresClient() as cur:
        feature_flag_query = cur.mogrify(
            feature_flag_sql,
            {"feature_flag_id": feature_flag_id, "project_id": project_id}
        )
        cur.execute(feature_flag_query)
        feature_flag_row = cur.fetchone()

        if feature_flag_row is None:
            return {"errors": ["Feature flag not found"]}

        feature_flag_row["created_at"] = TimeUTC.datetime_to_timestamp(feature_flag_row["created_at"])
        feature_flag_row["updated_at"] = TimeUTC.datetime_to_timestamp(feature_flag_row["updated_at"])

    feature_flag_row["conditions"] = get_conditions(feature_flag_id)

    return helper.dict_to_camel_case(feature_flag_row)


def create_feature_flag(feature_flag: schemas.FeatureFlagSchema, project_id: int, user_id: int) -> dict:
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
        (project_id, name, flag_key, description, flag_type, is_persist, is_active, created_by)
        VALUES (%(project_id)s, %(name)s, %(flag_key)s, %(description)s, %(flag_type)s, %(is_persist)s,
        %(is_active)s, %(created_by)s)
        RETURNING {", ".join(columns)}
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"project_id": project_id, "created_by": user_id, **feature_flag.dict()})
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

    # insert all conditions rows with single sql query
    if len(conditions) > 0:
        columns = (
            "feature_flag_id",
            "name",
            "rollout_percentage",
            "filters",
        )

        sql = f"""
            INSERT INTO feature_flags_conditions
            (feature_flag_id, name, rollout_percentage, filters)
            VALUES {", ".join(["%s"] * len(conditions))}
            RETURNING condition_id, {", ".join(columns)}
        """

        with pg_client.PostgresClient() as cur:
            params = [(feature_flag_id, c.name, c.rollout_percentage, json.dumps(c.filters)) for c in conditions]
            query = cur.mogrify(sql, params)
            cur.execute(query)
            rows = cur.fetchall()

    return rows


def create(feature_flag: schemas.FeatureFlagSchema, project_id: int, user_id: int) -> dict:
    """
    Create a new feature flag.
    """
    # Convert the FeatureFlagSchema instance to a dictionary.
    # feature_flag_dict = feature_flag.dict()

    # Create the feature flag.
    new_feature_flag = create_feature_flag(feature_flag, project_id, user_id)

    # Create the conditions.
    conditions = create_conditions(new_feature_flag["featureFlagId"], feature_flag.conditions)
    new_feature_flag["conditions"] = conditions

    return new_feature_flag


def update(project_id: int, feature_flag_id: int, feature_flag: Any, user_id: int):
    conditions = feature_flag.conditions
    feature_flag = update_feature_flag(project_id, feature_flag_id, feature_flag, user_id)

    conditions = check_conditions(feature_flag_id, conditions)
    feature_flag['conditions'] = conditions

    return feature_flag


def update_feature_flag(project_id: int, feature_flag_id: int,
                        feature_flag: schemas.FeatureFlagSchema, user_id: int):
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

    params = {
        "updated_by": user_id,
        "feature_flag_id": feature_flag_id,
        "project_id": project_id,
        **feature_flag.dict(),
    }

    sql = f"""
        UPDATE feature_flags
        SET {", ".join(f"{column} = %({column})s" for column in columns)},
            updated_at = timezone('utc'::text, now())
        WHERE feature_flag_id = %(feature_flag_id)s AND project_id = %(project_id)s
        RETURNING feature_flag_id, {", ".join(columns)}, created_at, updated_at
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)
        row = cur.fetchone()

        if row is None:
            raise HTTPException(status_code=400, detail="Something went wrong.")

    row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
    row["updated_at"] = TimeUTC.datetime_to_timestamp(row["updated_at"])

    return helper.dict_to_camel_case(row)


def get_conditions(feature_flag_id: int):
    """
    Get all conditions for a feature flag.
    """
    sql = """
        SELECT
            condition_id,
            feature_flag_id,
            name,
            rollout_percentage,
            filters
        FROM feature_flags_conditions
        WHERE feature_flag_id = %(feature_flag_id)s
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"feature_flag_id": feature_flag_id})
        cur.execute(query)
        rows = cur.fetchall()

    return rows


def check_conditions(feature_flag_id: int, conditions: List[schemas.FeatureFlagCondition]) -> Any:
    """
    Update existing feature flag conditions and return their updated data.
    """
    to_be_deleted = [ec.get("condition_id") for ec in get_conditions(feature_flag_id)]
    to_be_updated = []
    to_be_created = []

    for condition in conditions:
        if condition.condition_id is None:
            to_be_created.append(condition)
        elif condition.condition_id in to_be_deleted:
            to_be_deleted.remove(condition.condition_id)
        else:
            to_be_updated.append(condition)

    if len(to_be_created) > 0:
        create_conditions(feature_flag_id, list(filter(lambda x: x.condition_id is None, to_be_created)))

    if len(to_be_updated) > 0:
        update_conditions(feature_flag_id, list(filter(lambda x: x.condition_id is not None, to_be_updated)))

    if len(to_be_deleted) > 0:
        print("to_be_deleted")
        print(to_be_deleted)
        delete_conditions(to_be_deleted)


def update_conditions(feature_flag_id: int, conditions: List[schemas.FeatureFlagCondition]) -> Any:
    """
    Update existing feature flag conditions and return their updated data.
    """

    values = []
    params = {
        "feature_flag_id": feature_flag_id,
    }
    for i in range(len(conditions)):
        values.append(f"(%(condition_id_{i})s, %(name_{i})s, %(rollout_percentage_{i})s, %(filters_{i})s::jsonb)")
        params[f"condition_id_{i}"] = conditions[i].condition_id
        params[f"name_{i}"] = conditions[i].name
        params[f"rollout_percentage_{i}"] = conditions[i].rollout_percentage
        params[f"filters_{i}"] = json.dumps(conditions[i].filters)

    sql = f"""
        UPDATE feature_flags_conditions
        SET name = c.name, rollout_percentage = c.rollout_percentage, filters = c.filters
        FROM (VALUES {','.join(values)}) AS c(condition_id, name, rollout_percentage, filters)
        WHERE c.condition_id = feature_flags_conditions.condition_id AND feature_flag_id = %(feature_flag_id)s;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        print(query)
        cur.execute(query)


def delete_conditions(ids: List[int]) -> None:
    """
    Delete feature flag conditions.
    """
    sql = """
        DELETE FROM feature_flags_conditions
        WHERE condition_id = ANY(%(ids)s)
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"ids": ids})
        cur.execute(query)


def delete_feature_flag(project_id: int, feature_flag_id: int):
    """
    Delete a feature flag.
    """
    conditions = [
        "project_id=%(project_id)s",
        "feature_flags.feature_flag_id=%(feature_flag_id)s"
    ]
    params = {"project_id": project_id, "feature_flag_id": feature_flag_id}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE feature_flags
                                    SET deleted_at= (now() at time zone 'utc')
                                    WHERE {" AND ".join(conditions)};""", params)
        cur.execute(query)

    return {"state": "success"}
