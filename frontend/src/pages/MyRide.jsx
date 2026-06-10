import React, { useState, useEffect } from "react";
import { getMyRides, getMyRequests } from "../services/api.js";
import RideCard from "../components/RideCard.jsx";

export default function MyRides() {
  const [rides, setRides] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState("offered");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [ridesRes, requestsRes] = await Promise.all([getMyRides(), getMyRequests()]);
      setRides(ridesRes.data);
      setRequests(requestsRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const requestsByRide = requests.reduce((acc, req) => {
    if (!acc[req.ride.id]) acc[req.ride.id] = [];
    acc[req.ride.id].push(req);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">My rides</h1>

      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: "offered", label: `Rides I'm driving (${rides.length})` },
          { key: "joined", label: `Rides I've joined (${requests.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
      ) : tab === "offered" ? (
        rides.length === 0 ? (
          <EmptyState icon="🚗" message="You haven't offered any rides yet." cta="Offer a ride" href="/offer" />
        ) : (
          <div className="space-y-3">
            {rides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                mode="manage"
                requests={requestsByRide[ride.id] || []}
                onRefresh={load}
              />
            ))}
          </div>
        )
      ) : (
        requests.length === 0 ? (
          <EmptyState icon="🔍" message="You haven't joined any rides yet." cta="Find a ride" href="/find" />
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <RideCard
                key={req.id}
                ride={{ ...req.ride, status: req.status }}
                mode="request"
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function EmptyState({ icon, message, cta, href }) {
  return (
    <div className="text-center py-16 text-gray-400 space-y-3">
      <p className="text-4xl">{icon}</p>
      <p className="text-sm">{message}</p>
      <a href={href} className="inline-block text-sm text-emerald-600 hover:underline">
        {cta} →
      </a>
    </div>
  );
}