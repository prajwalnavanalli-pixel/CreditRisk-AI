"""Authentication, password hashing, JWT tokens, and RBAC dependencies."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer


JWT_SECRET = os.getenv("JWT_SECRET", "")
if len(JWT_SECRET.encode("utf-8")) < 32:
    raise RuntimeError(
        "JWT_SECRET must be configured with at least 32 bytes."
    )
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
API_KEY = os.getenv("CREDITRISK_API_KEY", "")
AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "true").lower() != "false"

bearer_scheme = HTTPBearer(auto_error=False)
api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + padding)


def hash_password(password: str) -> str:
    """Hash a password with a per-user random salt using PBKDF2-HMAC-SHA256."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a plaintext password against a stored PBKDF2 hash."""
    try:
        salt_hex, digest_hex = stored_hash.split("$", 1)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
    except ValueError:
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return hmac.compare_digest(actual, expected)


def create_access_token(payload: dict[str, Any], expires_hours: int | None = None) -> str:
    """Create a signed HS256 JWT token."""
    ttl_hours = expires_hours if expires_hours is not None else JWT_EXPIRE_HOURS
    now = int(time.time())
    claims = {
        **payload,
        "iat": now,
        "exp": now + (ttl_hours * 3600),
    }
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(claims, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = hmac.new(
        JWT_SECRET.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    return f"{header_b64}.{payload_b64}.{_b64url_encode(signature)}"


def decode_access_token(token: str) -> dict[str, Any]:
    """Verify HS256 signature and expiration, returning token claims."""
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(
            JWT_SECRET.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()
        provided_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, provided_sig):
            raise ValueError("Invalid token signature")

        claims = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if int(claims.get("exp", 0)) < int(time.time()):
            raise ValueError("Token has expired")
        return claims
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    api_key: str | None = Security(api_key_scheme),
) -> dict[str, Any]:
    """Authenticate incoming API requests via Bearer JWT or optional X-API-Key."""
    if API_KEY and api_key and hmac.compare_digest(api_key, API_KEY):
        return {
            "username": "service-api-key",
            "email": "service@creditrisk.ai",
            "full_name": "API Integration Client",
            "role": "admin",
        }

    if credentials and credentials.scheme.lower() == "bearer":
        return decode_access_token(credentials.credentials)

    if not AUTH_REQUIRED:
        return {
            "username": "analyst",
            "email": "analyst@creditrisk.ai",
            "full_name": "Senior Risk Analyst",
            "role": "analyst",
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Sign in or provide a Bearer token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_admin(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Restrict sensitive operations to admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required for this operation.",
        )
    return current_user
