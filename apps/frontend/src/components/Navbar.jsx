import { Search, Heart, User, Plus } from "lucide-react";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-left">
        <div className="logo">
          VIT<span>Exchange</span>
        </div>

        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search books, electronics, cycles..."
          />
        </div>
      </div>

      <div className="nav-right">
        <button className="sell-button">
          <Plus size={18} />
          Sell Item
        </button>

        <button className="icon-button">
          <Heart size={21} />
        </button>

        <button className="icon-button">
          <User size={21} />
        </button>
      </div>
    </nav>
  );
}

export default Navbar;