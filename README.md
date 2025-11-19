# 💰 FinSync - Unified Finance Management Platform

<div align="center">

![FinSync Logo](https://img.shields.io/badge/FinSync-Financial%20Freedom-blue?style=for-the-badge)

**Track expenses • Analyze stocks • Practice trading • AI-powered insights**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Live Demo](#) • [Documentation](#-documentation) • [Features](#-features) • [Installation](#-installation)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**FinSync** is a comprehensive financial management platform that combines expense tracking, stock analysis, and paper trading into one unified application. Powered by AI, FinSync provides intelligent insights to help users make smarter financial decisions.

### Why FinSync?

- 📊 **All-in-One Platform**: No need to juggle multiple apps and spreadsheets
- 🤖 **AI-Powered Insights**: Get personalized financial advice and stock recommendations
- 📈 **Real Stock Data**: Access real-time data for 2000+ NSE stocks
- 💹 **Risk-Free Trading**: Practice trading with ₹10,000 virtual money
- 🔒 **Secure & Private**: Bank-grade security for your financial data
- 🎨 **Beautiful UI**: Modern, intuitive interface with dark mode support

---

## ✨ Features

### 💳 Expense Management
- ✅ Track income and expenses with automatic categorization
- ✅ Create and monitor budgets with smart alerts
- ✅ Set financial goals and track progress
- ✅ Export data to PDF/Excel
- ✅ Recurring transaction support
- ✅ Visual spending analytics with charts

### 📊 Stock Analysis
- ✅ Real-time data for 2000+ NSE companies
- ✅ AI-powered price predictions
- ✅ Sentiment analysis from news and social media
- ✅ Technical and fundamental analysis
- ✅ Watchlist management
- ✅ Detailed company information

### 💹 Paper Trading
- ✅ Start with ₹10,000 virtual money
- ✅ Execute trades at real market prices
- ✅ Track portfolio performance
- ✅ View trading history and analytics
- ✅ Risk-free practice environment
- ✅ Market and limit orders

### 🤖 AI Chatbot
- ✅ Financial advice and recommendations
- ✅ Stock analysis and insights
- ✅ Budget optimization suggestions
- ✅ Natural language queries
- ✅ Personalized responses
- ✅ Voice input support with speech recognition
- ✅ Text + Voice output modes
- ✅ Stop response button (stop at any time)
- ✅ Typing animation effects
- ✅ Chat history with export (PDF, Text, WhatsApp)
- ✅ 10 prompts per chat limit
- ✅ Auto-save chat conversations

### 📈 Analytics & Insights
- ✅ Interactive spending charts
- ✅ Category-wise expense breakdown with improved pie chart labels
- ✅ Monthly/yearly comparisons
- ✅ Budget vs actual analysis
- ✅ Income vs expense trends
- ✅ Export reports to PDF/Excel

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14.2 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui
- **Charts**: Chart.js, Recharts
- **State Management**: React Context API
- **Forms**: React Hook Form + Zod validation
- **Animations**: Framer Motion

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: JavaScript
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT, Passport.js (Google OAuth)
- **File Upload**: Multer, Cloudinary
- **API Docs**: Swagger/OpenAPI
- **Security**: Helmet, Rate Limiting, XSS Protection

### AI & Data
- **AI Model**: Google Gemini AI
- **Stock Data**: Yahoo Finance API
- **News Scraping**: Cheerio, Puppeteer
- **Data Processing**: Python (FastAPI)

### DevOps & Tools
- **Version Control**: Git
- **Package Manager**: npm
- **Code Quality**: ESLint, Prettier
- **Testing**: Jest, Supertest
- **Deployment**: Render
- **Database**: MongoDB Atlas
- **CI/CD**: GitHub Actions (optional)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Git
- Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/whoknows1409/finsync.git
   cd finsync
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**

   **Backend** (`backend/.env`):
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/finsync
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

   **Frontend** (`frontend/.env`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

5. **Run the application**

   **Backend** (in `backend/` directory):
   ```bash
   npm run dev
   ```

   **Frontend** (in `frontend/` directory):
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

---

## 📁 Project Structure

```
finsync/
├── backend/                    # Backend Node.js application
│   ├── config/                 # Configuration files
│   ├── controllers/            # Route controllers
│   ├── middleware/             # Custom middleware
│   ├── models/                 # Mongoose models
│   ├── routes/                 # API routes
│   ├── services/               # Business logic
│   ├── utils/                  # Helper functions
│   ├── server.js               # Entry point
│   └── package.json
│
├── frontend/                   # Frontend Next.js application
│   ├── app/                    # Next.js 14 app directory
│   │   ├── (app)/              # Authenticated routes
│   │   ├── auth/               # Authentication pages
│   │   └── page.tsx            # Landing page
│   ├── components/             # React components
│   │   ├── ui/                 # UI components
│   │   ├── auth/               # Auth components
│   │   ├── dashboard/          # Dashboard components
│   │   └── ...
│   ├── lib/                    # Utilities and helpers
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript types
│   ├── public/                 # Static assets
│   └── package.json
│
├── python-service/             # Python FastAPI service
│   ├── app.py
│   └── requirements.txt
│
├── scripts/                    # Utility scripts
├── docs/                       # Documentation
├── .gitignore
├── README.md
└── package.json
```

---

## 🔐 Environment Variables

### Backend Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port (default: 5000) | Yes |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Optional |
| `CLOUDINARY_*` | Cloudinary config for images | Optional |
| `SMTP_*` | Email configuration | Optional |

### Frontend Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Gemini API key for frontend | Optional |

See `.env.example` files for complete configuration.

---

## 🚀 Deployment

### Deploy to Render (Recommended)

FinSync is optimized for deployment on Render.

**Deployment Time**: ~10-15 minutes

**Cost**:
- 🎉 Free tier: $0/month (with cold starts after inactivity)
- ⚡ Paid tier: Starting at $7/month per service

### Prerequisites
- ✅ GitHub account with this repo pushed
- ✅ [Render account](https://dashboard.render.com/) (free)
- ✅ [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free M0 cluster)
- ✅ Gemini API key (from Google AI Studio)

### Quick Deploy Steps
```bash
# 1. Ensure code is pushed to GitHub
git add .
git commit -m "Ready for deployment"
git push origin master

# 2. Follow DEPLOYMENT_QUICK_START.md for:
#    - MongoDB Atlas setup (2 minutes)
#    - Backend deployment (3 minutes)
#    - Frontend deployment (3 minutes)
#    - Configuration (2 minutes)

# 3. Your app will be live at:
#    Frontend: https://your-app-name.onrender.com
#    Backend:  https://your-app-name-api.onrender.com
```

### Architecture
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Next.js        │─────▶│  Express API    │─────▶│  MongoDB Atlas  │
│  Frontend       │      │  Backend        │      │  Database       │
│  (Render)       │◀─────│  (Render)       │      │  (Cloud)        │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## 📚 API Documentation

### Base URL
```
Local: http://localhost:5000/api
Production: https://your-backend.onrender.com/api
```

### Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/refresh` - Refresh token

#### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

#### Budgets
- `GET /api/budgets` - Get all budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

#### Stocks
- `GET /api/stocks` - Get stock list
- `GET /api/stocks/:symbol` - Get stock details
- `GET /api/stocks/:symbol/analysis` - AI analysis
- `POST /api/stocks/watchlist` - Add to watchlist

#### Trading
- `GET /api/trading/account` - Get trading account
- `POST /api/trading/order` - Place order
- `POST /api/trading/order/:id/execute` - Execute order
- `GET /api/trading/portfolio` - Get portfolio

#### Chatbot
- `POST /api/v1/chatbot/query` - Send message with conversation history
- `POST /api/v1/chatbot/save-chat` - Save chat conversation
- `GET /api/v1/chatbot/chat-history` - Get all chat history
- `DELETE /api/v1/chatbot/chat-history/:id` - Delete specific chat
- `DELETE /api/v1/chatbot/chat-history` - Clear all chat history

For complete API documentation, see [API.md](backend/docs/API.md)

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Run All Tests
```bash
npm test
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation
- Test thoroughly before submitting PR

---

## 🐛 Bug Reports

Found a bug? Please open an issue with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Environment details

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Omkar Bhoir**

- GitHub: [@whoknows1409](https://github.com/whoknows1409)
- Repository: [finsync](https://github.com/whoknows1409/finsync)

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Express.js](https://expressjs.com/) - Backend framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Google Gemini](https://ai.google.dev/) - AI model
- [Yahoo Finance](https://finance.yahoo.com/) - Stock data
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Radix UI](https://www.radix-ui.com/) - Primitives

---

## 📞 Support

Need help? Here are your options:

- 📖 Read the [Documentation](#-documentation)
- 🐛 Report issues on [GitHub Issues](https://github.com/whoknows1409/finsync/issues)
- 💬 Start a [Discussion](https://github.com/whoknows1409/finsync/discussions)
- 📧 Email: dakshb2211@gmail.com

---

## 🗺️ Roadmap

### Recently Completed
- [x] Stop response button in chatbot
- [x] Voice input/output modes
- [x] Fixed pie chart label overlapping
- [x] Chat export functionality (PDF, Text, WhatsApp)
- [x] Improved chatbot UI with typing effects

### Upcoming Features
- [ ] Mobile app (React Native)
- [ ] Multi-currency support
- [ ] Cryptocurrency tracking
- [ ] Investment portfolio analysis
- [ ] Bill reminders
- [ ] Family/shared budgets
- [ ] Advanced analytics dashboard
- [ ] Third-party bank integration
- [ ] Chatbot conversation search

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/whoknows1409/finsync?style=social)
![GitHub forks](https://img.shields.io/github/forks/whoknows1409/finsync?style=social)
![GitHub issues](https://img.shields.io/github/issues/whoknows1409/finsync)
![GitHub pull requests](https://img.shields.io/github/issues-pr/whoknows1409/finsync)

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

**Credits: Omkar Bhoir, Daksh Bari**

[⬆ Back to Top](#-finsync---unified-finance-management-platform)

</div>
