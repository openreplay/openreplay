from chalicelib.core import unlock

EDITION = 'ee'


def get_status(tenant_id):
    license = unlock.get_license()
    return {
        "hasActivePlan": unlock.is_valid(),
        "edition": EDITION,
        "expirationDate": unlock.get_expiration_date()
    }
