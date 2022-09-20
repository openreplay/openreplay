__author__ = "AZNAUROV David"
__maintainer__ = "KRAIEM Taha Yassine"

import schemas
from chalicelib.core import events, metadata, sessions
from chalicelib.utils import dev

"""
todo: remove LIMIT from the query
"""

from typing import List
import math
import warnings
from collections import defaultdict

from psycopg2.extras import RealDictRow
from chalicelib.utils import pg_client, helper

SIGNIFICANCE_THRSH = 0.4

T_VALUES = {1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
            11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.13, 16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
            21: 2.080, 22: 2.074, 23: 2.069, 25: 2.064, 26: 2.060, 27: 2.056, 28: 2.052, 29: 2.045, 30: 2.042}


def get_stages_and_events(filter_d, project_id) -> List[RealDictRow]:
    """
    Add minimal timestamp
    :param filter_d: dict contains events&filters&...
    :return:
    """
    stages: [dict] = filter_d.get("events", [])
    filters: [dict] = filter_d.get("filters", [])
    filter_issues = filter_d.get("issueTypes")
    if filter_issues is None or len(filter_issues) == 0:
        filter_issues = []
    stage_constraints = ["main.timestamp <= %(endTimestamp)s"]
    first_stage_extra_constraints = ["s.project_id=%(project_id)s", "s.start_ts >= %(startTimestamp)s",
                                     "s.start_ts <= %(endTimestamp)s"]
    filter_extra_from = []
    n_stages_query = []
    values = {}
    if len(filters) > 0:
        meta_keys = None
        for i, f in enumerate(filters):
            if not isinstance(f["value"], list):
                f.value = [f["value"]]
            if len(f["value"]) == 0 or f["value"] is None:
                continue
            f["value"] = helper.values_for_operator(value=f["value"], op=f["operator"])
            # filter_args = _multiple_values(f["value"])
            op = sessions.__get_sql_operator(f["operator"])

            filter_type = f["type"]
            # values[f_k] = sessions.__get_sql_value_multiple(f["value"])
            f_k = f"f_value{i}"
            values = {**values,
                      **sessions._multiple_values(helper.values_for_operator(value=f["value"], op=f["operator"]),
                                                  value_key=f_k)}
            if filter_type == schemas.FilterType.user_browser:
                # op = sessions.__get_sql_operator_multiple(f["operator"])
                first_stage_extra_constraints.append(
                    sessions._multiple_conditions(f's.user_browser {op} %({f_k})s', f["value"], value_key=f_k))

            elif filter_type in [schemas.FilterType.user_os, schemas.FilterType.user_os_ios]:
                # op = sessions.__get_sql_operator_multiple(f["operator"])
                first_stage_extra_constraints.append(
                    sessions._multiple_conditions(f's.user_os {op} %({f_k})s', f["value"], value_key=f_k))

            elif filter_type in [schemas.FilterType.user_device, schemas.FilterType.user_device_ios]:
                # op = sessions.__get_sql_operator_multiple(f["operator"])
                first_stage_extra_constraints.append(
                    sessions._multiple_conditions(f's.user_device {op} %({f_k})s', f["value"], value_key=f_k))

            elif filter_type in [schemas.FilterType.user_country, schemas.FilterType.user_country_ios]:
                # op = sessions.__get_sql_operator_multiple(f["operator"])
                first_stage_extra_constraints.append(
                    sessions._multiple_conditions(f's.user_country {op} %({f_k})s', f["value"], value_key=f_k))
            elif filter_type == schemas.FilterType.duration:
                if len(f["value"]) > 0 and f["value"][0] is not None:
                    first_stage_extra_constraints.append(f's.duration >= %(minDuration)s')
                    values["minDuration"] = f["value"][0]
                if len(f["value"]) > 1 and f["value"][1] is not None and int(f["value"][1]) > 0:
                    first_stage_extra_constraints.append('s.duration <= %(maxDuration)s')
                    values["maxDuration"] = f["value"][1]
            elif filter_type == schemas.FilterType.referrer:
                # events_query_part = events_query_part + f"INNER JOIN events.pages AS p USING(session_id)"
                filter_extra_from = [f"INNER JOIN {events.event_type.LOCATION.table} AS p USING(session_id)"]
                # op = sessions.__get_sql_operator_multiple(f["operator"])
                first_stage_extra_constraints.append(
                    sessions._multiple_conditions(f"p.base_referrer {op} %({f_k})s", f["value"], value_key=f_k))
            elif filter_type == events.event_type.METADATA.ui_type:
                if meta_keys is None:
                    meta_keys = metadata.get(project_id=project_id)
                    meta_keys = {m["key"]: m["index"] for m in meta_keys}
                # op = sessions.__get_sql_operator(f["operator"])
                if f.get("key") in meta_keys.keys():
                    first_stage_extra_constraints.append(
                        sessions._multiple_conditions(
                            f's.{metadata.index_to_colname(meta_keys[f["key"]])} {op} %({f_k})s', f["value"],
                            value_key=f_k))
                    # values[f_k] = helper.string_to_sql_like_with_op(f["value"][0], op)
            elif filter_type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
                # op = sessions.__get_sql_operator(f["operator"])
                first_stage_extra_constraints.append(
                    sessions._multiple_conditions(f's.user_id {op} %({f_k})s', f["value"], value_key=f_k))
                # values[f_k] = helper.string_to_sql_like_with_op(f["value"][0], op)
            elif filter_type in [schemas.FilterType.user_anonymous_id,
                                 schemas.FilterType.user_anonymous_id_ios]:
                # op = sessions.__get_sql_operator(f["operator"])
                first_stage_extra_constraints.append(
                    sessions._multiple_conditions(f's.user_anonymous_id {op} %({f_k})s', f["value"], value_key=f_k))
                # values[f_k] = helper.string_to_sql_like_with_op(f["value"][0], op)
            elif filter_type in [schemas.FilterType.rev_id, schemas.FilterType.rev_id_ios]:
                # op = sessions.__get_sql_operator(f["operator"])
                first_stage_extra_constraints.append(
                    sessions._multiple_conditions(f's.rev_id {op} %({f_k})s', f["value"], value_key=f_k))
                # values[f_k] = helper.string_to_sql_like_with_op(f["value"][0], op)
    i = -1
    for s in stages:

        if s.get("operator") is None:
            s["operator"] = "is"

        if not isinstance(s["value"], list):
            s["value"] = [s["value"]]
        is_any = sessions._isAny_opreator(s["operator"])
        if not is_any and isinstance(s["value"], list) and len(s["value"]) == 0:
            continue
        i += 1
        if i == 0:
            extra_from = filter_extra_from + ["INNER JOIN public.sessions AS s USING (session_id)"]
        else:
            extra_from = []
        op = sessions.__get_sql_operator(s["operator"])
        event_type = s["type"].upper()
        if event_type == events.event_type.CLICK.ui_type:
            next_table = events.event_type.CLICK.table
            next_col_name = events.event_type.CLICK.column
        elif event_type == events.event_type.INPUT.ui_type:
            next_table = events.event_type.INPUT.table
            next_col_name = events.event_type.INPUT.column
        elif event_type == events.event_type.LOCATION.ui_type:
            next_table = events.event_type.LOCATION.table
            next_col_name = events.event_type.LOCATION.column
        elif event_type == events.event_type.CUSTOM.ui_type:
            next_table = events.event_type.CUSTOM.table
            next_col_name = events.event_type.CUSTOM.column
        #     IOS --------------
        elif event_type == events.event_type.CLICK_IOS.ui_type:
            next_table = events.event_type.CLICK_IOS.table
            next_col_name = events.event_type.CLICK_IOS.column
        elif event_type == events.event_type.INPUT_IOS.ui_type:
            next_table = events.event_type.INPUT_IOS.table
            next_col_name = events.event_type.INPUT_IOS.column
        elif event_type == events.event_type.VIEW_IOS.ui_type:
            next_table = events.event_type.VIEW_IOS.table
            next_col_name = events.event_type.VIEW_IOS.column
        elif event_type == events.event_type.CUSTOM_IOS.ui_type:
            next_table = events.event_type.CUSTOM_IOS.table
            next_col_name = events.event_type.CUSTOM_IOS.column
        else:
            print("=================UNDEFINED")
            continue

        values = {**values, **sessions._multiple_values(helper.values_for_operator(value=s["value"], op=s["operator"]),
                                                        value_key=f"value{i + 1}")}
        if sessions.__is_negation_operator(op) and i > 0:
            op = sessions.__reverse_sql_operator(op)
            main_condition = "left_not.session_id ISNULL"
            extra_from.append(f"""LEFT JOIN LATERAL (SELECT session_id 
                                                        FROM {next_table} AS s_main 
                                                        WHERE s_main.{next_col_name} {op} %(value{i + 1})s
                                                        AND s_main.timestamp >= T{i}.stage{i}_timestamp
                                                        AND s_main.session_id = T1.session_id) AS left_not ON (TRUE)""")
        else:
            if is_any:
                main_condition = "TRUE"
            else:
                main_condition = sessions._multiple_conditions(f"main.{next_col_name} {op} %(value{i + 1})s",
                                                               values=s["value"], value_key=f"value{i + 1}")
        n_stages_query.append(f""" 
        (SELECT main.session_id, 
                {"MIN(main.timestamp)" if i + 1 < len(stages) else "MAX(main.timestamp)"} AS stage{i + 1}_timestamp, 
                '{event_type}' AS type,
                '{s["operator"]}' AS operator
        FROM {next_table} AS main {" ".join(extra_from)}        
        WHERE main.timestamp >= {f"T{i}.stage{i}_timestamp" if i > 0 else "%(startTimestamp)s"}
            {f"AND main.session_id=T1.session_id" if i > 0 else ""}
            AND {main_condition}
            {(" AND " + " AND ".join(stage_constraints)) if len(stage_constraints) > 0 else ""}
            {(" AND " + " AND ".join(first_stage_extra_constraints)) if len(first_stage_extra_constraints) > 0 and i == 0 else ""}
        GROUP BY main.session_id)
        AS T{i + 1} {"USING (session_id)" if i > 0 else ""}
        """)
    if len(n_stages_query) == 0:
        return []
    n_stages_query = " LEFT JOIN LATERAL ".join(n_stages_query)
    n_stages_query += ") AS stages_t"

    n_stages_query = f"""
    SELECT stages_and_issues_t.*,sessions.session_id, sessions.user_uuid FROM (
        SELECT * FROM (
             SELECT * FROM
                {n_stages_query}
        LEFT JOIN LATERAL 
        (
            SELECT * FROM 
            (SELECT ISE.session_id, 
                    ISS.type as issue_type,  
                    ISE.timestamp AS issue_timestamp,
                    ISS.context_string as issue_context,
                    ISS.issue_id as issue_id
            FROM events_common.issues AS ISE INNER JOIN issues AS ISS USING (issue_id)
            WHERE ISE.timestamp >= stages_t.stage1_timestamp 
                AND ISE.timestamp <= stages_t.stage{i + 1}_timestamp 
                AND ISS.project_id=%(project_id)s
                {"AND ISS.type IN %(issueTypes)s" if len(filter_issues) > 0 else ""}) AS base_t
        ) AS issues_t 
        USING (session_id)) AS stages_and_issues_t
    inner join sessions USING(session_id);
    """

    #  LIMIT 10000
    params = {"project_id": project_id, "startTimestamp": filter_d["startDate"], "endTimestamp": filter_d["endDate"],
              "issueTypes": tuple(filter_issues), **values}
    with pg_client.PostgresClient() as cur:
        # print("---------------------------------------------------")
        # print(cur.mogrify(n_stages_query, params))
        # print("---------------------------------------------------")
        cur.execute(cur.mogrify(n_stages_query, params))
        rows = cur.fetchall()
    return rows


