import { Heart, MapPin, ArrowUpRight } from "lucide-react";

function ListingCard({ listing }) {
  return (
    <article className="listing-card">
      <div className="listing-image">
        <span className={`listing-type ${listing.type}`}>
          {listing.type === "sale"
            ? "FOR SALE"
            : listing.type === "rental"
            ? "RENT"
            : "BORROW"}
        </span>

        <button className="listing-heart">
          <Heart size={18} />
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
            <strong>₹{listing.price}</strong>

            {listing.type === "rental" && (
              <span className="price-unit"> / day</span>
            )}
          </div>

          <button className="listing-arrow">
            <ArrowUpRight size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default ListingCard;