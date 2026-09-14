import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  HeartPulse,
  Globe,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "en"
  );

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const isArabic = language === "ar";

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("access_token");
      const role = localStorage.getItem("role");

      setIsLoggedIn(Boolean(token));
      setIsAdmin(Boolean(token) && role === "admin");
    };

    checkAuth();

    const handleStorageChange = (event) => {
      if (
        ["access_token", "role", "username", "email"].includes(
          event.key
        )
      ) {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () =>
      window.removeEventListener("storage", handleStorageChange);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem("language", language);

    document.documentElement.lang = language;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
  }, [language, isArabic]);

  useEffect(() => {
    const theme = darkMode ? "dark" : "light";

    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle(
      "dark-mode",
      darkMode
    );
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  const toggleLanguage = () => {
    setLanguage((current) => {
      const next = current === "ar" ? "en" : "ar";

      window.dispatchEvent(
        new CustomEvent("amanai-language-change", {
          detail: next,
        })
      );

      return next;
    });
  };

  const toggleTheme = () => {
    setDarkMode((current) => {
      const next = !current;

      window.dispatchEvent(
        new CustomEvent("amanai-theme-change", {
          detail: next,
        })
      );

      return next;
    });
  };

  const handleLogout = () => {
    [
      "access_token",
      "role",
      "username",
      "email",
      "active_conversation_id",
    ].forEach((key) => localStorage.removeItem(key));

    ["access_token", "role", "username", "email"].forEach(
      (key) => sessionStorage.removeItem(key)
    );

    setIsLoggedIn(false);
    setIsAdmin(false);

    navigate("/");
  };

  const goToChat = () => {
    navigate(isLoggedIn ? "/chat" : "/login");
  };

  const goToAdmin = () => {
    if (isAdmin) navigate("/admin");
  };

  return (
    <header
      className={`main-navbar ${
        darkMode ? "navbar-dark" : ""
      }`}
    >
      <div
        className="main-navbar-brand"
        onClick={() => navigate("/")}
      >
        <div className="main-navbar-logo">
          <HeartPulse size={22} />
        </div>

        <div className="main-navbar-brand-text">
          <h2>AmanAI</h2>
          <span>
            {isArabic
              ? "الذكاء الصحي"
              : "Healthcare Intelligence"}
          </span>
        </div>
      </div>

      <nav className="main-navbar-actions">
        <button
          type="button"
          className={`navbar-chat-button ${
            location.pathname === "/chat"
              ? "navbar-active"
              : ""
          }`}
          onClick={goToChat}
        >
          {isArabic ? "المحادثة" : "Chat"}
        </button>

        {isAdmin && (
          <button
            type="button"
            className={`navbar-admin-button ${
              location.pathname === "/admin"
                ? "navbar-active"
                : ""
            }`}
            onClick={goToAdmin}
          >
            <ShieldCheck size={16} />
            {isArabic ? "الإدارة" : "Admin"}
          </button>
        )}

        <button
          type="button"
          className="navbar-language-button"
          onClick={toggleLanguage}
          title={
            isArabic
              ? "Switch to English"
              : "التبديل إلى العربية"
          }
        >
          <Globe size={17} />
          <span>{isArabic ? "EN" : "العربية"}</span>
        </button>

        <button
          type="button"
          className="navbar-theme-button"
          onClick={toggleTheme}
          title={
            darkMode
              ? isArabic
                ? "الوضع الفاتح"
                : "Light mode"
              : isArabic
              ? "الوضع الداكن"
              : "Dark mode"
          }
        >
          {darkMode ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        {isLoggedIn ? (
          <button
            type="button"
            className="navbar-logout-button"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            <span>
              {isArabic ? "تسجيل الخروج" : "Logout"}
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="navbar-login-button"
            onClick={() => navigate("/login")}
          >
            {isArabic ? "تسجيل الدخول" : "Sign In"}
          </button>
        )}
      </nav>
    </header>
  );
}

export default Navbar;