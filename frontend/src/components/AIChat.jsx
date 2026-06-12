import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { sendAiChat } from "../services/api.js";

export default function AIChat({ originLat, originLng, destinationLat, destinationLng }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSend(e) {
    e.preventDefault();
    if (!query.trim()) return;
    const userMessage = { role: "user", text: query.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);
    setError(null);

    try {
      const res = await sendAiChat({
        question: userMessage.text,
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
      });
      setMessages((prev) => [...prev, { role: "assistant", text: res.data.answer }]);
    } catch (err) {
      setError(t("ai.chatError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t("ai.chatTitle")}</h2>
          <p className="text-sm text-gray-500">{t("ai.chatFallback")}</p>
        </div>
      </div>

      <div className="space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-2xl p-3 text-sm ${
              message.role === "assistant"
                ? "bg-indigo-50 text-indigo-800"
                : "bg-gray-100 text-gray-900"
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <form onSubmit={handleSend} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("ai.chatPlaceholder")}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("ai.send")}
        </button>
      </form>
    </div>
  );
}
