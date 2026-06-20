import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const client = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Normalize backend errors into a readable message for the UI.
export function extractError(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    // FastAPI validation error shape.
    const first = detail[0];
    const field = first?.loc?.slice(-1)[0];
    return field ? `${field}: ${first.msg}` : first.msg;
  }
  return error?.message || "Something went wrong";
}

export default client;
