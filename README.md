# Library Management Ecosystem

Welcome to the **Library Management Ecosystem**! This project replaces a legacy desktop application with a modern, fast, mobile-first web application designed specifically for library staff to manage borrowing, returns, and inventory seamlessly from their smartphones.

---

## The Vision

The goal of this project was to modernize operations for a local library by moving away from a constrained desktop environment to a cloud-based, accessible platform. Designed with speed, reliability, and ease of use in mind, the system empowers librarians to handle day-to-day tasks efficiently on the go.

The ecosystem strongly enforces data integrity (SQL), secure role-based access, and server-side transactional workflows.

---

## Tech Stack & Architecture

Built with modern web technologies to ensure scalability, performance, and a great developer experience. The application is seamlessly deployed on Vercel for fast, global delivery.

| Category | Technology |
|---|---|
| **Frontend Framework** | Next.js 16 (App Router) + React 19 + TypeScript |
| **Styling** | Tailwind CSS v4 |
| **UI Components** | Radix UI primitives, Lucide React icons |
| **Forms & Validation** | React Hook Form + Zod |
| **Backend & Database** | Neon (Serverless Postgres) + Drizzle ORM |
| **Authentication** | Firebase Auth (Client) |
| **Deployment** | Vercel |
| **Utilities** | `html5-qrcode` (barcode scanning), `date-fns` (timezone handling) |

---

## Key Features

- **Mobile-First Interface:** A responsive dashboard optimized for smartphones, which are the primary devices used by the library staff.
- **Integrated Barcode Scanning:** Issue and return books instantly using the device camera to scan book codes directly in the browser.
- **Member & Inventory Management:** Comprehensive CRUD operations for managing library members and the physical book catalog.
- **Automated Fine Calculation:** Automatically tracks and calculates overdue fines (in AED) with support for administrative overrides.
- **Real-time Dashboard & Reporting:** Insightful analytics on active loans, overdue items, and library usage, plus CSV export for reports.
- **Role-Based Access Control:** Secure authentication and authorization separating Admin capabilities (like system settings) from standard Librarian duties.
- **Comprehensive Audit Trails:** Append-only audit logs tracking all critical actions (issuing/returning books, fine adjustments, user changes).
- **Relational Integrity by Design:** Server-side transaction enforcement prevents double-issuing a copy or leaving orphaned loans.

---

## Local Development Setup

Follow these instructions to run the Library Management Ecosystem locally.

### 1. Requirements

- Node.js (v18 or higher)
- pnpm or npm
- A [Neon Database](https://neon.tech) account (PostgreSQL)
- A [Firebase](https://firebase.google.com/) account (for Authentication)

### 2. Environment Variables

Clone the repository, then copy the `.env.local.example` configuration file:

```bash
cp .env.local.example .env.local
```

Next, open `.env.local` and configure your environment variables:
- `DATABASE_URL`: Your pooled PostgreSQL connection string from Neon.
- `NEXT_PUBLIC_FIREBASE_*`: Your Firebase project details used for client-side Auth.

*(Note: Ensure your backend uses the appropriate secret setup for administering tokens or permissions if required.)*

### 3. Install Dependencies

Install the necessary dependencies using your package manager:

```bash
npm install
# or
pnpm install
```

### 4. Database Setup & Migrations

The project uses [Drizzle ORM](https://orm.drizzle.team/) to manage the Postgres schema. Generate and push your schema to Neon:

```bash
# Push schema directly to the database
npx drizzle-kit push
```

*(Optional)* If you need to seed your first Admin user to access the platform:
```bash
ADMIN_EMAIL=admin@librarymanagement.ae \
ADMIN_PASSWORD=your-secure-password \
ADMIN_NAME="Library Admin" \
npx ts-node -P scripts/tsconfig.json scripts/seed-admin.ts
```

### 5. Running the Application

Start the local Next.js development server:

```bash
npm run dev
# or 
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## Project Structure Overview

```text
├── app/                  # Next.js App Router root (pages and layouts)
│   ├── (auth)/           # Public-facing authentication pages (Login)
│   └── (app)/            # Secure dashboard and application pages
├── components/           # Reusable React components
│   ├── ui/               # Generic UI primitives (Buttons, Modals, Tables)
│   └── layout/           # Global layouts (Sidebar, TopNav)
├── lib/                  # Core business logic and shared configurations
│   ├── db/               # Drizzle ORM client and schema definitions
│   └── actions/          # Next.js Server Actions for secure mutations
├── hooks/                # Custom React hooks containing data fetching and UI logic
├── scripts/              # Setup, migration, and seeder scripts
└── drizzle/              # Generated SQL migrations for version control
```

---

## Contributing

This project is tailored specifically towards internal library use and assumes certain policies (e.g., timezone set to Asia/Dubai, currency set to AED/Fils). If you plan to adapt it for your own library, you will need to adjust the settings and locale logic located primarily in the `lib/utils` and `lib/constants` directories.

---

## License
This project is open-source and available under standard open source provisions.
