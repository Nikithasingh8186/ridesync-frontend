import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  requestRide,
  updateRequestStatus,
  cancelRide,
  updateRideStatus,
} from "../services/api.js";

const badgeClass = {
  pending: "bg-yellow-50 text-yellow-700",
  accepted: "bg-emerald-50 text-emerald-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-sky-50 text-sky-700",
  cancelled: "bg-gray-100 text-gray-500",
  declined: "bg-red-50 text-red-600",
};

function formatStatus(status, t) {
  const key = `status.${status || "pending"}`;
  return t(key, status?.replace("_", " ") || "pending");
}

export default function RideCard({ ride, mode = "find", requests = [], onRefresh }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requested, setRequested] = useState(false);

  const departure = new Date(ride.departure_time).toLocaleString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function runAction(action, fallbackMessage) {
    setLoading(true);
    setError(null);
    try {
      await action();
      await onRefresh?.();
    } catch (e) {
      setError(e.response?.data?.detail || fallbackMessage);
    } finally {
      setLoading(false);
    }
  }

  function handleRequest() {
    runAction(async () => {
      await requestRide(ride.id);
      setRequested(true);
    }, t("rides.failedSend"));
  }

  function handleCancel() {
    if (!confirm(t("rides.confirmCancelRide"))) return;
    runAction(() => cancelRide(ride.id), t("rides.failedCancel"));
  }

  function handleRequestAction(requestId, status) {
    runAction(() => updateRequestStatus(requestId, status), t("rides.failedUpdateRequest"));
  }

  function handleRideStatus(status) {
    runAction(() => updateRideStatus(ride.id, status), t("rides.failedUpdateRide"));
  }

  const rideStatus = ride.status || "pending";
  const canRequest = mode === "find" && ride.available_seats > 0 && rideStatus === "pending";
  const hasAcceptedPassenger = requests.some((req) => req.status === "accepted");

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{ride.driver?.full_name}</p>
          <p className="text-xs text-gray-400">{departure}</p>
        </div>
        <div className="text-right">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              badgeClass[rideStatus] || badgeClass.pending
            }`}
          >
            {formatStatus(rideStatus, t)}
          </span>
          <p className="mt-1 text-xs text-gray-400">
            {t("rides.seatsLeft", { count: ride.available_seats })}
          </p>
        </div>
      </div>

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

      {ride.cost_per_person && (
        <p className="text-sm text-gray-500">
          Rs {ride.cost_per_person} <span className="text-gray-400">{t("rides.perPerson")}</span>
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {canRequest && (
        <button
          onClick={handleRequest}
          disabled={loading || requested}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {requested ? t("rides.requestPending") : loading ? t("rides.sending") : t("rides.requestToJoin")}
        </button>
      )}

      {mode === "manage" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {t("rides.requestsCount", { count: requests.length })}
          </p>
          {requests.length === 0 && <p className="text-sm text-gray-400">{t("rides.noRequestsYet")}</p>}
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
            >
              <span className="text-sm text-gray-700">{req.passenger.full_name}</span>
              {req.status === "pending" && rideStatus === "pending" ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequestAction(req.id, "accepted")}
                    disabled={loading}
                    className="text-xs px-2 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {t("rides.accept")}
                  </button>
                  <button
                    onClick={() => handleRequestAction(req.id, "declined")}
                    disabled={loading}
                    className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    {t("rides.decline")}
                  </button>
                </div>
              ) : (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    badgeClass[req.status] || badgeClass.pending
                  }`}
                >
                  {formatStatus(req.status, t)}
                </span>
              )}
            </div>
          ))}

          {rideStatus === "pending" && hasAcceptedPassenger && (
            <button
              onClick={() => handleRideStatus("in_progress")}
              disabled={loading}
              className="w-full py-1.5 border border-blue-200 text-blue-600 text-sm rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {t("rides.startRide")}
            </button>
          )}
          {rideStatus === "in_progress" && (
            <button
              onClick={() => handleRideStatus("completed")}
              disabled={loading}
              className="w-full py-1.5 border border-emerald-200 text-emerald-600 text-sm rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
            >
              {t("rides.completeRide")}
            </button>
          )}
          <button
            onClick={handleCancel}
            disabled={loading || ["cancelled", "completed"].includes(rideStatus)}
            className="w-full py-1.5 border border-red-200 text-red-500 text-sm rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {t("rides.cancelRide")}
          </button>
        </div>
      )}

      {mode === "request" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t("rides.yourRequest")}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                badgeClass[rideStatus] || badgeClass.pending
              }`}
            >
              {formatStatus(rideStatus, t)}
            </span>
          </div>
          {["pending", "accepted"].includes(rideStatus) && ride.request_id && (
            <button
              onClick={() => handleRequestAction(ride.request_id, "cancelled")}
              disabled={loading}
              className="w-full py-1.5 border border-red-200 text-red-500 text-sm rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {t("rides.cancelRequest")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
