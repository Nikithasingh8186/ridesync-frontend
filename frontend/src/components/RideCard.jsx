import React, { useState } from "react";
import { requestRide, updateRequestStatus, cancelRide } from "../services/api.js";

/**
 * RideCard renders a single ride offer.
 *
 * Props:
 *   ride        — Ride object from the API
 *   mode        — "find" | "manage" | "request"
 *                 find    → shows a "Request to join" button
 *                 manage  → shows Accept/Decline buttons for incoming requests
 *                 request → shows the passenger's request status
 *   onRefresh   — callback to reload the parent list after an action
 */
export default function RideCard({ ride, mode = "find", requests = [], onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const departure = new Date(ride.departure_time).toLocaleString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function handleRequest() {
    setLoading(true);
    setError(null);
    try {
      await requestRide(ride.id);
      onRefresh?.();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to send request");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this ride?")) return;
    setLoading(true);
    try {
      await cancelRide(ride.id);
      onRefresh?.();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to cancel");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestAction(requestId, status) {
    setLoading(true);
    try {
      await updateRequestStatus(requestId, status);
      onRefresh?.();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{ride.driver?.full_name}</p>
          <p className="text-xs text-gray-400">{departure}</p>
        </div>
        <div className="text-right">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            ride.available_seats > 0
              ? "bg-emerald-50 text-emerald-700"
              : "bg-gray-100 text-gray-500"
          }`}>
            {ride.available_seats} seat{ride.available_seats !== 1 ? "s" : ""} left
          </span>
        </div>
      </div>

      {/* Route */}
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <span className="mt-1 w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <p className="text-sm text-gray-700">{ride.origin_address}</p>
        </div>
        <div className="ml-1 w-px h-3 bg-gray-200 mx-0.5" />
        <div className="flex items-start gap-2">
          <span className="mt-1 w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
          <p className="text-sm text-gray-700">{ride.destination_address}</p>
        </div>
      </div>

      {/* Cost */}
      {ride.cost_per_person && (
        <p className="text-sm text-gray-500">
          ₹{ride.cost_per_person} <span className="text-gray-400">per person</span>
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Actions */}
      {mode === "find" && ride.available_seats > 0 && (
        <button
          onClick={handleRequest}
          disabled={loading}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Sending…" : "Request to join"}
        </button>
      )}

      {mode === "manage" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Requests ({requests.length})
          </p>
          {requests.length === 0 && (
            <p className="text-sm text-gray-400">No requests yet</p>
          )}
          {requests.map((req) => (
            <div key={req.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-700">{req.passenger.full_name}</span>
              {req.status === "pending" ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequestAction(req.id, "accepted")}
                    disabled={loading}
                    className="text-xs px-2 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRequestAction(req.id, "declined")}
                    disabled={loading}
                    className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  req.status === "accepted"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}>
                  {req.status}
                </span>
              )}
            </div>
          ))}
          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full py-1.5 border border-red-200 text-red-500 text-sm rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Cancel ride
          </button>
        </div>
      )}

      {mode === "request" && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Your request</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            ride.status === "accepted"
              ? "bg-emerald-50 text-emerald-700"
              : ride.status === "declined"
              ? "bg-red-50 text-red-600"
              : "bg-yellow-50 text-yellow-700"
          }`}>
            {ride.status || "pending"}
          </span>
        </div>
      )}
    </div>
  );
}