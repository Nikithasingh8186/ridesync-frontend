import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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

export default api;
