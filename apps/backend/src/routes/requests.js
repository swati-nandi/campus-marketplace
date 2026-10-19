const express = require("express");

const pool = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

/*
  POST /api/requests

  Sale:
    Creates a purchase request.

  Rental:
    Creates a rental booking.

  Borrow:
    Creates a rental booking with total price = 0.
*/

router.post("/", authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.userId;

    const {
      listingId,
      message,
      startDate,
      endDate,
    } = req.body;

    if (!listingId) {
      return res.status(400).json({
        status: "error",
        message: "Listing ID is required",
      });
    }

    await client.query("BEGIN");

    await client.query(
      `SELECT set_config('app.user_id', $1, true)`,
      [String(userId)]
    );

    const listingResult = await client.query(
      `
      SELECT
        l.id,
        l.owner_id,
        l.title,
        l.listing_type,
        l.price,
        l.deposit,
        l.rental_unit,
        l.status
      FROM listings l
      WHERE l.id = $1
      FOR UPDATE
      `,
      [listingId]
    );

    if (listingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        status: "error",
        message: "Listing not found",
      });
    }

    const listing = listingResult.rows[0];

    if (listing.status !== "available") {
      await client.query("ROLLBACK");

      return res.status(409).json({
        status: "error",
        message: "This listing is no longer available",
      });
    }

    if (Number(listing.owner_id) === Number(userId)) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        status: "error",
        message: "You cannot request your own listing",
      });
    }

    /*
      SALE
    */

    if (listing.listing_type === "sale") {
      const existingRequest = await client.query(
        `
        SELECT id
        FROM purchase_requests
        WHERE listing_id = $1
          AND buyer_id = $2
          AND status = 'pending'
        LIMIT 1
        `,
        [listingId, userId]
      );

      if (existingRequest.rows.length > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          status: "error",
          message:
            "You already have a pending request for this item",
        });
      }

      const requestResult = await client.query(
        `
        INSERT INTO purchase_requests (
          listing_id,
          buyer_id,
          message
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          listing_id,
          buyer_id,
          message,
          status,
          created_at
        `,
        [
          listingId,
          userId,
          message || null,
        ]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        status: "ok",
        message: "Purchase request sent successfully",
        request: requestResult.rows[0],
      });
    }

    /*
      RENTAL / BORROW
    */

    if (
      listing.listing_type === "rental" ||
      listing.listing_type === "borrow"
    ) {
      if (!startDate || !endDate) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          status: "error",
          message:
            "Start date and end date are required",
        });
      }

      const start = new Date(
        `${startDate}T00:00:00`
      );

      const end = new Date(
        `${endDate}T00:00:00`
      );

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          status: "error",
          message: "Invalid rental dates",
        });
      }

      if (end < start) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          status: "error",
          message:
            "End date cannot be before the start date",
        });
      }

      /*
        Prevent a user from creating another
        pending request for the exact same
        rental period.
      */

      const existingBooking = await client.query(
        `
        SELECT id
        FROM rental_bookings
        WHERE listing_id = $1
          AND renter_id = $2
          AND status = 'requested'
          AND start_date = $3
          AND end_date = $4
        LIMIT 1
        `,
        [
          listingId,
          userId,
          startDate,
          endDate,
        ]
      );

      if (existingBooking.rows.length > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          status: "error",
          message:
            "You already have a request for these dates",
        });
      }

      /*
        Calculate rental price.
      */

      const millisecondsPerDay =
        1000 * 60 * 60 * 24;

      const numberOfDays =
        Math.floor(
          (end - start) / millisecondsPerDay
        ) + 1;

      let totalPrice = 0;

      if (listing.listing_type === "rental") {
        const price = Number(
          listing.price || 0
        );

        if (listing.rental_unit === "day") {
          totalPrice =
            price * numberOfDays;
        } else if (
          listing.rental_unit === "week"
        ) {
          totalPrice =
            price *
            Math.ceil(numberOfDays / 7);
        } else if (
          listing.rental_unit === "month"
        ) {
          totalPrice =
            price *
            Math.ceil(numberOfDays / 30);
        }
      }

      const depositAmount =
        Number(listing.deposit || 0);

      const bookingResult = await client.query(
        `
        INSERT INTO rental_bookings (
          listing_id,
          renter_id,
          start_date,
          end_date,
          total_price,
          deposit_amount,
          condition_before
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          listing_id,
          renter_id,
          start_date,
          end_date,
          status,
          total_price,
          deposit_amount,
          created_at
        `,
        [
          listingId,
          userId,
          startDate,
          endDate,
          totalPrice,
          depositAmount,
          null,
        ]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        status: "ok",
        message:
          listing.listing_type === "borrow"
            ? "Borrow request sent successfully"
            : "Rental request sent successfully",
        booking: bookingResult.rows[0],
      });
    }

    await client.query("ROLLBACK");

    return res.status(400).json({
      status: "error",
      message: "Unsupported listing type",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Request creation failed:",
      error
    );

    if (error.code === "23P01") {
      return res.status(409).json({
        status: "error",
        message:
          "These dates are already booked",
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message:
          "You already have a pending request for this listing",
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        status: "error",
        message:
          error.message ||
          "Request could not be created",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Could not create request",
    });
  } finally {
    client.release();
  }
});

