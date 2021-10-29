from chalicelib.utils import s3, s3urls


def sign_urls(urls):
    result = []
    for u in urls:
        e = s3urls.parse_url(u)
        result.append(s3.get_presigned_url_for_sharing(bucket=e["bucket"],
                                                       key=e["key"],
                                                       expires_in=10 * 60))
    return result
