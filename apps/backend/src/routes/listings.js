const express = require("express");
const pool = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// GET ALL AVAILABLE LISTINGS
// ============================================================

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        l.id,
        l.title,
        l.description,
        l.condition,
        l.listing_type,
        l.price,
        l.deposit,
        l.rental_unit,
        l.status,
        l.created_at,
        c.name AS category_name,
        loc.name AS location_name,
        p.full_name AS owner_name
      FROM listings l
      JOIN categories c
        ON c.id = l.category_id
      LEFT JOIN campus_locations loc
        ON loc.id = l.location_id
      JOIN user_profiles p
        ON p.user_id = l.owner_id
      JOIN users u
        ON u.id = l.owner_id
      WHERE l.status = 'available'
        AND u.is_suspended = false
      ORDER BY l.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch listings:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch listings",
    });
  }
});

// ============================================================
// CREATE A NEW LISTING
// ============================================================

router.post(
  "/",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        title,
        category,
        description,
        condition,
        price,
        deposit,
        location,
        listingType,
      } = req.body;

      // --------------------------------------------------------
      // Validate required fields
      // --------------------------------------------------------

      if (
        !title ||
        !category ||
        !description ||
        !condition ||
        price === undefined ||
        !location ||
        !listingType
      ) {
        return res.status(400).json({
          status: "error",
          message: "Please fill in all required fields",
        });
      }

      // --------------------------------------------------------
      // Find category
      // --------------------------------------------------------

      const categoryResult = await pool.query(
        `
        SELECT id
        FROM categories
        WHERE name = $1
        `,
        [category]
      );

      if (categoryResult.rows.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Invalid category",
        });
      }

      // --------------------------------------------------------
      // Find campus location
      // --------------------------------------------------------

      const locationResult = await pool.query(
        `
        SELECT id
        FROM campus_locations
        WHERE name = $1
        `,
        [location]
      );

      if (locationResult.rows.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Invalid campus location",
        });
      }

      // --------------------------------------------------------
      // Create listing using logged-in user
      // --------------------------------------------------------

      const result = await pool.query(
        `
        INSERT INTO listings (
          owner_id,
          category_id,
          location_id,
          title,
          description,
          condition,
          listing_type,
          price,
          deposit,
          rental_unit
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10
        )
        RETURNING *
        `,
        [
          req.user.userId,
          categoryResult.rows[0].id,
          locationResult.rows[0].id,
          title,
          description,
          condition,
          listingType,
          price,
          listingType === "rental" ? deposit : null,
          listingType === "rental" ? "day" : null,
        ]
      );

      res.status(201).json({
        status: "ok",
        message: "Listing created successfully",
        listing: result.rows[0],
      });
    } catch (error) {
      console.error(
        "Failed to create listing:",
        error
      );

      res.status(500).json({
        status: "error",
        message: "Failed to create listing",
      });
    }
  }
);

// ============================================================
// GET ONE LISTING BY ID
// ============================================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        l.id,
        l.title,
        l.description,
        l.condition,
        l.listing_type,
        l.price,
        l.deposit,
        l.rental_unit,
        l.status,
        l.created_at,
        c.name AS category_name,
        loc.name AS location_name,
        p.full_name AS owner_name
      FROM listings l
      JOIN categories c
        ON c.id = l.category_id
      LEFT JOIN campus_locations loc
        ON loc.id = l.location_id
      JOIN user_profiles p
        ON p.user_id = l.owner_id
      JOIN users u
        ON u.id = l.owner_id
      WHERE l.id = $1
        AND l.status = 'available'
        AND u.is_suspended = false
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Listing not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(
      "Failed to fetch listing:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to fetch listing",
    });
  }
});

module.exports = router;