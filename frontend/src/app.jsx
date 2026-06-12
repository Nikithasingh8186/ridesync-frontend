import React, { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import Login from "./pages/login.jsx";
import FindRide from "./pages/FindRide.jsx";
import OfferRide from "./pages/OfferRide.jsx";
import MyRides from "./pages/MyRide.jsx";
import Stats from "./pages/Stats.jsx";
import Requests from "./pages/Requests";
import Settings from "./pages/Settings.jsx";
// ---------- Auth context ----------

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
      setUser(null);
    }
  }, [token]);

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------- Protected route wrapper ----------

function Protected({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

// ---------- App ----------

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <Protected>
                  <Navbar />
                  <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
                    <Routes>
                      <Route path="/" element={<Navigate to="/find" replace />} />
                      <Route path="/find" element={<FindRide />} />
                      <Route path="/offer" element={<OfferRide />} />
                      <Route path="/my-rides" element={<MyRides />} />
                      <Route path="/stats" element={<Stats />} />
                      <Route path="/requests" element={<Requests />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </main>
                </Protected>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}