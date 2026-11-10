import logging

from decouple import config
from fastapi import HTTPException, status

import schemas
from chalicelib.core import webhook
from chalicelib.core.collaborations.collaboration_base import BaseCollaboration
from chalicelib.utils import ssrf
from chalicelib.utils.log import sanitize

logger = logging.getLogger(__name__)


class MSTeams(BaseCollaboration):
    @classmethod
    def add(cls, tenant_id, data: schemas.AddCollaborationSchema):
        if webhook.exists_by_name(tenant_id=tenant_id, name=data.name, exclude_id=None,
                                  webhook_type=schemas.WebhookType.MSTEAMS):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"name already exists.")
        try:
            hello = cls.say_hello(data.url)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        if hello:
            return webhook.add(tenant_id=tenant_id,
                               endpoint=data.url.unicode_string(),
                               webhook_type=schemas.WebhookType.MSTEAMS,
                               name=data.name)
        return None

    @classmethod
    def say_hello(cls, url):
        try:
            r = ssrf.post_json(
                endpoint=url,
                json_data={
                    "@type": "MessageCard",
                    "@context": "https://schema.org/extensions",
                    "summary": "Welcome to OpenReplay",
                    "title": "Welcome to OpenReplay"
                },
                timeout=3)
            if r.status_code != 200:
                logger.warning("MSTeams integration failed")
                logger.warning(sanitize(r.text))
                return False
        except ValueError:
            raise
        except Exception as e:
            logger.warning("!!! MSTeams integration failed")
            logger.exception(e)
            return False
        return True

    @classmethod
    def __share(cls, tenant_id, integration_id, attachement, extra=None):
        if extra is None:
            extra = {}
        integration = cls.get_integration(tenant_id=tenant_id, integration_id=integration_id)
        if integration is None:
            return {"errors": ["Microsoft Teams integration not found"]}
        r = ssrf.post_json(
            endpoint=integration["endpoint"],
            json_data={
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
                                       webhook_type=schemas.WebhookType.MSTEAMS)

        integrations = webhook.get_by_type(tenant_id=tenant_id, webhook_type=schemas.WebhookType.MSTEAMS)
        if integrations is None or len(integrations) == 0:
            return None
        return integrations[0]
