import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock } from "lucide-react";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:4000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed"
        );
      }

      // Save login information temporarily
      localStorage.setItem(
        "vit_exchange_token",
        data.token
      );

      localStorage.setItem(
        "vit_exchange_user",
        JSON.stringify(data.user)
      );

      alert("Login successful!");

      navigate("/");
    } catch (error) {
      console.error("Login failed:", error);

      setError(
        error.message ||
          "Unable to login. Please try again."
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
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="auth-card">

          <div className="auth-header">
            <p className="eyebrow">VIT EXCHANGE</p>

            <h1>Welcome back.</h1>

            <p>
              Login to buy, sell and rent items from
              fellow students.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >

            <div className="form-group">
              <label>VIT Email</label>

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
              <label>Password</label>

              <div className="auth-input">
                <Lock size={18} />

                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
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

            <div className="auth-options">
              <label className="remember-me">
                <input type="checkbox" />
                Remember me
              </label>

              <button
                type="button"
                className="forgot-password"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="primary-button auth-submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            className="google-button"
            type="button"
          >
            Continue with Google
          </button>

          <div className="auth-footer">
            <span>Don't have an account?</span>

            <button
              onClick={() => navigate("/signup")}
            >
              Create an account
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}

export default Login;