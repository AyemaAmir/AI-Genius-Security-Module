const express = require("express");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

// ─────────────────────────────────────────────
// TASK 4 — GET /api/ai/free-model
// All logged-in users can access this
// Simulates: Basic text summarization model
// ─────────────────────────────────────────────
router.get("/free-model", protect, (req, res) => {
  res.status(200).json({
    message: "✅ Free Model Response",
    model: "BasicSummarizer-v1",
    result: "This is a summarized version of your input text.",
    accessedBy: req.user.email,
    role: req.user.role,
  });
});


// ─────────────────────────────────────────────
// TASK 4 — POST /api/ai/premium-model
// Only Premium_User and Admin can access this
// Simulates: Advanced image/data analysis model
// ─────────────────────────────────────────────
router.post(
  "/premium-model",
  protect,
  restrictTo("Premium_User", "Admin"),
  (req, res) => {
    res.status(200).json({
      message: "✅ Premium Model Response",
      model: "DataAnalyzer-Pro-v3",
      result: "Deep analysis complete. Detected 3 anomalies in your dataset.",
      accessedBy: req.user.email,
      role: req.user.role,
    });
  }
);


// ─────────────────────────────────────────────
// TASK 4 — DELETE /api/ai/purge-cache
// Only Admin can access this
// Simulates: Clearing cached ML model results
// ─────────────────────────────────────────────
router.delete(
  "/purge-cache",
  protect,
  restrictTo("Admin"),
  (req, res) => {
    res.status(200).json({
      message: "✅ Cache purged successfully",
      action: "All cached AI model results have been cleared.",
      performedBy: req.user.email,
      role: req.user.role,
    });
  }
);


module.exports = router;