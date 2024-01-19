import schemas
from chalicelib.utils import helper
from chalicelib.utils import pg_client


def create_tag(project_id: int, data: schemas.TagCreate) -> int:
    query = """
    INSERT INTO public.tags (project_id, name, selector, ignore_click_rage, ignore_dead_click)
    VALUES (%(project_id)s, %(name)s, %(selector)s, %(ignore_click_rage)s, %(ignore_dead_click)s)
    RETURNING tag_id;
    """

    data = {
        'project_id': project_id,
        'name': data.name.strip(),
        'selector': data.selector,
        'ignore_click_rage': data.ignoreClickRage,
        'ignore_dead_click': data.ignoreDeadClick
    }
    
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, data)
        cur.execute(query)
        row = cur.fetchone()

    return row['tag_id']


def list_tags(project_id: int):
    query = """
    SELECT tag_id, name, selector, ignore_click_rage, ignore_dead_click
    FROM public.tags
    WHERE project_id = %(project_id)s
      AND deleted_at IS NULL
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, {'project_id': project_id})
        cur.execute(query)
        rows = cur.fetchall()

    return helper.list_to_camel_case(rows)


def update_tag(project_id: int, tag_id: int, data: schemas.TagUpdate):
    query = """
    UPDATE public.tags
    SET name = %(name)s
    WHERE tag_id = %(tag_id)s AND project_id = %(project_id)s
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, {'tag_id': tag_id, 'name': data.name, 'project_id': project_id})
        cur.execute(query)

    return True

def delete_tag(project_id: int, tag_id: int):
    query = """
    UPDATE public.tags
    SET deleted_at = now() at time zone 'utc'
    WHERE tag_id = %(tag_id)s AND project_id = %(project_id)s
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, {'tag_id': tag_id, 'project_id': project_id})
        cur.execute(query)

    return True