/*
  GET /api/requests/my

  Returns all requests made by
  the currently logged-in user.
*/

router.get(
  "/my",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.userId;

      const purchaseRequests =
        await pool.query(
          `
          SELECT
            pr.id,
            pr.listing_id,
            pr.status,
            pr.message,
            pr.created_at,

            l.title,
            l.price,
            l.listing_type,

            c.name AS category_name,
            loc.name AS location_name

          FROM purchase_requests pr

          JOIN listings l
            ON l.id = pr.listing_id

          JOIN categories c
            ON c.id = l.category_id

          JOIN campus_locations loc
            ON loc.id = l.location_id

          WHERE pr.buyer_id = $1

          ORDER BY pr.created_at DESC
          `,
          [userId]
        );

      const rentalRequests =
        await pool.query(
          `
          SELECT
            rb.id,
            rb.listing_id,
            rb.status,
            rb.start_date,
            rb.end_date,
            rb.total_price,
            rb.deposit_amount,
            rb.created_at,

            l.title,
            l.price,
            l.listing_type,
            l.rental_unit,

            c.name AS category_name,
            loc.name AS location_name

          FROM rental_bookings rb

          JOIN listings l
            ON l.id = rb.listing_id

          JOIN categories c
            ON c.id = l.category_id

          JOIN campus_locations loc
            ON loc.id = l.location_id

          WHERE rb.renter_id = $1

          ORDER BY rb.created_at DESC
          `,
          [userId]
        );

      res.json({
        status: "ok",
        purchaseRequests:
          purchaseRequests.rows,
        rentalRequests:
          rentalRequests.rows,
      });
    } catch (error) {
      console.error(
        "Failed to fetch my requests:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Could not fetch your requests",
      });
    }
  }
);

/*
  GET /api/requests/incoming

  Returns requests received by the
  currently logged-in seller.
*/

router.get(
  "/incoming",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.userId;

      const purchaseRequests =
        await pool.query(
          `
          SELECT
            pr.id,
            pr.listing_id,
            pr.buyer_id,
            pr.status,
            pr.message,
            pr.created_at,

            l.title,
            l.price,
            l.listing_type,

            u.email AS buyer_email,

            c.name AS category_name,
            loc.name AS location_name

          FROM purchase_requests pr

          JOIN listings l
            ON l.id = pr.listing_id

          JOIN users u
            ON u.id = pr.buyer_id

          JOIN categories c
            ON c.id = l.category_id

          LEFT JOIN campus_locations loc
            ON loc.id = l.location_id

          WHERE l.owner_id = $1

          ORDER BY pr.created_at DESC
          `,
          [userId]
        );

      const rentalRequests =
        await pool.query(
          `
          SELECT
            rb.id,
            rb.listing_id,
            rb.renter_id,
            rb.status,
            rb.start_date,
            rb.end_date,
            rb.total_price,
            rb.deposit_amount,
            rb.created_at,

            l.title,
            l.price,
            l.listing_type,
            l.rental_unit,

            u.email AS renter_email,

            c.name AS category_name,
            loc.name AS location_name

          FROM rental_bookings rb

          JOIN listings l
            ON l.id = rb.listing_id

          JOIN users u
            ON u.id = rb.renter_id

          JOIN categories c
            ON c.id = l.category_id

          LEFT JOIN campus_locations loc
            ON loc.id = l.location_id

          WHERE l.owner_id = $1

          ORDER BY rb.created_at DESC
          `,
          [userId]
        );

      res.json({
        status: "ok",
        purchaseRequests:
          purchaseRequests.rows,
        rentalRequests:
          rentalRequests.rows,
      });
    } catch (error) {
      console.error(
        "Failed to fetch incoming requests:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Could not fetch incoming requests",
      });
    }
  }
);

