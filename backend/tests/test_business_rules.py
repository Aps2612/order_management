"""Tests focused on the business rules that matter, not trivial CRUD getters."""


def _make_product(client, sku="SKU-1", price="10.00", stock=5, name="Widget"):
    return client.post(
        "/products",
        json={"name": name, "sku": sku, "price": price, "stock_quantity": stock},
    )


def _make_customer(client, email="a@example.com"):
    return client.post(
        "/customers",
        json={"full_name": "Alice", "email": email, "phone": "12345"},
    )


def test_product_sku_must_be_unique(client):
    assert _make_product(client, sku="DUP").status_code == 201
    resp = _make_product(client, sku="DUP")
    assert resp.status_code == 409
    assert resp.json()["code"] == "CONFLICT"


def test_product_quantity_cannot_be_negative(client):
    resp = _make_product(client, stock=-1)
    assert resp.status_code == 422


def test_customer_email_must_be_unique(client):
    assert _make_customer(client, email="dup@example.com").status_code == 201
    resp = _make_customer(client, email="dup@example.com")
    assert resp.status_code == 409


def test_order_total_is_computed_by_backend(client):
    product_id = _make_product(client, price="2.50", stock=10).json()["id"]
    customer_id = _make_customer(client).json()["id"]

    resp = client.post(
        "/orders",
        json={"customer_id": customer_id, "items": [{"product_id": product_id, "quantity": 4}]},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["total_amount"] == "10.00"  # 2.50 * 4
    assert body["items"][0]["unit_price"] == "2.50"


def test_order_reduces_stock(client):
    product_id = _make_product(client, stock=10).json()["id"]
    customer_id = _make_customer(client).json()["id"]

    client.post(
        "/orders",
        json={"customer_id": customer_id, "items": [{"product_id": product_id, "quantity": 3}]},
    )
    remaining = client.get(f"/products/{product_id}").json()["stock_quantity"]
    assert remaining == 7


def test_order_rejected_when_insufficient_stock(client):
    product_id = _make_product(client, stock=2).json()["id"]
    customer_id = _make_customer(client).json()["id"]

    resp = client.post(
        "/orders",
        json={"customer_id": customer_id, "items": [{"product_id": product_id, "quantity": 5}]},
    )
    assert resp.status_code == 409
    assert resp.json()["code"] == "INSUFFICIENT_STOCK"
    # Stock must be untouched after a rejected order.
    assert client.get(f"/products/{product_id}").json()["stock_quantity"] == 2


def test_deleting_order_restocks_inventory(client):
    product_id = _make_product(client, stock=10).json()["id"]
    customer_id = _make_customer(client).json()["id"]
    order_id = client.post(
        "/orders",
        json={"customer_id": customer_id, "items": [{"product_id": product_id, "quantity": 4}]},
    ).json()["id"]

    assert client.get(f"/products/{product_id}").json()["stock_quantity"] == 6
    assert client.delete(f"/orders/{order_id}").status_code == 204
    assert client.get(f"/products/{product_id}").json()["stock_quantity"] == 10


def test_duplicate_product_lines_are_merged(client):
    product_id = _make_product(client, stock=10).json()["id"]
    customer_id = _make_customer(client).json()["id"]

    resp = client.post(
        "/orders",
        json={
            "customer_id": customer_id,
            "items": [
                {"product_id": product_id, "quantity": 2},
                {"product_id": product_id, "quantity": 3},
            ],
        },
    )
    assert resp.status_code == 201
    assert len(resp.json()["items"]) == 1
    assert client.get(f"/products/{product_id}").json()["stock_quantity"] == 5


def test_cannot_delete_product_referenced_by_order(client):
    product_id = _make_product(client, stock=10).json()["id"]
    customer_id = _make_customer(client).json()["id"]
    client.post(
        "/orders",
        json={"customer_id": customer_id, "items": [{"product_id": product_id, "quantity": 1}]},
    )
    resp = client.delete(f"/products/{product_id}")
    assert resp.status_code == 409


def test_cannot_delete_customer_with_orders(client):
    product_id = _make_product(client, stock=10).json()["id"]
    customer_id = _make_customer(client).json()["id"]
    client.post(
        "/orders",
        json={"customer_id": customer_id, "items": [{"product_id": product_id, "quantity": 1}]},
    )
    resp = client.delete(f"/customers/{customer_id}")
    assert resp.status_code == 409


def test_order_requires_existing_customer_and_product(client):
    customer_id = _make_customer(client).json()["id"]
    resp = client.post(
        "/orders",
        json={"customer_id": customer_id, "items": [{"product_id": 999, "quantity": 1}]},
    )
    assert resp.status_code == 404


def test_dashboard_summary(client):
    _make_product(client, sku="LOW", stock=1)
    _make_product(client, sku="OK", stock=100)
    _make_customer(client)

    summary = client.get("/dashboard/summary").json()
    assert summary["total_products"] == 2
    assert summary["total_customers"] == 1
    assert summary["total_orders"] == 0
    assert any(p["sku"] == "LOW" for p in summary["low_stock_products"])
