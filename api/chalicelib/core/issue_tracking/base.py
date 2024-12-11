from abc import ABC, abstractmethod

from chalicelib.utils import pg_client, helper


class BaseIntegration(ABC):

    def __init__(self, user_id, ISSUE_CLASS):
        self._user_id = user_id
        self._issue_handler = ISSUE_CLASS(self.integration_token)

    @property
    @abstractmethod
    def provider(self):
        pass

    @property
    @abstractmethod
    def issue_handler(self):
        pass

    @property
    def integration_token(self):
        integration = self.get()
        if integration is None:
            print("no token configured yet")
            return None
        return integration["token"]

    def get(self):
        with pg_client.PostgresClient() as cur:
            cur.execute(
                cur.mogrify(
                    """SELECT *
                        FROM public.oauth_authentication 
                        WHERE user_id=%(user_id)s AND provider=%(provider)s;""",
                    {"user_id": self._user_id, "provider": self.provider.lower()})
            )
            return helper.dict_to_camel_case(cur.fetchone())

    @abstractmethod
    def get_obfuscated(self):
        pass

    @abstractmethod
    def update(self, changes, obfuscate=False):
        pass

    @abstractmethod
    def _add(self, data):
        pass

    @abstractmethod
    def delete(self):
        pass

    @abstractmethod
    def add_edit(self, data):
        pass
