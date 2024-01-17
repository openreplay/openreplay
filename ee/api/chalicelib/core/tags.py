from fastapi import HTTPException, status

import projects
import schemas
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from logging import getLogger


logger = logging.getLogger(__name__)



def create_tag(project_id: int, data: schemas.TagCreate, user_id: int) -> int:
    # Ensure the user has permission to create tags in this project
    if not projects.is_authorized(project_id=project_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create tags in this project")
    
    query = """
    INSERT INTO public.tags (project_id, selector, ignore_click_rage, ignore_dead_click)
    VALUES (%(project_id)s, %(selector)s, %(ignore_click_rage)s, %(ignore_dead_click)s)
    RETURNING tag_id;
    """

    # Remove project_id if any, to avoid a clash in the query
    data.pop('project_id', None)

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, {'project_id': project_id, **data})
        cur.execute(query)
        row = cur.fetchone()

    return row['tag_id']


def list_tags(project_id: int, user_id: int):
    # Ensure the user has permission to list tags in this project
    if not projects.is_authorized(project_id=project_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to list tags in this project")

    query = """
    SELECT tag_id, selector, ignore_click_rage, ignore_dead_click
    FROM public.tags
    WHERE project_id = %(project_id)s
      AND deleted_at IS NULL
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, {'project_id': project_id})
        cur.execute(query)
        rows = cur.fetchall()

    return helper.list_to_camel_case(rows)


def delete_tag(project_id: int, tag_id: int, user_id: int):
    # Ensure the user has permission to delete tags in this project
    if not projects.is_authorized(project_id=project_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete tags in this project")
    
    query = """
    UPDATE public.tags
    SET deleted_at = now() at time zone 'utc'
    WHERE tag_id = %(tag_id)s
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, {'tag_id': tag_id})
        cur.execute(query)
    return True
