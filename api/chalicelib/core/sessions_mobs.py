from decouple import config

from chalicelib.utils.storage import StorageClient


def __get_mob_keys(project_id, session_id):
    params = {
        "sessionId": session_id,
        "projectId": project_id
    }
    return [
        config("SESSION_MOB_PATTERN_S", default="%(sessionId)s") % params,
        config("SESSION_MOB_PATTERN_E", default="%(sessionId)se") % params
    ]


def __get_ios_video_keys(project_id, session_id):
    params = {
        "sessionId": session_id,
        "projectId": project_id
    }
    return [
        config("SESSION_IOS_VIDEO_PATTERN", default="replay.mp4") % params,
    ]


def __get_mob_keys_deprecated(session_id):
    return [str(session_id), str(session_id) + "e"]


async def get_urls(project_id, session_id, check_existence: bool = True):
    results = []
    for k in __get_mob_keys(project_id=project_id, session_id=session_id):
        if check_existence and not await asyncio.to_thread(StorageClient.exists, bucket=config("sessions_bucket"), key=k):
            continue
        results.append(await asyncio.to_thread(StorageClient.get_presigned_url_for_sharing,
            bucket=config("sessions_bucket"),
            expires_in=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900),
            key=k
        ))
    return results


async def get_urls_depercated(session_id, check_existence: bool = True):
    results = []
    for k in __get_mob_keys_deprecated(session_id=session_id):
        if check_existence and not await asyncio.to_thread(StorageClient.exists, bucket=config("sessions_bucket"), key=k)):
            continue
        results.append(await asyncio.to_thread(StorageClient.get_presigned_url_for_sharing,
            bucket=config("sessions_bucket"),
            expires_in=100000,
            key=k
        ))
    return results


async def get_ios(session_id, project_id, check_existence=False):
    results = []
    for k in __get_mob_keys(project_id=project_id, session_id=session_id):
        if check_existence and not await asyncio.to_thread(StorageClient.exists, bucket=config("IOS_BUCKET"), key=k):
            continue
        r = await asyncio.to_thread(
            StorageClient.get_presigned_url_for_sharing,
            bucket=config("IOS_BUCKET"),
            expires_in=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900),
            key=k
        )
        results.append(r)
    return results


async def get_ios_videos(session_id, project_id, check_existence=False):
    results = []
    for k in __get_ios_video_keys(project_id=project_id, session_id=session_id):
        if check_existence and not await asyncio.to_thread(StorageClient.exists, bucket=config("IOS_VIDEO_BUCKET"), key=k):
            continue
        result = await asyncio.to_thread(
            StorageClient.get_presigned_url_for_sharing,
            bucket=config("IOS_VIDEO_BUCKET"),
            expires_in=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900),
            key=k
        )
        results.append(result)
    return results


async def delete_mobs(project_id, session_ids):
    for session_id in session_ids:
        for k in __get_mob_keys(project_id=project_id, session_id=session_id) \
                 + __get_mob_keys_deprecated(session_id=session_id):
            await asyncio.to_thread(StorageClient.tag_for_deletion, bucket=config("sessions_bucket"), key=k)
