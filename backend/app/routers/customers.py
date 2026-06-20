from fastapi import APIRouter, status

from app.routers.deps import DbSession, PaginationParams
from app.schemas.customer import CustomerCreate, CustomerRead
from app.services import customer_service

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerRead])
def list_customers(db: DbSession, pagination: PaginationParams):
    return customer_service.list_customers(db, pagination.limit, pagination.offset)


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: DbSession):
    return customer_service.create_customer(db, payload)


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(customer_id: int, db: DbSession):
    return customer_service.get_customer(db, customer_id)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: DbSession):
    customer_service.delete_customer(db, customer_id)
