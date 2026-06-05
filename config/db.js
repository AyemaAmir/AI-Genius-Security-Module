const bcrypt = require("bcryptjs");

// Pre-hashed passwords for our 3 test users
// Plain passwords: "free123", "premium123", "admin123"
const users = [
  {
    id: "1",
    email: "free@aigenius.com",
    password: bcrypt.hashSync("free123", 10),
    role: "Free_User",
  },
  {
    id: "2",
    email: "premium@aigenius.com",
    password: bcrypt.hashSync("premium123", 10),
    role: "Premium_User",
  },
  {
    id: "3",
    email: "admin@aigenius.com",
    password: bcrypt.hashSync("admin123", 10),
    role: "Admin",
  },
];

// Whitelist of valid refresh tokens (acts like a DB table)
const refreshTokenStore = [];

module.exports = { users, refreshTokenStore };