def pearson_corr(x: list, y: list):
    n = len(x)
    if n != len(y):
        raise ValueError(f'x and y must have the same length. Got {len(x)} and {len(y)} instead')

    if n < 2:
        warnings.warn(f'x and y must have length at least 2. Got {n} instead')
        return None, None, False

    # If an input is constant, the correlation coefficient is not defined.
    if all(t == x[0] for t in x) or all(t == y[0] for t in y):
        warnings.warn("An input array is constant; the correlation coefficent is not defined.")
        return None, None, False

    if n == 2:
        return math.copysign(1, x[1] - x[0]) * math.copysign(1, y[1] - y[0]), 1.0

    xmean = sum(x) / len(x)
    ymean = sum(y) / len(y)

    xm = [el - xmean for el in x]
    ym = [el - ymean for el in y]

    normxm = math.sqrt((sum([xm[i] * xm[i] for i in range(len(xm))])))
    normym = math.sqrt((sum([ym[i] * ym[i] for i in range(len(ym))])))

    threshold = 1e-8
    if normxm < threshold * abs(xmean) or normym < threshold * abs(ymean):
        # If all the values in x (likewise y) are very close to the mean,
        # the loss of precision that occurs in the subtraction xm = x - xmean
        # might result in large errors in r.
        warnings.warn("An input array is constant; the correlation coefficent is not defined.")

    r = sum(
        i[0] * i[1] for i in zip([xm[i] / normxm for i in range(len(xm))], [ym[i] / normym for i in range(len(ym))]))

    # Presumably, if abs(r) > 1, then it is only some small artifact of  floating point arithmetic.
    # However, if r < 0, we don't care, as our problem is to find only positive correlations
    r = max(min(r, 1.0), 0.0)

    # approximated confidence
    if n < 31:
        t_c = T_VALUES[n]
    elif n < 50:
        t_c = 2.02
    else:
        t_c = 2
    if r >= 0.999:
        confidence = 1
    else:
        confidence = r * math.sqrt(n - 2) / math.sqrt(1 - r ** 2)

    if confidence > SIGNIFICANCE_THRSH:
        return r, confidence, True
    else:
        return r, confidence, False


