import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  MapPin,
  Package,
  Heart,
  Settings,
  LogOut,
  Clock,
  CalendarDays,
  ShoppingBag,
  Check,
  X,
} from "lucide-react";

function formatStatus(status) {
  if (!status) return "";

  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function formatDate(date) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return date;
  }

  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatListingType(type) {
  if (type === "sale") return "Purchase";
  if (type === "rental") return "Rental";
  if (type === "borrow") return "Borrow";

  return type;
}

function getStatusClass(status) {
  if (
    status === "accepted" ||
    status === "approved" ||
    status === "active" ||
    status === "returned"
  ) {
    return "status-success";
  }

  if (status === "rejected") {
    return "status-rejected";
  }

  if (status === "cancelled") {
    return "status-cancelled";
  }

  return "status-pending";
}

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [wishlistCount, setWishlistCount] = useState(0);
  const [listingCount, setListingCount] = useState(0);

  const [purchaseRequests, setPurchaseRequests] =
    useState([]);

  const [rentalRequests, setRentalRequests] =
    useState([]);

  const [incomingPurchaseRequests, setIncomingPurchaseRequests] =
    useState([]);

  const [incomingRentalRequests, setIncomingRentalRequests] =
    useState([]);

  const [loading, setLoading] = useState(true);

  const [activityLoading, setActivityLoading] =
    useState(true);

  const [incomingLoading, setIncomingLoading] =
    useState(true);

  const [activityError, setActivityError] =
    useState("");

  const [incomingError, setIncomingError] =
    useState("");

  const [processingRequest, setProcessingRequest] =
    useState("");

  useEffect(() => {
    const token = localStorage.getItem(
      "vit_exchange_token"
    );

    const storedUser = localStorage.getItem(
      "vit_exchange_user"
    );

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    let parsedUser;

    try {
      parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } catch (error) {
      console.error(
        "Failed to read user information:",
        error
      );

      localStorage.removeItem(
        "vit_exchange_user"
      );

      navigate("/login");
      return;
    }

    const fetchProfileData = async () => {
      try {
        const wishlistResponse = await fetch(
          "http://localhost:4000/api/wishlist",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (wishlistResponse.ok) {
          const wishlistData =
            await wishlistResponse.json();

          setWishlistCount(
            wishlistData.wishlist?.length || 0
          );
        }

        const listingsResponse = await fetch(
          "http://localhost:4000/api/listings"
        );

        if (listingsResponse.ok) {
          const listingsData =
            await listingsResponse.json();

          const listings =
            listingsData.listings ||
            listingsData ||
            [];

          const currentUserId = Number(
            parsedUser.id
          );

          const myListings = listings.filter(
            (listing) =>
              Number(listing.owner_id) ===
              currentUserId
          );

          setListingCount(myListings.length);
        }
      } catch (error) {
        console.error(
          "Failed to load profile data:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    const fetchActivity = async () => {
      try {
        setActivityLoading(true);
        setActivityError("");

        const response = await fetch(
          "http://localhost:4000/api/requests/my",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Could not load your activity."
          );
        }

        setPurchaseRequests(
          data.purchaseRequests || []
        );

        setRentalRequests(
          data.rentalRequests || []
        );
      } catch (error) {
        console.error(
          "Failed to load request history:",
          error
        );

        setActivityError(
          error.message ||
            "Could not load your request history."
        );
      } finally {
        setActivityLoading(false);
      }
    };

    const fetchIncomingRequests = async () => {
      try {
        setIncomingLoading(true);
        setIncomingError("");

        const response = await fetch(
          "http://localhost:4000/api/requests/incoming",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Could not load incoming requests."
          );
        }

        setIncomingPurchaseRequests(
          data.purchaseRequests || []
        );

        setIncomingRentalRequests(
          data.rentalRequests || []
        );
      } catch (error) {
        console.error(
          "Failed to load incoming requests:",
          error
        );

        setIncomingError(
          error.message ||
            "Could not load incoming requests."
        );
      } finally {
        setIncomingLoading(false);
      }
    };

    fetchProfileData();
    fetchActivity();
    fetchIncomingRequests();
  }, [navigate]);

  const refreshIncomingRequests = async () => {
    const token = localStorage.getItem(
      "vit_exchange_token"
    );

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setIncomingLoading(true);
      setIncomingError("");

      const response = await fetch(
        "http://localhost:4000/api/requests/incoming",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not load incoming requests."
        );
      }

      setIncomingPurchaseRequests(
        data.purchaseRequests || []
      );

      setIncomingRentalRequests(
        data.rentalRequests || []
      );
    } catch (error) {
      console.error(
        "Failed to refresh incoming requests:",
        error
      );

      setIncomingError(
        error.message ||
          "Could not refresh incoming requests."
      );
    } finally {
      setIncomingLoading(false);
    }
  };

  const handleRequestAction = async (
    type,
    id,
    action
  ) => {
    const token = localStorage.getItem(
      "vit_exchange_token"
    );

    if (!token) {
      navigate("/login");
      return;
    }

    const requestKey = `${type}-${id}`;

    try {
      setProcessingRequest(requestKey);

      const endpoint =
        type === "purchase"
          ? `http://localhost:4000/api/requests/purchase/${id}`
          : `http://localhost:4000/api/requests/rental/${id}`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Could not ${action} request.`
        );
      }

      await refreshIncomingRequests();

      if (action === "accept") {
        alert(
          type === "purchase"
            ? "Purchase request accepted successfully."
            : "Rental/borrow request approved successfully."
        );
      } else {
        alert(
          type === "purchase"
            ? "Purchase request rejected."
            : "Rental/borrow request rejected."
        );
      }
    } catch (error) {
      console.error(
        "Failed to update request:",
        error
      );

      alert(
        error.message ||
          `Could not ${action} request.`
      );
    } finally {
      setProcessingRequest("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(
      "vit_exchange_token"
    );

    localStorage.removeItem(
      "vit_exchange_user"
    );

    navigate("/login");
  };

  if (loading || !user) {
    return (
      <main className="profile-page">
        <div className="profile-container">
          <button
            className="back-button"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="profile-card">
            <h2>Loading profile...</h2>

            <p>
              Getting your marketplace information.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const displayName =
    user.email?.split("@")[0] || "User";

  const avatarLetter =
    displayName.charAt(0).toUpperCase();

  const totalActivity =
    purchaseRequests.length +
    rentalRequests.length;

  const totalIncomingRequests =
    incomingPurchaseRequests.length +
    incomingRentalRequests.length;

  const pendingIncomingPurchaseRequests =
    incomingPurchaseRequests.filter(
      (request) => request.status === "pending"
    );

  const pendingIncomingRentalRequests =
    incomingRentalRequests.filter(
      (request) => request.status === "requested"
    );

  return (
    <main className="profile-page">
      <div className="profile-container">
        <button
          className="back-button"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* PROFILE HEADER */}

        <section className="profile-header">
          <div className="profile-avatar">
            {avatarLetter}
          </div>

          <div>
            <p className="eyebrow">
              MY ACCOUNT
            </p>

            <h1>{displayName}</h1>

            <p>
              VIT Exchange member
            </p>
          </div>
        </section>

        {/* PROFILE INFORMATION */}

        <div className="profile-grid">
          <section className="profile-card">
            <div className="profile-card-heading">
              <h2>Personal Information</h2>

              <User size={20} />
            </div>

            <div className="profile-info">
              <div className="profile-info-item">
                <Mail size={18} />

                <div>
                  <span>Email</span>

                  <strong>
                    {user.email}
                  </strong>
                </div>
              </div>

              <div className="profile-info-item">
                <MapPin size={18} />

                <div>
                  <span>Campus</span>

                  <strong>
                    VIT Vellore
                  </strong>
                </div>
              </div>
            </div>

            <button
              className="profile-edit-button"
              onClick={() =>
                alert(
                  "Profile editing will be added next."
                )
              }
            >
              Edit Profile
            </button>
          </section>

          {/* MARKETPLACE STATS */}

          <section className="profile-card">
            <div className="profile-card-heading">
              <h2>Marketplace</h2>

              <Package size={20} />
            </div>

            <div className="profile-stat-grid">
              <div className="profile-stat">
                <strong>
                  {listingCount}
                </strong>

                <span>
                  My Listings
                </span>
              </div>

              <div className="profile-stat">
                <strong>
                  {totalActivity}
                </strong>

                <span>
                  My Requests
                </span>
              </div>

              <div className="profile-stat">
                <strong>
                  {wishlistCount}
                </strong>

                <span>
                  Saved Items
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* INCOMING REQUESTS */}

        <section className="profile-card activity-card">
          <div className="profile-card-heading">
            <div>
              <p className="eyebrow">
                SELLER ACTIVITY
              </p>

              <h2>
                Incoming Requests
              </h2>
            </div>

            <Package size={22} />
          </div>

          {incomingLoading ? (
            <div className="activity-empty">
              <p>
                Loading incoming requests...
              </p>
            </div>
          ) : incomingError ? (
            <div className="request-error">
              {incomingError}
            </div>
          ) : totalIncomingRequests === 0 ? (
            <div className="activity-empty">
              <Package size={32} />

              <h3>
                No incoming requests
              </h3>

              <p>
                Requests from students interested
                in your listings will appear here.
              </p>
            </div>
          ) : (
            <div className="activity-list">

              {/* INCOMING PURCHASE REQUESTS */}

              {incomingPurchaseRequests.map(
                (request) => {
                  const isPending =
                    request.status === "pending";

                  const isProcessing =
                    processingRequest ===
                    `purchase-${request.id}`;

                  return (
                    <article
                      className="activity-item"
                      key={`incoming-purchase-${request.id}`}
                    >
                      <div className="activity-icon">
                        <ShoppingBag
                          size={21}
                        />
                      </div>

                      <div
                        className="activity-main"
                        style={{
                          width: "100%",
                        }}
                      >
                        <div className="activity-top">
                          <div>
                            <span className="activity-type">
                              PURCHASE REQUEST
                            </span>

                            <h3>
                              {request.title}
                            </h3>
                          </div>

                          <span
                            className={`activity-status ${getStatusClass(
                              request.status
                            )}`}
                          >
                            {formatStatus(
                              request.status
                            )}
                          </span>
                        </div>

                        <div className="activity-details">
                          <span>
                            Buyer:{" "}
                            {request.buyer_email}
                          </span>

                          <span>
                            <MapPin
                              size={14}
                            />

                            {
                              request.location_name
                            }
                          </span>

                          <span>
                            ₹
                            {Number(
                              request.price || 0
                            )}
                          </span>

                          <span>
                            <CalendarDays
                              size={14}
                            />

                            {formatDate(
                              request.created_at
                            )}
                          </span>
                        </div>

                        {request.message && (
                          <p
                            style={{
                              marginTop: "10px",
                              marginBottom: "10px",
                            }}
                          >
                            <strong>
                              Message:
                            </strong>{" "}
                            {request.message}
                          </p>
                        )}

                        {isPending && (
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              marginTop: "12px",
                            }}
                          >
                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                handleRequestAction(
                                  "purchase",
                                  request.id,
                                  "accept"
                                )
                              }
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding:
                                  "9px 14px",
                                border: "none",
                                borderRadius:
                                  "8px",
                                cursor:
                                  isProcessing
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  isProcessing
                                    ? 0.6
                                    : 1,
                              }}
                            >
                              <Check
                                size={16}
                              />

                              {isProcessing
                                ? "Processing..."
                                : "Accept"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                handleRequestAction(
                                  "purchase",
                                  request.id,
                                  "reject"
                                )
                              }
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding:
                                  "9px 14px",
                                border: "none",
                                borderRadius:
                                  "8px",
                                cursor:
                                  isProcessing
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  isProcessing
                                    ? 0.6
                                    : 1,
                              }}
                            >
                              <X
                                size={16}
                              />

                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                }
              )}

              {/* INCOMING RENTAL / BORROW REQUESTS */}

              {incomingRentalRequests.map(
                (request) => {
                  const isPending =
                    request.status === "requested";

                  const isProcessing =
                    processingRequest ===
                    `rental-${request.id}`;

                  return (
                    <article
                      className="activity-item"
                      key={`incoming-rental-${request.id}`}
                    >
                      <div className="activity-icon">
                        <CalendarDays
                          size={21}
                        />
                      </div>

                      <div
                        className="activity-main"
                        style={{
                          width: "100%",
                        }}
                      >
                        <div className="activity-top">
                          <div>
                            <span className="activity-type">
                              {formatListingType(
                                request.listing_type
                              ).toUpperCase()}{" "}
                              REQUEST
                            </span>

                            <h3>
                              {request.title}
                            </h3>
                          </div>

                          <span
                            className={`activity-status ${getStatusClass(
                              request.status
                            )}`}
                          >
                            {formatStatus(
                              request.status
                            )}
                          </span>
                        </div>

                        <div className="activity-details">
                          <span>
                            {request.listing_type ===
                            "borrow"
                              ? "Renter/Borrower: "
                              : "Renter: "}

                            {request.renter_email}
                          </span>

                          <span>
                            <MapPin
                              size={14}
                            />

                            {
                              request.location_name
                            }
                          </span>

                          <span>
                            {request.listing_type ===
                            "borrow"
                              ? "Free"
                              : `₹${Number(
                                  request.total_price ||
                                    0
                                )}`}
                          </span>

                          <span>
                            <CalendarDays
                              size={14}
                            />

                            {formatDate(
                              request.start_date
                            )}{" "}
                            –{" "}
                            {formatDate(
                              request.end_date
                            )}
                          </span>
                        </div>

                        {request.deposit_amount > 0 && (
                          <p
                            style={{
                              marginTop: "10px",
                              marginBottom: "10px",
                            }}
                          >
                            Deposit: ₹
                            {Number(
                              request.deposit_amount
                            )}
                          </p>
                        )}

                        {isPending && (
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              marginTop: "12px",
                            }}
                          >
                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                handleRequestAction(
                                  "rental",
                                  request.id,
                                  "accept"
                                )
                              }
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding:
                                  "9px 14px",
                                border: "none",
                                borderRadius:
                                  "8px",
                                cursor:
                                  isProcessing
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  isProcessing
                                    ? 0.6
                                    : 1,
                              }}
                            >
                              <Check
                                size={16}
                              />

                              {isProcessing
                                ? "Processing..."
                                : "Accept"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                handleRequestAction(
                                  "rental",
                                  request.id,
                                  "reject"
                                )
                              }
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding:
                                  "9px 14px",
                                border: "none",
                                borderRadius:
                                  "8px",
                                cursor:
                                  isProcessing
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  isProcessing
                                    ? 0.6
                                    : 1,
                              }}
                            >
                              <X
                                size={16}
                              />

                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* MY ACTIVITY */}

        <section className="profile-card activity-card">
          <div className="profile-card-heading">
            <div>
              <p className="eyebrow">
                MARKETPLACE ACTIVITY
              </p>

              <h2>My Requests</h2>
            </div>

            <Clock size={22} />
          </div>

          {activityLoading ? (
            <div className="activity-empty">
              <p>
                Loading your requests...
              </p>
            </div>
          ) : activityError ? (
            <div className="request-error">
              {activityError}
            </div>
          ) : totalActivity === 0 ? (
            <div className="activity-empty">
              <ShoppingBag size={32} />

              <h3>
                No requests yet
              </h3>

              <p>
                When you buy, rent, or borrow an
                item, your requests will appear
                here.
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
          ) : (
            <div className="activity-list">

              {/* PURCHASE REQUESTS */}

              {purchaseRequests.map(
                (request) => (
                  <article
                    className="activity-item"
                    key={`purchase-${request.id}`}
                    onClick={() =>
                      navigate(
                        `/listing/${request.listing_id}`
                      )
                    }
                  >
                    <div className="activity-icon">
                      <ShoppingBag
                        size={21}
                      />
                    </div>

                    <div className="activity-main">
                      <div className="activity-top">
                        <div>
                          <span className="activity-type">
                            PURCHASE
                          </span>

                          <h3>
                            {request.title}
                          </h3>
                        </div>

                        <span
                          className={`activity-status ${getStatusClass(
                            request.status
                          )}`}
                        >
                          {formatStatus(
                            request.status
                          )}
                        </span>
                      </div>

                      <div className="activity-details">
                        <span>
                          {request.category_name}
                        </span>

                        <span>
                          <MapPin
                            size={14}
                          />

                          {
                            request.location_name
                          }
                        </span>

                        <span>
                          ₹
                          {Number(
                            request.price || 0
                          )}
                        </span>

                        <span>
                          <CalendarDays
                            size={14}
                          />

                          {formatDate(
                            request.created_at
                          )}
                        </span>
                      </div>
                    </div>
                  </article>
                )
              )}

              {/* RENTAL / BORROW REQUESTS */}

              {rentalRequests.map(
                (request) => (
                  <article
                    className="activity-item"
                    key={`rental-${request.id}`}
                    onClick={() =>
                      navigate(
                        `/listing/${request.listing_id}`
                      )
                    }
                  >
                    <div className="activity-icon">
                      <CalendarDays
                        size={21}
                      />
                    </div>

                    <div className="activity-main">
                      <div className="activity-top">
                        <div>
                          <span className="activity-type">
                            {formatListingType(
                              request.listing_type
                            ).toUpperCase()}
                          </span>

                          <h3>
                            {request.title}
                          </h3>
                        </div>

                        <span
                          className={`activity-status ${getStatusClass(
                            request.status
                          )}`}
                        >
                          {formatStatus(
                            request.status
                          )}
                        </span>
                      </div>

                      <div className="activity-details">
                        <span>
                          {request.category_name}
                        </span>

                        <span>
                          <MapPin
                            size={14}
                          />

                          {
                            request.location_name
                          }
                        </span>

                        <span>
                          {request.listing_type ===
                          "borrow"
                            ? "Free"
                            : `₹${Number(
                                request.total_price ||
                                  0
                              )}`}
                        </span>

                        <span>
                          <CalendarDays
                            size={14}
                          />

                          {formatDate(
                            request.start_date
                          )}{" "}
                          –{" "}
                          {formatDate(
                            request.end_date
                          )}
                        </span>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        {/* PROFILE ACTIONS */}

        <section className="profile-actions">
          <button
            onClick={() =>
              navigate("/wishlist")
            }
          >
            <Heart size={19} />

            My Wishlist
          </button>

          <button
            onClick={() =>
              alert(
                "Account settings will be added next."
              )
            }
          >
            <Settings size={19} />

            Account Settings
          </button>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <LogOut size={19} />

            Logout
          </button>
        </section>
      </div>
    </main>
  );
}

export default Profile;