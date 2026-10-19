import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import ListingCard from "../components/ListingCard";

const categories = [
  "All Categories",
  "Books & Study Materials",
  "Electronics & Gadgets",
  "Lab Coats & Engineering Gear",
  "Cycles & Campus Mobility",
  "Hostel Room Essentials",
];

function getCategoryIcon(category) {
  if (category === "Books & Study Materials") return "📚";
  if (category === "Electronics & Gadgets") return "🧮";
  if (category === "Lab Coats & Engineering Gear") return "🧪";
  if (category === "Cycles & Campus Mobility") return "🚲";
  if (category === "Hostel Room Essentials") return "💡";

  return "📦";
}

function Marketplace() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://localhost:4000/api/listings"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch listings");
        }

        const data = await response.json();

        const formattedListings = data.map((listing) => ({
          id: listing.id,
          title: listing.title,
          description: listing.description,
          category: listing.category_name,
          location: listing.location_name,
          price: Number(listing.price),
          type: listing.listing_type,
          condition: listing.condition,
          deposit: listing.deposit
            ? Number(listing.deposit)
            : null,
          rentalUnit: listing.rental_unit,
          owner: listing.owner_name,
          icon: getCategoryIcon(listing.category_name),
        }));

        setListings(formattedListings);
      } catch (error) {
        console.error("Failed to load listings:", error);
        setError("Unable to load listings. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const filteredListings = listings.filter((listing) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      listing.title.toLowerCase().includes(searchText) ||
      listing.category.toLowerCase().includes(searchText) ||
      listing.location.toLowerCase().includes(searchText);

    const matchesCategory =
      category === "All Categories" ||
      listing.category === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {/* HEADER */}
      <section className="marketplace-header">
        <div>
          <p className="eyebrow">VIT CAMPUS MARKETPLACE</p>

          <h1>Find something useful.</h1>

          <p>
            Browse items listed by students across campus.
          </p>
        </div>
      </section>

      {/* SEARCH AND FILTER */}
      <section className="marketplace-controls">
        <div className="marketplace-search">
          <Search size={19} />

          <input
            type="text"
            placeholder="Search books, electronics, cycles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-label">
          <SlidersHorizontal size={17} />
          <span>Filter</span>
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </section>

      {/* LISTINGS */}
      <main className="marketplace-content">
        <div className="marketplace-results-header">
          <div>
            <p className="eyebrow">LISTINGS</p>

            <h2>
              {loading
                ? "Loading..."
                : `${filteredListings.length} ${
                    filteredListings.length === 1
                      ? "item"
                      : "items"
                  } available`}
            </h2>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="empty-marketplace">
            <div>⏳</div>

            <h3>Loading listings...</h3>

            <p>
              Getting the latest items from the marketplace.
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="empty-marketplace">
            <div>⚠️</div>

            <h3>Something went wrong</h3>

            <p>{error}</p>

            <button
              className="secondary-button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        )}

        {/* LISTINGS */}
        {!loading && !error && filteredListings.length > 0 && (
          <div className="listings-grid">
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="marketplace-listing-wrapper"
                onClick={() =>
                  navigate(`/listing/${listing.id}`)
                }
              >
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          !error &&
          filteredListings.length === 0 && (
            <div className="empty-marketplace">
              <div>🔎</div>

              <h3>No listings found</h3>

              <p>
                Try changing your search or category filter.
              </p>

              <button
                className="secondary-button"
                onClick={() => {
                  setSearch("");
                  setCategory("All Categories");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
      </main>
    </div>
  );
}

export default Marketplace;