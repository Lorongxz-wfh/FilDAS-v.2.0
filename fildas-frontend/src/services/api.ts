import axios from "axios";
import { clearAuthAndRedirect } from "../lib/auth";

// Automatically uses local URL in development, production URL when deployed
const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.PROD
    ? "https://fildas-v2.onrender.com/api"
    : "http://127.0.0.1:8001/api");

const api = axios.create({
  baseURL: BASE_URL,
});

const pendingGet = new Map<string, AbortController>();

function getKey(config: any) {
  const url = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
  const params = config.params ? JSON.stringify(config.params) : "";
  return `GET ${url}?${params}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");

  config.headers = config.headers ?? {};
  config.headers.Accept = "application/json";

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // De-dupe identical GETs: cancel the previous in-flight request
  if ((config.method ?? "get").toLowerCase() === "get") {
    const key = getKey(config);
    const prev = pendingGet.get(key);
    if (prev) prev.abort();

    const controller = new AbortController();
    pendingGet.set(key, controller);
    config.signal = controller.signal;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if ((response.config.method ?? "get").toLowerCase() === "get") {
      const key = getKey(response.config);
      pendingGet.delete(key);
    }
    return response;
  },
  (error) => {
    const cfg = error?.config;
    if (cfg && (cfg.method ?? "get").toLowerCase() === "get") {
      const key = getKey(cfg);
      pendingGet.delete(key);
    }
    const status = error?.response?.status;

    if (status === 401 || status === 419) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export async function ensureCsrfCookie() {
  await axios.get("/sanctum/csrf-cookie", { withCredentials: true });
}

export default api;
