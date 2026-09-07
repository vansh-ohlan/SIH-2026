"""Schema definitions for extracted data."""

from pydantic import BaseModel


class RoRSchema(BaseModel):
    """Schema for Record of Rights fields."""

    survey_number: str | None = None
    owner_name: str | None = None
    area: str | None = None
    village: str | None = None
