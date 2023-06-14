from chalicelib.utils import pg_client, helper, email_helper, smtp
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.helper import get_issue_title

LOWEST_BAR_VALUE = 3


def get_config(user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify("""\
            SELECT users.weekly_report
            FROM public.users
            WHERE users.deleted_at ISNULL AND users.user_id=%(user_id)s 
            LIMIT 1;""", {"user_id": user_id}))
        result = cur.fetchone()
    return helper.dict_to_camel_case(result)


def edit_config(user_id, weekly_report):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify("""\
            UPDATE public.users
            SET weekly_report= %(weekly_report)s
            WHERE users.deleted_at ISNULL 
                AND users.user_id=%(user_id)s
            RETURNING weekly_report;""", {"user_id": user_id, "weekly_report": weekly_report}))
        result = cur.fetchone()
    return helper.dict_to_camel_case(result)


def cron():
    if not smtp.has_smtp():
        print("!!! No SMTP configuration found, ignoring weekly report")
        return
    _now = TimeUTC.now()
    with pg_client.PostgresClient(unlimited_query=True) as cur:
        params = {"tomorrow": TimeUTC.midnight(delta_days=1),
                  "3_days_ago": TimeUTC.midnight(delta_days=-3),
                  "1_week_ago": TimeUTC.midnight(delta_days=-7),
                  "2_week_ago": TimeUTC.midnight(delta_days=-14),
                  "5_week_ago": TimeUTC.midnight(delta_days=-35)}
        cur.execute(cur.mogrify("""\
            SELECT project_id,
               name                                                                     AS project_name,
               users.emails                                                             AS emails,
               TO_CHAR(DATE_TRUNC('day', now()) - INTERVAL '1 week', 'Mon. DDth, YYYY') AS period_start,
               TO_CHAR(DATE_TRUNC('day', now()), 'Mon. DDth, YYYY')                     AS period_end,
               COALESCE(week_0_issues.count, 0)                                         AS this_week_issues_count,
               COALESCE(week_1_issues.count, 0)                                         AS past_week_issues_count,
               COALESCE(month_1_issues.count, 0)                                        AS past_month_issues_count
            FROM (SELECT tenant_id, project_id, name FROM public.projects WHERE projects.deleted_at ISNULL) AS projects
                    INNER JOIN LATERAL (
                             SELECT sessions.project_id
                             FROM public.sessions
                             WHERE sessions.project_id = projects.project_id
                               AND start_ts >= %(3_days_ago)s
                               AND start_ts < %(tomorrow)s
                             LIMIT 1) AS recently_active USING (project_id)
                     INNER JOIN LATERAL (
                            SELECT COALESCE(ARRAY_AGG(email), '{}') AS emails
                            FROM public.users
                            WHERE users.tenant_id = projects.tenant_id
                              AND users.deleted_at ISNULL
                              AND users.weekly_report
                     ) AS users ON (TRUE)
                     LEFT JOIN LATERAL (
                            SELECT COUNT(1) AS count
                            FROM events_common.issues
                                     INNER JOIN public.sessions USING (session_id)
                            WHERE sessions.project_id = projects.project_id
                              AND issues.timestamp >= %(1_week_ago)s
                              AND issues.timestamp < %(tomorrow)s
                     ) AS week_0_issues ON (TRUE)
                     LEFT JOIN LATERAL (
                            SELECT COUNT(1) AS count
                            FROM events_common.issues
                                     INNER JOIN public.sessions USING (session_id)
                            WHERE sessions.project_id = projects.project_id
                              AND issues.timestamp <= %(1_week_ago)s
                              AND issues.timestamp >= %(2_week_ago)s
                     ) AS week_1_issues ON (TRUE)
                     LEFT JOIN LATERAL (
                            SELECT COUNT(1) AS count
                            FROM events_common.issues
                                     INNER JOIN public.sessions USING (session_id)
                            WHERE sessions.project_id = projects.project_id
                              AND issues.timestamp <= %(1_week_ago)s
                              AND issues.timestamp >= %(5_week_ago)s
                     ) AS month_1_issues ON (TRUE);"""), params)
        projects_data = cur.fetchall()
        _now2 = TimeUTC.now()
        print(f">> Weekly report query: {_now2 - _now} ms")
        _now = _now2
        emails_to_send = []
        for p in projects_data:
            params["project_id"] = p["project_id"]
            print(f"checking {p['project_name']} : {p['project_id']}")
            if len(p["emails"]) == 0 \
                    or p["this_week_issues_count"] + p["past_week_issues_count"] + p["past_month_issues_count"] == 0:
                print('ignore')
                continue
            print("valid")
            p["past_week_issues_evolution"] = helper.__decimal_limit(
                helper.__progress(p["this_week_issues_count"], p["past_week_issues_count"]), 1)
            p["past_month_issues_evolution"] = helper.__decimal_limit(
                helper.__progress(p["this_week_issues_count"], p["past_month_issues_count"]), 1)
            cur.execute(cur.mogrify("""
                SELECT LEFT(TO_CHAR(timestamp_i, 'Dy'),1) AS day_short,
                       TO_CHAR(timestamp_i, 'Mon. DD, YYYY') AS day_long,
                       (
                           SELECT COUNT(*)
                           FROM events_common.issues INNER JOIN public.issues USING (issue_id)
                           WHERE project_id = %(project_id)s
                             AND timestamp >= (EXTRACT(EPOCH FROM timestamp_i) * 1000)::BIGINT
                             AND timestamp <= (EXTRACT(EPOCH FROM timestamp_i + INTERVAL '1 day') * 1000)::BIGINT
                       )                             AS issues_count
                FROM generate_series(
                             DATE_TRUNC('day', now()) - INTERVAL '7 days',
                             DATE_TRUNC('day', now()) - INTERVAL '1 day',
                             '1 day'::INTERVAL
                         ) AS timestamp_i
                ORDER BY timestamp_i;""", params))
            days_partition = cur.fetchall()
            _now2 = TimeUTC.now()
            print(f">> Weekly report s-query-1: {_now2 - _now} ms project_id: {p['project_id']}")
            _now = _now2
            max_days_partition = max(x['issues_count'] for x in days_partition)
            for d in days_partition:
                if max_days_partition <= 0:
                    d["value"] = LOWEST_BAR_VALUE
                else:
                    d["value"] = d["issues_count"] * 100 / max_days_partition
                    d["value"] = d["value"] if d["value"] > LOWEST_BAR_VALUE else LOWEST_BAR_VALUE
            cur.execute(cur.mogrify("""\
            SELECT type, COUNT(*) AS count
            FROM events_common.issues INNER JOIN public.issues USING (issue_id)
            WHERE project_id = %(project_id)s
              AND timestamp >= (EXTRACT(EPOCH FROM DATE_TRUNC('day', now()) - INTERVAL '7 days') * 1000)::BIGINT
            GROUP BY type
            ORDER BY count DESC, type
            LIMIT 4;""", params))
            issues_by_type = cur.fetchall()
            _now2 = TimeUTC.now()
            print(f">> Weekly report s-query-1: {_now2 - _now} ms project_id: {p['project_id']}")
            _now = _now2
            max_issues_by_type = sum(i["count"] for i in issues_by_type)
            for i in issues_by_type:
                i["type"] = get_issue_title(i["type"])
                if max_issues_by_type <= 0:
                    i["value"] = LOWEST_BAR_VALUE
                else:
                    i["value"] = i["count"] * 100 / max_issues_by_type
            cur.execute(cur.mogrify("""\
                SELECT TO_CHAR(timestamp_i, 'Dy')             AS day_short,
                       TO_CHAR(timestamp_i, 'Mon. DD, YYYY')  AS day_long,
                       COALESCE((SELECT JSONB_AGG(sub)
                                 FROM (
                                          SELECT type, COUNT(*) AS count
                                          FROM events_common.issues
                                                   INNER JOIN public.issues USING (issue_id)
                                          WHERE project_id = %(project_id)s
                                            AND timestamp >= (EXTRACT(EPOCH FROM timestamp_i) * 1000)::BIGINT
                                            AND timestamp <= (EXTRACT(EPOCH FROM timestamp_i + INTERVAL '1 day') * 1000)::BIGINT
                                          GROUP BY type
                                          ORDER BY count
                                      ) AS sub), '[]'::JSONB) AS partition
                FROM generate_series(
                             DATE_TRUNC('day', now()) - INTERVAL '7 days',
                             DATE_TRUNC('day', now()) - INTERVAL '1 day',
                             '1 day'::INTERVAL
                         ) AS timestamp_i
                GROUP BY timestamp_i
                ORDER BY timestamp_i;""", params))
            issues_breakdown_by_day = cur.fetchall()
            _now2 = TimeUTC.now()
            print(f">> Weekly report s-query-1: {_now2 - _now} ms project_id: {p['project_id']}")
            _now = _now2
            for i in issues_breakdown_by_day:
                i["sum"] = sum(x["count"] for x in i["partition"])
                for j in i["partition"]:
                    j["type"] = get_issue_title(j["type"])
            max_days_partition = max(i["sum"] for i in issues_breakdown_by_day)
            for i in issues_breakdown_by_day:
                for j in i["partition"]:
                    if max_days_partition <= 0:
                        j["value"] = LOWEST_BAR_VALUE
                    else:
                        j["value"] = j["count"] * 100 / max_days_partition
                        j["value"] = j["value"] if j["value"] > LOWEST_BAR_VALUE else LOWEST_BAR_VALUE
            cur.execute(cur.mogrify("""
                SELECT type,
                       COUNT(*)                   AS issue_count,
                       COUNT(DISTINCT session_id) AS sessions_count,
                       (SELECT COUNT(DISTINCT sessions.session_id)
                        FROM public.sessions
                                 INNER JOIN events_common.issues AS sci USING (session_id)
                                 INNER JOIN public.issues AS si USING (issue_id)
                        WHERE si.project_id = %(project_id)s
                          AND sessions.project_id = %(project_id)s
                          AND sessions.start_ts <= (EXTRACT(EPOCH FROM DATE_TRUNC('day', now()) - INTERVAL '1 week') * 1000)::BIGINT
                          AND sessions.start_ts >= (EXTRACT(EPOCH FROM DATE_TRUNC('day', now()) - INTERVAL '2 weeks') * 1000)::BIGINT
                          AND si.type = mi.type
                          AND sessions.duration IS NOT NULL
                       )                          AS last_week_sessions_count,
                       (SELECT COUNT(DISTINCT sci.session_id)
                        FROM public.sessions
                                 INNER JOIN events_common.issues AS sci USING (session_id)
                                 INNER JOIN public.issues AS si USING (issue_id)
                        WHERE si.project_id = %(project_id)s
                          AND sessions.project_id = %(project_id)s
                          AND sessions.start_ts <= (EXTRACT(EPOCH FROM DATE_TRUNC('day', now()) - INTERVAL '1 week') * 1000)::BIGINT
                          AND sessions.start_ts >= (EXTRACT(EPOCH FROM DATE_TRUNC('day', now()) - INTERVAL '5 weeks') * 1000)::BIGINT
                          AND si.type = mi.type
                          AND sessions.duration IS NOT NULL
                       )                          AS last_month_sessions_count
                FROM events_common.issues
                         INNER JOIN public.issues AS mi USING (issue_id)
                         INNER JOIN public.sessions USING (session_id)
                WHERE mi.project_id = %(project_id)s AND sessions.project_id = %(project_id)s AND sessions.duration IS NOT NULL
                    AND sessions.start_ts >= (EXTRACT(EPOCH FROM DATE_TRUNC('day', now()) - INTERVAL '1 week') * 1000)::BIGINT
                GROUP BY type
                ORDER BY issue_count DESC;""", params))
            issues_breakdown_list = cur.fetchall()
            _now2 = TimeUTC.now()
            print(f">> Weekly report s-query-1: {_now2 - _now} ms project_id: {p['project_id']}")
            _now = _now2
            if len(issues_breakdown_list) > 4:
                others = {"type": "Others",
                          "sessions_count": sum(i["sessions_count"] for i in issues_breakdown_list[4:]),
                          "issue_count": sum(i["issue_count"] for i in issues_breakdown_list[4:]),
                          "last_week_sessions_count": sum(
                              i["last_week_sessions_count"] for i in issues_breakdown_list[4:]),
                          "last_month_sessions_count": sum(
                              i["last_month_sessions_count"] for i in issues_breakdown_list[4:])}
                issues_breakdown_list = issues_breakdown_list[:4]
                issues_breakdown_list.append(others)
            for i in issues_breakdown_list:
                i["type"] = get_issue_title(i["type"])
                i["last_week_sessions_evolution"] = helper.__decimal_limit(
                    helper.__progress(i["sessions_count"], i["last_week_sessions_count"]), 1)
                i["last_month_sessions_evolution"] = helper.__decimal_limit(
                    helper.__progress(i["sessions_count"], i["last_month_sessions_count"]), 1)
                i["sessions_count"] = f'{i["sessions_count"]:,}'
            keep_types = [i["type"] for i in issues_breakdown_list]
            for i in issues_breakdown_by_day:
                keep = []
                for j in i["partition"]:
                    if j["type"] in keep_types:
                        keep.append(j)
                i["partition"] = keep
            emails_to_send.append({"email": p.pop("emails"),
                                   "data": {
                                       **p,
                                       "days_partition": days_partition,
                                       "issues_by_type": issues_by_type,
                                       "issues_breakdown_by_day": issues_breakdown_by_day,
                                       "issues_breakdown_list": issues_breakdown_list
                                   }})
        print(f">>> Sending weekly report to {len(emails_to_send)} email-group")
        for e in emails_to_send:
            email_helper.weekly_report2(recipients=e["email"], data=e["data"])
