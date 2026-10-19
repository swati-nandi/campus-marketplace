import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, User } from "lucide-react";

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    console.log("Signup data:", formData);

    alert("Account creation will be connected to the backend later.");
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

            <h1>Create your account.</h1>

            <p>
              Join the campus marketplace and start exchanging items.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">

            <div className="form-group">
              <label>Full Name</label>

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
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>

              <div className="auth-input">
                <Lock size={18} />

                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="primary-button auth-submit"
            >
              Create Account
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
            <span>Already have an account?</span>

            <button
              onClick={() => navigate("/login")}
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