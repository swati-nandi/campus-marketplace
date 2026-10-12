-- VIT Exchange: development seed data. Run ONCE on a freshly migrated database.
-- Demo password for all seeded students: Demo@12345 (development only).
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Campus locations
INSERT INTO campus_locations (name, kind) VALUES
  ('SJT (Silver Jubilee Tower)', 'academic'),
  ('TT (Technology Tower)', 'academic'),
  ('SMV', 'academic'),
  ('M-Block Men''s Hostel', 'hostel'),
  ('Q-Block Men''s Hostel', 'hostel'),
  ('D Block Ladies Hostel', 'hostel'),
  ('Main Gate (Katpadi Bus/Auto Stand)', 'other'),
  ('VIT Lake / Food Street', 'other')
ON CONFLICT (name) DO NOTHING;

-- Categories
INSERT INTO categories (name, slug) VALUES
  ('Books & Study Materials', 'books'),
  ('Electronics & Gadgets', 'electronics'),
  ('Lab Coats & Engineering Gear', 'lab-gear'),
  ('Cycles & Campus Mobility', 'cycles'),
  ('Hostel Room Essentials', 'room-essentials')
ON CONFLICT (name) DO NOTHING;

-- Demo students (no admin here; create it from .env via a backend script)
INSERT INTO users (email, password_hash, role, email_verified_at) VALUES
  ('rohit2023@vitstudent.ac.in',  crypt('Demo@12345', gen_salt('bf', 10)), 'student', now()),
  ('ananya2024@vitstudent.ac.in', crypt('Demo@12345', gen_salt('bf', 10)), 'student', now())
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_profiles (user_id, full_name, reg_no, phone, hostel_block, bio) VALUES
  ((SELECT id FROM users WHERE email = 'rohit2023@vitstudent.ac.in'),
   'Rohit', '23BCE0001', '+910000000001', 'M-Block, Room 412',
   'Third year CSE student. Selling old items before shifting blocks.'),
  ((SELECT id FROM users WHERE email = 'ananya2024@vitstudent.ac.in'),
   'Ananya', '24BME0002', '+910000000002', 'D-Block, Room 102',
   'Mechanical engineering 2nd year. Looking to rent out lab kits.')
ON CONFLICT (user_id) DO NOTHING;

-- Listings
INSERT INTO listings
  (owner_id, category_id, location_id, title, description, condition, listing_type, price, deposit, rental_unit)
VALUES
  ((SELECT id FROM users WHERE email = 'rohit2023@vitstudent.ac.in'),
   (SELECT id FROM categories WHERE slug = 'books'),
   (SELECT id FROM campus_locations WHERE name = 'M-Block Men''s Hostel'),
   'Advanced Engineering Mathematics - Erwin Kreyszig',
   'Perfect condition textbook used for MAT2001. No annotations or highlighted text inside.',
   'like_new', 'sale', 600.00, NULL, NULL),

  ((SELECT id FROM users WHERE email = 'rohit2023@vitstudent.ac.in'),
   (SELECT id FROM categories WHERE slug = 'cycles'),
   (SELECT id FROM campus_locations WHERE name = 'VIT Lake / Food Street'),
   'Hercules 7-Speed Gear Cycle',
   'Great for getting from the men''s hostels to SJT. Brake pads recently replaced.',
   'good', 'sale', 2500.00, NULL, NULL),

  ((SELECT id FROM users WHERE email = 'ananya2024@vitstudent.ac.in'),
   (SELECT id FROM categories WHERE slug = 'lab-gear'),
   (SELECT id FROM campus_locations WHERE name = 'TT (Technology Tower)'),
   'Mechanical Workshop Tools & Lab Coat',
   'Includes safety goggles, workshop file template, and an L-sized clean lab coat.',
   'good', 'sale', 350.00, NULL, NULL),

  ((SELECT id FROM users WHERE email = 'ananya2024@vitstudent.ac.in'),
   (SELECT id FROM categories WHERE slug = 'electronics'),
   (SELECT id FROM campus_locations WHERE name = 'SJT (Silver Jubilee Tower)'),
   'Casio FX-991EX Scientific Calculator',
   'Renting out for CAT-1 and CAT-2 exam weeks only. Please return it in working condition.',
   'fair', 'rental', 50.00, 200.00, 'day');

COMMIT;
