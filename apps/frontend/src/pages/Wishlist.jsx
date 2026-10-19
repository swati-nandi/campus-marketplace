import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  MapPin,
  Trash2,
} from "lucide-react";

function getCategoryIcon(category) {
  if (category === "Books & Study Materials") return "📚";
  if (category === "Electronics & Gadgets") return "🧮";
  if (category === "Lab Coats & Engineering Gear") return "🧪";
  if (category === "Cycles & Campus Mobility") return "🚲";
  if (category === "Hostel Room Essentials") return "💡";

  return "📦";
}

function Wishlist() {
  const navigate = useNavigate();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWishlist = async () => {
    const token = localStorage.getItem(
      "vit_exchange_token"
    );

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:4000/api/wishlist",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not load wishlist."
        );
      }

      const formattedItems = (data.wishlist || []).map(
        (item) => ({
          id: item.listing_id,
          title: item.title,
          category: item.category_name,
          location: item.location_name,
          price: Number(item.price || 0),
          type: item.listing_type,
          condition: item.condition,
          icon: getCategoryIcon(item.category_name),
        })
      );

      setWishlistItems(formattedItems);
    } catch (error) {
      console.error(
        "Failed to load wishlist:",
        error
      );

      setError(
        error.message ||
          "Unable to load your wishlist."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (listingId) => {
    const token = localStorage.getItem(
      "vit_exchange_token"
    );

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:4000/api/wishlist/${listingId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not remove item from wishlist."
        );
      }

      setWishlistItems((currentItems) =>
        currentItems.filter(
          (item) => item.id !== listingId
        )
      );
    } catch (error) {
      console.error(
        "Failed to remove wishlist item:",
        error
      );

      setError(
        error.message ||
          "Could not remove item from wishlist."
      );
    }
  };

  if (loading) {
    return (
      <main className="wishlist-page">
        <div className="wishlist-container">
          <button
            className="back-button"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="wishlist-empty">
            <h2>Loading wishlist...</h2>
            <p>
              Getting your saved items.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="wishlist-page">
      <div className="wishlist-container">
        <button
          className="back-button"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="wishlist-header">
          <div>
            <p className="eyebrow">
              YOUR SAVED ITEMS
            </p>

            <h1>Wishlist</h1>

            <p>
              Keep track of items you may want to
              buy or rent.
            </p>
          </div>

          <Heart size={32} />
        </div>

        {error && (
          <div className="request-error">
            {error}
          </div>
        )}

        {wishlistItems.length > 0 ? (
          <div className="wishlist-grid">
            {wishlistItems.map((item) => (
              <article
                className="wishlist-card"
                key={item.id}
              >
                <div
                  className="wishlist-image"
                  onClick={() =>
                    navigate(
                      `/listing/${item.id}`
                    )
                  }
                >
                  <span
                    className={`listing-type ${item.type}`}
                  >
                    {item.type === "sale"
                      ? "FOR SALE"
                      : item.type === "rental"
                      ? "RENT"
                      : "BORROW"}
                  </span>

                  <div className="wishlist-icon">
                    {item.icon}
                  </div>
                </div>

                <div className="wishlist-content">
                  <p className="listing-category">
                    {item.category}
                  </p>

                  <h3
                    onClick={() =>
                      navigate(
                        `/listing/${item.id}`
                      )
                    }
                  >
                    {item.title}
                  </h3>

                  <div className="wishlist-location">
                    <MapPin size={14} />
                    {item.location}
                  </div>

                  <div className="wishlist-bottom">
                    <strong>
                      ₹{item.price}

                      {item.type === "rental" && (
                        <span> / day</span>
                      )}

                      {item.type === "borrow" && (
                        <span> / free</span>
                      )}
                    </strong>

                    <button
                      className="wishlist-remove"
                      title="Remove from wishlist"
                      onClick={() =>
                        handleRemove(item.id)
                      }
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="wishlist-empty">
            <div className="wishlist-empty-icon">
              ♡
            </div>

            <h2>
              Your wishlist is empty
            </h2>

            <p>
              Save items from the marketplace and
              they will appear here.
            </p>

            <button
              className="primary-button"
              onClick={() =>
                navigate("/marketplace")
              }
            >
              Browse Marketplace
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default Wishlist;