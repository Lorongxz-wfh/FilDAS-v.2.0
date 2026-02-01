import axios from "axios";
import { clearAuthAndRedirect } from "../lib/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers = config.headers ?? {};
  config.headers.Accept = "application/json";
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    
    if (status === 401 || status === 419) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default api;
