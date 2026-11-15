# FinSync — Unified Finance Management Platform

<div align="center">

![FinSync](https://img.shields.io/badge/FinSync-Unified%20Finance%20Platform-0A66C2?style=for-the-badge)

**An AI-powered full-stack web application that unifies personal expense tracking, real-time NSE stock analysis, and paper trading into a single platform.**

[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express_5-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[Live Demo](https://finsync-w6ce.onrender.com) &nbsp;•&nbsp; [Architecture](#architecture) &nbsp;•&nbsp; [Features](#features) &nbsp;•&nbsp; [Tech Stack](#tech-stack) &nbsp;•&nbsp; [Getting Started](#getting-started)

</div>

---

## Overview

**FinSync** is a comprehensive financial management platform built as a full-stack application with a decoupled frontend–backend architecture. It integrates three core financial modules — **expense management**, **stock market analysis**, and **paper trading** — into a single unified interface, enhanced by a context-aware AI chatbot powered by Google Gemini.

The platform exposes **80+ RESTful API endpoints** across 14 route modules and is backed by 13 Mongoose data models. The AI chatbot dynamically injects user-specific financial context (transaction history, budget utilization, recurring expenses, financial goals) into prompts, enabling personalized insights without fine-tuning.

---

## Architecture

```
┌──────────────────────┐       ┌──────────────────────┐       ┌───────────────┐
│   Next.js 14 (SSR)   │──────▶│   Express 5 API      │──────▶│  MongoDB Atlas│
│   TypeScript + React │◀──────│   Node.js 18+        │       │  (Mongoose)   │
│   Tailwind CSS 4     │       │   JWT + Google OAuth  │       └───────────────┘
│   shadcn/ui + Radix  │       │   Rate Limiting       │
└──────────────────────┘       │   Helmet + XSS Guard  │       ┌───────────────┐
                               │                      │──────▶│  Google Gemini│
┌──────────────────────┐       │   14 Route Modules    │       │  AI API       │
│   Flask (Python)     │──────▶│   70+ Endpoints       │       └───────────────┘
│   yfinance + Pandas  │       │   12 Mongoose Models  │
│   NSE Data Scraping  │       └──────────────────────┘       ┌───────────────┐
└──────────────────────┘                                       │  Yahoo Finance│
                                                               │  API + NSE    │
                                                               └───────────────┘
```

**Key architectural decisions:**
- **Decoupled frontend/backend** — Next.js frontend communicates with Express API via REST, enabling independent scaling and deployment
- **Context-aware AI pipeline** — Chatbot queries are enriched with real-time user financial data (budgets, transactions, goals, recurring expenses) before being sent to Gemini, providing personalized responses without model fine-tuning
- **Stock data** — Quotes, history and fundamentals come from Yahoo Finance's public endpoints, called directly from the Node.js API and cached. A standalone Flask service using yfinance is included as an optional extra; the API does not depend on it

---

## Features

### Expense Management
- Full CRUD for income and expense transactions with **automatic AI-powered categorization** via Gemini
- Budget creation with real-time spend tracking, category-wise performance analysis, and over-budget alerts
- Financial goals with contributions, withdrawals, progress and deadline tracking
- Recurring transactions (daily, weekly, monthly, yearly). Due items are created by a nightly job, at server start-up and when the transactions are opened, so none are missed while the server is asleep
- Budgets renew automatically each period, optionally carrying unspent money forward
- In-app notifications for budget thresholds, large expenses, recurring transactions, goals and filled orders, with per-user preferences
- Data export to **CSV, Excel, and PDF** formats using ExcelJS and PDFKit
- **10 analytics endpoints** — AI insights, recurring detection, budget vs. actual, expense breakdown, income/expense trends, savings growth, spending patterns, category trends, and summary

### Stock Market Analysis
- Real-time data for **NSE-listed stocks** via Yahoo Finance API with search, historical data, and NIFTY 50 index tracking
- **AI-powered stock analysis** — sentiment analysis from scraped news data, personalized stock suggestions, and price prediction using Gemini
- Stock comparison tool with monthly change calculations and fundamental metrics (P/E, market cap, 52-week range, beta)
- Sector-wise market performance tracking across 8 sectors (IT, Banking, Pharma, FMCG, Auto, Oil & Gas, Metal, Cement)
- Market status monitoring with NSE trading hours detection and top gainers/losers via live NSE scraping
- Interactive candlestick-style charts using **Lightweight Charts** and Chart.js

### Paper Trading Engine
- Virtual trading account initialized with **₹10,000** virtual currency
- **Market orders** fill immediately at the live price. **Limit orders** rest until the live price reaches the limit, then fill at that price or better; they are checked every two minutes during market hours and whenever the account is opened, and expire after 7 days
- Orders for one account are processed one at a time, so two simultaneous orders cannot spend the same balance
- Portfolio management with real-time P&L calculations (realized and unrealized), sector allocation, and performance metrics
- Trading statistics from FIFO trade matching — realised and unrealised P&L, win rate, best/worst trade, total volume, and average holding time

### AI Chatbot (Gemini-Powered)
- **Context-aware financial assistant** — dynamically injects user's transaction history, budget utilization, goal progress, and recurring expenses into prompts
- Specialized endpoints for budget advice, investment recommendations, stock sentiment analysis, and transaction categorization
- Voice input via Web Speech API and text-to-speech output
- Chat history with auto-save, export to **PDF/Text/WhatsApp** format, and 10-prompt-per-session limit
- Typing animation effects with real-time stop/cancel functionality

### Authentication & Security
- **JWT-based authentication**. Changing or resetting a password, or choosing "sign out everywhere", invalidates every earlier session
- Password reset by emailed one-hour link, password change, and account deletion
- **Google OAuth 2.0** integration for social login
- Email verification flow via **SendGrid** with HTML email templates; a changed email address takes effect only after it is confirmed
- **Helmet** security headers, and request bodies stripped of MongoDB operators
- **Rate limiting** per account for sign-in (10 failed attempts per 15 minutes) and per user for AI endpoints (60 requests per 15 minutes)
- Input validation with **express-validator**; updates accept only the fields a user is allowed to change

### Analytics Dashboard
- Interactive spending charts with **Chart.js** and **Recharts**
- Category-wise expense breakdown, monthly/yearly comparisons, and budget vs. actual analysis
- Income vs. expense trend visualization and savings growth tracking
- Customizable dashboard layout with drag-and-drop support (saved in the browser)
- Dark mode support via **next-themes**

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS 4, shadcn/ui, Radix UI |
| **UI/Charts** | Chart.js, Recharts, Lightweight Charts, Framer Motion, Lucide Icons |
| **Forms & Validation** | React Hook Form, Zod |
| **Backend** | Node.js 18+, Express 5, Mongoose ODM |
| **Database** | MongoDB Atlas |
| **Authentication** | JWT (jsonwebtoken), Google OAuth 2.0 (google-auth-library), SendGrid (email verification) |
| **AI/ML** | Google Gemini AI (@google/generative-ai) |
| **Stock Data** | Yahoo Finance API (yahoo-finance2 v3), yfinance (Python), Cheerio + Puppeteer (NSE scraping) |
| **Python Service** | Flask, yfinance, Pandas |
| **Data Export** | ExcelJS, PDFKit, jsPDF |
| **Security** | Helmet, express-rate-limit, express-validator |
| **File Upload** | Multer (profile images are stored with the user record) |
| **Scheduling** | node-cron (recurring transactions, budget renewal, limit order checks) |
| **Testing** | Jest (unit), Supertest against a throwaway MongoDB (integration) |
| **Logging** | Winston |
| **Deployment** | Render (frontend + backend), MongoDB Atlas |

---

## Project Structure

```
FinSync/
├── frontend/                       # Next.js 14 application (TypeScript)
│   ├── app/
│   │   ├── (app)/                  # Authenticated routes (App Router)
│   │   │   ├── dashboard/          # Dashboard page
│   │   │   ├── transactions/       # Expense management
│   │   │   ├── budget/             # Budget tracking
│   │   │   ├── goals/              # Financial goals
│   │   │   ├── notifications/      # Alerts and activity
│   │   │   ├── stocks/             # Stock market data
│   │   │   ├── stock-analysis/     # AI stock analysis
│   │   │   ├── trading/            # Paper trading engine
│   │   │   ├── chatbot/            # AI chatbot interface
│   │   │   ├── analysis/           # Analytics dashboard
│   │   │   ├── profile/            # User profile
│   │   │   └── settings/           # App settings
│   │   ├── auth/                   # Login, Register, OAuth
│   │   ├── verify-email/           # Email verification
│   │   └── page.tsx                # Landing page
│   ├── components/                 # React components
│   │   ├── ui/                     # shadcn/ui primitives
│   │   ├── dashboard/              # Dashboard widgets
│   │   ├── stocks/                 # Stock components
│   │   ├── trading/                # Trading components
│   │   └── chatbot/                # Chatbot components
│   ├── hooks/                      # Custom React hooks
│   ├── lib/                        # Utilities, API client
│   └── types/                      # TypeScript type definitions
│
├── backend/                        # Express 5 API (Node.js)
│   ├── routes/                     # 14 route modules
│   ├── controllers/                # 13 controller modules
│   ├── models/                     # 13 Mongoose schemas
│   ├── services/                   # Market data, order engine, budgets, recurring, notifications, Gemini
│   ├── tests/                      # Unit tests and integration checks
│   ├── middleware/                  # Auth, rate-limit, validation, upload
│   ├── utils/                      # Gemini, email, logger, cron, export
│   ├── config/                     # Database and app configuration
│   ├── app.js                      # Express app setup (CORS, middleware)
│   └── server.js                   # Server entry point
│
├── python-service/                 # Flask microservice
│   ├── app.py                      # NSE stock data API
│   └── requirements.txt
│
└── backend/app.py                  # Flask stock analysis service (NSE scraping)
```

---

## Getting Started

### Prerequisites
- **Node.js** 18+ and npm 8+
- **MongoDB** (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)
- **Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))
- **Python 3.8+** (optional, for the stock analysis microservice)

### Installation

```bash
# Clone the repository
git clone https://github.com/whoknows1409/FinSync.git
cd FinSync

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Configuration

**Backend** (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/finsync
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id        # Must be the same client ID the frontend uses
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=http://localhost:3000
SENDGRID_API_KEY=your_sendgrid_api_key        # Needed for sign-up verification, password reset and email changes
EMAIL_FROM=your_email@example.com              # Sender address verified in SendGrid
```

`GOOGLE_CLIENT_ID` is what Google sign-in tokens are checked against. If it is missing the check is skipped and a warning is logged.

**Frontend** (`frontend/.env`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000   # Pinged on load to wake a sleeping backend
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

The Gemini API key belongs to the backend only. Never put it in a `NEXT_PUBLIC_` variable: those are sent to every visitor's browser.

### Running Locally

```bash
# Terminal 1 — Backend
cd backend
npm run dev          # Starts Express server on port 5000

# Terminal 2 — Frontend
cd frontend
npm run dev          # Starts Next.js dev server on port 3000

# Terminal 3 — Python service (optional)
cd python-service
pip install -r requirements.txt
python app.py        # Starts Flask server on port 5001
```

Access the application at **http://localhost:3000**

### Tests

```bash
cd backend
npm test                     # Unit tests, no database needed

# Integration checks against the real API. The database is wiped,
# so its name must end in _test.
MONGODB_TEST_URI=mongodb://127.0.0.1:27017/finsync_test npm run test:integration
```

---

## API Overview

The backend exposes **80+ RESTful endpoints** across 14 route modules, all prefixed under `/api`:

| Module | Base Route | Endpoints | Description |
|---|---|---|---|
| Auth | `/api/auth` | 12 | Register, login, Google OAuth, email verification, password reset and change, sign out everywhere, delete account |
| Transactions | `/api/v1/transactions` | 10 | CRUD + recurring transactions + analysis |
| Budgets | `/api/v1/budgets` | 10 | CRUD + spend tracking + summary + category sync |
| Goals | `/api/v1/goals` | 5 | CRUD + contributions |
| Notifications | `/api/v1/notifications` | 5 | List, mark read, delete |
| Stocks | `/api/v1/stocks` | 7 | Search, detail, price, historical, real-time |
| Stock Analysis | `/api/stocks-analysis` | 5 | Stock data, plus AI analysis, comparison and suggestions (sign-in required) |
| Analysis | `/api/analysis` | 10 | AI insights, trends, patterns, breakdowns |
| Trading | `/api/v1/trading` | 7 | Account, orders, holdings, stats, allocation |
| Chatbot | `/api/v1/chatbot` | 11 | Query, insights, advice, sentiment, history |
| Profile | `/api/v1/profile` | 5 | Profile CRUD, image upload, stats |
| Export | `/api/export` | 4 | CSV, Excel, PDF, all-data export |
| Users | `/api/v1/users` | 2 | Dashboard data, user stats |
| Settings | `/api/settings` | 1 | App branding |

All protected endpoints require a JWT Bearer token in the `Authorization` header. Stock quotes, search and history are public; everything else, including every AI endpoint, requires sign-in.

---

## Author

**Omkar Bhoir**

- GitHub: [@whoknows1409](https://github.com/whoknows1409)
- Email: immortalomi14@gmail.com

---

<div align="center">

**Built with Next.js, Express, MongoDB, and Google Gemini AI**

**Contributors: Omkar Bhoir, Daksh Bari, Aditya Ghumare**

</div>
