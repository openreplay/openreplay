import json
import logging
from collections import Counter
from typing import List

from fastapi import HTTPException, status

import schemas
from chalicelib.utils import pg_client, helper

logger = logging.getLogger(__name__)

MAX_PROJECT_ID = 65000


def get_project(tenant_id, project_id, include_last_session=False, include_gdpr=None):
    with pg_client.PostgresClient() as cur:
        extra_select = ""
        if include_last_session:
            extra_select += """,(SELECT max(ss.start_ts) 
                                 FROM public.sessions AS ss 
                                 WHERE ss.project_id = %(project_id)s) AS last_recorded_session_at"""
        if include_gdpr:
            extra_select += ",s.gdpr"
        query = cur.mogrify(f"""SELECT s.project_id,
                                       s.project_key,
                                       s.name,
                                       s.save_request_payloads,
                                       s.platform
                                       {extra_select}
                                FROM public.projects AS s
                                WHERE s.project_id =%(project_id)s
                                    AND s.deleted_at IS NULL
                                LIMIT 1;""",
                            {"project_id": project_id})
        cur.execute(query=query)
        row = cur.fetchone()
        return helper.dict_to_camel_case(row)


def get_by_project_key(project_key):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT project_id,
                                      project_key,
                                      platform,
                                      name
                               FROM public.projects
                               WHERE project_key = %(project_key)s
                                 AND deleted_at ISNULL;""",
                            {"project_key": project_key})
        cur.execute(query=query)
        row = cur.fetchone()
        return helper.dict_to_camel_case(row)


def get_project_key(project_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT project_key
                               FROM public.projects
                               WHERE project_id = %(project_id)s
                                 AND deleted_at ISNULL;""",
                            {"project_id": project_id})
        cur.execute(query=query)
        project = cur.fetchone()
        return project["project_key"] if project is not None else None


def get_conditions(project_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT p.sample_rate AS rate,
                                      p.conditional_capture,
                                      COALESCE(
                                              array_agg(
                                                      json_build_object(
                                                              'condition_id', pc.condition_id,
                                                              'capture_rate', pc.capture_rate,
                                                              'name', pc.name,
                                                              'filters', pc.filters
                                                      )
                                              ) FILTER(WHERE pc.condition_id IS NOT NULL),
                                              ARRAY[] ::json[]
                                      )             AS conditions
                               FROM public.projects AS p
                                        LEFT JOIN (SELECT *
                                                   FROM public.projects_conditions
                                                   WHERE project_id = %(project_id)s
                                                   ORDER BY condition_id) AS pc ON p.project_id = pc.project_id
                               WHERE p.project_id = %(project_id)s
                                 AND p.deleted_at IS NULL
                               GROUP BY p.sample_rate, p.conditional_capture;""",
                            {"project_id": project_id})
        cur.execute(query=query)
        row = cur.fetchone()
        row = helper.dict_to_camel_case(row)
        row["conditions"] = [schemas.ProjectConditions(**c) for c in row["conditions"]]

        return row


def validate_conditions(conditions: List[schemas.ProjectConditions]) -> List[str]:
    errors = []
    names = [condition.name for condition in conditions]

    # Check for empty strings
    if any(name.strip() == "" for name in names):
        errors.append("Condition names cannot be empty strings")

    # Check for duplicates
    name_counts = Counter(names)
    duplicates = [name for name, count in name_counts.items() if count > 1]
    if duplicates:
        errors.append(f"Duplicate condition names found: {duplicates}")

    return errors


def update_conditions(project_id, changes: schemas.ProjectSettings):
    validation_errors = validate_conditions(changes.conditions)
    if validation_errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation_errors)

    conditions = []
    for condition in changes.conditions:
        conditions.append(condition.model_dump())

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""UPDATE public.projects
                               SET sample_rate= %(sample_rate)s,
                                   conditional_capture = %(conditional_capture)s
                               WHERE project_id = %(project_id)s
                                 AND deleted_at IS NULL;""",
                            {
                                "project_id": project_id,
                                "sample_rate": changes.rate,
                                "conditional_capture": changes.conditional_capture
                            })
        cur.execute(query=query)

    return update_project_conditions(project_id, changes.conditions)