def get_transitions_and_issues_of_each_type(rows: List[RealDictRow], all_issues_with_context, first_stage, last_stage):
    """
    Returns two lists with binary values 0/1:

    transitions ::: if transited from the first stage to the last - 1
                    else - 0
    errors      ::: a dictionary where the keys are all unique issues (currently context-wise)
                    the values are lists
                    if an issue happened between the first stage to the last - 1
                    else - 0

    For a small task of calculating a total drop due to issues,
    we need to disregard the issue type when creating the `errors`-like array.
    The `all_errors` array can be obtained by logical OR statement applied to all errors by issue
    The `transitions` array stays the same
    """
    transitions = []
    n_sess_affected = 0
    errors = {}
    for issue in all_issues_with_context:
        split = issue.split('__^__')
        errors[issue] = {
            "errors": [],
            "issue_type": split[0],
            "context": split[1]}

    for row in rows:
        t = 0
        first_ts = row[f'stage{first_stage}_timestamp']
        last_ts = row[f'stage{last_stage}_timestamp']
        if first_ts is None:
            continue
        elif first_ts is not None and last_ts is not None:
            t = 1
        transitions.append(t)

        ic_present = False
        for issue_type_with_context in errors:
            ic = 0
            issue_type = errors[issue_type_with_context]["issue_type"]
            context = errors[issue_type_with_context]["context"]
            if row['issue_type'] is not None:
                if last_ts is None or (first_ts < row['issue_timestamp'] < last_ts):
                    context_in_row = row['issue_context'] if row['issue_context'] is not None else ''
                    if issue_type == row['issue_type'] and context == context_in_row:
                        ic = 1
                        ic_present = True
            errors[issue_type_with_context]["errors"].append(ic)

        if ic_present and t:
            n_sess_affected += 1

    # def tuple_or(t: tuple):
    #     x = 0
    #     for el in t:
    #         x |= el
    #     return x
    def tuple_or(t: tuple):
        for el in t:
            if el > 0:
                return 1
        return 0

    errors = {key: errors[key]["errors"] for key in errors}
    all_errors = [tuple_or(t) for t in zip(*errors.values())]

    return transitions, errors, all_errors, n_sess_affected


