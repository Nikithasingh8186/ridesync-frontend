import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { sendAiChat } from "../services/api.js";

export default function AI() {
  const { t } = useTranslation();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function askAI(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer("");
    try {
      const res = await sendAiChat({ question });
      setAnswer(res.data.answer || t("ai.chatError"));
    } catch (err) {
      setError(err.response?.data?.detail || t("ai.chatError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t("ai.chatTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("ai.chatFallback")}</p>
      </div>

      <form onSubmit={askAI} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">{t("ai.chatPlaceholder")}</label>
          <textarea
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("ai.chatPlaceholder")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("ai.send")}
        </button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {answer && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-900">{t("ai.responseTitle")}</h2>
          <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">{answer}</p>
        </div>
      )}
    </div>
  );
}
