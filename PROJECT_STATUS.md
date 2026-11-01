# Smart Kirana - V1 Implementation Plan & Current Status

This document outlines the final requirements, architecture, database design, API specification, and phased development roadmap for the Smart Kirana web application, alongside the **CURRENT STATUS** of the project. This allows any future developer or AI tool to understand exactly where the project stands.

---

## 🛑 CURRENT PROJECT STATUS (Task Tracker)

- `[x]` **Phase 1: Backend project + database + authentication**
  - `[x]` Create project directory and virtual environment
  - `[x]` Install Django, DRF, PostgreSQL adapter (psycopg2-binary), SimpleJWT, CORS headers
  - `[x]` Initialize Django project (`backend`) and apps (`accounts`, `products`, `orders`, `offers`, `cart`, `notifications`)
  - `[x]` Configure `settings.py` (DB fallback to sqlite for dev, apps, auth, CORS)
  - `[x]` Implement Custom User model and CustomerProfile in `accounts`
  - `[x]` Create authentication APIs (Signup, Login, Logout)

- `[x]` **Phase 2: Product/category APIs + owner product management**
  - `[x]` Create Category and Product models in `products` app
  - `[x]` Create Category and Product APIs (ViewSet, Serializers)
  - `[x]` Scaffold React frontend using Vite, React Router, and Tailwind CSS
  - `[x]` Build Owner React Dashboard UI for managing Categories and Products
  - `[x]` Integrate frontend with backend APIs

- `[x]` **Phase 3: Customer product browsing**
  - `[x]` Build frontend layout for Customer Website (Navbar, Mobile Tab Bar)
  - `[x]` Build Home page (Categories, Deals, Popular products)
  - `[x]` Build Product Listing page with Category filtering
  - `[x]` Build Product Search functionality with debouncing
  - `[x]` Build Product Details page

- `[x]` **Phase 4: Cart + checkout + orders**
  - `[x]` Build Cart APIs (Add, Update, Delete, Calculate totals) in backend
  - `[x]` Implement Cart context and Cart page in React frontend
  - `[x]` Build Checkout flow (Store Pickup selection)
  - `[x]` Implement Order creation APIs (transactional safety)
  - `[x]` Build Customer Order History and Order Tracking pages

- `[x]` **Phase 5: Owner order management + packing checklist**
  - `[x]` Build Owner Orders UI (List, Filter by Status)
  - `[x]` Implement API endpoints for Order state transitions (Accept, Prepare, Ready, Complete)
  - `[x]` Build Order Details view for Owner
  - `[x]` Build interactive Packing Checklist UI

- `[ ]` **Phase 6: Offers/discounts**
  - `[ ]` Create Offer models and APIs in backend
  - `[ ]` Integrate dynamic discount calculation in Cart API
  - `[ ]` Build Owner UI to create and manage Offers

- `[ ]` **Phase 7: Notifications**
  - `[ ]` Create Notification models and APIs
  - `[ ]` Implement triggers for new orders
  - `[ ]` Build UI in Owner dashboard to display alerts

- `[ ]` **Phase 8: Testing + optimization**
  - `[ ]` Write critical backend tests (Cart totals, Order creation, Permissions)
  - `[ ]` Optimize database queries (avoid N+1) and image handling
  - `[ ]` Test mobile responsiveness across all pages

- `[ ]` **Phase 9: Production deployment**
  - `[ ]` Configure production settings (`DEBUG=False`, CORS, Allowed Hosts)
  - `[ ]` Build React frontend for production
  - `[ ]` Document deployment instructions

---

## 1. Final Requirements Document

**Project Name:** Smart Kirana
**Primary Goal:** Digitize a local Kirana shop with a mobile-first web application connecting customers and the shop owner via a unified Django backend.

**Core Principles:**
- Mobile-first, responsive design
- Clean separation between frontend (React) and backend (Django REST)
- V1 focuses strictly on core features (no microservices, no delivery, no online payments)
- Fast, intuitive user experience and secure, maintainable codebase
- API-first design for future Android app compatibility

## 2. Feature List

**Customer Features:**
- Secure authentication (Signup, Login, Password Reset)
- Profile management
- Product browsing and searching (with pagination and debouncing)
- Category-based filtering
- Cart management (Add, update quantity, remove items)
- Dynamic discount and savings calculation
- Checkout flow (Store Pickup only for V1)
- Real-time order status tracking
- Order history with "Buy Again" capability

**Owner Features:**
- Secure owner authentication (No public signup)
- Dashboard summarizing new/preparing orders and daily metrics
- Product management (CRUD, image optimization, availability toggling)
- Category management (Create, Edit, Delete safely)
- Offer/Discount management (Product-specific, %, fixed, min-order)
- Order management (View, accept, prepare, complete, reject)
- Interactive packing checklist
- Order notifications (Dashboard/Browser)
- Customer overview (Order history and basic details)
- Shop settings (Name, Logo, Timings)

## 3. User Roles and Permissions

- **Customer:** Can browse active products, manage their own cart, place orders, and view their own order history. Cannot access `/owner` routes or APIs.
- **Owner (Admin):** Superuser or specific group permissions. Full access to manage products, categories, offers, and all orders. Cannot use the customer signup flow.

## 4. Complete Page List

