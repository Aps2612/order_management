import { useEffect, useMemo, useState } from "react";
import { extractError } from "../api/client";
import { customersApi, ordersApi, productsApi } from "../api/resources";
import Modal from "../components/Modal.jsx";
import { EmptyView, ErrorView, Loading } from "../components/StateViews.jsx";
import { useToast } from "../components/Toast.jsx";

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = () => {
    setLoadError(null);
    Promise.all([ordersApi.list(), productsApi.list(), customersApi.list()])
      .then(([o, p, c]) => {
        setOrders(o);
        setProducts(p);
        setCustomers(c);
      })
      .catch((e) => setLoadError(extractError(e)));
  };

  useEffect(load, []);

  const productById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products]
  );
  const customerById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers]
  );

  const remove = async (order) => {
    if (!window.confirm(`Cancel order #${order.id}? Stock will be restored.`)) return;
    try {
      await ordersApi.remove(order.id);
      toast.success("Order cancelled");
      load();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  if (loadError) return <ErrorView message={loadError} />;
  if (!orders) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
        <button
          className="btn btn-primary"
          onClick={() => setCreateOpen(true)}
          disabled={products.length === 0 || customers.length === 0}
          title={
            products.length === 0 || customers.length === 0
              ? "Add at least one product and customer first"
              : ""
          }
        >
          + Create Order
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyView message="No orders yet." />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{customerById[o.customer_id]?.full_name || `Customer ${o.customer_id}`}</td>
                <td>{o.items.length}</td>
                <td>${Number(o.total_amount).toFixed(2)}</td>
                <td>
                  <span className="badge">{o.status}</span>
                </td>
                <td className="actions">
                  <button className="btn btn-sm" onClick={() => setDetail(o)}>
                    View
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(o)}>
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {createOpen && (
        <CreateOrderModal
          products={products}
          customers={customers}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}

      {detail && (
        <Modal title={`Order #${detail.id}`} onClose={() => setDetail(null)}>
          <p>
            <strong>Customer:</strong>{" "}
            {customerById[detail.customer_id]?.full_name || detail.customer_id}
          </p>
          <p>
            <strong>Status:</strong> {detail.status}
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map((it) => (
                <tr key={it.id}>
                  <td>{productById[it.product_id]?.name || `Product ${it.product_id}`}</td>
                  <td>{it.quantity}</td>
                  <td>${Number(it.unit_price).toFixed(2)}</td>
                  <td>${(Number(it.unit_price) * it.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="order-total">
            <strong>Total: ${Number(detail.total_amount).toFixed(2)}</strong>
          </p>
        </Modal>
      )}
    </div>
  );
}

function CreateOrderModal({ products, customers, onClose, onCreated }) {
  const toast = useToast();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [lines, setLines] = useState([{ product_id: products[0]?.id ?? "", quantity: 1 }]);
  const [saving, setSaving] = useState(false);

  const productById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products]
  );

  const estimatedTotal = lines.reduce((sum, line) => {
    const product = productById[Number(line.product_id)];
    return product ? sum + Number(product.price) * Number(line.quantity || 0) : sum;
  }, 0);

  const updateLine = (index, patch) => {
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const addLine = () =>
    setLines((current) => [...current, { product_id: products[0]?.id ?? "", quantity: 1 }]);

  const removeLine = (index) =>
    setLines((current) => current.filter((_, i) => i !== index));

  const submit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      toast.error("Select a customer");
      return;
    }
    const items = lines
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) }));
    if (items.length === 0) {
      toast.error("Add at least one valid item");
      return;
    }

    setSaving(true);
    try {
      await ordersApi.create({ customer_id: Number(customerId), items });
      toast.success("Order created");
      onCreated();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create Order" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <label>
          Customer
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} ({c.email})
              </option>
            ))}
          </select>
        </label>

        <div className="line-items">
          <div className="line-items-header">
            <span>Items</span>
            <button type="button" className="btn btn-sm" onClick={addLine}>
              + Add item
            </button>
          </div>
          {lines.map((line, index) => {
            const product = productById[Number(line.product_id)];
            return (
              <div className="line-item" key={index}>
                <select
                  value={line.product_id}
                  onChange={(e) => updateLine(index, { product_id: e.target.value })}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${Number(p.price).toFixed(2)} ({p.stock_quantity} in stock)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: e.target.value })}
                />
                {lines.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeLine(index)}
                    aria-label="Remove item"
                  >
                    ×
                  </button>
                )}
                {product && Number(line.quantity) > product.stock_quantity && (
                  <span className="field-error">Only {product.stock_quantity} in stock</span>
                )}
              </div>
            );
          })}
        </div>

        <p className="order-total">
          Estimated Total: <strong>${estimatedTotal.toFixed(2)}</strong>
        </p>

        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Placing..." : "Place Order"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
