import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import ListingDetails from "./pages/ListingDetails";
import SellItem from "./pages/SellItem";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Wishlist from "./pages/Wishlist";
import Profile from "./pages/Profile";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Home />} />

        <Route
          path="/marketplace"
          element={<Marketplace />}
        />

        <Route
          path="/listing/:id"
          element={<ListingDetails />}
        />

        <Route
          path="/sell"
          element={<SellItem />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/wishlist"
          element={<Wishlist />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;