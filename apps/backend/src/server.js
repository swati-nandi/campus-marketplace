const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const pool = require("./config/db");
const listingsRouter = require("./routes/listings");
const authRouter = require("./routes/auth");
const requestsRouter = require("./routes/requests");
const wishlistRouter = require("./routes/wishlist");
const app = express();
const PORT = process.env.PORT || 4000;
app.use("/api/wishlist", wishlistRouter);
app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN ||
      "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    message: "VIT Exchange API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend is healthy",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM users"
    );

    res.json({
      status: "ok",
      message: "Database connection is working",
      users: result.rows[0].count,
    });
  } catch (error) {
    console.error(
      "Database test failed:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

app.use(
  "/api/listings",
  listingsRouter
);

app.use(
  "/api/auth",
  authRouter
);

app.use(
  "/api/requests",
  requestsRouter
);

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});