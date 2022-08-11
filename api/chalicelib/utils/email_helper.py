from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.email_handler import __get_html_from_file, send_html


def send_team_invitation(recipient, client_id, sender_name, invitation_link):
    BODY_HTML = __get_html_from_file("chalicelib/utils/html/invitation.html",
                                     formatting_variables={"invitationLink": invitation_link,
                                                           "clientId": client_id,
                                                           "sender": sender_name})
    SUBJECT = "Welcome to OpenReplay"
    send_html(BODY_HTML, SUBJECT, recipient)


def send_forgot_password(recipient, invitation_link):
    BODY_HTML = __get_html_from_file("chalicelib/utils/html/reset_password.html",
                                     formatting_variables={"invitationLink": invitation_link})
    SUBJECT = "Password recovery"
    send_html(BODY_HTML, SUBJECT, recipient)


def send_assign_session(recipient, message, link):
    BODY_HTML = __get_html_from_file("chalicelib/utils/html/assignment.html",
                                     formatting_variables={"message": message,
                                                           "now": TimeUTC.to_human_readable(TimeUTC.now()),
                                                           "link": link})
    SUBJECT = "assigned session"
    send_html(BODY_HTML, SUBJECT, recipient)


def alert_email(recipients, subject, data):
    BODY_HTML = __get_html_from_file("chalicelib/utils/html/alert_notification.html", formatting_variables=data)
    send_html(BODY_HTML=BODY_HTML, SUBJECT=subject, recipient=recipients)


def __get_color(idx):
    return "#3EAAAF" if idx == 0 else "#77C3C7" if idx == 1 else "#9ED4D7" if idx == 2 else "#99d59a"


