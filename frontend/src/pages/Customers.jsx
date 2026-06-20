import { useEffect, useState } from "react";
import { extractError } from "../api/client";
import { customersApi } from "../api/resources";
import Modal from "../components/Modal.jsx";
import { EmptyView, ErrorView, Loading } from "../components/StateViews.jsx";
import { useToast } from "../components/Toast.jsx";

const emptyForm = { full_name: "", email: "", phone: "" };

function validate(form) {
  const errors = {};
  if (!form.full_name.trim()) errors.full_name = "Name is required";
  if (!form.email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email";
  return errors;
}

export default function Customers() {
  const toast = useToast();
  const [customers, setCustomers] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoadError(null);
    customersApi
      .list()
      .then(setCustomers)
      .catch((e) => setLoadError(extractError(e)));
  };

  useEffect(load, []);

  const openCreate = () => {
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      await customersApi.create({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });
      toast.success("Customer created");
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (customer) => {
    if (!window.confirm(`Delete "${customer.full_name}"?`)) return;
    try {
      await customersApi.remove(customer.id);
      toast.success("Customer deleted");
      load();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  if (loadError) return <ErrorView message={loadError} />;
  if (!customers) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Customer
        </button>
      </div>

      {customers.length === 0 ? (
        <EmptyView message="No customers yet." />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.full_name}</td>
                <td>{c.email}</td>
                <td>{c.phone || "—"}</td>
                <td className="actions">
                  <button className="btn btn-sm btn-danger" onClick={() => remove(c)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <Modal title="Add Customer" onClose={() => setModalOpen(false)}>
          <form onSubmit={submit} className="form" noValidate>
            <label>
              Full Name
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
              {errors.full_name && <span className="field-error">{errors.full_name}</span>}
            </label>
            <label>
              Email
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </label>
            <label>
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
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
