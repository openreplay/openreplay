import requests
from chalicelib.utils.helper import environ
from datetime import datetime
from chalicelib.core import webhook


class Slack:
    @classmethod
    def add_channel(cls, tenant_id, **args):
        url = args["url"]
        name = args["name"]
        if cls.say_hello(url):
            webhook.add(tenant_id=tenant_id,
                        endpoint=url,
                        webhook_type="slack",
                        name=name)
            return True
        return False

    @classmethod
    def say_hello(cls, url):
        r = requests.post(
            url=url,
            json={
                "attachments": [
                    {
                        "text": "Welcome to OpenReplay",
                        "ts": datetime.now().timestamp(),
                    }
                ]
            })
        if r.status_code != 200:
            print("slack integration failed")
            print(r.text)
            return False
        return True

    @classmethod
    def send_text(cls, tenant_id, webhook_id, text, **args):
        integration = cls.__get(tenant_id=tenant_id, integration_id=webhook_id)
        if integration is None:
            return {"errors": ["slack integration not found"]}
        print("====> sending slack notification")
        r = requests.post(
            url=integration["endpoint"],
            json={
                "attachments": [
                    {
                        "text": text,
                        "ts": datetime.now().timestamp(),
                        **args
                    }
                ]
            })
        print(r)
        print(r.text)
        return {"data": r.text}

    @classmethod
    def send_batch(cls, tenant_id, webhook_id, attachments):
        integration = cls.__get(tenant_id=tenant_id, integration_id=webhook_id)
        if integration is None:
            return {"errors": ["slack integration not found"]}
        print(f"====> sending slack batch notification: {len(attachments)}")
        for i in range(0, len(attachments), 100):
            r = requests.post(
                url=integration["endpoint"],
                json={"attachments": attachments[i:i + 100]})
            if r.status_code != 200:
                print("!!!! something went wrong")
                print(r)
                print(r.text)

    @classmethod
    def __share_to_slack(cls, tenant_id, integration_id, fallback, pretext, title, title_link, text):
        integration = cls.__get(tenant_id=tenant_id, integration_id=integration_id)
        if integration is None:
            return {"errors": ["slack integration not found"]}
        r = requests.post(
            url=integration["endpoint"],
            json={
                "attachments": [
                    {
                        "fallback": fallback,
                        "pretext": pretext,
                        "title": title,
                        "title_link": title_link,
                        "text": text,
                        "ts": datetime.now().timestamp()
                    }
                ]
            })
        return r.text

    @classmethod
    def share_session(cls, tenant_id, project_id, session_id, user, comment, integration_id=None):
        args = {"fallback": f"{user} has shared the below session!",
                "pretext": f"{user} has shared the below session!",
                "title": f"{environ['SITE_URL']}/{project_id}/session/{session_id}",
                "title_link": f"{environ['SITE_URL']}/{project_id}/session/{session_id}",
                "text": comment}
        return {"data": cls.__share_to_slack(tenant_id, integration_id, **args)}

    @classmethod
    def share_error(cls, tenant_id, project_id, error_id, user, comment, integration_id=None):
        args = {"fallback": f"{user} has shared the below error!",
                "pretext": f"{user} has shared the below error!",
                "title": f"{environ['SITE_URL']}/{project_id}/errors/{error_id}",
                "title_link": f"{environ['SITE_URL']}/{project_id}/errors/{error_id}",
                "text": comment}
        return {"data": cls.__share_to_slack(tenant_id, integration_id, **args)}

    @classmethod
    def has_slack(cls, tenant_id):
        integration = cls.__get(tenant_id=tenant_id)
        return not (integration is None or len(integration) == 0)

    @classmethod
    def __get(cls, tenant_id, integration_id=None):
        if integration_id is not None:
            return webhook.get(tenant_id=tenant_id, webhook_id=integration_id)

        integrations = webhook.get_by_type(tenant_id=tenant_id, webhook_type="slack")
        if integrations is None or len(integrations) == 0:
            return None
        return integrations[0]
