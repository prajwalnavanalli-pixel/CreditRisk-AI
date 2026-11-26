from pydantic import BaseModel, ConfigDict, Field


class ApplicantCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    applicant_id: str = Field(min_length=3, max_length=30)
    full_name: str | None = Field(default=None, min_length=2, max_length=80)
    credit_limit: float = Field(gt=0, le=10_000_000)
    age: int = Field(ge=18, le=100)
    education: int = Field(ge=0, le=6)
    marital_status: int = Field(ge=0, le=3)


class ApplicantUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    full_name: str | None = Field(default=None, min_length=2, max_length=80)
    credit_limit: float | None = Field(default=None, gt=0, le=10_000_000)
    age: int | None = Field(default=None, ge=18, le=100)
    education: int | None = Field(default=None, ge=0, le=6)
    marital_status: int | None = Field(default=None, ge=0, le=3)
