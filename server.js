const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const errorHandler = require("./middleware/errorMiddleware");

// Load environment variables from .env file
dotenv.config();

const app = express();

// ── Middleware ──────────────────────────────
app.use(express.json());        // Parse JSON request bodies
app.use(cookieParser());        // Parse cookies

// ── Routes ──────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);

// ── Health Check ────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "🚀 AI-Genius Auth Server is running!" });
});

// ── Centralized Error Handler ───────────────
app.use(errorHandler);

// ── Start Server ────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});