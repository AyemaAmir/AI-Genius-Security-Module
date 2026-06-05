# 🔐 AI-Genius Security Module
### JWT Authentication & Role-Based Access Control (RBAC) — Node.js/Express

> A stateless, token-based authentication and authorization subsystem implementing the **Bearer Token pattern**, **Refresh Token Rotation**, and a **Middleware Factory RBAC model** — designed to secure a multi-tier SaaS AI platform.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT                             │
│  Stores: accessToken (memory) | refreshToken (cookie)   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP Request
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   EXPRESS SERVER                        │
│                                                         │
│   ┌─────────────┐    ┌──────────────┐                  │
│   │ Auth Routes │    │   AI Routes  │                  │
│   │  /login     │    │  /free-model │                  │
│   │  /refresh   │    │  /premium    │                  │
│   │  /logout    │    │  /purge      │                  │
│   └─────────────┘    └──────┬───────┘                  │
│                             │                           │
│                    ┌────────▼────────┐                  │
│                    │    protect()    │  ← Verifies JWT  │
│                    └────────┬────────┘                  │
│                             │                           │
│                    ┌────────▼────────┐                  │
│                    │  restrictTo()   │  ← Checks Role   │
│                    └────────┬────────┘                  │
│                             │                           │
│                    ┌────────▼────────┐                  │
│                    │  Route Handler  │                  │
│                    └─────────────────┘                  │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   MOCK DATABASE                         │
│   users[]              refreshTokenStore[]              │
│   { id, email,         [ token1, token2... ]            │
│     password(bcrypt),                                   │
│     role }                                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Authentication Flow

```
Step 1 — LOGIN
──────────────
POST /api/auth/login
  │
  ├── Extract { email, password } from request body
  ├── Find user in database by email
  ├── bcrypt.compare(password, user.hashedPassword)
  ├── jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '15m' })
  │     → accessToken
  ├── jwt.sign({ id, email, role }, JWT_REFRESH_SECRET, { expiresIn: '7d' })
  │     → refreshToken → push to refreshTokenStore[]
  │     → set as httpOnly cookie
  └── Return { accessToken, user } in JSON response


Step 2 — ACCESS PROTECTED ROUTE
─────────────────────────────────
GET /api/ai/free-model
  │
  ├── protect() middleware:
  │     ├── Read Authorization header
  │     ├── Extract Bearer token
  │     ├── jwt.verify(token, JWT_SECRET)
  │     │     ├── Valid   → attach decoded payload to req.user → next()
  │     │     ├── Expired → 401 { message: "Access token expired" }
  │     │     └── Invalid → 401 { message: "Invalid token" }
  │
  ├── restrictTo('Free_User', 'Premium_User', 'Admin') middleware:
  │     ├── Check req.user.role against allowed roles array
  │     ├── Allowed → next()
  │     └── Denied  → 403 { message: "Access forbidden" }
  │
  └── Route Handler → 200 response


Step 3 — SILENT REFRESH
────────────────────────
POST /api/auth/refresh
  │
  ├── Read refreshToken from httpOnly cookie
  ├── Check if token exists in refreshTokenStore[] whitelist
  ├── jwt.verify(token, JWT_REFRESH_SECRET)
  ├── Generate new accessToken
  └── Return { accessToken } in JSON response
```

---

## 🎫 JWT Token Design

### Access Token Payload
```json
{
  "id": "1",
  "email": "user@aigenius.com",
  "role": "Premium_User",
  "iat": 1700000000,
  "exp": 1700000900
}
```

### Token Strategy
| Property | Access Token | Refresh Token |
|----------|-------------|---------------|
| **Secret** | `JWT_SECRET` | `JWT_REFRESH_SECRET` |
| **Expiry** | 15 minutes | 7 days |
| **Storage** | JSON response body | httpOnly cookie |
| **Algorithm** | HS256 | HS256 |
| **Payload** | id, email, role | id, email, role |
| **Revocation** | Stateless (expiry only) | Whitelist store |

> ⚠️ Passwords are **never** included in the JWT payload

---

## 🛡️ RBAC Middleware Design

### `protect()` — Authentication Guard
```javascript
// Reads Bearer token → verifies signature → attaches req.user
const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  req.user = decoded
  next()
}
```

### `restrictTo(...roles)` — Authorization Guard
```javascript
// Middleware factory — returns a middleware based on allowed roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access forbidden' })
    }
    next()
  }
}
```

