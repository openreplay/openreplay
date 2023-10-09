import schemas
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from typing import Any, List, Dict, Optional
from fastapi import HTTPException, status
import json
import logging

feature_flag_columns = (
    "feature_flag_id",
    "payload",
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


def exists_by_name(flag_key: str, project_id: int, exclude_id: Optional[int]) -> bool:
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT EXISTS(SELECT 1
                                FROM public.feature_flags
                                WHERE deleted_at IS NULL
                                    AND flag_key ILIKE %(flag_key)s AND project_id=%(project_id)s
                                    {"AND feature_flag_id!=%(exclude_id)s" if exclude_id else ""}) AS exists;""",
                            {"flag_key": flag_key, "exclude_id": exclude_id, "project_id": project_id})

        cur.execute(query=query)
        row = cur.fetchone()
        return row["exists"]


def update_feature_flag_status(project_id: int, feature_flag_id: int, is_active: bool) -> Dict[str, Any]:
    try:
        with pg_client.PostgresClient() as cur:
            query = cur.mogrify(f"""UPDATE feature_flags
                                SET is_active = %(is_active)s, updated_at=NOW()
                                WHERE feature_flag_id=%(feature_flag_id)s AND project_id=%(project_id)s
                                RETURNING is_active;""",
                                {"feature_flag_id": feature_flag_id, "is_active": is_active, "project_id": project_id})
            cur.execute(query=query)

            return {"is_active": cur.fetchone()["is_active"]}
    except Exception as e:
        logging.error(f"Failed to update feature flag status: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Failed to update feature flag status")


def search_feature_flags(project_id: int, user_id: int, data: schemas.SearchFlagsSchema) -> Dict[str, Any]:
    """
    Get all feature flags and their total count.
    """
    constraints, params = prepare_constraints_params_to_search(data, project_id, user_id)

    sql = f"""
        SELECT COUNT(1) OVER () AS count, {", ".join(feature_flag_columns)}
        FROM feature_flags
        WHERE {" AND ".join(constraints)}
        ORDER BY updated_at {data.order}
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


def prepare_constraints_params_to_search(data, project_id, user_id):
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
        constraints.append("flag_key ILIKE %(query)s")
        params["query"] = helper.values_for_operator(value=data.query,
                                                     op=schemas.SearchEventOperator._contains)
    return constraints, params


def create_feature_flag(project_id: int, user_id: int, feature_flag_data: schemas.FeatureFlagSchema) -> Optional[int]:
    if feature_flag_data.flag_type == schemas.FeatureFlagType.multi_variant and len(feature_flag_data.variants) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Variants are required for multi variant flag")

    validate_unique_flag_key(feature_flag_data, project_id)
    validate_multi_variant_flag(feature_flag_data)

    insert_columns = (
        'project_id',
        'flag_key',
        'description',
        'flag_type',
        'payload',
        'is_persist',
        'is_active',
        'created_by'
    )

    params = prepare_params_to_create_flag(feature_flag_data, project_id, user_id)
    conditions_len = len(feature_flag_data.conditions)
    variants_len = len(feature_flag_data.variants)

    flag_sql = f"""
                INSERT INTO feature_flags ({", ".join(insert_columns)})
                VALUES ({", ".join(["%(" + col + ")s" for col in insert_columns])})
                RETURNING feature_flag_id
        """
    conditions_query = ""
    variants_query = ""

    if conditions_len > 0:
        conditions_query = f"""
        inserted_conditions AS (
                INSERT INTO feature_flags_conditions(feature_flag_id, name, rollout_percentage, filters)
                VALUES {",".join([f"(("
                                  f"SELECT feature_flag_id FROM inserted_flag),"
                                  f"%(name_{i})s,"
                                  f"%(rollout_percentage_{i})s,"
                                  f"%(filters_{i})s::jsonb)"
                                  for i in range(conditions_len)])}
                RETURNING feature_flag_id
            )
        """

    if variants_len > 0:
        variants_query = f""",
        inserted_variants AS (
                INSERT INTO feature_flags_variants(feature_flag_id, value, description, rollout_percentage, payload)
                VALUES {",".join([f"((SELECT feature_flag_id FROM inserted_flag),"
                                  f"%(v_value_{i})s,"
                                  f"%(v_description_{i})s,"
                                  f"%(v_rollout_percentage_{i})s,"
                                  f"%(v_payload_{i})s::jsonb)"
                                  for i in range(variants_len)])}
                RETURNING feature_flag_id
            )
        """

    query = f"""
            WITH inserted_flag AS ({flag_sql}),
            {conditions_query}
            {variants_query}
            SELECT feature_flag_id FROM inserted_flag;
        """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, params)
        cur.execute(query)
        row = cur.fetchone()

        if row is None:
            return None

    return get_feature_flag(project_id=project_id, feature_flag_id=row["feature_flag_id"])


