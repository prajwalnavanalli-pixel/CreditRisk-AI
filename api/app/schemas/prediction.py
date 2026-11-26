from pydantic import BaseModel, ConfigDict, Field


class CreditRiskInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    # Applicant identification
    applicant_id: str | None = Field(
        default=None,
        min_length=3,
        max_length=30,
    )

    # Applicant financial & demographic information
    LIMIT_BAL: float = Field(gt=0, le=10_000_000)
    SEX: int = Field(ge=1, le=2)
    EDUCATION: int = Field(ge=1, le=4)
    MARRIAGE: int = Field(ge=1, le=3)
    AGE: int = Field(ge=18, le=100)

    # Previous payment status (-2 to 8 months)
    PAY_0: int = Field(ge=-2, le=8)
    PAY_2: int = Field(ge=-2, le=8)
    PAY_3: int = Field(ge=-2, le=8)
    PAY_4: int = Field(ge=-2, le=8)
    PAY_5: int = Field(ge=-2, le=8)
    PAY_6: int = Field(ge=-2, le=8)

    # Bill amounts (can be negative for credit balances)
    BILL_AMT1: float = Field(ge=-1_000_000, le=10_000_000)
    BILL_AMT2: float = Field(ge=-1_000_000, le=10_000_000)
    BILL_AMT3: float = Field(ge=-1_000_000, le=10_000_000)
    BILL_AMT4: float = Field(ge=-1_000_000, le=10_000_000)
    BILL_AMT5: float = Field(ge=-1_000_000, le=10_000_000)
    BILL_AMT6: float = Field(ge=-1_000_000, le=10_000_000)

    # Previous payment amounts
    PAY_AMT1: float = Field(ge=0, le=10_000_000)
    PAY_AMT2: float = Field(ge=0, le=10_000_000)
    PAY_AMT3: float = Field(ge=0, le=10_000_000)
    PAY_AMT4: float = Field(ge=0, le=10_000_000)
    PAY_AMT5: float = Field(ge=0, le=10_000_000)
    PAY_AMT6: float = Field(ge=0, le=10_000_000)
