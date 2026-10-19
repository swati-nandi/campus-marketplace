import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
} from "lucide-react";

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // -------------------------------
    // Password validation
    // -------------------------------

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    if (formData.password.length < 8) {
      setError(
        "Password must be at least 8 characters long."
      );
      return;
    }

    // -------------------------------
    // VIT email validation
    // -------------------------------

    const email =
      formData.email.trim().toLowerCase();

    if (
      !email.endsWith(
        "@vitstudent.ac.in"
      )
    ) {
      setError(
        "Please use your VIT student email address."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:4000/api/auth/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            email,
            password: formData.password,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not create your account."
        );
      }

      setSuccess(
        "Account created successfully! Redirecting to login..."
      );

      // Do NOT store password or account
      // information in localStorage.

      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      console.error(
        "Signup failed:",
        error
      );

      setError(
        error.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">

        <button
          className="back-button"
          onClick={() => navigate("/")}
          type="button"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="auth-card">

          <div className="auth-header">
            <p className="eyebrow">
              VIT EXCHANGE
            </p>

            <h1>
              Create your account.
            </h1>

            <p>
              Join the campus marketplace
              and start exchanging items.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >

            <div className="form-group">
              <label>
                Full Name
              </label>

              <div className="auth-input">
                <User size={18} />

                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                VIT Email
              </label>

              <div className="auth-input">
                <Mail size={18} />

                <input
                  type="email"
                  name="email"
                  placeholder="yourname@vitstudent.ac.in"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Password
              </label>

              <div className="auth-input">
                <Lock size={18} />

                <input
                  type="password"
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Confirm Password
              </label>

              <div className="auth-input">
                <Lock size={18} />

                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={
                    formData.confirmPassword
                  }
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {error && (
              <p
                style={{
                  color: "#dc2626",
                  marginTop: "4px",
                  marginBottom: "4px",
                }}
              >
                {error}
              </p>
            )}

            {success && (
              <p
                style={{
                  color: "#15803d",
                  marginTop: "4px",
                  marginBottom: "4px",
                }}
              >
                {success}
              </p>
            )}

            <button
              type="submit"
              className="primary-button auth-submit"
              disabled={loading}
            >
              {loading
                ? "Creating Account..."
                : "Create Account"}
            </button>

          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            className="google-button"
            type="button"
            onClick={() => {
              setError(
                "Google Sign In is not configured yet."
              );
            }}
          >
            Continue with Google
          </button>

          <div className="auth-footer">
            <span>
              Already have an account?
            </span>

            <button
              onClick={() =>
                navigate("/login")
              }
              type="button"
            >
              Login
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}

export default Signup;