def weekly_report2(recipients, data):
    data["o_tr_u"] = ""
    data["o_tr_d"] = ""
    for d in data["days_partition"]:
        data[
            "o_tr_u"] += f"""<td valign="bottom" style="padding:0 5px 0 0;width:14%;font-weight:300;margin:0;text-align:left">
                    <table style="width:100%;font-weight:300;margin-bottom:0;border-collapse:collapse">
                        <tbody>
                        <tr style="font-weight:300">
                          <td height="{d["value"]}px" title="{d["issues_count"]}" style="font-size:0;padding:0;font-weight:300;margin:0;line-height:0;background-color:#C5E5E7;text-align:left">&nbsp;</td>
                        </tr>
                    </tbody></table>
                  </td>"""
        data[
            "o_tr_d"] += f"""<td title="{d["day_long"]}, midnight" style="font-size:10px;color:#333333;padding:3px 5px 0 0;width:14%;font-weight:300;margin:0;text-align:center">{d["day_short"]}</td>"""

    data[
        "past_week_issues_status"] = f'<img src="img/weekly/arrow-{"increase" if data["past_week_issues_evolution"] > 0 else "decrease"}.png" width="15px" height="10px" style="font-weight:300;vertical-align:middle">'
    data["week_decision"] = "More" if data["past_week_issues_evolution"] > 0 else "Fewer"
    data["past_week_issues_evolution"] = abs(data["past_week_issues_evolution"])
    data[
        "past_month_issues_status"] = f'<img src="img/weekly/arrow-{"increase" if data["past_month_issues_evolution"] > 0 else "decrease"}.png" width="15px" height="10px" style="font-weight:300;vertical-align:middle">'
    data["month_decision"] = "More" if data["past_month_issues_evolution"] > 0 else "Fewer"
    data["past_month_issues_evolution"] = abs(data["past_month_issues_evolution"])
    data["progress_legend"] = []
    data["progress_tr"] = ""
    for idx, i in enumerate(data["issues_by_type"]):
        color = __get_color(idx)
        data["progress_legend"].append(
            f"""<td style="padding:0;font-weight:300;margin:0;text-align:left;">
                    <span style="white-space:nowrap;"><span style="border-radius:50%;font-weight:300;vertical-align:bottom;color:#fff;width:16px;height:16px;margin:0 8px;display:inline-block;background-color:{color}"></span>{i["count"]}</span><span style="font-weight:300;margin-left:5px;margin-right:0px;white-space:nowrap;">{i["type"]}</span>
                </td>""")
        data[
            "progress_tr"] += f'<td width="{i["value"]}%" title="{i["count"]} {i["type"]}" style="padding:0;font-weight:300;margin:0;background-color:{color};text-align:left">&nbsp;</td>'

    data["progress_legend"] = '<tr style="font-weight:300;font-size:13px;">' + "".join(
        data["progress_legend"]) + "</tr>"
    data["breakdown_list"] = ""
    color_breakdown = {}
    data["breakdown_list_other"] = ""
    for idx, i in enumerate(data["issues_breakdown_list"]):
        if idx < len(data["issues_breakdown_list"]) - 1 or i["type"].lower() != "others":
            color = __get_color(idx)
            color_breakdown[i["type"]] = color
            data["breakdown_list"] += f"""<tr style="font-weight:300">
              <td style="font-size:14px;padding:5px 0;font-weight:300;margin:0;text-align:left;white-space:nowrap;"><span style="vertical-align: middle;border-radius:50%;width:1em;font-weight:300;display:inline-block;background-color:{color};height:1em"></span>&nbsp;&nbsp;{i["type"]}</td>
              <td style="font-size:14px;padding:5px 0;font-weight:300;margin:0;text-align:left"><a href="%(frontend_url)s" style="color:#394EFF;font-weight:300;text-decoration:none" target="_blank" data-saferedirecturl="#">{i["sessions_count"]}</a></td>
              <td style="font-size:14px;padding:5px 0;font-weight:300;margin:0;text-align:left"><img src="img/weekly/arrow-{"increase" if i["last_week_sessions_evolution"] > 0 else "decrease"}.png" width="10px" height="7px" style="font-weight:300;vertical-align:middle;margin-right: 3px;"> {abs(i["last_week_sessions_evolution"])}%</td>
              <td style="font-size:14px;padding:5px 0;font-weight:300;margin:0;text-align:left"><img src="img/weekly/arrow-{"increase" if i["last_month_sessions_evolution"] > 0 else "decrease"}.png" width="10px" height="7px" style="font-weight:300;vertical-align:middle;margin-right: 3px;"> {abs(i["last_month_sessions_evolution"])}%</td>
            </tr>"""
        else:
            data["breakdown_list_other"] = f"""<tfoot style="font-weight:300">
            <tr style="font-weight:300">
              <td style="font-size:14px;padding:5px 0;font-weight:300;margin:0;text-align:left;white-space:nowrap;"><span style="vertical-align: middle;border-radius:50%;width:1em;font-weight:300;display:inline-block;background-color:#999999;height:1em"></span>&nbsp;&nbsp;{i["type"]}</td>
              <td style="font-size:14px;padding:5px 0;font-weight:300;margin:0;text-align:left"><a href="%(frontend_url)s" style="color:#394EFF;font-weight:300;text-decoration:none" target="_blank" data-saferedirecturl="#">{i["sessions_count"]}</a></td>
              <td style="font-size:14px;padding:5px 0;font-weight:300;margin:0;text-align:left"><img src="img/weekly/arrow-{"increase" if i["last_week_sessions_evolution"] > 0 else "decrease"}.png" width="10px" height="7px" style="font-weight:300;vertical-align:middle;margin-right: 3px;"> {abs(i["last_week_sessions_evolution"])}%</td>
              <td style="font-size:14px;padding:5px 0;font-weight:300;margin:0;text-align:left"><img src="img/weekly/arrow-{"increase" if i["last_month_sessions_evolution"] > 0 else "decrease"}.png" width="10px" height="7px" style="font-weight:300;vertical-align:middle;margin-right: 3px;"> {abs(i["last_month_sessions_evolution"])}%</td>
            </tr>
        </tfoot>"""
    data["b_tr_u"] = ""
    data["b_tr_d"] = ""
    for i in data["issues_breakdown_by_day"]:
        data[
            "b_tr_d"] += f"""<td title="{i["day_long"]}" style="font-size:14px;color:#333333;padding:10px 0 0;width:14%;border-right:10px solid #fff;font-weight:300;margin:0;text-align:center">
            {i["day_short"]}
          </td>"""
        if len(i["partition"]) > 0:
            sup_partition = ""
            for j in i["partition"]:
                sup_partition += f'<tr style="font-weight:300"><td height="{j["value"]}" title="{j["count"]} {j["type"]}" style="font-size:0;padding:0;border-right:none;font-weight:300;margin:0;line-height:0;background-color:{color_breakdown[j["type"]]};text-align:left"></td></tr>'
        else:
            sup_partition = '<tr style="font-weight:300"><td height="3" style="font-size:0;padding:0;border-right:none;font-weight:300;margin:0;line-height:0;background-color:#999999;text-align:left"></td></tr>'
        data[
            "b_tr_u"] += f"""<td valign="bottom" style="font-size:0;font-weight:300;padding:0;width:14%;border-right:10px solid #fff;height:110px;margin:0;text-align:left">
            <table style="width:100%;font-weight:300;margin-bottom:0;border-collapse:collapse">
                <tbody>{sup_partition}</tbody>
            </table>
          </td>"""
    BODY_HTML = __get_html_from_file("chalicelib/utils/html/Project-Weekly-Report.html", formatting_variables=data)
    SUBJECT = "OpenReplay Project Weekly Report"
    send_html(BODY_HTML=BODY_HTML, SUBJECT=SUBJECT, recipient=recipients)
