# Developer Setup & Seeding Guide

Follow this guide to install, configure, migrate, and seed the **ShahLMS** platform on your local machine.

---

## 📋 Prerequisites

Before proceeding, verify that your machine has the following tools installed:
* **Node.js** (v18.0.0 or higher)
* **PostgreSQL** (v14 or higher)
* **NPM** (v9 or higher)
* **Python 3** (Optional, only required for running the scraper in the workspace root)

---

## 🛠️ Environment Configurations

Both the frontend and backend require unique local configuration parameters. Create the following files:

### 1. Backend Config: `platform/backend/.env`
Create this file inside the `platform/backend` folder:
```env
# Server Port
PORT=5001

# Database Connection (update username, password, host, and dbname)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shahlms?schema=public"

# Session JWT Signing Secret
JWT_SECRET="shahlms_secret_jwt_key_987654321"

# Promotion Endpoint Security Header Key
ADMIN_SECRET="super_secret_admin_promotion_key"

# Google Client ID for OAuth login verification
GOOGLE_CLIENT_ID="YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com"

# Node Environment ("development" or "production")
NODE_ENV="development"
```

### 2. Frontend Config: `platform/frontend/.env`
Create this file inside the `platform/frontend` folder:
```env
# Backend API url Endpoint
VITE_API_URL="http://localhost:5001/api"

# Google Credentials OAuth Client ID (must match backend key)
VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com"
```

---

## 🗄️ Database Setup & Migration

1. **Create local database**:
   Connect to your PostgreSQL client and run:
   ```sql
   CREATE DATABASE shahlms;
   ```

2. **Generate Client & Push Models**:
   Open a terminal in the backend directory and run:
   ```bash
   cd platform/backend
   npm run build
   npm run prisma:push
   ```
   * The `npm run build` command runs `prisma generate` and compiles TypeScript to Javascript in `dist/`.
   * The `npm run prisma:push` runs `prisma db push`, which creates the tables inside PostgreSQL without needing migration file records (ideal for rapid prototyping).

---

## 🔐 Bootstrapping the Admin User

The platform requires users to be safelisted in the `User` database table before they can log in. Because you cannot log in to safelist yourself, you must bootstrap the first administrator using a REST API promotion call:

1. Locate the `ADMIN_SECRET` defined in `platform/backend/.env` (defaults to `super_secret_admin_promotion_key`).
2. Make a POST request using `curl` or Postman to the promotion endpoint:
   ```bash
   curl -X POST http://localhost:5001/api/admin/promote \
     -H "Content-Type: application/json" \
     -H "X-Admin-Secret: super_secret_admin_promotion_key" \
     -d '{"email": "your_email@example.com"}'
   ```
3. This adds `your_email@example.com` to the `User` database table and flags them as `isAdmin: true`.
4. You can now log into the platform using this email. Once authenticated, you will have access to the Admin Seeding dashboard (`/admin/seed`) and Safelist dashboard (`/admin/users`) where you can add or remove access for standard student accounts.

---

## 🔄 Seeding Problem Data

The database uses raw problem data scraped by the root Python scraper (`scraper/main.py`). Seeding parses these JSON files and synchronizes them into PostgreSQL.

### Option A: Local Command Line Sync (CLI)
Ensure you have scraped problems in the root `data/raw_json/` directory, then run from the backend directory:
```bash
npm run db:seed
```
This runs `prisma db seed`, which triggers the compiled TS code executing `prisma/seed.ts`. It iterates through all files in `../../data/raw_json`, checks MD5 hashes, and upserts them.

### Option B: Remote Admin Sync (Web UI Dashboard)
1. Boot both the frontend and backend servers.
2. Log in using your bootstrapped Admin account.
3. Open the sidebar navigation menu and click **Seed Problems**.
4. In the seeding panel, select the JSON folder or paste the scraped problem arrays, then click **Sync Database**.
5. The frontend will periodically poll the `/api/admin/seed/status` endpoint to update progress counters (New Created, Updated, and Skipped counts).

---

## 🏃 Running the Application

### 1. Launch Backend Server
```bash
cd platform/backend
npm run dev
```
The server will boot Nodemon and watch for TypeScript file changes, listening at `http://localhost:5001`.

### 2. Launch Frontend Application
```bash
cd platform/frontend
npm run dev
```
Vite will start the client dev server at `http://localhost:5173`. Open this URL in your web browser.

---

## 🧪 Development Mock Bypass Login

Setting up Google OAuth client credentials can be tedious during development. To bypass Google verification:
1. Ensure `NODE_ENV` is set to `"development"` in the backend `.env`.
2. On the `/login` page, you can simulate a login by using the mock bypass token.
3. If you have safelisted an email `student@example.com`, you can submit a dev authentication bypass payload containing the prefix `mock_token_student@example.com` in place of the Google JWT credentials.
4. The server will bypass Google check-calls, automatically extract `student@example.com`, and issue a fully functional local JWT session token.

---

## ⚠️ Troubleshooting & Pitfalls

### ❌ Error: "This email is not authorized to access the platform"
* **Reason**: The email address is missing from the `User` table database safelist.
* **Fix**: Follow the [Bootstrapping the Admin User](#-bootstrapping-the-admin-user) section to insert your email as an Admin, or log in as an Admin and add the email via the UI Allowed Users panel.

### ❌ Prisma Error: `P1001: Can't reach database server`
* **Reason**: PostgreSQL is not running or the connection string credentials in `platform/backend/.env` are incorrect.
* **Fix**: Verify your Postgres server status (`pg_ctl` or Docker container status) and double-check database name/port combinations inside `DATABASE_URL`.

### ❌ Monaco Editor loads slowly or fails to render
* **Reason**: Monaco loads its core bundle asynchronously from CDN links. If your development machine has restricted web access, Monaco will fail to load.
* **Fix**: Ensure you have an active network connection, or modify `vite.config.ts` to fetch and bundle Monaco assets locally.
