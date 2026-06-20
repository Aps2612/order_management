"""Order business logic.

This is the only place real concurrency correctness matters: creating an order
must not oversell stock even under simultaneous requests. We achieve that with a
single transaction that row-locks the involved products (SELECT ... FOR UPDATE)
in a deterministic order to avoid deadlocks.
"""
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import InsufficientStockError, NotFoundError
from app.models import Customer, Order, OrderItem, Product
from app.schemas.order import OrderCreate


def list_orders(db: Session, limit: int, offset: int) -> list[Order]:
    stmt = select(Order).order_by(Order.id.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt))


def get_order(db: Session, order_id: int) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise NotFoundError(f"Order {order_id} not found")
    return order


def _merge_quantities(payload: OrderCreate) -> dict[int, int]:
    """Collapse duplicate product lines so locking and stock math stay clean."""
    merged: dict[int, int] = defaultdict(int)
    for item in payload.items:
        merged[item.product_id] += item.quantity
    return dict(merged)


def create_order(db: Session, payload: OrderCreate) -> Order:
    if db.get(Customer, payload.customer_id) is None:
        raise NotFoundError(f"Customer {payload.customer_id} not found")

    quantities = _merge_quantities(payload)

    # Lock product rows in a deterministic (sorted) order to prevent AB-BA deadlocks.
    product_ids = sorted(quantities)
    stmt = (
        select(Product)
        .where(Product.id.in_(product_ids))
        .order_by(Product.id)
        .with_for_update()
    )
    products = {p.id: p for p in db.scalars(stmt)}

    missing = [pid for pid in product_ids if pid not in products]
    if missing:
        raise NotFoundError(f"Product(s) not found: {', '.join(map(str, missing))}")

    total = Decimal("0.00")
    order_items: list[OrderItem] = []
    for product_id in product_ids:
        product = products[product_id]
        quantity = quantities[product_id]
        if product.stock_quantity < quantity:
            raise InsufficientStockError(
                f"Insufficient stock for '{product.name}': "
                f"requested {quantity}, available {product.stock_quantity}"
            )
        product.stock_quantity -= quantity
        total += product.price * quantity
        order_items.append(
            OrderItem(product_id=product_id, quantity=quantity, unit_price=product.price)
        )

    order = Order(customer_id=payload.customer_id, total_amount=total, items=order_items)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def delete_order(db: Session, order_id: int) -> None:
    """Delete/cancel an order and return its items to stock, atomically."""
    order = get_order(db, order_id)

    product_ids = sorted({item.product_id for item in order.items})
    if product_ids:
        stmt = (
            select(Product)
            .where(Product.id.in_(product_ids))
            .order_by(Product.id)
            .with_for_update()
        )
        products = {p.id: p for p in db.scalars(stmt)}
        for item in order.items:
            product = products.get(item.product_id)
            if product is not None:
                product.stock_quantity += item.quantity

    db.delete(order)
    db.commit()
