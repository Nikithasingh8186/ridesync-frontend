import React, { useEffect, useState } from "react";
import { getStats } from "../services/api.js";
import StatsBar from "../components/StatsBar.jsx";

export default function Stats() {
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
      setError(err.response?.data?.detail || "Failed to load stats");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const intervalId = setInterval(() => load({ silent: true }), 15000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">Loading stats...</p>;

  const total = stats?.total;
  const hasStats = total?.total_rides > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Your impact</h1>
        <p className="mt-1 text-sm text-gray-500">
          Completed shared rides are counted toward environmental and traffic impact.
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {stats && (
        <>
          <StatsBar title="This week" stats={stats.weekly} />
          <StatsBar title="This month" stats={stats.monthly} />
          <StatsBar title="All time" stats={stats.total} />
        </>
      )}

      {hasStats && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-base font-medium text-gray-800">Impact summary</h2>
          <p className="text-sm text-gray-600">
            You have completed {total.total_rides} shared ride{total.total_rides === 1 ? "" : "s"},
            covered {total.total_distance_km.toFixed(0)} km, and saved about{" "}
            {total.co2_saved_kg.toFixed(1)} kg of CO2 compared with solo travel.
          </p>
        </div>
      )}

      {!hasStats && (
        <div className="text-center py-16 text-gray-400 space-y-3">
          <p className="text-sm">
            No completed rides yet. Your stats will appear here once a shared ride is completed.
          </p>
          <a href="/find" className="inline-block text-sm text-emerald-600 hover:underline">
            Find your first ride
          </a>
        </div>
      )}
    </div>
  );
}
