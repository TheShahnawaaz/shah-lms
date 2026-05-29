import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./features/auth/auth.routes";
import problemRoutes from "./features/problems/problems.routes";
import { errorHandler } from "./middlewares/error";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Middlewares
app.use(cors({
  origin: true, // Allow frontend origin
  credentials: true
}));
app.use(express.json());

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(port, () => {
  console.log(`[Server] Backend API running at http://localhost:${port}`);
});
