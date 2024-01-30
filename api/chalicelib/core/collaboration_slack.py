from datetime import datetime

from decouple import config
from fastapi import HTTPException, status

import httpx
import schemas
from chalicelib.core import webhook
from chalicelib.core.collaboration_base import BaseCollaboration


class Slack(BaseCollaboration):
    @classmethod
    async def add(cls, tenant_id, data: schemas.AddCollaborationSchema):
        if webhook.exists_by_name(tenant_id=tenant_id, name=data.name, exclude_id=None,
                                  webhook_type=schemas.WebhookType.slack):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"name already exists.")
        if cls.say_hello(data.url):
            return webhook.add(tenant_id=tenant_id,
                               endpoint=data.url.unicode_string(),
                               webhook_type=schemas.WebhookType.slack,
                               name=data.name)
        return None

    @classmethod
    async def say_hello(cls, url):
        async with httpx.AsyncClient() as client:
            r = await client.post(
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
    async def send_raw(cls, tenant_id, webhook_id, body):
        integration = await cls.get_integration(tenant_id=tenant_id, integration_id=webhook_id)
        if integration is None:
            return {"errors": ["slack integration not found"]}
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                url=integration["endpoint"],
                json=body,
                timeout=5)
            if r.status_code != 200:
                print(f"!! issue sending slack raw; webhookId:{webhook_id} code:{r.status_code}")
                print(r.text)
                return None
        except Exception as e:
            print(f"!! Issue sending slack raw webhookId:{webhook_id}")
            print(str(e))
            return None
        return {"data": r.text}

    @classmethod
    async def send_batch(cls, tenant_id, webhook_id, attachments):
        integration = await cls.get_integration(tenant_id=tenant_id, integration_id=webhook_id)
        if integration is None:
            return {"errors": ["slack integration not found"]}
        print(f"====> sending slack batch notification: {len(attachments)}")
        for i in range(0, len(attachments), 100):
            async with httpx.AsyncClient() as client:
                r = await client.post(
                url=integration["endpoint"],
                json={"attachments": attachments[i:i + 100]})
            if r.status_code != 200:
                print("!!!! something went wrong while sending to:")
                print(integration)
                print(r)
                print(r.text)

    @classmethod
    async def __share(cls, tenant_id, integration_id, attachement, extra=None):
        if extra is None:
            extra = {}
        integration = await cls.get_integration(tenant_id=tenant_id, integration_id=integration_id)
        if integration is None:
            return {"errors": ["slack integration not found"]}
        attachement["ts"] = datetime.now().timestamp()
        async with httpx.AsyncClient() as client:
            r = await client.post(url=integration["endpoint"], json={"attachments": [attachement], **extra})
        return r.text

    @classmethod
    async def share_session(cls, tenant_id, project_id, session_id, user, comment, project_name=None, integration_id=None):
        args = {"fallback": f"{user} has shared the below session!",
                "pretext": f"{user} has shared the below session!",
                "title": f"{config('SITE_URL')}/{project_id}/session/{session_id}",
                "title_link": f"{config('SITE_URL')}/{project_id}/session/{session_id}",
                "text": comment}
        data = await cls.__share(tenant_id, integration_id, attachement=args)
        if "errors" in data:
            return data
        return {"data": data}

    @classmethod
    async def share_error(cls, tenant_id, project_id, error_id, user, comment, project_name=None, integration_id=None):
        args = {"fallback": f"{user} has shared the below error!",
                "pretext": f"{user} has shared the below error!",
                "title": f"{config('SITE_URL')}/{project_id}/errors/{error_id}",
                "title_link": f"{config('SITE_URL')}/{project_id}/errors/{error_id}",
                "text": comment}
        data = await cls.__share(tenant_id, integration_id, attachement=args)
        if "errors" in data:
            return data
        return {"data": data}

    @classmethod
    async def get_integration(cls, tenant_id, integration_id=None):
        if integration_id is not None:
            return webhook.get_webhook(tenant_id=tenant_id, webhook_id=integration_id,
                                       webhook_type=schemas.WebhookType.slack)

        integrations = await webhook.get_by_type(tenant_id=tenant_id, webhook_type=schemas.WebhookType.slack)
        if integrations is None or len(integrations) == 0:
            return None
        return integrations[0]