**Customer Website:**
- `/` - Home (Search, Categories, Deals, Popular, Buy Again)
- `/products` - All products listing
- `/category/:id` - Products filtered by category
- `/product/:id` - Detailed product view
- `/search` - Search results
- `/cart` - Shopping cart
- `/checkout` - Order summary and placement (Pickup only)
- `/order-success/:id` - Order confirmation
- `/orders` - Customer's order history
- `/orders/:id` - Specific order details and tracking timeline
- `/profile` - Customer profile settings
- `/login` - Customer login
- `/signup` - Customer registration
- `/forgot-password` - Password reset

**Owner Portal:**
- `/owner/login` - Secure owner login
- `/owner/dashboard` - Overview metrics and active orders
- `/owner/products` - Product list
- `/owner/products/add` - Add new product
- `/owner/products/:id/edit` - Edit existing product
- `/owner/categories` - Manage categories
- `/owner/orders` - Order management with status filters
- `/owner/orders/:id` - Order details, state transitions, and packing checklist
- `/owner/offers` - Manage discounts and offers
- `/owner/customers` - View customer directory
- `/owner/settings` - Shop configuration

## 5. User Flows

**Customer Order Flow:**
1. Browse Home/Categories or Search -> View Product Card
2. Tap [+] to add to Cart -> Cart updates seamlessly
3. View Cart -> See subtotal, discounts, final price
4. Checkout -> Authenticate (if not logged in) -> Select Pickup Time -> Place Order
5. View Order Status -> Status moves from NEW -> ACCEPTED -> PREPARING -> READY -> COMPLETED

**Owner Fulfillment Flow:**
1. Dashboard Notification: New Order arrives
2. Open Order Details -> Review items -> Click [ACCEPT ORDER]
3. Click [START PREPARING]
4. Use Packing Checklist -> Check off physical items as packed
5. Click [PACKAGE READY] -> Order status updates for customer
6. Customer picks up order -> Click [MARK COMPLETED]

## 6. ER/Database Design (PostgreSQL)

- **User:** Extends Django's `AbstractUser` (Role flag: Customer/Owner).
- **CustomerProfile:** 1-to-1 with User (Mobile number, pickup preferences).
- **Category:** ID, Name, Active status, Created/Updated at.
- **Product:** ID, Category (FK), Name, Brand, Description, Unit, Regular Price, Offer Price, Image, Is Active, Is In Stock, Created/Updated at.
- **Offer:** ID, Name, Type (Product, %, Fixed, Min-Order), Value, Product (FK, null), Category (FK, null), Min Amount, Start/End Date, Is Active.
- **Cart:** ID, Customer (FK), Created/Updated at.
- **CartItem:** ID, Cart (FK), Product (FK), Quantity.
- **Order:** ID (e.g., SK1025), Customer (FK), Status (New, Accepted, Preparing, Ready, Completed, Rejected), Total Amount, Discount Applied, Pickup Time, Created/Updated at.
- **OrderItem:** ID, Order (FK), Product (FK - for reference), Product Name (Snapshot), Unit (Snapshot), Price (Snapshot), Quantity, Subtotal.
- **Notification:** ID, User/Role (FK), Message, Read Status, Created at.

## 7. API Specification (RESTful)

*All endpoints under `/api/v1/`*

**Auth:**
- `POST /auth/signup/` (Customer only)
- `POST /auth/login/` (Returns JWT/Session)
- `POST /auth/logout/`
- `POST /auth/forgot-password/`

**Products & Categories:**
- `GET /products/` (Query params: search, category, active_only)
- `GET /products/:id/`
- `POST, PUT, DELETE /products/` (Owner only)
- `GET, POST, PUT, DELETE /categories/` (Read all, Mutate Owner only)

**Cart:**
- `GET /cart/` (Gets current user's cart and calculated totals)
- `POST /cart/items/` (Add item)
- `PUT, DELETE /cart/items/:id/`

**Orders:**
- `POST /orders/` (Create order from cart)
- `GET /orders/` (Customer sees own, Owner sees all)
- `GET /orders/:id/`
- `PATCH /orders/:id/status/` (Owner only)

**Offers:**
- `GET, POST, PUT, DELETE /offers/` (Read/Write Owner only, Customers get discounts automatically calculated in cart/products)

**Profile:**
- `GET, PATCH /profile/`

## 8. Folder Structure

```text
smart-kirana/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/ (Django settings)
│   ├── accounts/ (Custom user, profile, auth)
│   ├── products/ (Products, categories)
│   ├── cart/
│   ├── orders/
│   ├── offers/
│   └── notifications/
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── customer/ (Pages, Components, Layouts)
        ├── owner/ (Pages, Components, Layouts)
        ├── auth/ (Shared auth logic)
        ├── common/ (Shared UI components like Buttons, Inputs)
        ├── services/ (Axios API calls)
        ├── context/ (AuthContext, CartContext)
        ├── hooks/
        └── utils/
```

## 9. UI/UX Design System

- **Colors:** 
  - Primary Brand: Deep Green (`#16a34a`)
  - Secondary/Owner Focus: Indigo/Blue (`#4f46e5`)
  - Background: Neutral Gray (`#f9fafb`)
  - Cards: White (`#ffffff`)
  - Status: Green (Success/Ready), Amber (Warning/Preparing), Blue (New), Red (Error/Rejected).
- **Typography:** Modern Sans-serif (Inter or Roboto).
- **Components:** High border-radius for cards (`rounded-2xl` or `rounded-xl`), subtle shadows, large touch targets (min 44px height for buttons).
- **Layouts:**
  - Customer: Bottom sticky navigation on mobile, top navbar on desktop.
  - Owner: Sidebar navigation on desktop, hamburger menu on mobile.
