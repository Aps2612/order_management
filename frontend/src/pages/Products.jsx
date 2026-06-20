import { useEffect, useState } from "react";
import { extractError } from "../api/client";
import { productsApi } from "../api/resources";
import Modal from "../components/Modal.jsx";
import { EmptyView, ErrorView, Loading } from "../components/StateViews.jsx";
import { useToast } from "../components/Toast.jsx";

const emptyForm = { name: "", sku: "", price: "", stock_quantity: "" };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.sku.trim()) errors.sku = "SKU is required";
  if (form.price === "" || Number(form.price) < 0) errors.price = "Price must be 0 or more";
  if (form.stock_quantity === "" || Number(form.stock_quantity) < 0)
    errors.stock_quantity = "Stock must be 0 or more";
  return errors;
}

export default function Products() {
  const toast = useToast();
  const [products, setProducts] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoadError(null);
    productsApi
      .list()
      .then(setProducts)
      .catch((e) => setLoadError(extractError(e)));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock_quantity: product.stock_quantity,
    });
    setErrors({});
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity),
    };

    setSaving(true);
    try {
      if (editing) {
        await productsApi.update(editing.id, payload);
        toast.success("Product updated");
      } else {
        await productsApi.create(payload);
        toast.success("Product created");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    try {
      await productsApi.remove(product.id);
      toast.success("Product deleted");
      load();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  if (loadError) return <ErrorView message={loadError} />;
  if (!products) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <EmptyView message="No products yet. Add your first one." />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>${Number(p.price).toFixed(2)}</td>
                <td>{p.stock_quantity}</td>
                <td className="actions">
                  <button className="btn btn-sm" onClick={() => openEdit(p)}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <Modal title={editing ? "Edit Product" : "Add Product"} onClose={() => setModalOpen(false)}>
          <form onSubmit={submit} className="form" noValidate>
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>
            <label>
              SKU
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              {errors.sku && <span className="field-error">{errors.sku}</span>}
            </label>
            <label>
              Price
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              {errors.price && <span className="field-error">{errors.price}</span>}
            </label>
            <label>
              Stock Quantity
              <input
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
              />
              {errors.stock_quantity && (
                <span className="field-error">{errors.stock_quantity}</span>
              )}
            </label>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
