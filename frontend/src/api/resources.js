import client from "./client";

export const productsApi = {
  list: () => client.get("/products").then((r) => r.data),
  create: (data) => client.post("/products", data).then((r) => r.data),
  update: (id, data) => client.put(`/products/${id}`, data).then((r) => r.data),
  remove: (id) => client.delete(`/products/${id}`),
};

export const customersApi = {
  list: () => client.get("/customers").then((r) => r.data),
  create: (data) => client.post("/customers", data).then((r) => r.data),
  remove: (id) => client.delete(`/customers/${id}`),
};

export const ordersApi = {
  list: () => client.get("/orders").then((r) => r.data),
  get: (id) => client.get(`/orders/${id}`).then((r) => r.data),
  create: (data) => client.post("/orders", data).then((r) => r.data),
  remove: (id) => client.delete(`/orders/${id}`),
};

export const dashboardApi = {
  summary: () => client.get("/dashboard/summary").then((r) => r.data),
};
