import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MapPin,
  ArrowUpRight,
} from "lucide-react";

function ListingCard({ listing }) {
  const navigate = useNavigate();

  const [isWishlisted, setIsWishlisted] =
    useState(false);

  const [wishlistLoading, setWishlistLoading] =
    useState(false);

  // ==============================
  // CHECK WISHLIST STATUS
  // ==============================

  useEffect(() => {
    const checkWishlist = async () => {
      const token = localStorage.getItem(
        "vit_exchange_token"
      );

      if (!token || !listing?.id) {
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
            },
          }
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        const wishlist = Array.isArray(
          data.wishlist
        )
          ? data.wishlist
          : [];

        const found = wishlist.some(
          (item) =>
            String(item.listing_id) ===
            String(listing.id)
        );

        setIsWishlisted(found);
      } catch (error) {
        console.error(
          "Failed to check wishlist:",
          error
        );
      }
    };

    checkWishlist();
  }, [listing?.id]);

  // ==============================
  // TOGGLE WISHLIST
  // ==============================

  const handleWishlist = async (event) => {
    // VERY IMPORTANT:
    // Prevent the Home card click from
    // opening the listing.
    event.stopPropagation();

    const token = localStorage.getItem(
      "vit_exchange_token"
    );

    if (!token) {
      navigate("/login");
      return;
    }

    if (!listing?.id || wishlistLoading) {
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

  return (
    <article className="listing-card">
      <div className="listing-image">
        <span
          className={`listing-type ${listing.type}`}
        >
          {listing.type === "sale"
            ? "FOR SALE"
            : listing.type === "rental"
            ? "RENT"
            : "BORROW"}
        </span>

        {/* ==============================
            WISHLIST HEART
        ============================== */}

        <button
          className={`listing-heart ${
            isWishlisted
              ? "listing-heart-active"
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
            size={18}
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
        </button>

        <div className="listing-placeholder">
          {listing.icon}
        </div>
      </div>

      <div className="listing-content">
        <div className="listing-category">
          {listing.category}
        </div>

        <h3>{listing.title}</h3>

        <div className="listing-location">
          <MapPin size={14} />
          {listing.location}
        </div>

        <div className="listing-bottom">
          <div>
            <strong>
              ₹{listing.price}
            </strong>

            {listing.type === "rental" && (
              <span className="price-unit">
                {" "}
                / day
              </span>
            )}
          </div>

          <button
            className="listing-arrow"
            type="button"
          >
            <ArrowUpRight size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default ListingCard;