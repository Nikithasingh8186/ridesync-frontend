import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../App.jsx";
import { useLanguage } from "../i18n/LanguageProvider.jsx";

export default function Navbar() {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const links = [
    { to: "/find", label: t("nav.find") },
    { to: "/offer", label: t("nav.offer") },
    { to: "/my-rides", label: t("nav.myRides") },
    { to: "/stats", label: t("nav.stats") },
    { to: "/requests", label: t("nav.requests") },
    { to: "/settings", label: t("nav.settings") },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/find" className="flex items-center gap-2 font-semibold text-emerald-600">
          <span className="text-xl">🚗</span>
          <span>RideSync</span>
        </NavLink>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-1">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* User + logout */}
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="hidden sm:block px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="te">తెలుగు</option>
          </select>
          {user && (
            <span className="hidden sm:block text-sm text-gray-500">
              {user.full_name}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            {t("nav.signOut")}
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-10">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-xs font-medium transition-colors ${
                isActive ? "text-emerald-600" : "text-gray-500"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}