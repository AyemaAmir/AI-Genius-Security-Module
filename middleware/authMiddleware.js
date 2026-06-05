const jwt = require("jsonwebtoken");

// ─────────────────────────────────────────────
// TASK 2 — protect middleware
// Reads Bearer token from header, verifies it,
// attaches decoded user to req.user
// ─────────────────────────────────────────────
const protect = (req, res, next) => {
  // 1. Read Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. No token provided.",
    });
  }

  // 2. Extract token (remove "Bearer " prefix)
  const token = authHeader.split(" ")[1];

  // 3. Verify token signature and expiry
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, iat, exp }
    next(); // token is valid → proceed to next middleware/route
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Access token expired. Please refresh your token.",
      });
    }
    return res.status(401).json({
      message: "Invalid token. Please login again.",
    });
  }
};


// ─────────────────────────────────────────────
// TASK 4 — restrictTo middleware factory
// Takes allowed roles, returns a middleware that
// checks if req.user.role is in the allowed list
// ─────────────────────────────────────────────
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access forbidden. Your role '${req.user.role}' is not allowed to perform this action.`,
      });
    }
    next();
  };
};


module.exports = { protect, restrictTo };