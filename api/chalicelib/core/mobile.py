from chalicelib.core import projects
from chalicelib.utils.storage import StorageClient
from decouple import config


async def sign_keys(project_id, session_id, keys):
    result = []
    project_key = await projects.get_project_key(project_id)
    for k in keys:
        result.append(StorageClient.get_presigned_url_for_sharing(bucket=config("iosBucket"),
                                                              key=f"{project_key}/{session_id}/{k}",
                                                              expires_in=60 * 60))
    return result
