import React, { useEffect, useState } from "react";
import { searchRides } from "../services/api.js";
import RideCard from "../components/RideCard.jsx";
import AISuggestion from "../components/AISuggestion.jsx";

export default function FindRide() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [form, setForm] = useState({
    origin_address: "",
    origin_lat: "",
    origin_lng: "",
    destination_address: "",
    destination_lat: "",
    destination_lng: "",
    departure_time: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const buildParams = () => ({
    origin_lat: parseFloat(form.origin_lat),
    origin_lng: parseFloat(form.origin_lng),
    destination_lat: parseFloat(form.destination_lat),
    destination_lng: parseFloat(form.destination_lng),
    departure_time: new Date(form.departure_time).toISOString(),
  });

  async function loadRides({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const res = await searchRides(buildParams());
      setRides(res.data);
      setSearched(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    await loadRides();
  }

  useEffect(() => {
    if (!searched) return undefined;
    const intervalId = setInterval(() => loadRides({ silent: true }), 5000);
    return () => clearInterval(intervalId);
  }, [searched, form.origin_lat, form.origin_lng, form.destination_lat, form.destination_lng, form.departure_time]);

  const preferredTime = form.departure_time
    ? new Date(form.departure_time).toTimeString().slice(0, 5)
    : "08:30";

  const allCoords =
    form.origin_lat && form.origin_lng && form.destination_lat && form.destination_lng;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Find a ride</h1>

      <form onSubmit={handleSearch} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Pickup address</label>
            <input
              required
              value={form.origin_address}
              onChange={set("origin_address")}
              placeholder="Banjara Hills, Hyderabad"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Destination address</label>
            <input
              required
              value={form.destination_address}
              onChange={set("destination_address")}
              placeholder="Cyberabad, Hyderabad"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Pickup latitude</label>
            <input
              required type="number" step="any"
              value={form.origin_lat} onChange={set("origin_lat")}
              placeholder="17.4126"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Pickup longitude</label>
            <input
              required type="number" step="any"
              value={form.origin_lng} onChange={set("origin_lng")}
              placeholder="78.4071"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Destination latitude</label>
            <input
              required type="number" step="any"
              value={form.destination_lat} onChange={set("destination_lat")}
              placeholder="17.4400"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Destination longitude</label>
            <input
              required type="number" step="any"
              value={form.destination_lng} onChange={set("destination_lng")}
              placeholder="78.3489"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Preferred departure time</label>
            <input
              required type="datetime-local"
              value={form.departure_time} onChange={set("departure_time")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search rides"}
        </button>
      </form>

      {allCoords && (
        <AISuggestion
          originLat={parseFloat(form.origin_lat)}
          originLng={parseFloat(form.origin_lng)}
          destinationLat={parseFloat(form.destination_lat)}
          destinationLng={parseFloat(form.destination_lng)}
          preferredDeparture={preferredTime}
        />
      )}

      {searched && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {rides.length} ride{rides.length !== 1 ? "s" : ""} found
          </p>
          {rides.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🚗</p>
              <p className="text-sm">No rides match your search. Try a wider time window or check back later.</p>
            </div>
          ) : (
            rides.map((ride) => (
              <RideCard key={ride.id} ride={ride} mode="find" onRefresh={loadRides} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
