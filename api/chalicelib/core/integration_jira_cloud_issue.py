from chalicelib.utils import jira_client
from chalicelib.core.integration_base_issue import BaseIntegrationIssue


class JIRACloudIntegrationIssue(BaseIntegrationIssue):
    def __init__(self, token, username, url):
        self.username = username
        self.url = url
        self._client = jira_client.JiraManager(self.url, self.username, token, None)
        super(JIRACloudIntegrationIssue, self).__init__("JIRA", token)

    async def create_new_assignment(self, integration_project_id, title, description, assignee, issue_type):
        await self._client.set_jira_project_id(integration_project_id)
        data = {
            'summary': title,
            'description': description,
            'issuetype': {'id': issue_type},
            'assignee': {"id": assignee},
            "labels": ["OpenReplay"]
        }
        return self._client.create_issue(data)

    async def get_by_ids(self, saved_issues):
        projects_map = {}
        for i in saved_issues:
            if i["integrationProjectId"] not in projects_map.keys():
                projects_map[i["integrationProjectId"]] = []
            projects_map[i["integrationProjectId"]].append(i["id"])

        results = []
        for integration_project_id in projects_map:
            await self._client.set_jira_project_id(integration_project_id)
            jql = 'labels = OpenReplay'
            if len(projects_map[integration_project_id]) > 0:
                jql += f" AND ID IN ({','.join(projects_map[integration_project_id])})"
            issues = await self._client.get_issues(jql, offset=0)
            results += issues
        return {"issues": results}

    async def get(self, integration_project_id, assignment_id):
        await self._client.set_jira_project_id(integration_project_id)
        return await self._client.get_issue_v3(assignment_id)

    async def comment(self, integration_project_id, assignment_id, comment):
        await self._client.set_jira_project_id(integration_project_id)
        return await self._client.add_comment_v3(assignment_id, comment)

    async def get_metas(self, integration_project_id):
        meta = {}
        await self._client.set_jira_project_id(integration_project_id)
        meta['issueTypes'] = await self._client.get_issue_types()
        meta['users'] = await self._client.get_assignable_users()
        return {"provider": self.provider.lower(), **meta}

    async def get_projects(self):
        return await self._client.get_projects()
