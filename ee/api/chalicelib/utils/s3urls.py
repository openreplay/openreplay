import re
from urllib.parse import urlparse


def style(url):
    """ Determine 'style' of a given S3 url

    >>> style("s3://my-bucket/my-key/")
    's3'

    >>> style("s3://user@my-bucket/my-key/")
    's3-credential'

    >>> style("https://my-bucket.s3.amazonaws.com/my-key/")
    'bucket-in-netloc'

    >>> style("https://s3.amazonaws.com/my-bucket/my-key/")
    'bucket-in-path'
    """
    o = urlparse(url)
    if o.scheme == 's3':
        if '@' in o.netloc:
            return 's3-credential'
        else:
            return 's3'

    if re.search(r'^s3[.-](\w{2}-\w{4,9}-\d\.)?amazonaws\.com', o.netloc):
        return 'bucket-in-path'

    if re.search(r'\.s3[.-](\w{2}-\w{4,9}-\d\.)?amazonaws\.com', o.netloc):
        return 'bucket-in-netloc'

    raise ValueError(f'Unknown url style: {url}')


def build_url(url_type, bucket, key=None, region=None, credential_name=None):
    """ Construct an S3 URL

    Args:
        url_type: one of 's3', 's3-credential', 'bucket-in-path', 'bucket-in-netloc'
        bucket: S3 bucket name
        key: Key within bucket (optional)
        region: S3 region name (optional)
        credential_name: user/credential name to use in S3 scheme url (optional)

    Returns
        (string) S3 URL
    """
    if url_type == 's3':
        credential = f'{credential_name}@' if credential_name else ""
        return f's3://{credential}{bucket}/{key or ""}'

    if url_type == 'bucket-in-path':
        return f'https://s3{"-" if region else ""}{region or ""}.amazonaws.com/{bucket}/{key}'

    if url_type == 'bucket-in-netloc':
        return f'https://{bucket}.s3.amazonaws.com/{key}'

    raise ValueError(f'Invalid url_type: {url_type}')


def parse_s3_credential_url(url):
    """ Parse S3 scheme url containing a user/credential name

    >>> parse_s3_url("s3://user@my-bucket/my-key")
    {'bucket': 'my-bucket', 'key': 'my-key/', 'credential_name': 'user'}
    """
    o = urlparse(url)
    cred_name, bucket = o.netloc.split('@')
    key = o.path if o.path[0] != '/' else o.path[1:]
    return {'bucket': bucket, 'key': key, 'credential_name': cred_name}


def parse_s3_url(url):
    """ Parse S3 scheme url

    >>> parse_s3_url("s3://my-bucket/my-key")
    {'bucket': 'my-bucket', 'key': 'my-key/'}
    """
    o = urlparse(url)
    bucket = o.netloc
    key = o.path if o.path[0] != '/' else o.path[1:]
    return {'bucket': bucket, 'key': key}


def parse_bucket_in_path_url(url):
    """ Parse url with bucket name path

    >>> parse_bucket_in_path_url("https://s3-eu-west-1.amazonaws.com/my-bucket/my-key/")
    {'bucket': 'my-bucket', 'key': 'my-key/'}
    """
    path = urlparse(url).path
    bucket = path.split('/')[1]
    key = '/'.join(path.split('/')[2:])
    return {'bucket': bucket, 'key': key}


def parse_bucket_in_netloc_url(url):
    """ Parse url with bucket name in host/netloc

    >>> parse_bucket_in_netloc_url("https://my-bucket.s3.amazonaws.com/my-key/")
    {'bucket': 'my-bucket', 'key': 'my-key/'}
    """
    o = urlparse(url)
    bucket = o.netloc.split('.')[0]
    key = o.path if o.path[0] != '/' else o.path[1:]
    return {'bucket': bucket, 'key': key}


def parse_url(url):
    url_style = style(url)

    if url_style == 's3-credential':
        return parse_s3_credential_url(url)
    if url_style == 's3':
        return parse_s3_url(url)
    if url_style == 'bucket-in-path':
        return parse_bucket_in_path_url(url)
    if url_style == 'bucket-in-netloc':
        return parse_bucket_in_netloc_url(url)