def create_project_conditions(project_id, conditions):
    rows = []

    # insert all conditions rows with single sql query
    if len(conditions) > 0:
        columns = (
            "project_id",
            "name",
            "capture_rate",
            "filters",
        )

        sql = f"""
            INSERT INTO projects_conditions
            (project_id, name, capture_rate, filters)
            VALUES {", ".join(["%s"] * len(conditions))}
            RETURNING condition_id, {", ".join(columns)}
        """

        with pg_client.PostgresClient() as cur:
            params = [
                (project_id, c.name, c.capture_rate, json.dumps([filter_.model_dump() for filter_ in c.filters]))
                for c in conditions]
            query = cur.mogrify(sql, params)
            cur.execute(query)
            rows = cur.fetchall()

    return rows


def update_project_condition(project_id, conditions):
    values = []
    params = {
        "project_id": project_id,
    }
    for i in range(len(conditions)):
        values.append(f"(%(condition_id_{i})s, %(name_{i})s, %(capture_rate_{i})s, %(filters_{i})s::jsonb)")
        params[f"condition_id_{i}"] = conditions[i].condition_id
        params[f"name_{i}"] = conditions[i].name
        params[f"capture_rate_{i}"] = conditions[i].capture_rate
        params[f"filters_{i}"] = json.dumps(conditions[i].filters)

    sql = f"""
        UPDATE projects_conditions
        SET name = c.name, capture_rate = c.capture_rate, filters = c.filters
        FROM (VALUES {','.join(values)}) AS c(condition_id, name, capture_rate, filters)
        WHERE c.condition_id = projects_conditions.condition_id AND project_id = %(project_id)s;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)


def delete_project_condition(project_id, ids):
    sql = """
          DELETE
          FROM projects_conditions
          WHERE condition_id IN %(ids)s
            AND project_id = %(project_id)s; \
          """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"project_id": project_id, "ids": tuple(ids)})
        cur.execute(query)


def update_project_conditions(project_id, conditions):
    if conditions is None:
        return

    existing = get_conditions(project_id)["conditions"]
    existing_ids = {c.condition_id for c in existing}

    to_be_updated = [c for c in conditions if c.condition_id in existing_ids]
    to_be_created = [c for c in conditions if c.condition_id not in existing_ids]
    to_be_deleted = existing_ids - {c.condition_id for c in conditions}

    if to_be_deleted:
        delete_project_condition(project_id, to_be_deleted)

    if to_be_created:
        create_project_conditions(project_id, to_be_created)

    if to_be_updated:
        update_project_condition(project_id, to_be_updated)

    return get_conditions(project_id)


def get_projects_ids(tenant_id):
    with pg_client.PostgresClient() as cur:
        query = f"""SELECT s.project_id
                    FROM public.projects AS s
                    WHERE s.deleted_at IS NULL
                    ORDER BY s.project_id;"""
        cur.execute(query=query)
        rows = cur.fetchall()
    return [r["project_id"] for r in rows]


def delete_metadata_condition(project_id, metadata_key):
    sql = """ \
          UPDATE public.projects_conditions
          SET filters=(SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
                       FROM jsonb_array_elements(filters) AS elem
                       WHERE NOT (elem ->> 'type' = 'metadata'
                           AND elem ->> 'source' = %(metadata_key)s))
          WHERE project_id = %(project_id)s
            AND jsonb_typeof(filters) = 'array'
            AND EXISTS (SELECT 1
                        FROM jsonb_array_elements(filters) AS elem
                        WHERE elem ->> 'type' = 'metadata'
                        AND elem ->> 'source' = %(metadata_key)s);"""

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"project_id": project_id, "metadata_key": metadata_key})
        cur.execute(query)


def rename_metadata_condition(project_id, old_metadata_key, new_metadata_key):
    sql = """ \
          UPDATE public.projects_conditions
          SET filters = (SELECT jsonb_agg(CASE
                                              WHEN elem ->> 'type' = 'metadata' AND elem ->> 'source' =
                                          %(old_metadata_key)s
              THEN elem || ('{"source": "'|| %(new_metadata_key)s||'"}')::jsonb
              ELSE elem END)
                         FROM jsonb_array_elements(filters) AS elem)
          WHERE project_id = %(project_id)s
            AND jsonb_typeof(filters) = 'array'
            AND EXISTS (SELECT 1
                        FROM jsonb_array_elements(filters) AS elem
                        WHERE elem ->> 'type' = 'metadata'
                        AND elem ->> 'source' = %(old_metadata_key)s);"""

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"project_id": project_id, "old_metadata_key": old_metadata_key,
                                  "new_metadata_key": new_metadata_key})
        cur.execute(query)

# TODO: make project conditions use metadata-column-name instead of metadata-key