def validate_unique_flag_key(feature_flag_data, project_id, exclude_id=None):
    if exists_by_name(project_id=project_id, flag_key=feature_flag_data.flag_key, exclude_id=exclude_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Feature flag with key already exists.")


def validate_multi_variant_flag(feature_flag_data):
    if feature_flag_data.flag_type == schemas.FeatureFlagType.multi_variant:
        if sum([v.rollout_percentage for v in feature_flag_data.variants]) > 100:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Sum of rollout percentage for variants cannot be greater than 100.")


def prepare_params_to_create_flag(feature_flag_data, project_id, user_id):
    conditions_data = prepare_conditions_values(feature_flag_data)
    variants_data = prepare_variants_values(feature_flag_data)

    params = {
        "project_id": project_id,
        "created_by": user_id,
        **feature_flag_data.model_dump(),
        **conditions_data,
        **variants_data,
        "payload": json.dumps(feature_flag_data.payload)
    }

    return params


def prepare_variants_values(feature_flag_data):
    variants_data = {}
    for i, v in enumerate(feature_flag_data.variants):
        for k in v.model_dump().keys():
            variants_data[f"v_{k}_{i}"] = v.__getattribute__(k)
        variants_data[f"v_value_{i}"] = v.value
        variants_data[f"v_description_{i}"] = v.description
        variants_data[f"v_payload_{i}"] = json.dumps(v.payload)
        variants_data[f"v_rollout_percentage_{i}"] = v.rollout_percentage
    return variants_data


def prepare_conditions_values(feature_flag_data):
    conditions_data = {}
    for i, s in enumerate(feature_flag_data.conditions):
        for k in s.model_dump().keys():
            conditions_data[f"{k}_{i}"] = s.__getattribute__(k)
        conditions_data[f"name_{i}"] = s.name
        conditions_data[f"rollout_percentage_{i}"] = s.rollout_percentage
        conditions_data[f"filters_{i}"] = json.dumps([filter_.model_dump() for filter_ in s.filters])
    return conditions_data


def get_feature_flag(project_id: int, feature_flag_id: int) -> Optional[Dict[str, Any]]:
    conditions_query = """
            SELECT COALESCE(jsonb_agg(ffc ORDER BY condition_id), '[]'::jsonb) AS conditions
            FROM feature_flags_conditions AS ffc
            WHERE ffc.feature_flag_id = %(feature_flag_id)s
        """

    variants_query = """
            SELECT COALESCE(jsonb_agg(ffv ORDER BY variant_id), '[]'::jsonb) AS variants
            FROM feature_flags_variants AS ffv
            WHERE ffv.feature_flag_id = %(feature_flag_id)s
        """

    sql = f"""
            SELECT {", ".join(["ff." + col for col in feature_flag_columns])},
                    ({conditions_query}) AS conditions,
                    ({variants_query}) AS variants
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
            params = [
                (feature_flag_id, c.name, c.rollout_percentage, json.dumps([filter_.model_dump() for filter_ in c.filters]))
                for c in conditions]
            query = cur.mogrify(sql, params)
            cur.execute(query)
            rows = cur.fetchall()

    return rows


def update_feature_flag(project_id: int, feature_flag_id: int,
                        feature_flag: schemas.FeatureFlagSchema, user_id: int):
    """
    Update an existing feature flag and return its updated data.
    """
    validate_unique_flag_key(feature_flag_data=feature_flag, project_id=project_id, exclude_id=feature_flag_id)
    validate_multi_variant_flag(feature_flag_data=feature_flag)

    columns = (
        "flag_key",
        "description",
        "flag_type",
        "is_persist",
        "is_active",
        "payload",
        "updated_by",
    )

    params = {
        "updated_by": user_id,
        "feature_flag_id": feature_flag_id,
        "project_id": project_id,
        **feature_flag.model_dump(),
        "payload": json.dumps(feature_flag.payload),
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
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Feature flag not found")

    row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
    row["updated_at"] = TimeUTC.datetime_to_timestamp(row["updated_at"])
    row['conditions'] = check_conditions(feature_flag_id, feature_flag.conditions)
    row['variants'] = check_variants(feature_flag_id, feature_flag.variants)

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


def check_variants(feature_flag_id: int, variants: List[schemas.FeatureFlagVariant]) -> Any:
    existing_ids = [ev.get("variant_id") for ev in get_variants(feature_flag_id)]
    to_be_deleted = []
    to_be_updated = []
    to_be_created = []

    for vid in existing_ids:
        if vid not in [v.variant_id for v in variants]:
            to_be_deleted.append(vid)

    for variant in variants:
        if variant.variant_id is None:
            to_be_created.append(variant)
        else:
            to_be_updated.append(variant)

    if len(to_be_created) > 0:
        create_variants(feature_flag_id=feature_flag_id, variants=to_be_created)

    if len(to_be_updated) > 0:
        update_variants(feature_flag_id=feature_flag_id, variants=to_be_updated)

    if len(to_be_deleted) > 0:
        delete_variants(feature_flag_id=feature_flag_id, ids=to_be_deleted)

    return get_variants(feature_flag_id)


def get_variants(feature_flag_id: int):
    sql = """
        SELECT
            variant_id,
            feature_flag_id,
            value,
            payload,
            rollout_percentage
        FROM feature_flags_variants
        WHERE feature_flag_id = %(feature_flag_id)s
        ORDER BY variant_id;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"feature_flag_id": feature_flag_id})
        cur.execute(query)
        rows = cur.fetchall()

    return rows


