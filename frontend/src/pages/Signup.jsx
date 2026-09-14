import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  HeartPulse,
  ArrowLeft,
  ShieldCheck,
  LockKeyhole,
  User,
  Mail,
  Lock,
} from "lucide-react";

import "./Signup.css";

function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !username ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (
        response.ok &&
        data.message ===
          "User registered successfully!"
      ) {
        alert("Account created successfully! 🎉");
        navigate("/login");
      } else {
        setError(
          data.message ||
            "Unable to create your account."
        );
      }
    } catch (error) {
      console.error("Signup error:", error);

      setError(
        "Unable to connect to the server. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <section className="signup-visual">
        <div className="signup-brand">
          <div className="signup-brand-icon">
            <HeartPulse size={22} />
          </div>

          <div>
            <h2>AmanAI</h2>
            <span>Healthcare Intelligence</span>
          </div>
        </div>

        <div className="signup-visual-content">
          <div className="mini-badge">
            <span />
            Your health matters
          </div>

          <h1>
            Your health,
            <br />
            <span>your journey.</span>
          </h1>

          <p>
            Create your AmanAI account and
            start exploring a smarter way to
            understand healthcare information.
          </p>

          <div className="signup-robot">
            <div className="signup-robot-glow" />

            <div className="signup-robot-head">
              <div className="signup-robot-face">
                <div className="signup-robot-eyes">
                  <span />
                  <span />
                </div>

                <div className="signup-robot-smile" />
              </div>
            </div>

            <div className="signup-robot-neck" />

            <div className="signup-robot-body">
              <div className="signup-coat">
                <div className="signup-stethoscope" />

                <div className="signup-heart">
                  <HeartPulse size={18} />
                </div>
              </div>
            </div>

            <div className="signup-heart-float">
              <HeartPulse size={22} />
            </div>
          </div>
        </div>

        <div className="signup-ecg">
          <svg viewBox="0 0 700 100" preserveAspectRatio="none">
            <path d="M0 52 H120 L140 52 L155 25 L170 78 L185 52 H280 L300 52 L315 43 L328 52 H420 L440 52 L456 20 L472 82 L488 52 H590 L610 52 L625 43 L640 52 H700" />
          </svg>
        </div>
      </section>

      <section className="signup-form-section">
        <div className="signup-form-wrapper">
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

            <h1>Create account</h1>
            <p>
              Join AmanAI and start your healthcare journey.
            </p>
          </div>

          <form
            className="signup-form"
            onSubmit={handleSignup}
          >
            <div className="input-group">
              <label htmlFor="username">Username</label>

              <div className="input-with-icon">
                <User size={17} />

                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="signup-email">
                Email address
              </label>

              <div className="input-with-icon">
                <Mail size={17} />

                <input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="signup-password">
                Password
              </label>

              <div className="input-with-icon">
                <Lock size={17} />

                <input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirm-password">
                Confirm password
              </label>

              <div className="input-with-icon">
                <Lock size={17} />

                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                />
              </div>
            </div>

            {error && (
              <p className="signup-error">{error}</p>
            )}

            <button
              type="submit"
              className="signup-submit"
              disabled={loading}
            >
              {loading
                ? "Creating account..."
                : "Create account"}
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
            <span>Already have an account?</span>

            <button
              type="button"
              onClick={() => navigate("/login")}
            >
              Sign in
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

export default Signup;