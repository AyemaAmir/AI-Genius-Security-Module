const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { users, refreshTokenStore } = require("../config/db");

const router = express.Router();

// ─────────────────────────────────────────────
// TASK 1 — POST /api/auth/login
// Verifies credentials, returns Access Token in
// JSON body, stores Refresh Token in httpOnly cookie
// ─────────────────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const user = users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 2. Compare entered password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3. Generate Access Token (short-lived: 15 minutes)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES }
    );

    // 4. Generate Refresh Token (long-lived: 7 days)
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES }
    );

    // 5. Save refresh token to our whitelist store
    refreshTokenStore.push(refreshToken);

    // 6. Send Refresh Token as secure httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,    // JS cannot access this cookie
      secure: false,     // Set to true in production (HTTPS)
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    // 7. Send Access Token in JSON response
    res.status(200).json({
      message: "Login successful",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});


// ─────────────────────────────────────────────
// TASK 3 — POST /api/auth/refresh
// Reads refresh token from cookie, verifies it,
// issues a brand new Access Token
// ─────────────────────────────────────────────
router.post("/refresh", (req, res, next) => {
  try {
    // 1. Read the refresh token from the cookie
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token found. Please login again." });
    }

    // 2. Check if token exists in our whitelist
    if (!refreshTokenStore.includes(token)) {
      return res.status(403).json({ message: "Refresh token is invalid or revoked." });
    }

    // 3. Verify token signature and expiry
    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Refresh token expired. Please login again." });
      }

      // 4. Issue a new Access Token
      const newAccessToken = jwt.sign(
        { id: decoded.id, email: decoded.email, role: decoded.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES }
      );

      res.status(200).json({
        message: "Access token refreshed successfully",
        accessToken: newAccessToken,
      });
    });
  } catch (err) {
    next(err);
  }
});


// ─────────────────────────────────────────────
// BONUS — POST /api/auth/logout
// Removes refresh token from whitelist + clears cookie
// ─────────────────────────────────────────────
router.post("/logout", (req, res) => {
  const token = req.cookies.refreshToken;

  // Remove from whitelist
  const index = refreshTokenStore.indexOf(token);
  if (index > -1) refreshTokenStore.splice(index, 1);

  // Clear the cookie
  res.clearCookie("refreshToken");
  res.status(200).json({ message: "Logged out successfully" });
});


module.exports = router;