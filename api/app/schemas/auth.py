from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    identifier: str = Field(
        min_length=3,
        max_length=100,
        description="Username or email address",
    )
    password: str = Field(min_length=6, max_length=128)


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    username: str = Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: str = Field(min_length=5, max_length=120, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    full_name: str = Field(min_length=2, max_length=80)
    organization: str = Field(default="CreditRisk AI Underwriting", max_length=100)
    password: str = Field(min_length=6, max_length=128)


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    full_name: str | None = Field(default=None, min_length=2, max_length=80)
    organization: str | None = Field(default=None, min_length=2, max_length=100)
    theme_preference: Literal["dark", "light"] | None = None
    notifications_enabled: bool | None = None
    high_risk_alert_threshold: int | None = Field(default=None, ge=10, le=95)


class PasswordChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str = Field(min_length=6, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class SystemSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    low_risk_max_threshold: float = Field(ge=0.05, le=0.45)
    medium_risk_max_threshold: float = Field(ge=0.25, le=0.85)
    high_risk_alert_enabled: bool = True
