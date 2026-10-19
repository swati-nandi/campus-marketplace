import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  MapPin,
} from "lucide-react";

const categories = [
  {
    label: "Books & Study Materials",
    value: "Books & Study Materials",
  },
  {
    label: "Electronics & Gadgets",
    value: "Electronics & Gadgets",
  },
  {
    label: "Lab Coats & Engineering Gear",
    value: "Lab Coats & Engineering Gear",
  },
  {
    label: "Cycles & Campus Mobility",
    value: "Cycles & Campus Mobility",
  },
  {
    label: "Hostel Room Essentials",
    value: "Hostel Room Essentials",
  },
];

const locations = [
  {
    label: "SJT (Silver Jubilee Tower)",
    value: "SJT (Silver Jubilee Tower)",
  },
  {
    label: "TT (Technology Tower)",
    value: "TT (Technology Tower)",
  },
  {
    label: "SMV",
    value: "SMV",
  },
  {
    label: "M-Block Men's Hostel",
    value: "M-Block Men's Hostel",
  },
  {
    label: "D Block Ladies Hostel",
    value: "D Block Ladies Hostel",
  },
  {
    label: "VIT Lake / Food Street",
    value: "VIT Lake / Food Street",
  },
  {
    label: "Main Gate (Katpadi Bus/Auto Stand)",
    value: "Main Gate (Katpadi Bus/Auto Stand)",
  },
];

