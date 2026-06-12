import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getStats } from "../services/api.js";
import StatsBar from "../components/StatsBar.jsx";

export default function Stats() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await getStats();
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || t("stats.failed"));
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const intervalId = setInterval(() => load({ silent: true }), 15000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">{t("stats.loading")}</p>;

  const total = stats?.total;
  const hasStats = total?.total_rides > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t("stats.title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("stats.subtitle")}</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {stats && (
        <>
          <StatsBar title={t("stats.week")} stats={stats.weekly} />
          <StatsBar title={t("stats.month")} stats={stats.monthly} />
          <StatsBar title={t("stats.total")} stats={stats.total} />
        </>
      )}

      {hasStats && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-base font-medium text-gray-800">{t("stats.summaryTitle")}</h2>
          <p className="text-sm text-gray-600">
            {t("stats.summary", {
              rides: total.total_rides,
              distance: total.total_distance_km.toFixed(0),
              co2: total.co2_saved_kg.toFixed(1),
            })}
          </p>
        </div>
      )}

      {!hasStats && (
        <div className="text-center py-16 text-gray-400 space-y-3">
          <p className="text-sm">{t("stats.empty")}</p>
          <a href="/find" className="inline-block text-sm text-emerald-600 hover:underline">
            {t("nav.find")}
          </a>
        </div>
      )}
    </div>
  );
}