/*
  PATCH /api/requests/purchase/:requestId

  Seller accepts or rejects a purchase request.

  ACCEPT:
    - Request becomes accepted.
    - Transaction is created.
    - Listing becomes sold.
    - Other pending requests are rejected.

  REJECT:
    - Request becomes rejected.
    - Listing stays available.
*/

router.patch(
  "/purchase/:requestId",
  authenticateToken,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const sellerId = req.user.userId;
      const { requestId } = req.params;
      const { action } = req.body;

      if (
        action !== "accept" &&
        action !== "reject"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Action must be accept or reject",
        });
      }

      await client.query("BEGIN");

      await client.query(
        `SELECT set_config('app.user_id', $1, true)`,
        [String(sellerId)]
      );

      const requestResult = await client.query(
        `
        SELECT
          pr.id,
          pr.listing_id,
          pr.buyer_id,
          pr.status,

          l.owner_id,
          l.title,
          l.price,
          l.listing_type,
          l.status AS listing_status

        FROM purchase_requests pr

        JOIN listings l
          ON l.id = pr.listing_id

        WHERE pr.id = $1

        FOR UPDATE OF pr, l
        `,
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          status: "error",
          message: "Purchase request not found",
        });
      }

      const request = requestResult.rows[0];

      if (
        Number(request.owner_id) !==
        Number(sellerId)
      ) {
        await client.query("ROLLBACK");

        return res.status(403).json({
          status: "error",
          message:
            "You are not allowed to manage this request",
        });
      }

      if (request.status !== "pending") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          status: "error",
          message:
            "This request has already been processed",
        });
      }

      if (action === "reject") {
        const updatedRequest =
          await client.query(
            `
            UPDATE purchase_requests
            SET status = 'rejected'
            WHERE id = $1
            RETURNING
              id,
              listing_id,
              buyer_id,
              status,
              created_at
            `,
            [requestId]
          );

        await client.query("COMMIT");

        return res.json({
          status: "ok",
          message: "Purchase request rejected",
          request:
            updatedRequest.rows[0],
        });
      }

      /*
        ACCEPT PURCHASE

        Make sure the item has not already
        been sold/reserved.
      */

      if (request.listing_status !== "available") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          status: "error",
          message:
            "This listing is no longer available",
        });
      }

      /*
        Create the transaction first.
        The unique live-transaction index
        protects against double-selling.
      */

      const transactionResult =
        await client.query(
          `
          INSERT INTO transactions (
            purchase_request_id,
            listing_id,
            buyer_id,
            seller_id,
            amount,
            status,
            payment_method
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            'pending_meetup',
            'in_person'
          )
          RETURNING
            id,
            purchase_request_id,
            listing_id,
            buyer_id,
            seller_id,
            amount,
            status,
            payment_method,
            created_at
          `,
          [
            request.id,
            request.listing_id,
            request.buyer_id,
            sellerId,
            Number(request.price || 0),
          ]
        );

      await client.query(
        `
        UPDATE purchase_requests
        SET status = 'accepted'
        WHERE id = $1
        `,
        [requestId]
      );

      await client.query(
        `
        UPDATE purchase_requests
        SET status = 'rejected'
        WHERE listing_id = $1
          AND id <> $2
          AND status = 'pending'
        `,
        [
          request.listing_id,
          requestId,
        ]
      );

      await client.query(
        `
        UPDATE listings
        SET status = 'sold'
        WHERE id = $1
        `,
        [request.listing_id]
      );

      await client.query("COMMIT");

      return res.json({
        status: "ok",
        message:
          "Purchase request accepted",
        requestId: request.id,
        transaction:
          transactionResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error(
        "Purchase request update failed:",
        error
      );

      if (error.code === "23505") {
        return res.status(409).json({
          status: "error",
          message:
            "This listing has already been sold or accepted by another request",
        });
      }

      return res.status(500).json({
        status: "error",
        message:
          "Could not update purchase request",
      });
    } finally {
      client.release();
    }
  }
);

