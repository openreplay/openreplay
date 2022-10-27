from abc import ABC, abstractmethod
import requests
from decouple import config
from datetime import datetime

import schemas
from chalicelib.core import webhook


class BaseCollaboration(ABC):
    @classmethod
    @abstractmethod
    def add(cls, tenant_id, data: schemas.AddCollaborationSchema):
        pass

    @classmethod
    @abstractmethod
    def say_hello(cls, url):
        pass

    @classmethod
    @abstractmethod
    def send_raw(cls, tenant_id, webhook_id, body):
        pass

    @classmethod
    @abstractmethod
    def send_batch(cls, tenant_id, webhook_id, attachments):
        pass

    @classmethod
    @abstractmethod
    def __share(cls, tenant_id, integration_id, fallback, pretext, title, title_link, text):
        pass

    @classmethod
    @abstractmethod
    def share_session(cls, tenant_id, project_id, session_id, user, comment, integration_id=None):
        pass

    @classmethod
    @abstractmethod
    def share_error(cls, tenant_id, project_id, error_id, user, comment, integration_id=None):
        pass

    @classmethod
    @abstractmethod
    def __get(cls, tenant_id, integration_id=None):
        pass
