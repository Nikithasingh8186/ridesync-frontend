import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { offerRide } from "../services/api.js";

export default function OfferRide() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    origin_address: "",
    origin_lat: "",
    origin_lng: "",
    destination_address: "",
    destination_lat: "",
    destination_lng: "",
    departure_time: "",
    available_seats: 3,
    cost_per_person: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await offerRide({
        ...form,
        origin_lat: parseFloat(form.origin_lat),
        origin_lng: parseFloat(form.origin_lng),
        destination_lat: parseFloat(form.destination_lat),
        destination_lng: parseFloat(form.destination_lng),
        available_seats: parseInt(form.available_seats),
        cost_per_person: form.cost_per_person ? parseFloat(form.cost_per_person) : null,
        departure_time: new Date(form.departure_time).toISOString(),
      });
      navigate("/my-rides");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to post ride");
    } finally {
      setLoading(false);
    }
  }

  const field = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        required={!["cost_per_person"].includes(key)}
        type={type}
        step={type === "number" ? "any" : undefined}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Offer a ride</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Pickup address", "origin_address", "text", "Banjara Hills, Hyderabad")}
          {field("Destination address", "destination_address", "text", "Cyberabad, Hyderabad")}
          {field("Pickup latitude", "origin_lat", "number", "17.4126")}
          {field("Pickup longitude", "origin_lng", "number", "78.4071")}
          {field("Destination latitude", "destination_lat", "number", "17.4400")}
          {field("Destination longitude", "destination_lng", "number", "78.3489")}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Departure time</label>
            <input
              required type="datetime-local"
              value={form.departure_time} onChange={set("departure_time")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Available seats</label>
            <select
              value={form.available_seats}
              onChange={set("available_seats")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n} seat{n > 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Cost per person (₹) <span className="text-gray-400">— optional</span>
            </label>
            <input
              type="number" min="0" step="1"
              value={form.cost_per_person} onChange={set("cost_per_person")}
              placeholder="Leave blank to let RideSync estimate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Posting…" : "Post ride"}
        </button>
      </form>
    </div>
  );
}