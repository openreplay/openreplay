import time
from datetime import datetime

import requests
from jira import JIRA
from jira.exceptions import JIRAError
from requests.auth import HTTPBasicAuth
from starlette import status
from starlette.exceptions import HTTPException

fields = "id, summary, description, creator, reporter, created, assignee, status, updated, comment, issuetype, labels"


class JiraManager:
    retries = 0

    def __init__(self, url, username, password, project_id=None):
        self._config = {"JIRA_PROJECT_ID": project_id, "JIRA_URL": url, "JIRA_USERNAME": username,
                        "JIRA_PASSWORD": password}
        try:
            self._jira = JIRA(url, basic_auth=(username, password), logging=True, max_retries=0, timeout=3)
        except Exception as e:
            print("!!! JIRA AUTH ERROR")
            print(e)
            raise e

    def set_jira_project_id(self, project_id):
        self._config["JIRA_PROJECT_ID"] = project_id

    def get_projects(self):
        try:
            projects = self._jira.projects()
        except JIRAError as e:
            self.retries -= 1
            if (e.status_code // 100) == 4 and self.retries > 0:
                time.sleep(1)
                return self.get_projects()
            print(f"=>Exception {e.text}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: {e.text}")
        projects_dict_list = []
        for project in projects:
            projects_dict_list.append(self.__parser_project_info(project))

        return projects_dict_list

    def get_project(self):
        try:
            project = self._jira.project(self._config['JIRA_PROJECT_ID'])
        except JIRAError as e:
            self.retries -= 1
            if (e.status_code // 100) == 4 and self.retries > 0:
                time.sleep(1)
                return self.get_project()
            print(f"=>Exception {e.text}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: {e.text}")
        return self.__parser_project_info(project)

    def get_issues(self, sql: str, offset: int = 0):
        jql = "project = " + self._config['JIRA_PROJECT_ID'] \
              + ((" AND " + sql) if sql is not None and len(sql) > 0 else "") \
              + " ORDER BY createdDate DESC"

        try:
            issues = self._jira.search_issues(jql, maxResults=1000, startAt=offset, fields=fields)
        except JIRAError as e:
            self.retries -= 1
            if (e.status_code // 100) == 4 and self.retries > 0:
                time.sleep(1)
                return self.get_issues(sql, offset)
            print(f"=>Exception {e.text}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: {e.text}")

        issue_dict_list = []
        for issue in issues:
            # print(issue.raw)
            issue_dict_list.append(self.__parser_issue_info(issue, include_comments=False))

        # return {"total": issues.total, "issues": issue_dict_list}
        return issue_dict_list

    def get_issue(self, issue_id: str):
        try:
            # issue = self._jira.issue(issue_id)
            issue = self._jira.issue(issue_id, fields=fields)
        except JIRAError as e:
            self.retries -= 1
            if (e.status_code // 100) == 4 and self.retries > 0:
                time.sleep(1)
                return self.get_issue(issue_id)
            print(f"=>Exception {e.text}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: {e.text}")
        return self.__parser_issue_info(issue)

    def get_issue_v3(self, issue_id: str):
        try:
            url = f"{self._config['JIRA_URL']}/rest/api/3/issue/{issue_id}?fields={fields}"
            auth = HTTPBasicAuth(self._config['JIRA_USERNAME'], self._config['JIRA_PASSWORD'])
            issue = requests.get(
                url,
                headers={
                    "Accept": "application/json"
                },
                auth=auth
            )
        except Exception as e:
            self.retries -= 1
            if self.retries > 0:
                time.sleep(1)
                return self.get_issue_v3(issue_id)
            print(f"=>Exception {e}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: get issue error")
        return self.__parser_issue_info(issue.json())

    def create_issue(self, issue_dict):
        issue_dict["project"] = {"id": self._config['JIRA_PROJECT_ID']}
        try:
            issue = self._jira.create_issue(fields=issue_dict)
            return self.__parser_issue_info(issue)
        except JIRAError as e:
            self.retries -= 1
            if (e.status_code // 100) == 4 and self.retries > 0:
                time.sleep(1)
                return self.create_issue(issue_dict)
            print(f"=>Exception {e.text}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: {e.text}")

    def close_issue(self, issue):
        try:
            # jira.transition_issue(issue, '5', assignee={'name': 'pm_user'}, resolution={'id': '3'})
            self._jira.transition_issue(issue, 'Close')
        except JIRAError as e:
            self.retries -= 1
            if (e.status_code // 100) == 4 and self.retries > 0:
                time.sleep(1)
                return self.close_issue(issue)
            print(f"=>Exception {e.text}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: {e.text}")

    def assign_issue(self, issue_id, account_id) -> bool:
        try:
            return self._jira.assign_issue(issue_id, account_id)
        except JIRAError as e:
            self.retries -= 1
            if (e.status_code // 100) == 4 and self.retries > 0:
                time.sleep(1)
                return self.assign_issue(issue_id, account_id)
            print(f"=>Exception {e.text}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: {e.text}")

    def add_comment(self, issue_id: str, comment: str):
        try:
            comment = self._jira.add_comment(issue_id, comment)
        except JIRAError as e:
            self.retries -= 1
            if (e.status_code // 100) == 4 and self.retries > 0:
                time.sleep(1)
                return self.add_comment(issue_id, comment)
            print(f"=>Exception {e.text}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: {e.text}")
        return self.__parser_comment_info(comment)

    def add_comment_v3(self, issue_id: str, comment: str):
        try:
            url = f"{self._config['JIRA_URL']}/rest/api/3/issue/{issue_id}/comment"
            auth = HTTPBasicAuth(self._config['JIRA_USERNAME'], self._config['JIRA_PASSWORD'])
            comment_response = requests.post(
                url,
                headers={
                    "Accept": "application/json"
                },
                auth=auth,
                json={
                    "body": {
                        "type": "doc",
                        "version": 1,
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [
                                    {
                                        "text": comment,
                                        "type": "text"
                                    }
                                ]
                            }
                        ]
                    }
                }
            )
        except Exception as e:
            self.retries -= 1
            if self.retries > 0:
                time.sleep(1)
                return self.add_comment_v3(issue_id, comment)
            print(f"=>Exception {e}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: comment error")
        return self.__parser_comment_info(comment_response.json())

    def get_comments(self, issueKey):
        try:
            comments = self._jira.comments(issueKey)
            results = []
            for c in comments:
                results.append(self.__parser_comment_info(c.raw))
            return results
        except JIRAError as e:
            self.retries -= 1
            if (e.status_code // 100) == 4 and self.retries > 0:
                time.sleep(1)
                return self.get_comments(issueKey)
            print(f"=>Exception {e.text}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: {e.text}")

    def get_meta(self):
        meta = {}
        meta['issueTypes'] = self.get_issue_types()
        meta['users'] = self.get_assignable_users()
        return meta

    def get_assignable_users(self):
        try:
            users = self._jira.search_assignable_users_for_issues(project=self._config['JIRA_PROJECT_ID'], query="*")
        except JIRAError as e:
            self.retries -= 1
            if (e.status_code // 100) == 4 and self.retries > 0:
                time.sleep(1)
                return self.get_assignable_users()
            print(f"=>Exception {e.text}")
            if e.status_code == 401:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="JIRA: 401 Unauthorized")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: {e.text}")
        users_dict = []
        for user in users:
            users_dict.append({
                'name': user.displayName,
                'email': user.emailAddress,
                'id': user.accountId,
                'avatarUrls': user.raw["avatarUrls"]
            })

        return users_dict

    def get_issue_types(self):
        try:
            types = self._jira.issue_types()
        except JIRAError as e:
            self.retries -= 1
            if (e.status_code // 100) == 4 and self.retries > 0:
                time.sleep(1)
                return self.get_issue_types()
            print(f"=>Exception {e.text}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"JIRA: {e.text}")
        types_dict = []
        for type in types:
            if not type.subtask and not type.name.lower() == "epic":
                types_dict.append({
                    'id': type.id,
                    'name': type.name,
                    'iconUrl': type.iconUrl,
                    'description': type.description
                })
        return types_dict

    def __parser_comment_info(self, comment):
        if not isinstance(comment, dict):
            comment = comment.raw

        pattern = '%Y-%m-%dT%H:%M:%S.%f%z'
        creation = datetime.strptime(comment['created'], pattern)
        # update = datetime.strptime(comment['updated'], pattern)

        return {
            'id': comment['id'],
            'author': comment['author']['accountId'],
            'message': comment['body'],
            # 'created': comment['created'],
            'createdAt': int((creation - creation.utcoffset()).timestamp() * 1000),
            # 'updated': comment['updated'],
            # 'updatedAt': int((update - update.utcoffset()).timestamp() * 1000)
        }

    @staticmethod
    def __get_closed_status(status):
        return status.lower() == "done" or status.lower() == "close" or status.lower() == "closed" or status.lower() == "finish" or status.lower() == "finished"

    def __parser_issue_info(self, issue, include_comments=True):
        results_dict = {}
        if not isinstance(issue, dict):
            raw_info = issue.raw
        else:
            raw_info = issue

        fields = raw_info['fields']
        results_dict["id"] = raw_info["id"]
        results_dict["key"] = raw_info["key"]
        # results_dict["ticketNumber"] = raw_info["key"]
        results_dict["title"] = fields["summary"]
        results_dict["description"] = fields["description"]
        results_dict["issueType"] = [fields["issuetype"]["id"]]

        # results_dict["assignee"] = None
        # results_dict["reporter"] = None

        if isinstance(fields["assignee"], dict):
            results_dict["assignees"] = [fields["assignee"]["accountId"]]
        # if isinstance(fields["reporter"], dict):
        #     results_dict["reporter"] = fields["reporter"]["accountId"]
        if isinstance(fields["creator"], dict):
            results_dict["creator"] = fields["creator"]["accountId"]

        if "comment" in fields:
            if include_comments:
                comments_dict = []
                for comment in fields["comment"]["comments"]:
                    comments_dict.append(self.__parser_comment_info(comment))

                results_dict['comments'] = comments_dict
            results_dict['commentsCount'] = fields["comment"]["total"]

        results_dict["status"] = fields["status"]['name']
        results_dict["createdAt"] = fields["created"]
        # results_dict["updated"] = fields["updated"]
        results_dict["labels"] = fields["labels"]
        results_dict["closed"] = self.__get_closed_status(fields["status"]['name'])

        return results_dict

    @staticmethod
    def __parser_project_info(project):
        results_dict = {}
        raw_info = project.raw
        results_dict["id"] = raw_info["id"]
        results_dict["name"] = raw_info["name"]
        results_dict["avatarUrls"] = raw_info["avatarUrls"]
        results_dict["description"] = raw_info["description"] if "description" in raw_info else ""

        return results_dict
