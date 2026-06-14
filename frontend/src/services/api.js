import axios from "axios";
import { getAiHeaderOptions } from "./settings.js";

console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

console.log("BASE_URL =", BASE_URL);

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token and language headers from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const language = localStorage.getItem("ridesync_language") || "en";
  config.headers["Accept-Language"] = language;

  if (config.url?.startsWith("/ai/")) {
    const aiHeaders = getAiHeaderOptions();
    config.headers = { ...config.headers, ...aiHeaders };
  }

  return config;
});

// Redirect to /login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ---------- Auth ----------
export const register = (data) => api.post("/auth/register", data);

export const login = (email, password) =>
  api.post(
    "/auth/login",
    new URLSearchParams({ username: email, password }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

export const getMe = () => api.get("/users/me");

// ---------- Rides ----------
export const offerRide = (data) => api.post("/rides", data);

export const searchRides = (params) => api.get("/rides", { params });

export const getMyRides = () => api.get("/rides/my");

export const cancelRide = (rideId) => api.delete(`/rides/${rideId}`);

export const updateRideStatus = (rideId, status) =>
  api.patch(`/rides/${rideId}/status`, { status });

// ---------- Requests ----------
export const requestRide = (rideId) => api.post("/requests", { ride_id: rideId });

export const getMyRequests = () => api.get("/requests/my");

export const getReceivedRequests = () => api.get("/requests/received");

export const updateRequestStatus = (requestId, status) =>
  api.patch(`/requests/${requestId}`, { status });

// ---------- Stats ----------
export const getStats = () => api.get("/stats");

// ---------- AI ----------
export const getAISuggestions = (data) => api.post("/ai/suggestions", data);
export const sendAiChat = (data) => api.post("/ai/chat", data);

export default api;
