import { useEffect, useState } from "react";
import { dashboardApi } from "../api/resources";
import { extractError } from "../api/client";
import { ErrorView, Loading } from "../components/StateViews.jsx";

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    dashboardApi
      .summary()
      .then(setSummary)
      .catch((e) => setError(extractError(e)));
  }, []);

  if (error) return <ErrorView message={error} />;
  if (!summary) return <Loading />;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stat-grid">
        <StatCard label="Total Products" value={summary.total_products} />
        <StatCard label="Total Customers" value={summary.total_customers} />
        <StatCard label="Total Orders" value={summary.total_orders} />
        <StatCard label="Low Stock Items" value={summary.low_stock_products.length} />
      </div>

      <section className="panel">
        <h2>Low Stock Products</h2>
        {summary.low_stock_products.length === 0 ? (
          <p className="muted">All products are well stocked.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {summary.low_stock_products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>
                    <span className="badge badge-warn">{p.stock_quantity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
