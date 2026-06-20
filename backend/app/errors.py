"""Domain-level exceptions, decoupled from FastAPI.

Services raise these; a single exception handler in main.py maps them to
HTTP responses with a consistent error envelope.
"""


class DomainError(Exception):
    status_code: int = 400
    code: str = "BAD_REQUEST"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFoundError(DomainError):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(DomainError):
    """Used for unique-constraint clashes and referential-integrity blocks."""

    status_code = 409
    code = "CONFLICT"


class InsufficientStockError(DomainError):
    status_code = 409
    code = "INSUFFICIENT_STOCK"
