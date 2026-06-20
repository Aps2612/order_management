"""Shared router dependencies."""
from typing import Annotated

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db

DbSession = Annotated[Session, Depends(get_db)]


class Pagination:
    def __init__(
        self,
        limit: Annotated[int | None, Query(ge=1, le=500)] = None,
        offset: Annotated[int, Query(ge=0)] = 0,
    ):
        self.limit = limit or get_settings().default_page_limit
        self.offset = offset


PaginationParams = Annotated[Pagination, Depends(Pagination)]
