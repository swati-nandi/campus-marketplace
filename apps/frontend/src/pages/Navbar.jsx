import { Search, Heart, User, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="nav-left">
        <div className="logo" onClick={() => navigate("/")}>
          VIT<span>Exchange</span>
        </div>

        <div className="search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search books, electronics, cycles..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value.trim()) {
                navigate(
                  `/marketplace?search=${encodeURIComponent(
                    e.target.value.trim()
                  )}`
                );
              }
            }}
          />
        </div>
      </div>

      <div className="nav-right">
        <button
          className="sell-button"
          onClick={() => navigate("/sell")}
        >
          <Plus size={18} />
          Sell Item
        </button>

        <button
          className="icon-button"
          onClick={() => navigate("/wishlist")}
          title="Wishlist"
        >
          <Heart size={21} />
        </button>

        <button
          className="icon-button"
          onClick={() => navigate("/profile")}
          title="Account"
        >
          <User size={21} />
        </button>
      </div>
    </nav>
  );
}

export default Navbar;