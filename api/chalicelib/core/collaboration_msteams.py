import logging

import requests
from decouple import config
from fastapi import HTTPException, status

import schemas
from chalicelib.core import webhook
from chalicelib.core.collaboration_base import BaseCollaboration

logger = logging.getLogger(__name__)


class MSTeams(BaseCollaboration):
    @classmethod
    def add(cls, tenant_id, data: schemas.AddCollaborationSchema):
        if webhook.exists_by_name(tenant_id=tenant_id, name=data.name, exclude_id=None,
                                  webhook_type=schemas.WebhookType.msteams):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"name already exists.")
        if cls.say_hello(data.url):
            return webhook.add(tenant_id=tenant_id,
                               endpoint=data.url.unicode_string(),
                               webhook_type=schemas.WebhookType.msteams,
                               name=data.name)
        return None

    @classmethod
    def say_hello(cls, url):
        r = requests.post(
            url=url,
            json={
                "@type": "MessageCard",
                "@context": "https://schema.org/extensions",
                "summary": "Welcome to OpenReplay",
                "title": "Welcome to OpenReplay"
            })
        if r.status_code != 200:
            logging.warning("MSTeams integration failed")
            logging.warning(r.text)
            return False
        return True

    @classmethod
    def send_raw(cls, tenant_id, webhook_id, body):
        integration = cls.get_integration(tenant_id=tenant_id, integration_id=webhook_id)
        if integration is None:
            return {"errors": ["msteams integration not found"]}
        try:
            r = requests.post(
                url=integration["endpoint"],
                json=body,
                timeout=5)
            if r.status_code != 200:
                logging.warning(f"!! issue sending msteams raw; webhookId:{webhook_id} code:{r.status_code}")
                logging.warning(r.text)
                return None
        except requests.exceptions.Timeout:
            logging.warning(f"!! Timeout sending msteams raw webhookId:{webhook_id}")
            return None
        except Exception as e:
            logging.warning(f"!! Issue sending msteams raw webhookId:{webhook_id}")
            logging.warning(e)
            return None
        return {"data": r.text}

    @classmethod
    def send_batch(cls, tenant_id, webhook_id, attachments):
        integration = cls.get_integration(tenant_id=tenant_id, integration_id=webhook_id)
        if integration is None:
            return {"errors": ["msteams integration not found"]}
        logging.debug(f"====> sending msteams batch notification: {len(attachments)}")
        for i in range(0, len(attachments), 50):
            part = attachments[i:i + 50]
            for j in range(1, len(part), 2):
                part.insert(j, {"text": "***"})

            r = requests.post(url=integration["endpoint"],
                              json={
                                  "@type": "MessageCard",
                                  "@context": "http://schema.org/extensions",
                                  "summary": part[0]["activityTitle"],
                                  "sections": part
                              })
            if r.status_code != 200:
                logging.warning("!!!! something went wrong")
                logging.warning(r.text)

    @classmethod
    def __share(cls, tenant_id, integration_id, attachement, extra=None):
        if extra is None:
            extra = {}
        integration = cls.get_integration(tenant_id=tenant_id, integration_id=integration_id)
        if integration is None:
            return {"errors": ["Microsoft Teams integration not found"]}
        r = requests.post(
            url=integration["endpoint"],
            json={
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "sections": [attachement],
                **extra
            })

        return r.text

    @classmethod
    def share_session(cls, tenant_id, project_id, session_id, user, comment, project_name=None, integration_id=None):
        title = f"*{user}* has shared the below session!"
        link = f"{config('SITE_URL')}/{project_id}/session/{session_id}"
        args = {
            "activityTitle": title,
            "facts": [
                {
                    "name": "Session:",
                    "value": link
                }],
            "markdown": True
        }
        if project_name and len(project_name) > 0:
            args["activitySubtitle"] = f"On Project *{project_name}*"
        if comment and len(comment) > 0:
            args["facts"].append({
                "name": "Comment:",
                "value": comment
            })
        data = cls.__share(tenant_id, integration_id, attachement=args, extra={"summary": title})
        if "errors" in data:
            return data
        return {"data": data}

    @classmethod
    def share_error(cls, tenant_id, project_id, error_id, user, comment, project_name=None, integration_id=None):
        title = f"*{user}* has shared the below error!"
        link = f"{config('SITE_URL')}/{project_id}/errors/{error_id}"
        args = {
            "activityTitle": title,
            "facts": [
                {
                    "name": "Session:",
                    "value": link
                }],
            "markdown": True
        }
        if project_name and len(project_name) > 0:
            args["activitySubtitle"] = f"On Project *{project_name}*"
        if comment and len(comment) > 0:
            args["facts"].append({
                "name": "Comment:",
                "value": comment
            })
        data = cls.__share(tenant_id, integration_id, attachement=args, extra={"summary": title})
        if "errors" in data:
            return data
        return {"data": data}

    @classmethod
    def get_integration(cls, tenant_id, integration_id=None):
        if integration_id is not None:
            return webhook.get_webhook(tenant_id=tenant_id, webhook_id=integration_id,
                                       webhook_type=schemas.WebhookType.msteams)

        integrations = webhook.get_by_type(tenant_id=tenant_id, webhook_type=schemas.WebhookType.msteams)
        if integrations is None or len(integrations) == 0:
            return None
        return integrations[0]
