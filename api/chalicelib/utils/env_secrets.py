"""
Startup verification of secret env vars (keys, passwords, passphrases, tokens).

Called once from the app lifespan. The rest of the code keeps reading values with decouple.config().
- REQUIRED secrets must be present, non-empty and at least MIN_LENGTHS[name] characters long.
- OPTIONAL secrets are only checked when set (non-empty): they must then reach the minimum length.
"""
import logging

from decouple import config

logger = logging.getLogger(__name__)

# Minimum lengths; the helm chart and docker-compose installers generate 20-char values
# (`randAlphaNum 20` / `openssl rand -hex 10`).
MIN_LENGTHS = {
    # HMAC signing secrets
    "JWT_SECRET": 20,
    "JWT_REFRESH_SECRET": 20,
    "JWT_SPOT_SECRET": 20,
    "JWT_SPOT_REFRESH_SECRET": 20,
    "JWT_MCP_SECRET": 20,
    "ASSIST_JWT_SECRET": 20,
    "SCIM_ACCESS_SECRET_KEY": 20,
    "SCIM_REFRESH_SECRET_KEY": 20,
    # shared service keys
    "ASSIST_KEY": 20,
    "assist_secret": 16,
    "captcha_key": 16,
    "LICENSE_KEY": 16,
    # databases
    "pg_password": 8,
    "ch_password": 8,
    "CLICKHOUSE_PASSWORD": 8,
    # object storage
    "S3_KEY": 8,
    "S3_SECRET": 16,
    "AZURE_ACCOUNT_KEY": 32,
    # misc
    "EMAIL_PASSWORD": 8,
    "sp_key": 64,  # SAML SP private key (PEM)
}

# Read without a default somewhere in the code: must be set.
REQUIRED = (
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "JWT_SPOT_SECRET",
    "JWT_SPOT_REFRESH_SECRET",
    "JWT_MCP_SECRET",
    "ASSIST_JWT_SECRET",
    "ASSIST_KEY",
    "pg_password",
)

# Feature is disabled when unset/empty: only checked when a value is provided.
OPTIONAL = tuple(name for name in MIN_LENGTHS if name not in REQUIRED)


class SecretError(ValueError):
    pass


def _check(name: str, required: bool) -> str | None:
    min_length = MIN_LENGTHS[name]
    value = config(name, default=None)
    if value is None or len(value) == 0:
        if required:
            return f"env var {name} is required and must be at least {min_length} characters long"
        return None
    if len(value) < min_length:
        return f"env var {name} is too short: {len(value)} characters, minimum is {min_length}"
    return None


def check() -> None:
    """Fail fast at startup if a required secret is missing/too short or a set optional secret is too short."""
    errors = [e for e in (_check(n, required=True) for n in REQUIRED) if e]
    errors += [e for e in (_check(n, required=False) for n in OPTIONAL) if e]
    if errors:
        for e in errors:
            logger.critical(e)
        raise SecretError("invalid secret configuration: " + "; ".join(errors))
    logger.info("secret env vars verified")
