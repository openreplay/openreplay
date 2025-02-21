from decouple import config

from chalicelib.core.sessions import sessions_mobs, sessions_favorite
from chalicelib.utils.storage import extra
from .custom_metrics import *


def create_card(project: schemas.ProjectContext, user_id, data: schemas.CardSchema, dashboard=False):
    with pg_client.PostgresClient() as cur:
        session_data = None
        if data.metric_type == schemas.MetricType.HEAT_MAP:
            if data.session_id is not None:
                session_data = {"sessionId": data.session_id}
            else:
                session_data = get_heat_map_chart(project=project, user_id=user_id,
                                                  data=data, include_mobs=False)
                if session_data is not None:
                    session_data = {"sessionId": session_data["sessionId"]}

            if session_data is not None:
                # for EE only
                keys = sessions_mobs. \
                    __get_mob_keys(project_id=project.project_id, session_id=session_data["sessionId"])
                keys += sessions_mobs. \
                    __get_mob_keys_deprecated(session_id=session_data["sessionId"])  # To support old sessions
                tag = config('RETENTION_L_VALUE', default='vault')
                for k in keys:
                    try:
                        extra.tag_session(file_key=k, tag_value=tag)
                    except Exception as e:
                        logger.warning(f"!!!Error while tagging: {k} to {tag} for heatMap")
                        logger.error(str(e))

        _data = {"session_data": json.dumps(session_data) if session_data is not None else None}
        for i, s in enumerate(data.series):
            for k in s.model_dump().keys():
                _data[f"{k}_{i}"] = s.__getattribute__(k)
            _data[f"index_{i}"] = i
            _data[f"filter_{i}"] = s.filter.json()
        series_len = len(data.series)
        params = {"user_id": user_id, "project_id": project.project_id, **data.model_dump(), **_data,
                  "default_config": json.dumps(data.default_config.model_dump()), "card_info": None}
        params["card_info"] = get_global_card_info(data=data)
        if data.metric_type == schemas.MetricType.PATH_ANALYSIS:
            params["card_info"] = {**params["card_info"], **get_path_analysis_card_info(data=data)}
        params["card_info"] = json.dumps(params["card_info"])

        query = """INSERT INTO metrics (project_id, user_id, name, is_public,
                            view_type, metric_type, metric_of, metric_value,
                            metric_format, default_config, thumbnail, data,
                            card_info)
                   VALUES (%(project_id)s, %(user_id)s, %(name)s, %(is_public)s, 
                              %(view_type)s, %(metric_type)s, %(metric_of)s, %(metric_value)s, 
                              %(metric_format)s, %(default_config)s, %(thumbnail)s, %(session_data)s,
                              %(card_info)s)
                   RETURNING metric_id"""
        if len(data.series) > 0:
            query = f"""WITH m AS ({query})
                        INSERT INTO metric_series(metric_id, index, name, filter)
                        VALUES {",".join([f"((SELECT metric_id FROM m), %(index_{i})s, %(name_{i})s, %(filter_{i})s::jsonb)"
                                          for i in range(series_len)])}
                        RETURNING metric_id;"""

        query = cur.mogrify(query, params)
        cur.execute(query)
        r = cur.fetchone()
        if dashboard:
            return r["metric_id"]
    return {"data": get_card(metric_id=r["metric_id"], project_id=project.project_id, user_id=user_id)}


def delete_card(project_id, metric_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
            UPDATE public.metrics 
            SET deleted_at = timezone('utc'::text, now()), edited_at = timezone('utc'::text, now()) 
            WHERE project_id = %(project_id)s
              AND metric_id = %(metric_id)s
              AND (user_id = %(user_id)s OR is_public)
            RETURNING data;""",
                        {"metric_id": metric_id, "project_id": project_id, "user_id": user_id})
        )
        # for EE only
        row = cur.fetchone()
    if row:
        if row["data"] and not sessions_favorite.favorite_session_exists(session_id=row["data"]["sessionId"]):
            keys = sessions_mobs. \
                __get_mob_keys(project_id=project_id, session_id=row["data"]["sessionId"])
            keys += sessions_mobs. \
                __get_mob_keys_deprecated(session_id=row["data"]["sessionId"])  # To support old sessions
            tag = config('RETENTION_D_VALUE', default='default')
            for k in keys:
                try:
                    extra.tag_session(file_key=k, tag_value=tag)
                except Exception as e:
                    logger.warning(f"!!!Error while tagging: {k} to {tag} for heatMap")
                    logger.error(str(e))
    return {"state": "success"}
