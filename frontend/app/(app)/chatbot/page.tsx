"use client"

import { useState, useEffect } from "react"
import { ChatInterface } from "@/components/chatbot/chat-interface"
import { ChatHistory } from "@/components/chatbot/chat-history"
import { ChatInsights } from "@/components/chatbot/chat-insights"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Lightbulb, TrendingUp, Clock, MessageSquare } from "lucide-react"
import { chatbotAPI } from "@/lib/api-service"

interface ChatHistoryItem {
  _id: string
  title: string
  date: string
  createdAt: string
  timestamp: string
  messages: Array<{
    role: "user" | "assistant"
    content: string
    timestamp: string
  }>
  promptCount: number
}

export default function ChatbotPage() {
  const [selectedChat, setSelectedChat] = useState<ChatHistoryItem | null>(null)
  const [isNewChat, setIsNewChat] = useState(true)
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showInsights, setShowInsights] = useState(false)

  // Load chat history on component mount
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await chatbotAPI.getChatHistory()
        if (response.success) {
          setChatHistory(response.data)
        }
      } catch (error) {
        console.error('Failed to fetch chat history:', error)
      }
    }

    fetchChatHistory()
  }, [refreshTrigger])

  const handleSelectChat = (chat: ChatHistoryItem) => {
    setSelectedChat(chat)
    setIsNewChat(false)
  }

  const handleNewChat = () => {
    setSelectedChat(null)
    setIsNewChat(true)
  }

  const handleChatUpdated = () => {
    // Refresh chat history when a chat is updated
    setRefreshTrigger(prev => prev + 1)
  }

  // Update chat history when a chat is updated
  const updateChatInHistory = (updatedChat: ChatHistoryItem) => {
    setChatHistory(prev => {
      const index = prev.findIndex(chat => 
        chat._id === updatedChat._id || chat.timestamp === updatedChat.timestamp
      )
      
      if (index !== -1) {
        const newHistory = [...prev]
        newHistory[index] = updatedChat
        return newHistory
      }
      
      return prev
    })
  }

  // Generate insights data
  const generateInsights = () => {
    if (!chatHistory.length) return null

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    let questionsThisWeek = 0
    const topicFrequency: { [key: string]: number } = {}
    
    // Financial keywords to look for in messages
    const financialKeywords = [
      "budget", "invest", "saving", "debt", "loan", "mortgage", 
      "retirement", "stock", "bond", "mutual fund", "ETF", 
      "interest", "dividend", "portfolio", "asset", "liability",
      "income", "expense", "emergency fund", "401k", "IRA",
      "credit score", "tax", "inflation", "compound interest"
    ]

    // Process chat history
    chatHistory.forEach(chat => {
      chat.messages.forEach((message: any) => {
        if (message.role === "user") {
          const messageDate = new Date(message.timestamp)
          
          // Count questions from the last week
          if (messageDate >= oneWeekAgo) {
            questionsThisWeek++
          }
          
          // Extract financial topics
          const messageText = message.content.toLowerCase()
          financialKeywords.forEach(keyword => {
            if (messageText.includes(keyword.toLowerCase())) {
              topicFrequency[keyword] = (topicFrequency[keyword] || 0) + 1
            }
          })
        }
      })
    })
    
    // Find most common topic
    let mostCommonTopic = "General Finance"
    let maxFrequency = 0
    
    Object.entries(topicFrequency).forEach(([topic, frequency]) => {
      if (frequency > maxFrequency) {
        maxFrequency = frequency
        mostCommonTopic = topic
      }
    })
    
    // Estimate hours saved (assuming 5 minutes saved per question)
    const hoursSaved = (questionsThisWeek * 5) / 60
    
    return {
      questionsThisWeek,
      mostCommonTopic,
      hoursSaved,
      topicFrequency
    }
  }

  const insights = generateInsights()

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Finsync AI Chatbot</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Get personalized financial advice from our AI assistant</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Insights Summary Card */}
          {insights && (
            <Card className="w-full sm:w-auto border-0 shadow-none bg-transparent">
              <CardContent className="p-3 flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span className="text-xs sm:text-sm font-medium">{insights.questionsThisWeek} this week</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs sm:text-sm font-medium capitalize">{insights.mostCommonTopic}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="text-xs sm:text-sm font-medium">{insights.hoursSaved.toFixed(1)} hrs saved</span>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowInsights(true)}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Lightbulb className="h-4 w-4" />
            Insights
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChatInterface 
            selectedChat={selectedChat} 
            onNewChat={handleNewChat} 
            onLoadChat={handleSelectChat}
            isNewChat={isNewChat}
            onChatUpdated={handleChatUpdated}
            updateChatInHistory={updateChatInHistory}
          />
        </div>
        <div>
          <ChatHistory 
            chatHistory={chatHistory}
            onSelectChat={handleSelectChat} 
            onNewChat={handleNewChat}
            currentChatId={selectedChat?.timestamp || selectedChat?._id}
          />
        </div>
      </div>

      <ChatInsights 
        chatHistory={chatHistory}
        isVisible={showInsights}
        onClose={() => setShowInsights(false)}
      />
    </div>
  )
}