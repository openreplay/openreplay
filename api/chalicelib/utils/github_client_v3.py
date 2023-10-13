import logging
from datetime import datetime

import requests
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class github_formatters:

    @staticmethod
    def get_timestamp(ts):
        ts = ts[:-1]
        pattern = '%Y-%m-%dT%H:%M:%S'
        creation = datetime.strptime(ts, pattern)
        return int(creation.timestamp() * 1000)

    @staticmethod
    def label(label):
        return {
            'id': label["id"],
            'name': label["name"],
            'description': label["description"],
            'color': label["color"]
        }

    @staticmethod
    def comment(comment):
        return {
            'id': str(comment["id"]),
            'message': comment["body"],
            'author': str(github_formatters.user(comment["user"])["id"]),
            'createdAt': github_formatters.get_timestamp(comment["created_at"])
        }

    @staticmethod
    def issue(issue):
        labels = [github_formatters.label(l) for l in issue["labels"]]
        result = {
            'id': str(issue["number"]),
            'creator': str(github_formatters.user(issue["user"])["id"]),
            'assignees': [str(github_formatters.user(a)["id"]) for a in issue["assignees"]],
            'title': issue["title"],
            'description': issue["body"],
            'status': issue["state"],
            'createdAt': github_formatters.get_timestamp(issue["created_at"]),
            'closed': issue["closed_at"] is not None,
            'commentsCount': issue["comments"],
            'issueType': [str(l["id"]) for l in labels if l["name"].lower() != "openreplay"],
            'labels': [l["name"] for l in labels]
        }
        return result

    @staticmethod
    def user(user):
        if not user:
            return None
        result = {
            'id': user["id"],
            'name': user["login"],
            'avatarUrls': {'24x24': user["avatar_url"]},
            'email': ""
        }
        return result

    @staticmethod
    def team_to_dict(team):
        if not team:
            return None

        result = {'id': team.id, 'name': team.name, 'members_count': team.members_count}
        return result

    @staticmethod
    def repo(repo):
        if not repo:
            return None
        return {
            "id": str(repo["id"]),
            "name": repo["name"],
            "description": repo["description"],
            "creator": str(repo["owner"]["id"])
        }

    @staticmethod
    def organization(org):
        if not org:
            return None
        return {
            "id": org["id"],
            "name": org["login"],
            "description": org["description"],
            "avatarUrls": {'24x42': org["avatar_url"]}
        }


def get_response_links(response):
    links = {}
    if "Link" in response.headers:
        link_headers = response.headers["Link"].split(", ")
        for link_header in link_headers:
            (url, rel) = link_header.split("; ")
            url = url[1:-1]
            rel = rel[5:-1]
            links[rel] = url
    return links


class githubV3Request:
    __base = "https://api.github.com"

    def __init__(self, token):
        self.__token = token

    def __get_request_header(self):
        return {"Accept": "application/vnd.github.v3+json", 'Authorization': f'token {self.__token}'}

    def get(self, url, params={}):
        results = []
        params = {"per_page": 100, **params}
        pages = {"next": f"{self.__base}{url}", "last": ""}
        while len(pages.keys()) > 0 and pages["next"] != pages["last"]:
            response = requests.get(pages["next"], headers=self.__get_request_header(), params=params)
            pages = get_response_links(response)
            result = response.json()
            if response.status_code != 200:
                logger.warning(f"=>GITHUB Exception")
                logger.error(result)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"GITHUB: {result['message']}")
            if isinstance(result, dict):
                return result
            results += result
        return results

    def post(self, url, body):
        response = requests.post(f"{self.__base}{url}", headers=self.__get_request_header(), json=body)
        return response.json()
