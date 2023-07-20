import schemas
from chalicelib.core import integration_base
from chalicelib.core.integration_github_issue import GithubIntegrationIssue
from chalicelib.utils import pg_client, helper

PROVIDER = schemas.IntegrationType.github


class GitHubIntegration(integration_base.BaseIntegration):

    def __init__(self, tenant_id, user_id):
        self.__tenant_id = tenant_id
        super(GitHubIntegration, self).__init__(user_id=user_id, ISSUE_CLASS=GithubIntegrationIssue)

    @property
    def provider(self):
        return PROVIDER

    @property
    def issue_handler(self):
        return self._issue_handler

    def get_obfuscated(self):
        integration = self.get()
        if integration is None:
            return None
        return {"token": helper.obfuscate(text=integration["token"]), "provider": self.provider.lower()}

    def update(self, changes, obfuscate=False):
        with pg_client.PostgresClient() as cur:
            sub_query = [f"{helper.key_to_snake_case(k)} = %({k})s" for k in changes.keys()]
            cur.execute(
                cur.mogrify(f"""\
                        UPDATE public.oauth_authentication
                        SET {','.join(sub_query)}
                        WHERE user_id=%(user_id)s
                        RETURNING token;""",
                            {"user_id": self._user_id,
                             **changes})
            )
            w = helper.dict_to_camel_case(cur.fetchone())
            if w and w.get("token") and obfuscate:
                w["token"] = helper.obfuscate(w["token"])
            return w

    def _add(self, data):
        pass

    def add(self, token, obfuscate=False):
        with pg_client.PostgresClient() as cur:
            cur.execute(
                cur.mogrify("""\
                        INSERT INTO public.oauth_authentication(user_id, provider, provider_user_id, token)
                        VALUES(%(user_id)s, 'github', '', %(token)s)
                        RETURNING token;""",
                            {"user_id": self._user_id,
                             "token": token})
            )
            w = helper.dict_to_camel_case(cur.fetchone())
            if w and w.get("token") and obfuscate:
                w["token"] = helper.obfuscate(w["token"])
            return w

    # TODO: make a revoke token call
    def delete(self):
        with pg_client.PostgresClient() as cur:
            cur.execute(
                cur.mogrify("""\
                        DELETE FROM public.oauth_authentication
                        WHERE user_id=%(user_id)s AND provider=%(provider)s;""",
                            {"user_id": self._user_id, "provider": self.provider.lower()})
            )
            return {"state": "success"}

    def add_edit(self, data: schemas.IssueTrackingGithubSchema):
        s = self.get()
        if s is not None:
            return self.update(
                changes={
                    "token": data.token if len(data.token) > 0 and data.token.find("***") == -1 \
                        else s.token
                },
                obfuscate=True
            )
        else:
            return self.add(token=data.token, obfuscate=True)
