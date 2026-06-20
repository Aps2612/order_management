from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=50)
    price: Decimal = Field(ge=0, decimal_places=2)
    stock_quantity: int = Field(ge=0)

    @field_validator("name", "sku")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        return value.strip()


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    sku: str | None = Field(default=None, min_length=1, max_length=50)
    price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    stock_quantity: int | None = Field(default=None, ge=0)

    @field_validator("name", "sku")
    @classmethod
    def strip_whitespace(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else value


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
