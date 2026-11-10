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


