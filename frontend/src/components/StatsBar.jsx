import React, { useState, useEffect } from "react";
import { getStats } from "../services/api.js";
import StatsBar from "../components/StatsBar.jsx";

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">Loading stats…</p>;

  const treesEquiv = stats ? (stats.co2_saved_kg / 21.77).toFixed(1) : 0; // 1 tree absorbs ~21.77 kg CO₂/yr

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-gray-900">Your impact</h1>

      <StatsBar stats={stats} />

      {/* Impact narrative */}
      {stats?.total_rides > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-medium text-gray-800">What your shared rides add up to</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              You've shared <strong className="text-gray-900">{stats.km_shared.toFixed(0)} km</strong> worth
              of commutes — the equivalent of driving from Hyderabad to Mumbai and back.
            </p>
            <p>
              That saved <strong className="text-gray-900">{stats.co2_saved_kg.toFixed(1)} kg</strong> of CO₂ —
              roughly what <strong className="text-gray-900">{treesEquiv} trees</strong> absorb in a year.
            </p>
            <p>
              And you've saved{" "}
              <strong className="text-gray-900">₹{stats.total_savings.toLocaleString("en-IN")}</strong>{" "}
              that would have gone to solo rides.
            </p>
          </div>
        </div>
      )}

      {stats?.total_rides === 0 && (
        <div className="text-center py-16 text-gray-400 space-y-3">
          <p className="text-4xl">📊</p>
          <p className="text-sm">No rides yet — your stats will appear here once you start sharing commutes.</p>
          <a href="/find" className="inline-block text-sm text-emerald-600 hover:underline">
            Find your first ride →
          </a>
        </div>
      )}
    </div>
  );
}