### Usage Pattern
```javascript
// Stacking both middlewares on a route:
router.delete('/purge-cache',
  protect,                    // Step 1: Are you logged in?
  restrictTo('Admin'),        // Step 2: Are you an Admin?
  handler                     // Step 3: Execute
)
```

---

## 🌐 API Reference

### Auth Endpoints
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/auth/login` | ❌ | Login → returns accessToken + sets cookie |
| `POST` | `/api/auth/refresh` | 🍪 Cookie | Issues new accessToken from refresh cookie |
| `POST` | `/api/auth/logout` | ❌ | Clears refresh token from store + cookie |

### AI Endpoints
| Method | Endpoint | Free_User | Premium_User | Admin |
|--------|----------|-----------|--------------|-------|
| `GET` | `/api/ai/free-model` | ✅ | ✅ | ✅ |
| `POST` | `/api/ai/premium-model` | ❌ 403 | ✅ | ✅ |
| `DELETE` | `/api/ai/purge-cache` | ❌ 403 | ❌ 403 | ✅ |

### HTTP Status Codes Used
| Code | Meaning | When returned |
|------|---------|---------------|
| `200` | OK | Successful request |
| `401` | Unauthorized | Missing, invalid, or expired token |
| `403` | Forbidden | Valid token but insufficient role |
| `500` | Server Error | Unexpected server-side failure |

---

## 🔒 Security Implementation

| Vulnerability | Mitigation Applied |
|---------------|-------------------|
| Plain-text passwords | bcrypt hashing with 10 salt rounds |
| Token theft via JS | Refresh token in `httpOnly` cookie |
| CSRF attacks | `sameSite=strict` cookie flag |
| Token forgery | HMAC-SHA256 signature via `JWT_SECRET` |
| Hardcoded secrets | All secrets in `.env` via `dotenv` |
| Unauthorized role access | `restrictTo()` middleware on every route |
| Expired token reuse | `jwt.verify()` checks `exp` claim automatically |
| Refresh token reuse | Server-side whitelist `refreshTokenStore[]` |

---

## 📁 Project Structure

```
ai-genius-jwt-rbac/
│
├── config/
│   └── db.js                  # In-memory user store + refresh token whitelist
│
├── middleware/
│   ├── authMiddleware.js       # protect() + restrictTo() implementations
│   └── errorMiddleware.js      # Global error handler middleware
│
├── routes/
│   ├── authRoutes.js           # POST /login, /refresh, /logout
│   └── aiRoutes.js             # GET /free-model, POST /premium-model, DELETE /purge-cache
│
├── postman/
│   └── AI-Genius.postman_collection.json   # Full test collection
│
├── screenshots/                # Postman workflow test evidence (10 screenshots)
│
├── .env                        # Secret keys (not committed)
├── .env.example                # Environment variable template
├── .gitignore                  # Excludes .env and node_modules
├── package.json
├── server.js                   # Express app entry point
└── README.md
```

---

## ⚙️ Setup & Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/ai-genius-jwt-rbac.git
cd ai-genius-jwt-rbac

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your secret values

# Start development server
npm run dev

# Server runs at:
# http://localhost:5000
```

---

## 🔑 Environment Variables

```env
PORT=5000
JWT_SECRET=your_strong_access_secret_here
JWT_REFRESH_SECRET=your_strong_refresh_secret_here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
```

---

## 🧪 Testing Workflow

Import `/postman/AI-Genius.postman_collection.json` into Postman and run in this order:

```
01 Login (Free User)          → 200 ✅ get accessToken
02 Access Free Model          → 200 ✅ role allowed
03 Premium Model (Free User)  → 403 ❌ role blocked
04 Login (Premium User)       → 200 ✅ get accessToken
05 Access Premium Model       → 200 ✅ role allowed
06 Expired Token Test         → 401 ❌ token rejected
07 Refresh Token              → 200 ✅ new accessToken issued
08 Login (Admin)              → 200 ✅ get accessToken
09 Purge Cache (Admin)        → 200 ✅ admin action success
10 Purge Cache (Free User)    → 403 ❌ role blocked
```

---

## 🛠️ Dependencies

```json
{
  "express": "^4.x",
  "jsonwebtoken": "^9.x",
  "bcryptjs": "^2.x",
  "cookie-parser": "^1.x",
  "dotenv": "^16.x"
}
```

---

## 👩‍💻 Author

**Ayema Amir**