def get_affected_users_for_all_issues(rows, first_stage, last_stage):
    """

    :param rows:
    :param first_stage:
    :param last_stage:
    :return:
    """
    affected_users = defaultdict(lambda: set())
    affected_sessions = defaultdict(lambda: set())
    contexts = defaultdict(lambda: None)
    n_affected_users_dict = defaultdict(lambda: None)
    n_affected_sessions_dict = defaultdict(lambda: None)
    all_issues_with_context = set()
    n_issues_dict = defaultdict(lambda: 0)
    issues_by_session = defaultdict(lambda: 0)

    for row in rows:

        # check that the session has reached the first stage of subfunnel:
        if row[f'stage{first_stage}_timestamp'] is None:
            continue

        iss = row['issue_type']
        iss_ts = row['issue_timestamp']

        # check that the issue exists and belongs to subfunnel:
        if iss is not None and (row[f'stage{last_stage}_timestamp'] is None or
                                (row[f'stage{first_stage}_timestamp'] < iss_ts < row[f'stage{last_stage}_timestamp'])):
            context_string = row['issue_context'] if row['issue_context'] is not None else ''
            issue_with_context = iss + '__^__' + context_string
            contexts[issue_with_context] = {"context": context_string, "id": row["issue_id"]}
            all_issues_with_context.add(issue_with_context)
            n_issues_dict[issue_with_context] += 1
            if row['user_uuid'] is not None:
                affected_users[issue_with_context].add(row['user_uuid'])

            affected_sessions[issue_with_context].add(row['session_id'])
            issues_by_session[row[f'session_id']] += 1

    if len(affected_users) > 0:
        n_affected_users_dict.update({
            iss: len(affected_users[iss]) for iss in affected_users
        })
    if len(affected_sessions) > 0:
        n_affected_sessions_dict.update({
            iss: len(affected_sessions[iss]) for iss in affected_sessions
        })
    return all_issues_with_context, n_issues_dict, n_affected_users_dict, n_affected_sessions_dict, contexts


