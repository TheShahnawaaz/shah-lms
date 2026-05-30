# ShahLMS Mock Feature Tracker

This document outlines all current frontend-mocked features, hardcoded stats, and simulated behaviors across the platform. Use this as a checklist for future backend API integration and database schema expansion.

---

## 1. Dashboard (`Dashboard.tsx`)

| Feature | Current Mock Behavior | Future Real Data Implementation |
| :--- | :--- | :--- |
| **Solved Problems Counter** | Hardcoded to show `0` solved out of the total problems: `0 / {totalProblems}`. | Query the user's successful submission records from a `Submission` model where `status = "ACCEPTED"`. |
| **Daily Streak Counter** | Hardcoded to `"1 day"`. | Calculate from the user's daily login logs or daily submission timestamps in the database. |
| **Difficulty Distribution** | Difficulty percentages are hardcoded: Easy (35%), Medium (45%), Hard (15%), Harder (5%). | Dynamically calculate based on the count of active problems per difficulty in the catalog. |

---

## 2. Problems Arena Header (`ProblemDetail.tsx`)

| Feature | Current Mock Behavior | Future Real Data Implementation |
| :--- | :--- | :--- |
| **Star Pill (Points)** | Hardcoded to show `68` stars. | Retrieve cumulative points from the user's score/XP column in the `User` database table. |
| **Trophy Pill (XP / Rank)** | Hardcoded to show `268` trophies. | Retrieve the user's current rank or contest performance metrics from a leaderboard query. |
| **Flame Pill (Streak)** | Hardcoded to show `0` flame streak. | Fetch dynamic daily submission streak from the user's profile statistics. |
| **Notification Bell** | Static icon button with no dropdown or notifications panel. | Fetch dynamic user alerts/announcements from a `Notification` model in the database. |

---

## 3. Coding Sandbox & Judge (`ProblemDetail.tsx`)

| Feature | Current Mock Behavior | Future Real Data Implementation |
| :--- | :--- | :--- |
| **Run on Sample** | Simulated execution using a series of frontend `setTimeout` delays representing compilation states ("Compiling...", "Running Test Case 1..."). The output simply echoes the input. | Connect to a remote code execution engine (e.g., **Judge0**, **AWS Lambda**, or custom Docker container sandboxes) to securely compile and run the user's script. |
| **Code Submission** | Triggers a simulated execution sequence that displays a mock success alert: `"Submission Status: Accepted (15/15 test cases passed)!"` with hardcoded statistics (0.04s, 4MB). | Post code to backend submission API. Compile and run against all hidden test cases, update the user's solved status, and persist the record in a `Submission` table. |
| **Problem Bookmarking** | Toggles a local component state (`bookmarked = true/false`) without persisting the action. | Create a `UserBookmark` model in the database and implement API endpoints (`POST` / `DELETE` `/problems/:id/bookmark`) to save user favorites. |

---

## 4. Coding Templates (`ProblemDetail.tsx`)

| Feature | Current Mock Behavior | Future Real Data Implementation |
| :--- | :--- | :--- |
| **Reset / Default Templates** | Uses local fallback boilerplate strings defined in the React component for C++, Java, and Python if template models are empty. | Retrieve custom start templates seeded from the database via the `TemplateCode` model relation. |
