from fastapi import APIRouter, status

from app.routers.deps import DbSession, PaginationParams
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductRead])
def list_products(db: DbSession, pagination: PaginationParams):
    return product_service.list_products(db, pagination.limit, pagination.offset)


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: DbSession):
    return product_service.create_product(db, payload)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: DbSession):
    return product_service.get_product(db, product_id)


@router.put("/{product_id}", response_model=ProductRead)
def update_product(product_id: int, payload: ProductUpdate, db: DbSession):
    return product_service.update_product(db, product_id, payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: DbSession):
    product_service.delete_product(db, product_id)
