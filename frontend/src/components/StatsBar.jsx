import React from "react";
import { useTranslation } from "react-i18next";

const metricKeys = [
  { key: "total_rides", labelKey: "stats.ridesCompleted", suffix: "" },
  { key: "total_distance_km", labelKey: "stats.distance", suffix: " km" },
  { key: "co2_saved_kg", labelKey: "stats.co2", suffix: " kg" },
  { key: "fuel_saved_liters", labelKey: "stats.fuel", suffix: " L" },
  { key: "traffic_reduction_percent", labelKey: "stats.traffic", suffix: "%" },
];

function formatValue(value, suffix) {
  const numeric = Number(value || 0);
  const formatted = Number.isInteger(numeric) ? numeric : numeric.toFixed(1);
  return `${formatted}${suffix}`;
}

export default function StatsBar({ title, stats }) {
  const { t } = useTranslation();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-gray-800">{title}</h2>
        <span className="text-xs text-gray-400">
          {t("stats.saved", { amount: Number(stats.total_savings || 0).toLocaleString("en-IN") })}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {metricKeys.map((metric) => (
          <div key={metric.key} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">{t(metric.labelKey)}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatValue(stats[metric.key], metric.suffix)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
