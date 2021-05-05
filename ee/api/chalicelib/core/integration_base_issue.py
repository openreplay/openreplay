from abc import ABC, abstractmethod


class RequestException(Exception):
    pass


def proxy_issues_handler(e):
    print("=======__proxy_issues_handler=======")
    print(str(e))
    return {"errors": [str(e)]}


class BaseIntegrationIssue(ABC):
    def __init__(self, provider, integration_token):
        self.provider = provider
        self.integration_token = integration_token

    @abstractmethod
    def create_new_assignment(self, integration_project_id, title, description, assignee, issue_type):
        pass

    @abstractmethod
    def get_by_ids(self, saved_issues):
        pass

    @abstractmethod
    def get(self, integration_project_id, assignment_id):
        pass

    @abstractmethod
    def comment(self, integration_project_id, assignment_id, comment):
        pass

    @abstractmethod
    def get_metas(self, integration_project_id):
        pass

    @abstractmethod
    def get_projects(self):
        pass
