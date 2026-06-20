from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import ConflictError, NotFoundError
from app.models import OrderItem, Product
from app.schemas.product import ProductCreate, ProductUpdate


def list_products(db: Session, limit: int, offset: int) -> list[Product]:
    stmt = select(Product).order_by(Product.id).limit(limit).offset(offset)
    return list(db.scalars(stmt))


def get_product(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise NotFoundError(f"Product {product_id} not found")
    return product


def _ensure_sku_available(db: Session, sku: str, exclude_id: int | None = None) -> None:
    stmt = select(Product).where(Product.sku == sku)
    if exclude_id is not None:
        stmt = stmt.where(Product.id != exclude_id)
    if db.scalars(stmt).first() is not None:
        raise ConflictError(f"SKU '{sku}' already exists")


def create_product(db: Session, payload: ProductCreate) -> Product:
    _ensure_sku_available(db, payload.sku)
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, payload: ProductUpdate) -> Product:
    product = get_product(db, product_id)
    data = payload.model_dump(exclude_unset=True)
    if "sku" in data:
        _ensure_sku_available(db, data["sku"], exclude_id=product_id)
    for field, value in data.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)
    referenced = db.scalars(
        select(OrderItem).where(OrderItem.product_id == product_id).limit(1)
    ).first()
    if referenced is not None:
        raise ConflictError("Cannot delete a product referenced by existing orders")
    db.delete(product)
    db.commit()
