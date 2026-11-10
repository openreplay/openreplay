from abc import ABC, abstractmethod

import schemas


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
    def __share(cls, tenant_id, integration_id, attachments, extra=None):
        pass

    @classmethod
    @abstractmethod
    def share_session(cls, tenant_id, project_id, session_id, user, comment, project_name=None, integration_id=None):
        pass

    @classmethod
    @abstractmethod
    def share_error(cls, tenant_id, project_id, error_id, user, comment, project_name=None, integration_id=None):
        pass

    @classmethod
    @abstractmethod
    def get_integration(cls, tenant_id, integration_id=None):
        pass
