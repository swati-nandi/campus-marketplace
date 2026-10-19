const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../config/db");

const router = express.Router();

// ============================================================
// LOGIN
// ============================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    // Find user
    const result = await pool.query(
      `
      SELECT
        id,
        email,
        password_hash,
        role,
        is_suspended
      FROM users
      WHERE email = $1
      `,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // Check if account is suspended
    if (user.is_suspended) {
      return res.status(403).json({
        status: "error",
        message: "Your account has been suspended",
      });
    }

    // Compare password
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      status: "ok",
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);

    res.status(500).json({
      status: "error",
      message: "Login failed",
    });
  }
});

module.exports = router;