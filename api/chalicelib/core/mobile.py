from chalicelib.core import projects
from chalicelib.utils import s3
from decouple import config


def sign_keys(project_id, session_id, keys):
    result = []
    project_key = projects.get_project_key(project_id)
    for k in keys:
        result.append(s3.get_presigned_url_for_sharing(bucket=config("iosBucket"),
                                                       key=f"{project_key}/{session_id}/{k}",
                                                       expires_in=60 * 60))
    return result
