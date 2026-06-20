from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import ConflictError, NotFoundError
from app.models import Customer, Order
from app.schemas.customer import CustomerCreate


def list_customers(db: Session, limit: int, offset: int) -> list[Customer]:
    stmt = select(Customer).order_by(Customer.id).limit(limit).offset(offset)
    return list(db.scalars(stmt))


def get_customer(db: Session, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise NotFoundError(f"Customer {customer_id} not found")
    return customer


def create_customer(db: Session, payload: CustomerCreate) -> Customer:
    existing = db.scalars(select(Customer).where(Customer.email == payload.email)).first()
    if existing is not None:
        raise ConflictError(f"Email '{payload.email}' already exists")
    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def delete_customer(db: Session, customer_id: int) -> None:
    customer = get_customer(db, customer_id)
    referenced = db.scalars(
        select(Order).where(Order.customer_id == customer_id).limit(1)
    ).first()
    if referenced is not None:
        raise ConflictError("Cannot delete a customer with existing orders")
    db.delete(customer)
    db.commit()
