import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Heart,
  User,
  Plus,
} from "lucide-react";

function Navbar() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      navigate(
        `/marketplace?search=${encodeURIComponent(
          trimmedSearch
        )}`
      );
    } else {
      navigate("/marketplace");
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <button
          className="logo"
          onClick={() => navigate("/")}
          type="button"
        >
          VIT<span>Exchange</span>
        </button>

        <form
          className="search-box"
          onSubmit={handleSearch}
        >
          <Search size={18} />

          <input
            type="text"
            placeholder="Search books, electronics, cycles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      <div className="nav-right">
        <button
          className="sell-button"
          onClick={() => navigate("/sell")}
          type="button"
        >
          <Plus size={18} />
          Sell Item
        </button>

        <button
          className="icon-button"
          onClick={() => navigate("/wishlist")}
          type="button"
          aria-label="Wishlist"
        >
          <Heart size={21} />
        </button>

        <button
          className="icon-button"
          onClick={() => navigate("/profile")}
          type="button"
          aria-label="Profile"
        >
          <User size={21} />
        </button>
      </div>
    </nav>
  );
}

export default Navbar;