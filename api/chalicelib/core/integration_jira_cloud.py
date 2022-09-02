import schemas
from chalicelib.core import integration_base
from chalicelib.core.integration_jira_cloud_issue import JIRACloudIntegrationIssue
from chalicelib.utils import pg_client, helper

PROVIDER = schemas.IntegrationType.jira


def obfuscate_string(string):
    return "*" * (len(string) - 4) + string[-4:]


class JIRAIntegration(integration_base.BaseIntegration):
    def __init__(self, tenant_id, user_id):
        self.__tenant_id = tenant_id
        # TODO: enable super-constructor when OAuth is done
        # super(JIRAIntegration, self).__init__(jwt, user_id, JIRACloudIntegrationProxy)
        self._issue_handler = None
        self._user_id = user_id
        self.integration = self.get()

        if self.integration is None:
            return
        self.integration["valid"] = True
        if not self.integration["url"].endswith('atlassian.net'):
            self.integration["valid"] = False

    @property
    def provider(self):
        return PROVIDER

    @property
    def issue_handler(self):
        if self.integration["url"].endswith('atlassian.net') and self._issue_handler is None:
            try:
                self._issue_handler = JIRACloudIntegrationIssue(token=self.integration["token"],
                                                                username=self.integration["username"],
                                                                url=self.integration["url"])
            except Exception as e:
                self._issue_handler = None
                self.integration["valid"] = False
        return self._issue_handler

    # TODO: remove this once jira-oauth is done
    def get(self):
        with pg_client.PostgresClient() as cur:
            cur.execute(
                cur.mogrify(
                    """SELECT username, token, url
                        FROM public.jira_cloud 
                        WHERE user_id=%(user_id)s;""",
                    {"user_id": self._user_id})
            )
            data = helper.dict_to_camel_case(cur.fetchone())

        if data is None:
            return
        data["valid"] = True
        if not data["url"].endswith('atlassian.net'):
            data["valid"] = False
        return data

    def get_obfuscated(self):
        if self.integration is None:
            return None
        integration = dict(self.integration)
        integration["token"] = obfuscate_string(self.integration["token"])
        integration["provider"] = self.provider.lower()
        return integration

    def update(self, changes, obfuscate=False):
        with pg_client.PostgresClient() as cur:
            sub_query = [f"{helper.key_to_snake_case(k)} = %({k})s" for k in changes.keys()]
            cur.execute(
                cur.mogrify(f"""\
                        UPDATE public.jira_cloud
                        SET {','.join(sub_query)}
                        WHERE user_id=%(user_id)s
                        RETURNING username, token, url;""",
                            {"user_id": self._user_id,
                             **changes})
            )
            w = helper.dict_to_camel_case(cur.fetchone())
            if obfuscate:
                w["token"] = obfuscate_string(w["token"])
        return self.get()

    # TODO: make this generic for all issue tracking integrations
    def _add(self, data):
        print("a pretty defined abstract method")
        return

    def add(self, username, token, url):
        with pg_client.PostgresClient() as cur:
            cur.execute(
                cur.mogrify("""\
                        INSERT INTO public.jira_cloud(username, token, user_id,url)
                        VALUES (%(username)s, %(token)s, %(user_id)s,%(url)s)
                        RETURNING  username, token, url;""",
                            {"user_id": self._user_id, "username": username,
                             "token": token, "url": url})
            )
            w = helper.dict_to_camel_case(cur.fetchone())
        return self.get()

    def delete(self):
        with pg_client.PostgresClient() as cur:
            cur.execute(
                cur.mogrify("""\
                        DELETE FROM public.jira_cloud
                        WHERE user_id=%(user_id)s;""",
                            {"user_id": self._user_id})
            )
            return {"state": "success"}

    def add_edit(self, data):
        if self.integration is not None:
            return self.update(
                changes={
                    "username": data["username"],
                    "token": data["token"] \
                        if data.get("token") and len(data["token"]) > 0 and data["token"].find("***") == -1 \
                        else self.integration["token"],
                    "url": data["url"]
                },
                obfuscate=True
            )
        else:
            return self.add(
                username=data["username"],
                token=data["token"],
                url=data["url"]
            )
