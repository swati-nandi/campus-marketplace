# VIT Exchange – Campus Marketplace Management System

VIT Exchange is a campus-focused marketplace management system designed for students to buy, sell, rent, borrow, and manage items within the VIT campus community.

The system provides a centralized platform for student-to-student transactions while maintaining database-level rules for transaction safety, rental availability, and user ownership.

---

## 1. Project Overview

Students often rely on informal communication channels to buy and sell used books, electronics, cycles, lab equipment, hostel essentials, and other campus items.

VIT Exchange provides a structured marketplace where students can:

- Create and manage listings
- Browse available campus items
- Search and filter listings
- Buy items
- Rent items
- Borrow items
- Send purchase/rental/borrow requests
- Accept or reject incoming requests
- Maintain a wishlist
- View transaction and request history
- Manage their profile

The application is built as a full-stack web application using React, Node.js, Express, and PostgreSQL.

---

## 2. Main Features

### Authentication

- Student login using email and password
- JWT-based authentication
- Password hashing using bcrypt
- Protected backend routes
- Suspended-user validation

### Marketplace

- View available listings
- Search listings
- Filter listings
- View listing details
- View category and campus location
- View seller information

### Listing Management

Students can create listings with:

- Title
- Description
- Category
- Condition
- Price
- Campus location
- Listing type

Supported listing types:

- Sale
- Rental
- Borrow

Rental listings additionally support:

- Rental price
- Deposit
- Rental unit

### Purchase Requests

For sale listings:

1. Buyer sends a purchase request.
2. Seller reviews the request.
3. Seller can accept or reject it.
4. Accepted requests create a transaction.
5. The listing becomes sold.
6. Other pending requests for the listing are rejected.

### Rental and Borrow Requests

For rental and borrow listings:

- Student selects start and end dates.
- The system checks availability.
- Rental price is calculated according to the configured rental unit.
- Deposit information is recorded.
- Sellers can approve or reject requests.
- Overlapping approved/active rentals are prevented.

### Wishlist

Students can:

- Add listings to their wishlist
- View saved listings
- Remove listings from their wishlist

### Profile

The profile section provides:

- User information
- Listing information
- Wishlist information
- Purchase requests
- Rental/borrow requests
- Incoming seller requests
- Request status
- Transaction information

---

## 3. Technology Stack

### Frontend

- React
- Vite
- React Router
- Lucide React

### Backend

- Node.js
- Express.js
- PostgreSQL
- JWT
- bcrypt
- cookie-parser
- CORS

### Database

- PostgreSQL 16
- SQL constraints
- Foreign keys
- Check constraints
- Unique constraints
- Exclusion constraints
- Database triggers
- Views
- Indexes

### Development Tools

- Visual Studio Code
- Git
- GitHub
- npm

---

## 4. System Architecture

```text
                    ┌─────────────────────┐
                    │      Student        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │       + Vite        │
                    └──────────┬──────────┘
                               │
                         HTTP / REST API
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Express Backend   │
                    │      Node.js        │
                    └──────────┬──────────┘
                               │
                    JWT Authentication
                               │
                               ▼
                    ┌─────────────────────┐
                    │    PostgreSQL DB    │
                    │                     │
                    │ Users               │
                    │ Listings            │
                    │ Requests            │
                    │ Transactions        │
                    │ Rentals             │
                    │ Wishlist            │
                    │ Categories          │
                    │ Locations           │
                    └─────────────────────┘