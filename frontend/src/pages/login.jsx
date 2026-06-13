import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login, register, getMe } from "../services/api.js";
import { useAuth } from "../App.jsx";

export default function Login() {
  const { t } = useTranslation();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "register") {
        await register({ email: form.email, password: form.password, full_name: form.full_name });
      }
      const tokenRes = await login(form.email, form.password);
      const token = tokenRes.data.access_token;
      localStorage.setItem("token", token);
      const userRes = await getMe();
      authLogin(token, userRes.data);
      navigate("/find");
    } catch (err) {
      setError(err.response?.data?.detail || t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="text-3xl mb-2">🚗</div>
          <h1 className="text-xl font-semibold text-gray-900">{t("app.name")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("app.tagline")}</p>
        </div>

        {/* Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {["login", "register"].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              {m === "login" ? t("auth.signIn") : t("auth.signUp")}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t("auth.fullName")}</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={set("full_name")}
                placeholder={t("auth.fullNamePlaceholder")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t("auth.workEmail")}</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={set("email")}
              placeholder={t("auth.emailPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t("auth.password")}</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={set("password")}
              placeholder={t("auth.passwordPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? t("auth.pleaseWait") : mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
          </button>
        </form>
      </div>
    </div>
  );
}