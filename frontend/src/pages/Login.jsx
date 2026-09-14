import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  HeartPulse,
  ArrowLeft,
  ShieldCheck,
  LockKeyhole,
} from "lucide-react";

import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("role");

    if (!token) return;

    navigate(
      role === "admin" ? "/admin" : "/chat",
      { replace: true }
    );
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.detail ||
            data.message ||
            "Invalid email or password."
        );
        return;
      }

      if (!data.access_token) {
        setError("Invalid email or password.");
        return;
      }

      const user = data.user || {};
      const role = user.role || "user";

      [
        "access_token",
        "role",
        "username",
        "email",
      ].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      localStorage.setItem(
        "access_token",
        data.access_token
      );
      localStorage.setItem("role", role);

      if (user.username) {
        localStorage.setItem("username", user.username);
      }

      if (user.email) {
        localStorage.setItem("email", user.email);
      }

      navigate(
        role === "admin" ? "/admin" : "/chat",
        { replace: true }
      );
    } catch (error) {
      console.error("Login error:", error);
      setError(
        "Unable to connect to the server. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-visual">
        <div className="login-brand">
          <div className="login-brand-icon">
            <HeartPulse size={22} />
          </div>

          <div>
            <h2>AmanAI</h2>
            <span>Healthcare Intelligence</span>
          </div>
        </div>

        <div className="login-visual-content">
          <div className="mini-badge">
            <span />
            Your health matters
          </div>

          <h1>
            Welcome back
            <br />
            to <span>AmanAI.</span>
          </h1>

          <p>
            Continue your journey with your
            intelligent healthcare companion.
          </p>

          <div className="login-robot">
            <div className="robot-glow" />

            <div className="login-robot-head">
              <div className="login-robot-face">
                <div className="login-robot-eyes">
                  <span />
                  <span />
                </div>
                <div className="login-robot-smile" />
              </div>
            </div>

            <div className="login-robot-neck" />

            <div className="login-robot-body">
              <div className="login-coat">
                <div className="login-stethoscope" />
                <div className="login-heart">
                  <HeartPulse size={18} />
                </div>
              </div>
            </div>

            <div className="login-heart-float">
              <HeartPulse size={22} />
            </div>
          </div>
        </div>

        <div className="login-ecg">
          <svg viewBox="0 0 700 100" preserveAspectRatio="none">
            <path d="M0 52 H120 L140 52 L155 25 L170 78 L185 52 H280 L300 52 L315 43 L328 52 H420 L440 52 L456 20 L472 82 L488 52 H590 L610 52 L625 43 L640 52 H700" />
          </svg>
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-form-wrapper">
          <button
            type="button"
            className="back-home"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={17} />
            Back to home
          </button>

          <div className="form-heading">
            <div className="mobile-logo">
              <HeartPulse size={22} />
            </div>

            <h1>Sign in</h1>
            <p>
              Welcome back. Please enter your details.
            </p>
          </div>

          <form
            className="login-form"
            onSubmit={handleLogin}
          >
            <div className="input-group">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="input-group">
              <div className="password-label">
                <label htmlFor="password">Password</label>

                <button
                  type="button"
                  className="forgot-password"
                >
                  Forgot password?
                </button>
              </div>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="remember-row">
              <label>
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
            </div>

            {error && (
              <p className="login-error">{error}</p>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="security-note">
            <ShieldCheck size={17} />

            <div>
              <strong>Your information is secure</strong>
              <p>
                AmanAI protects your account with
                secure authentication.
              </p>
            </div>
          </div>

          <div className="signup-prompt">
            <span>Don't have an account?</span>

            <button
              type="button"
              onClick={() => navigate("/signup")}
            >
              Create an account
            </button>
          </div>

          <div className="login-footer">
            <LockKeyhole size={13} />
            Secure healthcare experience
          </div>
        </div>
      </section>
    </div>
  );
}

export default Login;