def count_sessions(rows, n_stages):
    session_counts = {i: set() for i in range(1, n_stages + 1)}
    for ind, row in enumerate(rows):
        for i in range(1, n_stages + 1):
            if row[f"stage{i}_timestamp"] is not None:
                session_counts[i].add(row[f"session_id"])
    session_counts = {i: len(session_counts[i]) for i in session_counts}
    return session_counts


def count_users(rows, n_stages):
    users_in_stages = defaultdict(lambda: set())

    for ind, row in enumerate(rows):
        for i in range(1, n_stages + 1):
            if row[f"stage{i}_timestamp"] is not None:
                users_in_stages[i].add(row["user_uuid"])

    users_count = {i: len(users_in_stages[i]) for i in range(1, n_stages + 1)}

    return users_count


def get_stages(stages, rows):
    n_stages = len(stages)
    session_counts = count_sessions(rows, n_stages)
    users_counts = count_users(rows, n_stages)

    stages_list = []
    for i, stage in enumerate(stages):

        drop = None
        if i != 0:
            if session_counts[i] == 0:
                drop = 0
            elif session_counts[i] > 0:
                drop = int(100 * (session_counts[i] - session_counts[i + 1]) / session_counts[i])

        stages_list.append(
            {"value": stage["value"],
             "type": stage["type"],
             "operator": stage["operator"],
             "sessionsCount": session_counts[i + 1],
             "drop_pct": drop,
             "usersCount": users_counts[i + 1],
             "dropDueToIssues": 0
             }
        )
    return stages_list


def get_issues(stages, rows, first_stage=None, last_stage=None, drop_only=False):
    """

    :param stages:
    :param rows:
    :param first_stage: If it's a part of the initial funnel, provide a number of the first stage (starting from 1)
    :param last_stage: If it's a part of the initial funnel, provide a number of the last stage (starting from 1)
    :return:
    """

    n_stages = len(stages)

    if first_stage is None:
        first_stage = 1
    if last_stage is None:
        last_stage = n_stages
    if last_stage > n_stages:
        print("The number of the last stage provided is greater than the number of stages. Using n_stages instead")
        last_stage = n_stages

    n_critical_issues = 0
    issues_dict = dict({"significant": [],
                        "insignificant": []})
    session_counts = count_sessions(rows, n_stages)
    drop = session_counts[first_stage] - session_counts[last_stage]

    all_issues_with_context, n_issues_dict, affected_users_dict, affected_sessions, contexts = get_affected_users_for_all_issues(
        rows, first_stage, last_stage)
    transitions, errors, all_errors, n_sess_affected = get_transitions_and_issues_of_each_type(rows,
                                                                                               all_issues_with_context,
                                                                                               first_stage, last_stage)

    # print("len(transitions) =", len(transitions))

    if any(all_errors):
        total_drop_corr, conf, is_sign = pearson_corr(transitions, all_errors)
        if total_drop_corr is not None and drop is not None:
            total_drop_due_to_issues = int(total_drop_corr * n_sess_affected)
        else:
            total_drop_due_to_issues = 0
    else:
        total_drop_due_to_issues = 0

    if drop_only:
        return total_drop_due_to_issues
    for issue in all_issues_with_context:

        if not any(errors[issue]):
            continue
        r, confidence, is_sign = pearson_corr(transitions, errors[issue])

        if r is not None and drop is not None and is_sign:
            lost_conversions = int(r * affected_sessions[issue])
        else:
            lost_conversions = None
        if r is None:
            r = 0
        split = issue.split('__^__')
        issues_dict['significant' if is_sign else 'insignificant'].append({
            "type": split[0],
            "title": helper.get_issue_title(split[0]),
            "affected_sessions": affected_sessions[issue],
            "unaffected_sessions": session_counts[1] - affected_sessions[issue],
            "lost_conversions": lost_conversions,
            "affected_users": affected_users_dict[issue],
            "conversion_impact": round(r * 100),
            "context_string": contexts[issue]["context"],
            "issue_id": contexts[issue]["id"]
        })

        if is_sign:
            n_critical_issues += n_issues_dict[issue]

    return n_critical_issues, issues_dict, total_drop_due_to_issues


