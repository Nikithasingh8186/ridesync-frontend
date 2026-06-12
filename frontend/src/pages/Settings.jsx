import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import { getAiSettingsForForm, saveAiSettings } from "../services/settings.js";

export default function Settings() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [aiMode, setAiMode] = useState("cloud");
  const [localEndpoint, setLocalEndpoint] = useState("http://localhost:11434");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const settings = getAiSettingsForForm();
    setAiMode(settings.aiMode);
    setLocalEndpoint(settings.localEndpoint);
    setApiKey(settings.apiKey || "");
  }, []);

  function handleSave(e) {
    e.preventDefault();
    saveAiSettings({ aiMode, localEndpoint, apiKey });
    setStatus(t("settings.saved"));
    setTimeout(() => setStatus(""), 2500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("settings.subtitle")}</p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-5 space-y-6">
        <section className="space-y-4">
          <h2 className="text-base font-medium text-gray-800">{t("settings.languageTitle")}</h2>
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="te">తెలుగు</option>
            </select>
            <button
              type="button"
              onClick={() => setLanguage(language)}
              className="text-sm text-emerald-600 hover:underline"
            >
              {t("app.translatePage")}
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-medium text-gray-800">{t("settings.aiTitle")}</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={aiMode === "local"}
                onChange={(e) => setAiMode(e.target.checked ? "local" : "cloud")}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>{t("settings.useLocal")}</span>
            </label>
            <div className="space-y-2">
              <label className="block text-sm text-gray-600">{t("settings.localEndpoint")}</label>
              <input
                type="text"
                value={localEndpoint}
                onChange={(e) => setLocalEndpoint(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm text-gray-600">{t("settings.apiKey")}</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t("settings.apiKeyPlaceholder")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <p className="text-sm text-gray-500">{t("settings.cloudDefault")}</p>
            <p className="text-sm text-gray-500">{t("settings.localNote")}</p>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            type="submit"
            className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t("settings.save")}
          </button>
          {status && <span className="text-sm text-emerald-700">{status}</span>}
        </div>
      </form>
    </div>
  );
}
