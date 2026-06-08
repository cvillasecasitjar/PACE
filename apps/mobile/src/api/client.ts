import axios from "axios";
import { API_BASE_URL } from "./config";
import { getAuthToken, useAuth } from "../store/auth";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
});

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, drop the session so the app returns to the auth flow.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && getAuthToken()) {
      void useAuth.getState().signOut();
    }
    return Promise.reject(error);
  }
);