def get_top_insights(filter_d, project_id):
    output = []
    stages = filter_d.get("events", [])
    # TODO: handle 1 stage alone
    if len(stages) == 0:
        print("no stages found")
        return output, 0
    elif len(stages) == 1:
        # TODO: count sessions, and users for single stage
        output = [{
            "type": stages[0]["type"],
            "value": stages[0]["value"],
            "dropPercentage": None,
            "operator": stages[0]["operator"],
            "sessionsCount": 0,
            "dropPct": 0,
            "usersCount": 0,
            "dropDueToIssues": 0

        }]
        counts = sessions.search_sessions(data=schemas.SessionsSearchCountSchema.parse_obj(filter_d), project_id=project_id,
                                          user_id=None, count_only=True)
        output[0]["sessionsCount"] = counts["countSessions"]
        output[0]["usersCount"] = counts["countUsers"]
        return output, 0
    # The result of the multi-stage query
    rows = get_stages_and_events(filter_d=filter_d, project_id=project_id)
    if len(rows) == 0:
        return get_stages(stages, []), 0
    # Obtain the first part of the output
    stages_list = get_stages(stages, rows)
    # Obtain the second part of the output
    total_drop_due_to_issues = get_issues(stages, rows, first_stage=filter_d.get("firstStage"),
                                          last_stage=filter_d.get("lastStage"), drop_only=True)
    return stages_list, total_drop_due_to_issues


def get_issues_list(filter_d, project_id, first_stage=None, last_stage=None):
    output = dict({"total_drop_due_to_issues": 0, "critical_issues_count": 0, "significant": [], "insignificant": []})
    stages = filter_d.get("events", [])
    # The result of the multi-stage query
    rows = get_stages_and_events(filter_d=filter_d, project_id=project_id)
    # print(json.dumps(rows[0],indent=4))
    # return
    if len(rows) == 0:
        return output
        # Obtain the second part of the output
    n_critical_issues, issues_dict, total_drop_due_to_issues = get_issues(stages, rows, first_stage=first_stage,
                                                                          last_stage=last_stage)
    output['total_drop_due_to_issues'] = total_drop_due_to_issues
    # output['critical_issues_count'] = n_critical_issues
    output = {**output, **issues_dict}
    return output


def get_overview(filter_d, project_id, first_stage=None, last_stage=None):
    output = dict()
    stages = filter_d["events"]
    # TODO: handle 1 stage alone
    if len(stages) == 0:
        return {"stages": [],
                "criticalIssuesCount": 0}
    elif len(stages) == 1:
        # TODO: count sessions, and users for single stage
        output["stages"] = [{
            "type": stages[0]["type"],
            "value": stages[0]["value"],
            "sessionsCount": None,
            "dropPercentage": None,
            "usersCount": None
        }]
        return output
    # The result of the multi-stage query
    rows = get_stages_and_events(filter_d=filter_d, project_id=project_id)
    if len(rows) == 0:
        # PS: not sure what to return if rows are empty
        output["stages"] = [{
            "type": stages[0]["type"],
            "value": stages[0]["value"],
            "sessionsCount": None,
            "dropPercentage": None,
            "usersCount": None
        }]
        output['criticalIssuesCount'] = 0
        return output
    # Obtain the first part of the output
    stages_list = get_stages(stages, rows)

    # Obtain the second part of the output
    n_critical_issues, issues_dict, total_drop_due_to_issues = get_issues(stages, rows, first_stage=first_stage,
                                                                          last_stage=last_stage)

    output['stages'] = stages_list
    output['criticalIssuesCount'] = n_critical_issues
    return output
