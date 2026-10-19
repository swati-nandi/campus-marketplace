const express = require("express");

const pool = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// GET USER WISHLIST
// ============================================================

router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        w.listing_id,
        w.added_at,
        l.title,
        l.price,
        l.listing_type,
        l.condition,
        c.name AS category_name,
        loc.name AS location_name
      FROM wishlist_items w
      JOIN listings l
        ON l.id = w.listing_id
      JOIN categories c
        ON c.id = l.category_id
      JOIN campus_locations loc
        ON loc.id = l.location_id
      WHERE w.user_id = $1
      ORDER BY w.added_at DESC
      `,
      [req.user.userId]
    );

    res.json({
      status: "ok",
      wishlist: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch wishlist:", error);

    res.status(500).json({
      status: "error",
      message: "Could not fetch wishlist",
    });
  }
});

// ============================================================
// ADD LISTING TO WISHLIST
// ============================================================

router.post("/:listingId", authenticateToken, async (req, res) => {
  try {
    const { listingId } = req.params;

    await pool.query(
      `
      INSERT INTO wishlist_items (
        user_id,
        listing_id
      )
      VALUES ($1, $2)
      ON CONFLICT (user_id, listing_id)
      DO NOTHING
      `,
      [req.user.userId, listingId]
    );

    res.status(201).json({
      status: "ok",
      message: "Added to wishlist",
    });
  } catch (error) {
    console.error("Failed to add wishlist:", error);

    res.status(500).json({
      status: "error",
      message: "Could not add to wishlist",
    });
  }
});

// ============================================================
// REMOVE LISTING FROM WISHLIST
// ============================================================

router.delete("/:listingId", authenticateToken, async (req, res) => {
  try {
    const { listingId } = req.params;

    await pool.query(
      `
      DELETE FROM wishlist_items
      WHERE user_id = $1
        AND listing_id = $2
      `,
      [req.user.userId, listingId]
    );

    res.json({
      status: "ok",
      message: "Removed from wishlist",
    });
  } catch (error) {
    console.error("Failed to remove wishlist:", error);

    res.status(500).json({
      status: "error",
      message: "Could not remove from wishlist",
    });
  }
});

module.exports = router;