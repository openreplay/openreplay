import schemas
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from logging import getLogger


logger = logging.getLogger(__name__)



def _can_do(project_id, user_id):
    # make sure the user is part of the tenant associated with project_id
    query """
    SELECT user_id
    FROM public.projects, public.tenants, public.users
    WHERE public.projects.project_id = %(project_id)s 
      AND public.tenants.tenant_id = public.projects.tenant_id
      AND public.users.tenant_id = public.tenants.tenant_id
      AND public.users.user_id = $(user_id)s;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, {'project_id': project_id, 'user_id': user_id})
        cur.execute(query)
        row = cur.fetchone()
        return row is not None


def create_tag(project_id: int, data: schemas.TagCreate, user_id: int) -> int:
    if not _can_do(project_id, user_id):
        logger.debug('Tried to create tag for a project the user should not have access')
        return -1
    
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
    if not _can_do(project_id, user_id):
        logger.debug('Tried to list tag from a project the user should not have access')
        return []

    query = """
    SELECT tag_id, selector, ignore_click_rage, ignore_dead_click
    FROM public.tags
    WHERE project_id = %(project_id)s
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, {'project_id': project_id})
        cur.execute(query)
        rows = cur.fetchall()

    return helper.list_to_camel_case(rows)


def delete_tag(project_id: int, tag_id: int, user_id: int):

    if not _can_do(project_id, user_id):
        logger.debug('Tried to delete tag from a project the user should not have access')
        return False
    
    query = """
    DELETE FROM public.tags
    WHERE tag_id = %(tag_id)s
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, {'tag_id': tag_id})
        cur.execute(query)
    return True
