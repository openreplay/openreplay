"""
Secret env vars (keys, passwords, passphrases, tokens) must be read through this module
instead of calling decouple.config() directly, so every secret gets a minimum-length check.

- Required secrets (no `default`): missing, empty or too short -> SecretError.
- Optional secrets (`default` given): missing/empty -> `default` is returned (feature disabled);
  set but too short -> SecretError.
"""
import logging

from decouple import config, UndefinedValueError

logger = logging.getLogger(__name__)

# Minimum lengths; the helm chart and docker-compose installers generate 20-char values
# (`randAlphaNum 20` / `openssl rand -hex 10`).
MIN_LENGTHS = {
    # HMAC signing secrets
    "JWT_SECRET": 30,
    "JWT_REFRESH_SECRET": 30,
    "JWT_SPOT_SECRET": 30,
    "JWT_SPOT_REFRESH_SECRET": 30,
    "JWT_MCP_SECRET": 30,
    "ASSIST_JWT_SECRET": 30,
    "SCIM_ACCESS_SECRET_KEY": 30,
    "SCIM_REFRESH_SECRET_KEY": 30,
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

# Secrets every API instance needs; validated at startup so a weak value fails fast
# instead of on the first login.
REQUIRED_AT_STARTUP = (
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "JWT_SPOT_SECRET",
    "JWT_SPOT_REFRESH_SECRET",
    "JWT_MCP_SECRET",
)

_REQUIRED = object()


class SecretError(ValueError):
    pass


def get(name: str, default=_REQUIRED) -> str | None:
    """Read secret env var `name` and enforce its minimum length (see MIN_LENGTHS)."""
    min_length = MIN_LENGTHS[name]
    try:
        value = config(name)
    except UndefinedValueError:
        value = None
    if value is None or len(value) == 0:
        if default is _REQUIRED:
            raise SecretError(f"env var {name} is required and must be at least {min_length} characters long")
        return default
    if not isinstance(value, str):
        value = str(value)
    if len(value) < min_length:
        raise SecretError(f"env var {name} is too short: {len(value)} characters, minimum is {min_length}")
    return value


def is_set(name: str) -> bool:
    """True if the optional secret is configured (non-empty and long enough)."""
    return get(name, default=None) is not None


def check_required() -> None:
    """Fail fast at startup if any always-required secret is missing or too short."""
    errors = []
    for name in REQUIRED_AT_STARTUP:
        try:
            get(name)
        except SecretError as e:
            errors.append(str(e))
    if errors:
        for e in errors:
            logger.critical(e)
        raise SecretError("invalid secret configuration: " + "; ".join(errors))
