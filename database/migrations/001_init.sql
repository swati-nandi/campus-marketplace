-- VIT Exchange schema. Targets PostgreSQL 16. Run on an empty database.
BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============ Reference tables ============
CREATE TABLE campus_locations (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  kind        TEXT NOT NULL CHECK (kind IN ('hostel','academic','other'))
);

CREATE TABLE categories (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  parent_id  BIGINT REFERENCES categories(id) ON DELETE SET NULL
);

-- ============ Users ============
-- Role kept as a CHECK column: only two roles, no extra attributes per role,
-- so a separate roles table would add a join without adding information.
CREATE TABLE users (
  id                 BIGSERIAL PRIMARY KEY,
  email              CITEXT NOT NULL UNIQUE,
  password_hash      TEXT NOT NULL,
  role               TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  is_suspended       BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_profiles (
  user_id      BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  reg_no       TEXT UNIQUE,
  phone        TEXT,
  hostel_block TEXT,
  bio          TEXT,
  avatar_url   TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Listings ============
CREATE TABLE listings (
  id            BIGSERIAL PRIMARY KEY,
  owner_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  category_id   BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  location_id   BIGINT REFERENCES campus_locations(id) ON DELETE SET NULL,
  title         TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 150),
  description   TEXT NOT NULL DEFAULT '',
  condition     TEXT NOT NULL CHECK (condition IN ('new','like_new','good','fair')),
  listing_type  TEXT NOT NULL CHECK (listing_type IN ('sale','rental','borrow')),
  price         NUMERIC(10,2),
  deposit       NUMERIC(10,2) CHECK (deposit IS NULL OR deposit >= 0),
  rental_unit   TEXT CHECK (rental_unit IN ('day','week','month')),
  status        TEXT NOT NULL DEFAULT 'available'
                CHECK (status IN ('available','reserved','sold','rented','removed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_tsv    TSVECTOR GENERATED ALWAYS AS (
                  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
                ) STORED,
  CONSTRAINT listing_type_fields CHECK (
       (listing_type = 'sale'   AND price IS NOT NULL AND price >= 0 AND rental_unit IS NULL)
    OR (listing_type = 'rental' AND price IS NOT NULL AND price > 0  AND rental_unit IS NOT NULL)
    OR (listing_type = 'borrow' AND price IS NULL AND rental_unit IS NULL)
  )
);

CREATE TABLE listing_images (
  id          BIGSERIAL PRIMARY KEY,
  listing_id  BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  position    INT NOT NULL DEFAULT 0 CHECK (position >= 0),
  UNIQUE (listing_id, position)
);

CREATE TABLE listing_status_history (
  id          BIGSERIAL PRIMARY KEY,
  listing_id  BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Clearance bundles ============
CREATE TABLE clearance_bundles (
  id           BIGSERIAL PRIMARY KEY,
  owner_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  total_price  NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  status       TEXT NOT NULL DEFAULT 'available'
               CHECK (status IN ('available','reserved','sold','removed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UNIQUE(listing_id): an item can belong to at most one bundle.
CREATE TABLE clearance_bundle_items (
  bundle_id   BIGINT NOT NULL REFERENCES clearance_bundles(id) ON DELETE CASCADE,
  listing_id  BIGINT NOT NULL UNIQUE REFERENCES listings(id) ON DELETE RESTRICT,
  PRIMARY KEY (bundle_id, listing_id)
);

-- ============ Wanted-item requests ============
CREATE TABLE item_requests (
  id                 BIGSERIAL PRIMARY KEY,
  requester_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id        BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  title              TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  max_budget         NUMERIC(10,2) CHECK (max_budget IS NULL OR max_budget >= 0),
  desired_condition  TEXT CHECK (desired_condition IN ('new','like_new','good','fair')),
  preferred_type     TEXT CHECK (preferred_type IN ('sale','rental','borrow')),
  needed_by          DATE,
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','closed')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Offers and purchase requests ============
CREATE TABLE offers (
  id          BIGSERIAL PRIMARY KEY,
  listing_id  BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_offer_one_pending
  ON offers (listing_id, buyer_id) WHERE status = 'pending';

-- A request targets exactly one of: a single listing or a whole bundle.
CREATE TABLE purchase_requests (
  id          BIGSERIAL PRIMARY KEY,
  listing_id  BIGINT REFERENCES listings(id) ON DELETE CASCADE,
  bundle_id   BIGINT REFERENCES clearance_bundles(id) ON DELETE CASCADE,
  buyer_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id    BIGINT REFERENCES offers(id) ON DELETE SET NULL,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_target CHECK ((listing_id IS NOT NULL) <> (bundle_id IS NOT NULL))
);
CREATE UNIQUE INDEX uq_request_one_pending_listing
  ON purchase_requests (listing_id, buyer_id) WHERE status = 'pending' AND listing_id IS NOT NULL;
CREATE UNIQUE INDEX uq_request_one_pending_bundle
  ON purchase_requests (bundle_id, buyer_id) WHERE status = 'pending' AND bundle_id IS NOT NULL;

-- ============ Transactions ============
-- Records an arrangement; payment is in person. payment_confirmed_at is set only
-- when the seller confirms receipt. It is NOT verified payment.
CREATE TABLE transactions (
  id                    BIGSERIAL PRIMARY KEY,
  purchase_request_id   BIGINT UNIQUE REFERENCES purchase_requests(id) ON DELETE RESTRICT,
  listing_id            BIGINT REFERENCES listings(id) ON DELETE RESTRICT,
  bundle_id             BIGINT REFERENCES clearance_bundles(id) ON DELETE RESTRICT,
  buyer_id              BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount                NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status                TEXT NOT NULL DEFAULT 'pending_meetup'
                        CHECK (status IN ('pending_meetup','completed','cancelled','disputed')),
  payment_method        TEXT NOT NULL DEFAULT 'in_person',
  payment_confirmed_at  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ,
  CONSTRAINT tx_one_target CHECK ((listing_id IS NOT NULL) <> (bundle_id IS NOT NULL)),
  CONSTRAINT tx_parties_differ CHECK (buyer_id <> seller_id)
);
-- Database-level guard against double-selling: at most one live transaction per item.
CREATE UNIQUE INDEX uq_tx_live_listing ON transactions (listing_id)
  WHERE status <> 'cancelled' AND listing_id IS NOT NULL;
CREATE UNIQUE INDEX uq_tx_live_bundle ON transactions (bundle_id)
  WHERE status <> 'cancelled' AND bundle_id IS NOT NULL;

-- ============ Rentals and borrowing (one table; borrow = rental at price 0) ============
CREATE TABLE rental_bookings (
  id                BIGSERIAL PRIMARY KEY,
  listing_id        BIGINT NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  renter_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'requested'
                    CHECK (status IN ('requested','approved','rejected','active','returned','cancelled')),
  total_price       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  deposit_amount    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  condition_before  TEXT CHECK (condition_before IN ('new','like_new','good','fair')),
  condition_after   TEXT CHECK (condition_after  IN ('new','like_new','good','fair')),
  picked_up_at      TIMESTAMPTZ,
  returned_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date),
  -- Two confirmed bookings of the same item can never overlap.
  CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
    listing_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  ) WHERE (status IN ('approved','active'))
);

-- ============ Wishlist ============
CREATE TABLE wishlist_items (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id  BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

-- ============ Messaging ============
CREATE TABLE conversations (
  id          BIGSERIAL PRIMARY KEY,
  listing_id  BIGINT REFERENCES listings(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE conversation_participants (
  conversation_id  BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at     TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE TABLE messages (
  id               BIGSERIAL PRIMARY KEY,
  conversation_id  BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body             TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Notifications ============
CREATE TABLE notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Reviews ============
CREATE TABLE reviews (
  id              BIGSERIAL PRIMARY KEY,
  transaction_id  BIGINT NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  reviewer_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_review CHECK (reviewer_id <> reviewee_id),
  CONSTRAINT one_review_per_tx_reviewer UNIQUE (transaction_id, reviewer_id)
);

-- ============ Reports and audit ============
CREATE TABLE reports (
  id                BIGSERIAL PRIMARY KEY,
  reporter_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id        BIGINT REFERENCES listings(id) ON DELETE SET NULL,
  reported_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reason            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  resolved_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT report_has_target CHECK (listing_id IS NOT NULL OR reported_user_id IS NOT NULL)
);

CREATE TABLE admin_audit_logs (
  id           BIGSERIAL PRIMARY KEY,
  admin_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  target_type  TEXT NOT NULL,
  target_id    BIGINT,
  details      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Indexes ============
CREATE INDEX idx_listings_owner          ON listings (owner_id);
CREATE INDEX idx_listings_browse         ON listings (status, created_at DESC);
CREATE INDEX idx_listings_cat_type       ON listings (category_id, listing_type) WHERE status = 'available';
CREATE INDEX idx_listings_price          ON listings (price) WHERE status = 'available';
CREATE INDEX idx_listings_location       ON listings (location_id);
CREATE INDEX idx_listings_tsv            ON listings USING gin (search_tsv);
CREATE INDEX idx_listings_title_trgm     ON listings USING gin (title gin_trgm_ops);
CREATE INDEX idx_images_listing          ON listing_images (listing_id);
CREATE INDEX idx_status_hist_listing     ON listing_status_history (listing_id, changed_at DESC);
CREATE INDEX idx_offers_listing          ON offers (listing_id);
CREATE INDEX idx_offers_buyer            ON offers (buyer_id);
CREATE INDEX idx_requests_listing        ON purchase_requests (listing_id);
CREATE INDEX idx_requests_buyer          ON purchase_requests (buyer_id);
CREATE INDEX idx_tx_buyer                ON transactions (buyer_id, created_at DESC);
CREATE INDEX idx_tx_seller               ON transactions (seller_id, created_at DESC);
CREATE INDEX idx_rentals_listing_dates   ON rental_bookings (listing_id, start_date, end_date);
CREATE INDEX idx_rentals_renter          ON rental_bookings (renter_id);
CREATE INDEX idx_messages_conv           ON messages (conversation_id, created_at);
CREATE INDEX idx_participants_user       ON conversation_participants (user_id);
CREATE INDEX idx_notif_user_unread       ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX idx_item_requests_open      ON item_requests (category_id) WHERE status = 'open';
CREATE INDEX idx_reviews_reviewee        ON reviews (reviewee_id);
CREATE INDEX idx_reports_open            ON reports (status) WHERE status = 'open';

-- ============ Functions and triggers ============
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Keeps an automatic history of every listing status change.
-- The backend sets `SET LOCAL app.user_id = '<id>'` inside its transaction.
CREATE FUNCTION log_listing_status() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO listing_status_history (listing_id, old_status, new_status, changed_by)
    VALUES (NEW.id,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END,
            NEW.status,
            NULLIF(current_setting('app.user_id', true), '')::bigint);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listing_status_ins AFTER INSERT ON listings
  FOR EACH ROW EXECUTE FUNCTION log_listing_status();
CREATE TRIGGER trg_listing_status_upd AFTER UPDATE OF status ON listings
  FOR EACH ROW EXECUTE FUNCTION log_listing_status();

-- Nobody can buy, offer on, or rent their own listing or bundle.
CREATE FUNCTION forbid_self_deal() RETURNS trigger AS $$
DECLARE
  j JSONB := to_jsonb(NEW);
  actor BIGINT := COALESCE(j->>'buyer_id', j->>'renter_id')::bigint;
  owner BIGINT;
BEGIN
  SELECT owner_id INTO owner FROM listings WHERE id = (j->>'listing_id')::bigint;
  IF owner IS NULL THEN
    SELECT owner_id INTO owner FROM clearance_bundles WHERE id = (j->>'bundle_id')::bigint;
  END IF;
  IF owner = actor THEN
    RAISE EXCEPTION 'You cannot transact on your own listing' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_offers_no_self   BEFORE INSERT ON offers
  FOR EACH ROW EXECUTE FUNCTION forbid_self_deal();
CREATE TRIGGER trg_requests_no_self BEFORE INSERT ON purchase_requests
  FOR EACH ROW EXECUTE FUNCTION forbid_self_deal();
CREATE TRIGGER trg_rentals_no_self  BEFORE INSERT ON rental_bookings
  FOR EACH ROW EXECUTE FUNCTION forbid_self_deal();

-- Reviews only for completed transactions, between the two real parties.
CREATE FUNCTION check_review_eligibility() RETURNS trigger AS $$
DECLARE t transactions%ROWTYPE;
BEGIN
  SELECT * INTO t FROM transactions WHERE id = NEW.transaction_id;
  IF t.status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'Transaction is not completed' USING ERRCODE = '23514';
  END IF;
  IF NOT ((NEW.reviewer_id = t.buyer_id  AND NEW.reviewee_id = t.seller_id)
       OR (NEW.reviewer_id = t.seller_id AND NEW.reviewee_id = t.buyer_id)) THEN
    RAISE EXCEPTION 'Reviewer and reviewee must be the buyer and seller' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_eligibility BEFORE INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION check_review_eligibility();

-- ============ Views ============
CREATE VIEW v_available_listings AS
SELECT l.id, l.title, l.description, l.condition, l.listing_type, l.price, l.deposit,
       l.rental_unit, l.created_at, l.search_tsv,
       l.category_id, c.name AS category_name,
       l.location_id, loc.name AS location_name,
       l.owner_id, p.full_name AS owner_name,
       (SELECT url FROM listing_images i WHERE i.listing_id = l.id ORDER BY position LIMIT 1) AS cover_image
FROM listings l
JOIN categories c ON c.id = l.category_id
JOIN user_profiles p ON p.user_id = l.owner_id
LEFT JOIN campus_locations loc ON loc.id = l.location_id
JOIN users u ON u.id = l.owner_id AND NOT u.is_suspended
WHERE l.status = 'available';

CREATE VIEW v_user_ratings AS
SELECT reviewee_id AS user_id,
       COUNT(*)                     AS review_count,
       ROUND(AVG(rating)::numeric, 2) AS avg_rating
FROM reviews GROUP BY reviewee_id;

CREATE VIEW v_overdue_rentals AS
SELECT r.*, (CURRENT_DATE - r.end_date) AS days_overdue
FROM rental_bookings r
WHERE r.status = 'active' AND r.end_date < CURRENT_DATE;

COMMIT;