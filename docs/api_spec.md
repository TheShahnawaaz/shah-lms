# API Specification Guide

All REST API endpoints exposed by the **ShahLMS Backend** Express server are detailed below.

### 📡 Base URL
The default API server runs on:
* **Development**: `http://localhost:5001/api`
* **Production**: Set via the `VITE_API_URL` environment variable.

### 📦 Standard Response Envelope
All API responses follow a uniform JSON structure:
```json
{
  "code": 200,
  "details": "Descriptive message about the result.",
  "data": {}
}
```

---

## 🔒 Authentication API

### 1. User/Google Login
Allows users to sign in. In production, this validates a Google OAuth ID token. In development, it accepts a mock credentials string to simplify manual test flows.

* **Endpoint**: `POST /api/auth/login`
* **Auth Required**: No (Public)
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "idToken": "mock_token_developer@example.com"
  }
  ```
  *(Note: Any token starting with `mock_token_` will bypass OAuth verification and login the extracted email directly when `process.env.NODE_ENV != 'production'`)*

* **Response (200 OK)**:
  ```json
  {
    "code": 200,
    "details": "Login success.",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "2af7a868-b7fb-4819-bf93-6de947514a60",
        "email": "developer@example.com",
        "name": "developer",
        "profilePictureUrl": "https://api.dicebear.com/7.x/initials/svg?seed=developer",
        "isAdmin": true
      }
    }
  }
  ```
* **Common Error Statuses**:
  * `400 Bad Request`: Token parameter is empty.
  * `403 Forbidden`: The email associated with the token is not safelisted in the database.

---

### 2. Get User Profile
Retrieves detailed profile metadata for the currently logged-in user session.

* **Endpoint**: `GET /api/auth/me`
* **Auth Required**: Yes (`Bearer <JWT_TOKEN>`)
* **Response (200 OK)**:
  ```json
  {
    "code": 200,
    "details": "User profile fetched.",
    "data": {
      "id": "2af7a868-b7fb-4819-bf93-6de947514a60",
      "email": "developer@example.com",
      "name": "developer",
      "profilePictureUrl": "https://api.dicebear.com/7.x/initials/svg?seed=developer",
      "isAdmin": true,
      "createdAt": "2026-05-30T16:08:23.000Z"
    }
  }
  ```

---

## 📝 Problems Arena API

### 1. List Paginated Problems
Queries the database catalog. Supports keyword searches, difficulty levels, and tag categorizations.

* **Endpoint**: `GET /api/problems`
* **Auth Required**: Yes (`Bearer <JWT_TOKEN>`)
* **Query Parameters**:
  * `page` *(optional integer, default: 1)*: Page number offset.
  * `limit` *(optional integer, default: 20)*: Count of records per page.
  * `search` *(optional string)*: Filters for text patterns in titles and bodies.
  * `difficulty` *(optional integer)*: Matches numeric ratings (1 = Easy, 2 = Medium, 3 = Hard).
  * `tag` *(optional string)*: Case-insensitive search matching tag names.

* **Response (200 OK)**:
  ```json
  {
    "code": 200,
    "details": "Problems fetched successfully.",
    "data": {
      "problems": [
        {
          "id": 121,
          "title": "Hollow Diamond Pattern",
          "difficulty": 1,
          "timeLimitSec": 1.0,
          "memoryLimitMb": 256,
          "status": "PUBLISHED",
          "createdAt": "2026-05-30T16:08:23.000Z",
          "tags": [
            { "name": "Pattern Rendering" }
          ]
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "totalCount": 1,
        "totalPages": 1
      }
    }
  }
  ```

---

### 2. Get Problem Detail
Retrieves the full detailed structure of a single coding problem. This contains formulas, starter code templates, and editorial sample codes.

* **Endpoint**: `GET /api/problems/:id`
* **Auth Required**: Yes (`Bearer <JWT_TOKEN>`)
* **Path Parameters**:
  * `id` *(integer)*: The exact ID index of the problem.

* **Response (200 OK)**:
  ```json
  {
    "code": 200,
    "details": "Problem details fetched.",
    "data": {
      "id": 121,
      "title": "Hollow Diamond Pattern",
      "body": "Markdown string containing mathematical equations like $N$.",
      "inputFormat": "A single integer $N$.",
      "outputFormat": "Print the hollow diamond pattern.",
      "constraints": "$1 \\le N \\le 50$",
      "difficulty": 1,
      "memoryLimitMb": 256,
      "timeLimitSec": 1.0,
      "note": "Optional markdown note content.",
      "samples": [
        {
          "input": "3",
          "output": " * \n* *\n * \n",
          "explanation": "Standard 3x3 hollow diamond."
        }
      ],
      "hints": {
        "hint1": "Calculate spacer padding.",
        "hint2": "Use nested loops."
      },
      "videoEditorialId": "xyz123",
      "status": "PUBLISHED",
      "hash": "4a589cf29788a1b63ef2a5",
      "createdAt": "2026-05-30T16:08:23.000Z",
      "updatedAt": "2026-05-30T16:08:23.000Z",
      "tags": [
        { "name": "Pattern Rendering" }
      ],
      "editorials": [
        { "code": "print('hello')", "language": "python" }
      ],
      "templates": [
        { "code": "def solve():\n    pass", "language": "python" }
      ]
    }
  }
  ```
* **Common Error Statuses**:
  * `400 Bad Request`: Parameter ID is not an integer.
  * `404 Not Found`: Problem ID is not found.

---

### 3. List All Taxonomy Tags
Lists all problem tags sorted alphabetically alongside their associated problem count.

* **Endpoint**: `GET /api/problems/tags`
* **Auth Required**: Yes (`Bearer <JWT_TOKEN>`)
* **Response (200 OK)**:
  ```json
  {
    "code": 200,
    "details": "Tags list fetched.",
    "data": [
      {
        "id": "e9bcf2a8-14bb-4e67-bf94-1a9865ef122a",
        "name": "Arrays",
        "problemCount": 14
      },
      {
        "id": "ca859cf2-1a4e-48cb-ab82-209865ef715b",
        "name": "Dynamic Programming",
        "problemCount": 5
      }
    ]
  }
  ```

---

## 🛠️ Admin Control API

### 1. Promote User access
Bypasses typical auth systems using a secure headers key. Used to establish the first admin user.

* **Endpoint**: `POST /api/admin/promote`
* **Auth Required**: No (Gated via Headers key)
* **Headers**: `x-admin-secret: <secret_key>`
  *(Must match `ADMIN_SECRET` in `.env`, defaults to `super_secret_admin_promotion_key`)*
* **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "code": 200,
    "details": "User promoted to admin successfully.",
    "data": {
      "id": "31bcf291-a18c-4cf2-83b6-981fcae18f2d",
      "email": "user@example.com",
      "isAdmin": true
    }
  }
  ```

---

### 2. Seed Batch Problems
Allows the UI admin portal to push parsed lists of scraped problems into the database. Runs asynchronously.

* **Endpoint**: `POST /api/admin/seed`
* **Auth Required**: Yes (Admin only)
* **Request Body**:
  ```json
  {
    "problems": [
      {
        "id": 121,
        "title": "Hollow Diamond Pattern",
        "body": "Draw diamond...",
        "difficulty": 1,
        "tags": ["Pattern Rendering"],
        "template_code": [
          { "code": "def solve(): pass", "language": "python" }
        ]
      }
    ]
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "code": 200,
    "details": "Seeding batch processed.",
    "data": {
      "created": 1,
      "updated": 0,
      "skipped": 0,
      "errors": []
    }
  }
  ```

---

### 3. Monitor Seeding Process Status
Retrieves current background processing status and history statistics from the last seed execution run.

* **Endpoint**: `GET /api/admin/seed/status`
* **Auth Required**: Yes (Admin only)
* **Response (200 OK)**:
  ```json
  {
    "code": 200,
    "details": "Seeding status retrieved.",
    "data": {
      "status": "SUCCESS",
      "lastRun": "2026-05-30T16:10:00.000Z",
      "created": 1,
      "updated": 0,
      "skipped": 25,
      "errors": []
    }
  }
  ```

---

### 4. Fetch Allowed Users Safelist
Lists all registered platform accounts (both standard and admin).

* **Endpoint**: `GET /api/admin/users`
* **Auth Required**: Yes (Admin only)
* **Response (200 OK)**:
  ```json
  {
    "code": 200,
    "details": "Allowed users list fetched.",
    "data": [
      {
        "id": "2af7a868-b7fb-4819-bf93-6de947514a60",
        "email": "developer@example.com",
        "name": "developer",
        "profilePictureUrl": "https://api.dicebear.com/...",
        "isAdmin": true,
        "createdAt": "2026-05-30T16:08:23.000Z"
      }
    ]
  }
  ```

---

### 5. Safelist New User Email
Permits an email account to log into the platform.

* **Endpoint**: `POST /api/admin/users`
* **Auth Required**: Yes (Admin only)
* **Request Body**:
  ```json
  {
    "email": "new_student@example.com",
    "isAdmin": false
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "code": 201,
    "details": "User safelisted successfully.",
    "data": {
      "id": "e9bcf2a8-12ab-4efd-12ab-12984abef42a",
      "email": "new_student@example.com",
      "name": null,
      "profilePictureUrl": null,
      "isAdmin": false,
      "createdAt": "2026-05-30T16:11:00.000Z"
    }
  }
  ```

---

### 6. Revoke User Access
Removes an email from the safelist database. The target user is instantly blocked on their next authenticated action.

* **Endpoint**: `DELETE /api/admin/users/:id`
* **Auth Required**: Yes (Admin only)
* **Path Parameters**:
  * `id` *(string)*: Unique database UUID of the target user.

* **Response (200 OK)**:
  ```json
  {
    "code": 200,
    "details": "User access revoked successfully.",
    "data": {
      "id": "e9bcf2a8-12ab-4efd-12ab-12984abef42a",
      "email": "new_student@example.com"
    }
  }
  ```
* **Common Error Statuses**:
  * `400 Bad Request`: An admin user attempts to delete their own ID record ("You cannot remove your own access!").
  * `404 Not Found`: User ID not found.