def create_variants(feature_flag_id: int, variants: List[schemas.FeatureFlagVariant]) -> List[Dict[str, Any]]:
    """
    Create new feature flag variants and return their data.
    """
    rows = []

    # insert all variants rows with single sql query
    if len(variants) > 0:
        columns = (
            "feature_flag_id",
            "value",
            "description",
            "payload",
            "rollout_percentage",
        )

        sql = f"""
            INSERT INTO feature_flags_variants
            (feature_flag_id, value, description, payload, rollout_percentage)
            VALUES {", ".join(["%s"] * len(variants))}
            RETURNING variant_id, {", ".join(columns)}
        """

        with pg_client.PostgresClient() as cur:
            params = [(feature_flag_id, v.value, v.description, json.dumps(v.payload), v.rollout_percentage) for v in variants]
            query = cur.mogrify(sql, params)
            cur.execute(query)
            rows = cur.fetchall()

    return rows


def update_variants(feature_flag_id: int, variants: List[schemas.FeatureFlagVariant]) -> Any:
    """
    Update existing feature flag variants and return their updated data.
    """
    values = []
    params = {
        "feature_flag_id": feature_flag_id,
    }
    for i in range(len(variants)):
        values.append(f"(%(variant_id_{i})s, %(value_{i})s, %(rollout_percentage_{i})s, %(payload_{i})s::jsonb)")
        params[f"variant_id_{i}"] = variants[i].variant_id
        params[f"value_{i}"] = variants[i].value
        params[f"rollout_percentage_{i}"] = variants[i].rollout_percentage
        params[f"payload_{i}"] = json.dumps(variants[i].payload)

    sql = f"""
        UPDATE feature_flags_variants
        SET value = c.value, rollout_percentage = c.rollout_percentage, payload = c.payload
        FROM (VALUES {','.join(values)}) AS c(variant_id, value, rollout_percentage, payload)
        WHERE c.variant_id = feature_flags_variants.variant_id AND feature_flag_id = %(feature_flag_id)s;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)


def delete_variants(feature_flag_id: int, ids: List[int]) -> None:
    """
    Delete existing feature flag variants and return their data.
    """
    sql = """
            DELETE FROM feature_flags_variants
            WHERE variant_id IN %(ids)s
                AND feature_flag_id= %(feature_flag_id)s;
        """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"feature_flag_id": feature_flag_id, "ids": tuple(ids)})
        cur.execute(query)


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
                                SET deleted_at= (now() at time zone 'utc'), is_active=false
                                WHERE {" AND ".join(conditions)};""", params)
        cur.execute(query)

    return {"state": "success"}
