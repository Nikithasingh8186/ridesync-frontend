import React, { useEffect, useState } from "react";
import { getMyRides, getMyRequests, getReceivedRequests } from "../services/api.js";
import RideCard from "../components/RideCard.jsx";

export default function MyRides() {
  const [rides, setRides] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [tab, setTab] = useState("offered");
  const [loading, setLoading] = useState(true);

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const [ridesRes, receivedRes, myRequestsRes] = await Promise.all([
        getMyRides(),
        getReceivedRequests(),
        getMyRequests(),
      ]);
      setRides(ridesRes.data);
      setReceivedRequests(receivedRes.data);
      setMyRequests(myRequestsRes.data);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const intervalId = setInterval(() => load({ silent: true }), 5000);
    return () => clearInterval(intervalId);
  }, []);

  const requestsByRide = receivedRequests.reduce((acc, req) => {
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
          { key: "joined", label: `Rides I've joined (${myRequests.length})` },
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
        <p className="text-sm text-gray-400 animate-pulse">Loading...</p>
      ) : tab === "offered" ? (
        rides.length === 0 ? (
          <EmptyState message="You have not offered any rides yet." cta="Offer a ride" href="/offer" />
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
      ) : myRequests.length === 0 ? (
        <EmptyState message="You have not joined any rides yet." cta="Find a ride" href="/find" />
      ) : (
        <div className="space-y-3">
          {myRequests.map((req) => (
            <RideCard
              key={req.id}
              ride={{ ...req.ride, status: req.status, request_id: req.id }}
              mode="request"
              onRefresh={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message, cta, href }) {
  return (
    <div className="text-center py-16 text-gray-400 space-y-3">
      <p className="text-sm">{message}</p>
      <a href={href} className="inline-block text-sm text-emerald-600 hover:underline">
        {cta}
      </a>
    </div>
  );
}
