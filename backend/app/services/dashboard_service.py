from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Customer, Order, Product

LOW_STOCK_THRESHOLD = 10


def get_summary(db: Session) -> dict:
    total_products = db.scalar(select(func.count()).select_from(Product)) or 0
    total_customers = db.scalar(select(func.count()).select_from(Customer)) or 0
    total_orders = db.scalar(select(func.count()).select_from(Order)) or 0
    low_stock = list(
        db.scalars(
            select(Product)
            .where(Product.stock_quantity <= LOW_STOCK_THRESHOLD)
            .order_by(Product.stock_quantity)
        )
    )
    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "low_stock_products": low_stock,
    }
