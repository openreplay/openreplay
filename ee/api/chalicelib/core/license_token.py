import base64
import binascii
import json
import time
from dataclasses import dataclass
from typing import Optional

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

PUBLIC_KEYS = {
    "2026-10": "03e60cef1dbb63a2ee76e8655639b3499d849dec20f5bd1b11b5de3d6a79d0dc",
}

PREFIX = "OR1"
WARN_BEFORE_DAYS = 14
MAX_CLOCK_SKEW_SECONDS = 24 * 3600
_DAY = 86400

class LicenseTokenError(ValueError):
    pass


@dataclass(frozen=True)
class License:
    kid: str
    customer: str
    seats: int
    issued_at: int
    expires_at: int
    grace_days: int = 0

    @property
    def hard_expires_at(self) -> int:
        return self.expires_at + self.grace_days * _DAY

    def days_left(self, now: Optional[int] = None) -> int:
        now = int(time.time()) if now is None else now
        return (self.expires_at - now) // _DAY


def is_token(value) -> bool:
    return isinstance(value, str) and value.startswith(PREFIX + ".")


def _b64decode(data: str) -> bytes:
    try:
        return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))
    except (binascii.Error, ValueError) as e:
        raise LicenseTokenError(f"malformed base64: {e}") from e


def _required_int(payload: dict, key: str) -> int:
    value = payload.get(key)
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise LicenseTokenError(f"missing or invalid field: {key}")
    return value


def parse(token: str, public_keys: Optional[dict] = None) -> License:
    public_keys = PUBLIC_KEYS if public_keys is None else public_keys
    if not is_token(token):
        raise LicenseTokenError("not a license token")
    parts = token.strip().split(".")
    if len(parts) != 3:
        raise LicenseTokenError("malformed token")
    payload_raw = _b64decode(parts[1])
    signature = _b64decode(parts[2])

    try:
        payload = json.loads(payload_raw)
    except ValueError as e:
        raise LicenseTokenError(f"malformed payload: {e}") from e
    if not isinstance(payload, dict):
        raise LicenseTokenError("malformed payload")

    kid = payload.get("kid")
    if not isinstance(kid, str) or kid not in public_keys:
        raise LicenseTokenError(f"unknown signing key: {kid}")
    try:
        public_key = Ed25519PublicKey.from_public_bytes(bytes.fromhex(public_keys[kid]))
        public_key.verify(signature, payload_raw)
    except InvalidSignature:
        raise LicenseTokenError("invalid signature") from None
    except ValueError as e:
        raise LicenseTokenError(f"invalid public key for {kid}: {e}") from e

    issued_at = _required_int(payload, "issued_at")
    expires_at = _required_int(payload, "expires_at")
    if expires_at <= issued_at:
        raise LicenseTokenError("expires_at must be after issued_at")
    grace_days = payload.get("grace_days", 0)
    if isinstance(grace_days, bool) or not isinstance(grace_days, int) or grace_days < 0:
        raise LicenseTokenError("missing or invalid field: grace_days")
    customer = payload.get("customer", "")
    if not isinstance(customer, str):
        raise LicenseTokenError("missing or invalid field: customer")

    return License(kid=kid, customer=customer, seats=_required_int(payload, "seats"),
                   issued_at=issued_at, expires_at=expires_at, grace_days=grace_days)


def verify(token: str, now: Optional[int] = None, public_keys: Optional[dict] = None) -> License:
    now = int(time.time()) if now is None else now
    lic = parse(token, public_keys=public_keys)
    if lic.issued_at > now + MAX_CLOCK_SKEW_SECONDS:
        raise LicenseTokenError("license issued in the future, check the system clock")
    if now > lic.hard_expires_at:
        raise LicenseTokenError(f"license expired on {_date(lic.hard_expires_at)}")
    return lic


def _date(ts: int) -> str:
    return time.strftime("%Y-%m-%d", time.gmtime(ts))
