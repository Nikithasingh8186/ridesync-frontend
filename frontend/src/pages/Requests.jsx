import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMyRequests } from "../services/api";

function statusClass(status) {
  if (status === "accepted") return "bg-emerald-50 text-emerald-700";
  if (status === "in_progress") return "bg-blue-50 text-blue-700";
  if (status === "completed") return "bg-sky-50 text-sky-700";
  if (status === "cancelled") return "bg-gray-100 text-gray-500";
  if (status === "declined") return "bg-red-50 text-red-600";
  return "bg-yellow-50 text-yellow-700";
}

export default function Requests() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await getMyRequests();
      setRequests(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || t("requests.error"));
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const intervalId = setInterval(() => load({ silent: true }), 5000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">{t("requests.loading")}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">{t("requests.title")}</h1>
      {error && <p className="text-sm text-red-500">{error}</p>}

      {requests.length === 0 ? (
        <p className="text-sm text-gray-400">{t("requests.none")}</p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {request.ride.origin_address} to {request.ride.destination_address}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t("requests.driver", { name: request.ride.driver?.full_name || t("requests.unknownDriver") })}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(
                    request.status
                  )}`}
                >
                  {t(`status.${request.status}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
