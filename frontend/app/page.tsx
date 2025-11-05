// app/page.tsx
"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  Moon, 
  Sun, 
  ArrowRight, 
  CheckCircle2,
  Sparkles,
  Target,
  TrendingDown,
  DollarSign,
  PieChart,
  Bell,
  Lock,
  Smartphone,
  LineChart
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { LoginForm } from "@/components/auth/login-form"
import { SignupForm } from "@/components/auth/signup-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { motion } from "framer-motion"
import Image from "next/image"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup")

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  const toggleAuthMode = () => {
    setAuthMode(authMode === "login" ? "signup" : "login")
  }

  const handleGetStarted = () => {
    setAuthMode("signup")
    setShowAuth(true)
  }

  const handleSignIn = () => {
    setAuthMode("login")
    setShowAuth(true)
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Gradient Background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      {/* Header/Navbar */}
      <header className="relative z-50 border-b border-border/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center">
              <Image
                src="/finsync-logo.png"
                alt="FinSync Logo"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl font-bold">FinSync</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="hover:bg-primary/10"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setAuthMode("login")
                setShowAuth(true)
              }}
              className="hidden sm:inline-flex"
            >
              Sign In
            </Button>
            <Button
              onClick={() => {
                setAuthMode("signup")
                setShowAuth(true)
              }}
              className="gap-2"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left Column - Content */}
              <motion.div 
                className="flex flex-col justify-center space-y-8"
                initial="initial"
                animate="animate"
                variants={staggerContainer}
              >
                <motion.div variants={fadeInUp} className="space-y-4">
                  <Badge className="w-fit bg-primary/10 text-primary hover:bg-primary/20">
                    <Sparkles className="mr-1 h-3 w-3" /> AI-Powered Finance Platform
                  </Badge>
                  <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                    Financial freedom{" "}
                    <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      made simple
                    </span>
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    Stop juggling multiple apps and spreadsheets. FinSync brings expense tracking, 
                    stock analysis, and paper trading into one powerful platform—backed by AI insights.
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp} className="flex flex-col gap-4 sm:flex-row">
                  <Button size="lg" className="gap-2 text-lg" onClick={handleGetStarted}>
                    Start Free Today <ArrowRight className="h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="text-lg" onClick={handleSignIn}>
                    Sign In
                  </Button>
                </motion.div>

                <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-6 pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm">100% Free Forever</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm">No Credit Card Required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm">2000+ Stocks</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Column - Visual */}
              <motion.div 
                className="relative"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                <div className="relative rounded-2xl border border-border/50 bg-gradient-to-br from-background to-muted/30 p-8 shadow-2xl">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Portfolio</p>
                        <p className="text-3xl font-bold">₹4,52,890</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-sm text-muted-foreground">Monthly Savings</p>
                        <p className="text-2xl font-bold">₹24,500</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-sm text-muted-foreground">Active Goals</p>
                        <p className="text-2xl font-bold">8</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-gradient-to-r from-green-500/20 to-blue-500/20 p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <p className="font-semibold">AI Insight: You're on track to reach your goals 2 months early!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="border-y border-border/40 bg-muted/30 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                The cost of financial chaos is too high
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
                Stop losing money to impulse purchases, missed investment opportunities, and scattered financial tools. 
                FinSync consolidates everything you need to build wealth.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Features Section - 3 Main Features */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl space-y-24">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="grid gap-12 lg:grid-cols-2 lg:gap-16"
            >
              <div className="flex flex-col justify-center space-y-6">
                <Badge className="w-fit bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                  <Lock className="mr-1 h-3 w-3" /> Secure & Smart
                </Badge>
                <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Stop overspending with intelligent budgets
                </h3>
                <p className="text-lg text-muted-foreground">
                  Our AI analyzes your spending patterns and sends instant alerts when you're about to exceed 
                  your budget. Set custom rules, track expenses by category, and watch your savings grow automatically.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span>Real-time expense tracking with automatic categorization</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span>Smart alerts when you approach budget limits</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span>Visual insights into spending trends and patterns</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-8">
                <Card className="border-border/60">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">Monthly Budget</CardTitle>
                      <PieChart className="h-6 w-6 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Food & Dining</span>
                        <span className="font-semibold">₹8,500 / ₹10,000</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-[85%] bg-green-500" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Entertainment</span>
                        <span className="font-semibold text-orange-500">₹4,800 / ₹5,000</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-[96%] bg-orange-500" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Transportation</span>
                        <span className="font-semibold">₹2,100 / ₹7,000</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-[30%] bg-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="grid gap-12 lg:grid-cols-2 lg:gap-16"
            >
              <div className="order-2 rounded-2xl border border-border bg-gradient-to-br from-green-500/5 to-blue-500/5 p-8 lg:order-1">
                <Card className="border-border/60">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">Stock Analysis</CardTitle>
                      <LineChart className="h-6 w-6 text-green-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-sm text-muted-foreground">RELIANCE</p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <p className="text-2xl font-bold">₹2,456.30</p>
                        <div className="flex items-center gap-1 text-green-500">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm font-semibold">+2.4%</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">AI Prediction</span>
                        <Badge className="bg-green-500/20 text-green-600">BUY</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Sentiment Score</span>
                        <span className="font-semibold">87/100</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Target Price</span>
                        <span className="font-semibold">₹2,680</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="order-1 flex flex-col justify-center space-y-6 lg:order-2">
                <Badge className="w-fit bg-green-500/10 text-green-600 hover:bg-green-500/20">
                  <TrendingUp className="mr-1 h-3 w-3" /> AI-Powered Analysis
                </Badge>
                <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Make smarter investment decisions
                </h3>
                <p className="text-lg text-muted-foreground">
                  Access real-time data and AI predictions for 2000+ NSE stocks. Get sentiment analysis, 
                  price targets, and personalized recommendations based on your portfolio and risk profile.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span>AI-powered stock predictions and recommendations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span>Real-time market sentiment analysis</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span>Comprehensive technical and fundamental analysis</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="grid gap-12 lg:grid-cols-2 lg:gap-16"
            >
              <div className="flex flex-col justify-center space-y-6">
                <Badge className="w-fit bg-purple-500/10 text-purple-600 hover:bg-purple-500/20">
                  <Zap className="mr-1 h-3 w-3" /> Risk-Free Practice
                </Badge>
                <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Practice trading without risking real money
                </h3>
                <p className="text-lg text-muted-foreground">
                  Build confidence and test strategies with our paper trading platform. Start with virtual money, 
                  execute trades at real market prices, and track your performance before investing for real.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span>₹10,000 virtual money to start practicing</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span>Real-time market prices and order execution</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span>Track performance with detailed analytics</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-gradient-to-br from-purple-500/5 to-pink-500/5 p-8">
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="text-xl">Your Portfolio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Wallet Balance</p>
                        <p className="text-2xl font-bold">₹6,240</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div>
                          <p className="font-semibold">TCS</p>
                          <p className="text-sm text-muted-foreground">10 shares</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-500">+₹450</p>
                          <p className="text-sm text-muted-foreground">+12.3%</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div>
                          <p className="font-semibold">INFY</p>
                          <p className="text-sm text-muted-foreground">15 shares</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-500">-₹120</p>
                          <p className="text-sm text-muted-foreground">-3.2%</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </section>

        {/* All Features Grid */}
        <section className="border-y border-border/40 bg-muted/30 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16 text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Everything you need in one platform
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Comprehensive features designed to help you achieve financial freedom.
              </p>
            </motion.div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: <Shield className="h-6 w-6" />,
                  title: "Bank-Grade Security",
                  description: "Your data is encrypted and protected with industry-leading security."
                },
                {
                  icon: <Bell className="h-6 w-6" />,
                  title: "Smart Alerts",
                  description: "Get notified about budget limits, bills, and investment opportunities."
                },
                {
                  icon: <Target className="h-6 w-6" />,
                  title: "Budget Management",
                  description: "Create and manage budgets across categories with real-time tracking and insights."
                },
                {
                  icon: <BarChart3 className="h-6 w-6" />,
                  title: "Advanced Analytics",
                  description: "Visualize spending patterns with interactive charts and reports."
                },
                {
                  icon: <Smartphone className="h-6 w-6" />,
                  title: "Mobile Friendly",
                  description: "Access your finances anytime, anywhere on any device."
                },
                {
                  icon: <Sparkles className="h-6 w-6" />,
                  title: "AI Chatbot",
                  description: "Get instant financial advice and answers to your questions."
                },
                {
                  icon: <TrendingUp className="h-6 w-6" />,
                  title: "Market Insights",
                  description: "Stay updated with real-time market data and stock news."
                },
                {
                  icon: <LineChart className="h-6 w-6" />,
                  title: "Portfolio Analytics",
                  description: "Track your investment performance with detailed metrics."
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full border-border/60 transition-all hover:border-primary/50 hover:shadow-lg">
                    <CardHeader>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {feature.icon}
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof / Stats */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 text-center sm:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="space-y-2"
              >
                <p className="text-4xl font-bold text-primary sm:text-5xl">2000+</p>
                <p className="text-muted-foreground">NSE Stocks Available</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-2"
              >
                <p className="text-4xl font-bold text-primary sm:text-5xl">100%</p>
                <p className="text-muted-foreground">Free Forever</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="space-y-2"
              >
                <p className="text-4xl font-bold text-primary sm:text-5xl">24/7</p>
                <p className="text-muted-foreground">AI Assistant Support</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary via-blue-600 to-purple-600 text-white shadow-2xl">
                <CardContent className="px-6 py-16 text-center sm:px-12 sm:py-20">
                  <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                    Ready to take control of your financial future?
                  </h2>
                  <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90 sm:text-xl">
                    Join FinSync today and start making smarter financial decisions. 
                    No credit card required, no hidden fees—just powerful tools to help you succeed.
                  </p>
                  <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                    <Button 
                      size="lg" 
                      variant="secondary" 
                      className="gap-2 text-lg font-semibold"
                      onClick={handleGetStarted}
                    >
                      Get Started Free <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="mt-6 text-sm text-white/80">
                    Start with ₹10,000 virtual money • No credit card needed • Cancel anytime
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-semibold">FinSync</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 FinSync. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Dialog */}
      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{authMode === "login" ? "Welcome back to FinSync" : "Start your financial journey"}</DialogTitle>
              <DialogDescription className="text-sm">
                {authMode === "login"
                  ? "Sign in to access your dashboard and continue managing your finances."
                  : "Create your free account and unlock powerful financial tools."}
              </DialogDescription>
            </DialogHeader>
          </div>
          {authMode === "login" ? (
            <LoginForm onToggleMode={toggleAuthMode} />
          ) : (
            <SignupForm onToggleMode={toggleAuthMode} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}