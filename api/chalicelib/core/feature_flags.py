import schemas
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from typing import Any, List, Dict, Optional
from fastapi import HTTPException, status
import json

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


def search_feature_flags(project_id: int, user_id: int, data: schemas.SearchFlagsSchema) -> Dict[str, Any]:
    """
    Get all feature flags and their total count.
    """
    constraints = [
        "feature_flags.project_id = %(project_id)s",
        "feature_flags.deleted_at IS NULL",
    ]

    params = {
        "project_id": project_id,
        "user_id": user_id,
        "limit": data.limit,
        "offset": (data.page - 1) * data.limit,
    }

    if data.is_active is not None:
        constraints.append("feature_flags.is_active=%(is_active)s")
        params["is_active"] = data.is_active

    if data.user_id is not None:
        constraints.append("feature_flags.created_by=%(user_id)s")

    if data.query is not None and len(data.query) > 0:
        constraints.append("name ILIKE %(query)s")
        params["query"] = helper.values_for_operator(value=data.query,
                                                     op=schemas.SearchEventOperator._contains)

    sql = f"""
        SELECT COUNT(1) OVER () AS count, {", ".join(feature_flag_columns)}
        FROM feature_flags
        WHERE {" AND ".join(constraints)}
        ORDER BY created_at {data.order.value}
        LIMIT %(limit)s OFFSET %(offset)s;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)
        rows = cur.fetchall()

    if len(rows) == 0:
        return {"data": {"total": 0, "list": []}}

    results = {"total": rows[0]["count"]}

    rows = helper.list_to_camel_case(rows)
    for row in rows:
        row.pop("count")
        row["createdAt"] = TimeUTC.datetime_to_timestamp(row["createdAt"])
        row["updatedAt"] = TimeUTC.datetime_to_timestamp(row["updatedAt"])

    results["list"] = rows
    return {"data": results}


def create_feature_flag(project_id: int, user_id: int, feature_flag_data: schemas.FeatureFlagSchema) -> Optional[int]:
    insert_columns = (
        'project_id',
        'name',
        'flag_key',
        'description',
        'flag_type',
        'is_persist',
        'is_active',
        'created_by'
    )

    _data = {}
    for i, s in enumerate(feature_flag_data.conditions):
        for k in s.dict().keys():
            _data[f"{k}_{i}"] = s.__getattribute__(k)
        _data[f"name_{i}"] = s.name
        _data[f"rollout_percentage_{i}"] = s.rollout_percentage
        _data[f"filters_{i}"] = json.dumps(s.filters)

    params = {
        "project_id": project_id,
        "created_by": user_id,
        **feature_flag_data.dict(),
        **_data
    }

    conditions_len = len(feature_flag_data.conditions)

    flag_sql = f"""
                INSERT INTO feature_flags ({", ".join(insert_columns)})
                VALUES ({", ".join(["%(" + col + ")s" for col in insert_columns])})
                RETURNING feature_flag_id
        """

    query = f"""
        WITH inserted_flag AS ({flag_sql})
        INSERT INTO feature_flags_conditions(feature_flag_id, name, rollout_percentage, filters)
        VALUES {",".join([f"((SELECT feature_flag_id FROM inserted_flag), %(name_{i})s, %(rollout_percentage_{i})s, %(filters_{i})s::jsonb)"
                          for i in range(conditions_len)])}
        RETURNING feature_flag_id;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, params)
        cur.execute(query)
        row = cur.fetchone()

        if row is None:
            return None

    return get_feature_flag(project_id  =project_id, feature_flag_id=row["feature_flag_id"])


def get_feature_flag(project_id: int, feature_flag_id: int) -> Optional[Dict[str, Any]]:
    conditions_query = """
            SELECT COALESCE(jsonb_agg(ffc ORDER BY condition_id), '[]'::jsonb) AS conditions
            FROM feature_flags_conditions AS ffc
            WHERE ffc.feature_flag_id = %(feature_flag_id)s
        """

    sql = f"""
            SELECT {", ".join(["ff." + col for col in feature_flag_columns])},
                    ({conditions_query}) AS conditions
            FROM feature_flags AS ff
            WHERE ff.feature_flag_id = %(feature_flag_id)s
                AND ff.project_id = %(project_id)s
                AND ff.deleted_at IS NULL;
        """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"feature_flag_id": feature_flag_id, "project_id": project_id})
        cur.execute(query)
        row = cur.fetchone()

        if row is None:
            return {"errors": ["Feature flag not found"]}

        row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
        row["updated_at"] = TimeUTC.datetime_to_timestamp(row["updated_at"])

    return {"data": helper.dict_to_camel_case(row)}


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
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Something went wrong.")

    row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
    row["updated_at"] = TimeUTC.datetime_to_timestamp(row["updated_at"])
    row['conditions'] = check_conditions(feature_flag_id, feature_flag.conditions)

    return {"data": helper.dict_to_camel_case(row)}


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
        ORDER BY condition_id;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"feature_flag_id": feature_flag_id})
        cur.execute(query)
        rows = cur.fetchall()

    return rows


def check_conditions(feature_flag_id: int, conditions: List[schemas.FeatureFlagCondition]) -> Any:
    existing_ids = [ec.get("condition_id") for ec in get_conditions(feature_flag_id)]
    to_be_deleted = []
    to_be_updated = []
    to_be_created = []

    for cid in existing_ids:
        if cid not in [c.condition_id for c in conditions]:
            to_be_deleted.append(cid)

    for condition in conditions:
        if condition.condition_id is None:
            to_be_created.append(condition)
        else:
            to_be_updated.append(condition)

    if len(to_be_created) > 0:
        create_conditions(feature_flag_id=feature_flag_id, conditions=to_be_created)

    if len(to_be_updated) > 0:
        update_conditions(feature_flag_id=feature_flag_id, conditions=to_be_updated)

    if len(to_be_deleted) > 0:
        delete_conditions(feature_flag_id=feature_flag_id, ids=to_be_deleted)

    return get_conditions(feature_flag_id)


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
        cur.execute(query)


def delete_conditions(feature_flag_id: int, ids: List[int]) -> None:
    """
    Delete feature flag conditions.
    """
    sql = """
        DELETE FROM feature_flags_conditions
        WHERE condition_id IN %(ids)s
            AND feature_flag_id= %(feature_flag_id)s;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"feature_flag_id": feature_flag_id, "ids": tuple(ids)})
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
