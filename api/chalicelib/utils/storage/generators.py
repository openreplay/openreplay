import hashlib
from urllib.parse import urlparse


def generate_file_key(project_id, key):
    return f"{project_id}/{hashlib.md5(key.encode()).hexdigest()}"


def generate_file_key_from_url(project_id, url):
    u = urlparse(url)
    new_url = u.scheme + "://" + u.netloc + u.path
    return generate_file_key(project_id=project_id, key=new_url)