/*
  PATCH /api/requests/rental/:bookingId

  Seller accepts or rejects a rental/borrow request.

  ACCEPT:
    requested -> approved

  REJECT:
    requested -> rejected
*/

router.patch(
  "/rental/:bookingId",
  authenticateToken,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const sellerId = req.user.userId;
      const { bookingId } = req.params;
      const { action } = req.body;

      if (
        action !== "accept" &&
        action !== "reject"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Action must be accept or reject",
        });
      }

      await client.query("BEGIN");

      await client.query(
        `SELECT set_config('app.user_id', $1, true)`,
        [String(sellerId)]
      );

      const bookingResult = await client.query(
        `
        SELECT
          rb.id,
          rb.listing_id,
          rb.renter_id,
          rb.status,
          rb.start_date,
          rb.end_date,
          rb.total_price,
          rb.deposit_amount,

          l.owner_id,
          l.title,
          l.listing_type,
          l.status AS listing_status

        FROM rental_bookings rb

        JOIN listings l
          ON l.id = rb.listing_id

        WHERE rb.id = $1

        FOR UPDATE OF rb, l
        `,
        [bookingId]
      );

      if (bookingResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          status: "error",
          message: "Rental request not found",
        });
      }

      const booking = bookingResult.rows[0];

      if (
        Number(booking.owner_id) !==
        Number(sellerId)
      ) {
        await client.query("ROLLBACK");

        return res.status(403).json({
          status: "error",
          message:
            "You are not allowed to manage this request",
        });
      }

      if (booking.status !== "requested") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          status: "error",
          message:
            "This request has already been processed",
        });
      }

      /*
        REJECT
      */

      if (action === "reject") {
        const updatedBooking =
          await client.query(
            `
            UPDATE rental_bookings
            SET status = 'rejected'
            WHERE id = $1
            RETURNING
              id,
              listing_id,
              renter_id,
              start_date,
              end_date,
              status,
              total_price,
              deposit_amount
            `,
            [bookingId]
          );

        await client.query("COMMIT");

        return res.json({
          status: "ok",
          message:
            "Rental/borrow request rejected",
          booking:
            updatedBooking.rows[0],
        });
      }

      /*
        ACCEPT

        Check for overlapping approved/active
        booking before changing this request
        to approved.
      */

      const conflictResult = await client.query(
        `
        SELECT id
        FROM rental_bookings
        WHERE listing_id = $1
          AND id <> $2
          AND status IN ('approved', 'active')
          AND daterange(
            start_date,
            end_date,
            '[]'
          ) &&
          daterange(
            $3::date,
            $4::date,
            '[]'
          )
        LIMIT 1
        `,
        [
          booking.listing_id,
          booking.id,
          booking.start_date,
          booking.end_date,
        ]
      );

      if (conflictResult.rows.length > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          status: "error",
          message:
            "These dates are already booked by another approved request",
        });
      }

      const updatedBooking =
        await client.query(
          `
          UPDATE rental_bookings
          SET status = 'approved'
          WHERE id = $1
          RETURNING
            id,
            listing_id,
            renter_id,
            start_date,
            end_date,
            status,
            total_price,
            deposit_amount
          `,
          [bookingId]
        );

      /*
        Reject other pending requests whose
        dates overlap the newly approved booking.
      */

      await client.query(
        `
        UPDATE rental_bookings
        SET status = 'rejected'
        WHERE listing_id = $1
          AND id <> $2
          AND status = 'requested'
          AND daterange(
            start_date,
            end_date,
            '[]'
          ) &&
          daterange(
            $3::date,
            $4::date,
            '[]'
          )
        `,
        [
          booking.listing_id,
          booking.id,
          booking.start_date,
          booking.end_date,
        ]
      );

      await client.query("COMMIT");

      return res.json({
        status: "ok",
        message:
          "Rental/borrow request approved",
        booking:
          updatedBooking.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error(
        "Rental request update failed:",
        error
      );

      if (error.code === "23P01") {
        return res.status(409).json({
          status: "error",
          message:
            "These dates are already booked",
        });
      }

      return res.status(500).json({
        status: "error",
        message:
          "Could not update rental request",
      });
    } finally {
      client.release();
    }
  }
);

module.exports = router;