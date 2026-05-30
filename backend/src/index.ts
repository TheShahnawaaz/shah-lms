import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import authRoutes from "./features/auth/auth.routes";
import problemRoutes from "./features/problems/problems.routes";
import adminRoutes from "./features/admin/admin.routes";
import { errorHandler } from "./middlewares/error";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Middlewares
app.use(morgan("dev"));
app.use(cors({
  origin: true, // Allow frontend origin
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "OK", version: "1.0.0", env: process.env.NODE_ENV, timestamp: new Date() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/admin", adminRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(port, () => {
  console.log(`[Server] Backend API running at http://localhost:${port}`);
});
