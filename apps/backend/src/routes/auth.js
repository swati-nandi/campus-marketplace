const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../config/db");

const router = express.Router();

// ===============================
// POST /api/auth/signup
// ===============================
router.post("/signup", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      name,
      email,
      password,
    } = req.body;

    // -------------------------------
    // Basic validation
    // -------------------------------

    if (!name || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Name, email and password are required",
      });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      return res.status(400).json({
        status: "error",
        message: "Full name is required",
      });
    }

    // Only VIT student emails
    if (!normalizedEmail.endsWith("@vitstudent.ac.in")) {
      return res.status(400).json({
        status: "error",
        message:
          "Please use your VIT student email address",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: "error",
        message:
          "Password must be at least 8 characters long",
      });
    }

    // -------------------------------
    // Check whether user already exists
    // -------------------------------

    const existingUser = await client.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message:
          "An account with this email already exists",
      });
    }

    // -------------------------------
    // Hash password
    // -------------------------------

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    // -------------------------------
    // Create user + profile together
    // -------------------------------

    await client.query("BEGIN");

    const userResult = await client.query(
      `
      INSERT INTO users (
        email,
        password_hash,
        role
      )
      VALUES ($1, $2, 'student')
      RETURNING id, email, role
      `,
      [
        normalizedEmail,
        passwordHash,
      ]
    );

    const user = userResult.rows[0];

    await client.query(
      `
      INSERT INTO user_profiles (
        user_id,
        full_name
      )
      VALUES ($1, $2)
      `,
      [
        user.id,
        trimmedName,
      ]
    );

    await client.query("COMMIT");

    // -------------------------------
    // Success
    // -------------------------------

    res.status(201).json({
      status: "ok",
      message:
        "Account created successfully",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Signup failed:",
      error
    );

    // PostgreSQL unique constraint
    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message:
          "An account with this email already exists",
      });
    }

    res.status(500).json({
      status: "error",
      message:
        "Could not create your account",
    });
  } finally {
    client.release();
  }
});

// ===============================
// POST /api/auth/login
// ===============================
router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.role,
        u.is_suspended,
        p.full_name
      FROM users u
      LEFT JOIN user_profiles p
        ON p.user_id = u.id
      WHERE u.email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message:
          "Invalid email or password",
      });
    }

    const user = result.rows[0];

    if (user.is_suspended) {
      return res.status(403).json({
        status: "error",
        message:
          "Your account has been suspended",
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!passwordMatches) {
      return res.status(401).json({
        status: "error",
        message:
          "Invalid email or password",
      });
    }

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
        fullName: user.full_name,
      },
    });
  } catch (error) {
    console.error(
      "Login failed:",
      error
    );

    res.status(500).json({
      status: "error",
      message:
        "Could not login",
    });
  }
});

module.exports = router;