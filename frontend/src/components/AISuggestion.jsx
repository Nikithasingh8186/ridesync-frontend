import React, { useState } from "react";
import { getAISuggestions } from "../services/api.js";

/**
 * AISuggestion — shows AI-powered commute tips for a given route.
 *
 * Props:
 *   originLat, originLng, destinationLat, destinationLng — floats
 *   preferredDeparture — string e.g. "08:30"
 *   onPickSuggestion — callback(rideId) when user accepts the top pick
 */
export default function AISuggestion({
  originLat, originLng,
  destinationLat, destinationLng,
  preferredDeparture,
  onPickSuggestion,
}) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  async function fetchSuggestion() {
    setLoading(true);
    setError(null);
    try {
      const res = await getAISuggestions({
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
        preferred_departure: preferredDeparture,
      });
      setSuggestion(res.data.suggestion);
    } catch (e) {
      setError("Could not load AI suggestions right now.");
    } finally {
      setLoading(false);
    }
  }

  if (dismissed) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <p className="text-sm font-medium text-indigo-800">AI commute suggestions</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-indigo-300 hover:text-indigo-500 text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {!suggestion && !loading && (
        <button
          onClick={fetchSuggestion}
          className="w-full py-2 text-sm font-medium text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          Get personalised suggestions
        </button>
      )}

      {loading && (
        <p className="text-sm text-indigo-500 animate-pulse">Thinking…</p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {suggestion && (
        <div className="space-y-3">
          <p className="text-sm text-indigo-700">{suggestion.reasoning}</p>

          {suggestion.tips?.length > 0 && (
            <ul className="space-y-1.5">
              {suggestion.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-indigo-600">
                  <span className="mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}

          {suggestion.top_pick_id && (
            <button
              onClick={() => onPickSuggestion?.(suggestion.top_pick_id)}
              className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View recommended ride
            </button>
          )}
        </div>
      )}
    </div>
  );
}