function SellItem() {
  const navigate = useNavigate();

  const [listingType, setListingType] = useState("sale");

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    condition: "",
    price: "",
    deposit: "",
    location: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleListingTypeChange = (type) => {
    setListingType(type);

    setError("");
    setSuccess("");

    // Borrow listings do not have a price or deposit.
    if (type === "borrow") {
      setFormData((previous) => ({
        ...previous,
        price: "",
        deposit: "",
      }));
    }

    // Sale listings do not have a rental deposit.
    if (type === "sale") {
      setFormData((previous) => ({
        ...previous,
        deposit: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem(
        "vit_exchange_token"
      );

      if (!token) {
        setError(
          "You must be logged in to create a listing."
        );

        setLoading(false);

        setTimeout(() => {
          navigate("/login");
        }, 1200);

        return;
      }

      // Price rules:
      // Sale   -> price required
      // Rental -> price required
      // Borrow -> price must be null
      const price =
        listingType === "borrow"
          ? null
          : Number(formData.price);

      const deposit =
        listingType === "rental" &&
        formData.deposit
          ? Number(formData.deposit)
          : null;

      const listingData = {
        title: formData.title,
        category: formData.category,
        description: formData.description,
        condition: formData.condition,
        price,
        deposit,
        location: formData.location,
        listingType,
      };

      console.log(
        "Submitting listing:",
        listingData
      );

      const response = await fetch(
        "http://localhost:4000/api/listings",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(listingData),
        }
      );

      const data = await response.json();

      console.log(
        "Backend response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create listing"
        );
      }

      setSuccess(
        "Listing created successfully! Redirecting to the marketplace..."
      );

      setTimeout(() => {
        navigate("/marketplace");
      }, 1200);
    } catch (error) {
      console.error(
        "Failed to create listing:",
        error
      );

      setError(
        error.message ||
          "Unable to create listing. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="sell-page">
      <div className="sell-container">

        {/* BACK BUTTON */}

        <button
          className="back-button"
          onClick={() => navigate(-1)}
          type="button"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* HEADER */}

        <div className="sell-header">
          <p className="eyebrow">
            VIT CAMPUS MARKETPLACE
          </p>

          <h1>
            List something for your campus.
          </h1>

          <p>
            Sell, rent or lend something to another
            student.
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div
            className="form-error"
            style={{
              padding: "14px 16px",
              marginBottom: "20px",
              borderRadius: "8px",
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              fontWeight: "500",
            }}
          >
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div
            style={{
              padding: "14px 16px",
              marginBottom: "20px",
              borderRadius: "8px",
              backgroundColor: "#dcfce7",
              color: "#166534",
              border: "1px solid #bbf7d0",
              fontWeight: "500",
            }}
          >
            {success}
          </div>
        )}

        {/* FORM */}

        <form
          className="sell-form"
          onSubmit={handleSubmit}
        >

          {/* ITEM INFORMATION */}

          <section className="form-section">

            <div className="form-section-heading">
              <span>01</span>

              <div>
                <h2>Item information</h2>

                <p>
                  Tell students what you're listing.
                </p>
              </div>
            </div>

            <div className="form-group">

              <label htmlFor="title">
                Item title
              </label>

              <input
                id="title"
                name="title"
                type="text"
                placeholder="e.g. Engineering Mathematics textbook"
                value={formData.title}
                onChange={handleChange}
                required
              />

            </div>

            <div className="form-row">

              <div className="form-group">

                <label htmlFor="category">
                  Category
                </label>

                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select category
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>

              </div>

              <div className="form-group">

                <label htmlFor="condition">
                  Condition
                </label>

                <select
                  id="condition"
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select condition
                  </option>

                  <option value="new">
                    New
                  </option>

                  <option value="like_new">
                    Like New
                  </option>

                  <option value="good">
                    Good
                  </option>

                  <option value="fair">
                    Fair
                  </option>
                </select>

              </div>

            </div>

            <div className="form-group">

              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows="6"
                placeholder="Describe the item's condition, what's included, and anything buyers should know..."
                value={formData.description}
                onChange={handleChange}
                required
              />

            </div>

          </section>

          {/* LISTING TYPE */}

          <section className="form-section">

            <div className="form-section-heading">

              <span>02</span>

              <div>
                <h2>
                  How do you want to list it?
                </h2>

                <p>
                  Choose how another student can get
                  your item.
                </p>
              </div>

            </div>

            <div className="listing-type-options">

              <button
                type="button"
                className={
                  listingType === "sale"
                    ? "listing-type-option active"
                    : "listing-type-option"
                }
                onClick={() =>
                  handleListingTypeChange("sale")
                }
              >
                <strong>Sell</strong>

                <span>
                  Transfer ownership
                </span>
              </button>

              <button
                type="button"
                className={
                  listingType === "rental"
                    ? "listing-type-option active"
                    : "listing-type-option"
                }
                onClick={() =>
                  handleListingTypeChange("rental")
                }
              >
                <strong>Rent</strong>

                <span>
                  Get the item back later
                </span>
              </button>

              <button
                type="button"
                className={
                  listingType === "borrow"
                    ? "listing-type-option active"
                    : "listing-type-option"
                }
                onClick={() =>
                  handleListingTypeChange("borrow")
                }
              >
                <strong>Lend</strong>

                <span>
                  Let another student borrow it
                </span>
              </button>

            </div>

          </section>

          {/* PRICE */}

          {listingType !== "borrow" && (
            <section className="form-section">

              <div className="form-section-heading">

                <span>03</span>

                <div>
                  <h2>Pricing</h2>

                  <p>
                    Set the amount students will pay.
                  </p>
                </div>

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="price">
                    {listingType === "sale"
                      ? "Price"
                      : "Price per day"}
                  </label>

                  <div className="input-with-symbol">

                    <span>₹</span>

                    <input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.price}
                      onChange={handleChange}
                      required
                    />

                  </div>

                </div>

                {listingType === "rental" && (
                  <div className="form-group">

                    <label htmlFor="deposit">
                      Security deposit
                    </label>

                    <div className="input-with-symbol">

                      <span>₹</span>

                      <input
                        id="deposit"
                        name="deposit"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.deposit}
                        onChange={handleChange}
                      />

                    </div>

                  </div>
                )}

              </div>

            </section>
          )}

          {/* LOCATION */}

          <section className="form-section">

            <div className="form-section-heading">

              <span>
                {listingType === "borrow"
                  ? "03"
                  : "04"}
              </span>

              <div>
                <h2>Meet-up location</h2>

                <p>
                  Choose where students can collect
                  the item.
                </p>
              </div>

            </div>

            <div className="form-group">

              <label htmlFor="location">
                Campus location
              </label>

              <div className="select-with-icon">

                <MapPin size={17} />

                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select location
                  </option>

                  {locations.map((location) => (
                    <option
                      key={location.value}
                      value={location.value}
                    >
                      {location.label}
                    </option>
                  ))}
                </select>

              </div>

            </div>

          </section>

          {/* IMAGE */}

          <section className="form-section">

            <div className="form-section-heading">

              <span>
                {listingType === "borrow"
                  ? "04"
                  : "05"}
              </span>

              <div>
                <h2>Add photos</h2>

                <p>
                  Show students what they're getting.
                </p>
              </div>

            </div>

            <div className="upload-box">

              <Upload size={28} />

              <strong>
                Upload item photos
              </strong>

              <span>
                JPG, PNG or WEBP
              </span>

              <button
                type="button"
                className="upload-button"
              >
                Choose files
              </button>

            </div>

          </section>

          {/* SUBMIT */}

          <div className="sell-submit">

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate("/marketplace")
              }
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create Listing"}
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}

export default SellItem;