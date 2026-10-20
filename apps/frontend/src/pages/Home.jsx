import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ListingCard from "../components/ListingCard";

const categories = [
  {
    name: "Books & Study Materials",
    description: "Textbooks, notes and study resources",
    icon: "📚",
  },
  {
    name: "Electronics & Gadgets",
    description: "Calculators, devices and accessories",
    icon: "💻",
  },
  {
    name: "Lab & Engineering Gear",
    description: "Lab coats, tools and equipment",
    icon: "🧪",
  },
  {
    name: "Cycles & Campus Mobility",
    description: "Cycles and campus transport",
    icon: "🚲",
  },
  {
    name: "Hostel Room Essentials",
    description: "Everything for your hostel room",
    icon: "🛏️",
  },
];

const listings = [
  {
    id: 1,
    title: "Advanced Engineering Mathematics",
    category: "Books & Study Materials",
    location: "M-Block Men's Hostel",
    price: 600,
    type: "sale",
    icon: "📚",
  },
  {
    id: 2,
    title: "Hercules 7-Speed Gear Cycle",
    category: "Cycles & Campus Mobility",
    location: "VIT Lake",
    price: 2500,
    type: "sale",
    icon: "🚲",
  },
  {
    id: 3,
    title: "Mechanical Workshop Tools & Lab Coat",
    category: "Lab Coats & Engineering Gear",
    location: "TT",
    price: 350,
    type: "sale",
    icon: "🧪",
  },
  {
    id: 4,
    title: "Casio FX-991EX Scientific Calculator",
    category: "Electronics & Gadgets",
    location: "SJT",
    price: 50,
    type: "rental",
    icon: "🧮",
  },
];

function Home() {
  const navigate = useNavigate();

  const openListing = (listingId) => {
    navigate(`/listing/${listingId}`);
  };

  return (
    <div>
      <Navbar />

      <main className="home">
        {/* HERO SECTION */}
        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow">
              VIT CAMPUS MARKETPLACE
            </p>

            <h1>
              Buy. Sell. Rent.
              <br />
              <span>All on campus.</span>
            </h1>

            <p className="hero-description">
              Find useful items from fellow students or give
              your unused things a second life.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() =>
                  navigate("/marketplace")
                }
                type="button"
              >
                Browse Marketplace
              </button>

              <button
                className="secondary-button"
                onClick={() => navigate("/sell")}
                type="button"
              >
                Sell an Item
              </button>
            </div>
          </div>

          <div className="hero-card">
            <div className="hero-card-top">
              <span>Campus deals</span>
              <span>↗</span>
            </div>

            <div className="hero-card-item">
              <span>📚</span>

              <div>
                <strong>Engineering Books</strong>
                <small>From ₹150</small>
              </div>
            </div>

            <div className="hero-card-item">
              <span>🧮</span>

              <div>
                <strong>
                  Scientific Calculators
                </strong>
                <small>From ₹50</small>
              </div>
            </div>

            <div className="hero-card-item">
              <span>🚲</span>

              <div>
                <strong>Campus Cycles</strong>
                <small>From ₹1,500</small>
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="categories-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">EXPLORE</p>
              <h2>Shop by category</h2>
            </div>

            <button
              className="view-all-button"
              onClick={() =>
                navigate("/marketplace")
              }
              type="button"
            >
              View all →
            </button>
          </div>

          <div className="categories-grid">
            {categories.map((category) => (
              <div
                className="category-card"
                key={category.name}
                onClick={() =>
                  navigate("/marketplace")
                }
              >
                <div className="category-icon">
                  {category.icon}
                </div>

                <h3>{category.name}</h3>

                <p>{category.description}</p>

                <span className="category-arrow">
                  ↗
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* LISTINGS */}
        <section className="listings-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">JUST LISTED</p>
              <h2>Fresh on campus</h2>
            </div>

            <button
              className="view-all-button"
              onClick={() =>
                navigate("/marketplace")
              }
              type="button"
            >
              View marketplace →
            </button>
          </div>

          <div className="listings-grid">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="home-listing-wrapper"
                onClick={() =>
                  openListing(listing.id)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();
                    openListing(listing.id);
                  }
                }}
              >
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;