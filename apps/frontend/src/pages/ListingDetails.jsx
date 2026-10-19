import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  MapPin,
  ShieldCheck,
} from "lucide-react";

function getCategoryIcon(category) {
  if (category === "Books & Study Materials") return "📚";
  if (category === "Electronics & Gadgets") return "🧮";
  if (category === "Lab Coats & Engineering Gear") return "🧪";
  if (category === "Cycles & Campus Mobility") return "🚲";
  if (category === "Hostel Room Essentials") return "💡";

  return "📦";
}

function formatCondition(condition) {
  if (!condition) return "";

  return condition
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==============================
  // WISHLIST
  // ==============================

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // ==============================
  // REQUEST
  // ==============================

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");

  // ==============================
  // FETCH LISTING
  // ==============================

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        setError("");
        setRequestMessage("");
        setRequestError("");

        const response = await fetch(
          `http://localhost:4000/api/listings/${id}`
        );

        if (response.status === 404) {
          setListing(null);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch listing");
        }

        const data = await response.json();

        const formattedListing = {
          id: data.id,
          title: data.title,
          category: data.category_name,
          location: data.location_name,
          price: Number(data.price || 0),
          type: data.listing_type,
          icon: getCategoryIcon(data.category_name),
          condition: formatCondition(data.condition),
          description: data.description,
          seller: data.owner_name,
          deposit: data.deposit
            ? Number(data.deposit)
            : null,
          rentalUnit: data.rental_unit,
        };

        setListing(formattedListing);
      } catch (error) {
        console.error(
          "Failed to load listing:",
          error
        );

        setError(
          "Unable to load this listing. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  // ==============================
  // CHECK WISHLIST
  // ==============================

  useEffect(() => {
    const checkWishlist = async () => {
      const token = localStorage.getItem(
        "vit_exchange_token"
      );

      if (!token) {
        setIsWishlisted(false);
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:4000/api/wishlist",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 401) {
          setIsWishlisted(false);
          return;
        }

        if (!response.ok) {
          throw new Error(
            "Failed to fetch wishlist"
          );
        }

        const data = await response.json();

        const wishlist = Array.isArray(
          data.wishlist
        )
          ? data.wishlist
          : [];

        const found = wishlist.some(
          (item) =>
            String(item.listing_id) === String(id)
        );

        setIsWishlisted(found);
      } catch (error) {
        console.error(
          "Failed to check wishlist:",
          error
        );

        setIsWishlisted(false);
      }
    };

    checkWishlist();
  }, [id]);

  // ==============================
  // TOGGLE WISHLIST
  // ==============================

  const handleWishlist = async () => {
    const token = localStorage.getItem(
      "vit_exchange_token"
    );

    if (!token) {
      navigate("/login");
      return;
    }

    if (!listing || wishlistLoading) {
      return;
    }

    const currentlyWishlisted = isWishlisted;

    try {
      setWishlistLoading(true);

      const response = await fetch(
        `http://localhost:4000/api/wishlist/${listing.id}`,
        {
          method: currentlyWishlisted
            ? "DELETE"
            : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not update wishlist."
        );
      }

      // Update only after the database request succeeds.
      setIsWishlisted(!currentlyWishlisted);
    } catch (error) {
      console.error(
        "Wishlist update failed:",
        error
      );

      alert(
        error.message ||
          "Could not update wishlist. Please try again."
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  // ==============================
  // BUY / RENT / BORROW REQUEST
  // ==============================

  const handleRequest = async () => {
    setRequestError("");
    setRequestMessage("");

    const token = localStorage.getItem(
      "vit_exchange_token"
    );

    if (!token) {
      navigate("/login");
      return;
    }

    if (!listing) {
      return;
    }

    if (
      listing.type === "rental" ||
      listing.type === "borrow"
    ) {
      if (!startDate || !endDate) {
        setRequestError(
          "Please select both a start date and an end date."
        );
        return;
      }

      if (endDate < startDate) {
        setRequestError(
          "End date cannot be before the start date."
        );
        return;
      }
    }

    try {
      setRequestLoading(true);

      const requestBody = {
        listingId: listing.id,
      };

      if (
        listing.type === "rental" ||
        listing.type === "borrow"
      ) {
        requestBody.startDate = startDate;
        requestBody.endDate = endDate;
      }

      const response = await fetch(
        "http://localhost:4000/api/requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not create your request."
        );
      }

      setRequestMessage(
        data.message ||
          "Your request has been sent successfully."
      );

      if (
        listing.type === "rental" ||
        listing.type === "borrow"
      ) {
        setStartDate("");
        setEndDate("");
      }
    } catch (error) {
      console.error(
        "Request creation failed:",
        error
      );

      setRequestError(
        error.message ||
          "Could not create your request. Please try again."
      );
    } finally {
      setRequestLoading(false);
    }
  };

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <main className="listing-not-found">
        <h1>Loading listing...</h1>

        <p>
          Getting the latest information from the
          marketplace.
        </p>
      </main>
    );
  }

  // ==============================
  // ERROR
  // ==============================

  if (error) {
    return (
      <main className="listing-not-found">
        <h1>Something went wrong</h1>

        <p>{error}</p>

        <button
          className="primary-button"
          onClick={() => navigate("/marketplace")}
          type="button"
        >
          Back to Marketplace
        </button>
      </main>
    );
  }

  // ==============================
  // NOT FOUND
  // ==============================

  if (!listing) {
    return (
      <main className="listing-not-found">
        <h1>Listing not found</h1>

        <p>
          The item you're looking for doesn't exist.
        </p>

        <button
          className="primary-button"
          onClick={() => navigate("/marketplace")}
          type="button"
        >
          Back to Marketplace
        </button>
      </main>
    );
  }

  const isRental = listing.type === "rental";
  const isBorrow = listing.type === "borrow";
  const isSale = listing.type === "sale";

  return (
    <main className="listing-details-page">
      <button
        className="back-button"
        onClick={() => navigate(-1)}
        type="button"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="listing-details">
        {/* ==============================
            IMAGE
        ============================== */}

        <div className="listing-details-image">
          <span
            className={`listing-type ${listing.type}`}
          >
            {isSale
              ? "FOR SALE"
              : isRental
              ? "RENT"
              : "BORROW"}
          </span>

          <div className="listing-details-icon">
            {listing.icon}
          </div>
        </div>

        {/* ==============================
            INFORMATION
        ============================== */}

        <div className="listing-details-info">
          <p className="eyebrow">
            {listing.category}
          </p>

          <h1>{listing.title}</h1>

          <div className="details-location">
            <MapPin size={17} />
            {listing.location}
          </div>

          <div className="details-price">
            ₹{listing.price}

            {isRental && (
              <span>
                / {listing.rentalUnit || "day"}
              </span>
            )}

            {isBorrow && (
              <span> / free</span>
            )}
          </div>

          {isRental && listing.deposit && (
            <p className="details-deposit">
              Security deposit: ₹{listing.deposit}
            </p>
          )}

          <div className="details-divider" />

          <div className="details-condition">
            <span>Condition</span>
            <strong>{listing.condition}</strong>
          </div>

          <div className="details-description">
            <h3>Description</h3>
            <p>{listing.description}</p>
          </div>

          {/* SELLER */}

          <div className="seller-card">
            <div className="seller-avatar">
              {listing.seller
                ? listing.seller.charAt(0)
                : "?"}
            </div>

            <div>
              <span>Listed by</span>
              <strong>{listing.seller}</strong>
            </div>
          </div>

          {/* ==============================
              RENTAL / BORROW DATES
          ============================== */}

          {(isRental || isBorrow) && (
            <div className="request-dates">
              <h3>
                {isRental
                  ? "Select rental dates"
                  : "Select borrowing dates"}
              </h3>

              <div className="date-fields">
                <div>
                  <label htmlFor="startDate">
                    Start date
                  </label>

                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    min={
                      new Date()
                        .toISOString()
                        .split("T")[0]
                    }
                    onChange={(event) =>
                      setStartDate(
                        event.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label htmlFor="endDate">
                    End date
                  </label>

                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={
                      startDate ||
                      new Date()
                        .toISOString()
                        .split("T")[0]
                    }
                    onChange={(event) =>
                      setEndDate(
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* REQUEST MESSAGES */}

          {requestError && (
            <div className="request-error">
              {requestError}
            </div>
          )}

          {requestMessage && (
            <div className="request-success">
              {requestMessage}
            </div>
          )}

          {/* ==============================
              ACTION BUTTONS
          ============================== */}

          <div className="details-actions">
            <button
              className="primary-button"
              onClick={handleRequest}
              disabled={requestLoading}
              type="button"
            >
              {requestLoading
                ? "Sending..."
                : isSale
                ? "Buy"
                : isRental
                ? "Request Rental"
                : "Request Borrow"}
            </button>

            <button
              className={`save-button ${
                isWishlisted
                  ? "wishlist-active"
                  : ""
              }`}
              onClick={handleWishlist}
              disabled={wishlistLoading}
              type="button"
              aria-label={
                isWishlisted
                  ? "Remove from wishlist"
                  : "Add to wishlist"
              }
              title={
                isWishlisted
                  ? "Remove from wishlist"
                  : "Add to wishlist"
              }
            >
              <Heart
                size={19}
                strokeWidth={2}
                fill={
                  isWishlisted
                    ? "#dc2626"
                    : "none"
                }
                color={
                  isWishlisted
                    ? "#dc2626"
                    : "currentColor"
                }
              />

              {wishlistLoading
                ? "Saving..."
                : isWishlisted
                ? "Saved"
                : "Save"}
            </button>
          </div>

          {/* SAFETY */}

          <div className="safe-campus">
            <ShieldCheck size={19} />

            <div>
              <strong>
                Campus marketplace
              </strong>

              <p>
                Meet safely at a convenient campus
                location and verify the item before
                completing the transaction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ListingDetails;