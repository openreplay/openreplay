EDITION = 'foss'


def get_status(tenant_id=None):
    return {
        "hasActivePlan": True,
        "edition": EDITION,
        "expirationDate": -1
    }
