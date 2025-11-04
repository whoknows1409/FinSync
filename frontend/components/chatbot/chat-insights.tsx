// frontend/components/chatbot/chat-insights.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lightbulb, TrendingUp, Clock, MessageSquare } from "lucide-react"
import { useState, useEffect } from "react"
import { chatbotAPI } from "@/lib/api-service"

interface ChatInsight {
  questionsThisWeek: number
  mostCommonTopic: string
  hoursSaved: number
  topicFrequency: { [key: string]: number }
}

interface ChatInsightsProps {
  chatHistory: any[]
  isVisible: boolean
  onClose: () => void
}

export function ChatInsights({ chatHistory, isVisible, onClose }: ChatInsightsProps) {
  const [insights, setInsights] = useState<ChatInsight | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Financial keywords to look for in messages
  const financialKeywords = [
    "budget", "invest", "saving", "debt", "loan", "mortgage", 
    "retirement", "stock", "bond", "mutual fund", "ETF", 
    "interest", "dividend", "portfolio", "asset", "liability",
    "income", "expense", "emergency fund", "401k", "IRA",
    "credit score", "tax", "inflation", "compound interest"
  ]

  useEffect(() => {
    if (!isVisible) return

    const generateInsights = async () => {
      setIsLoading(true)
      
      try {
        // Calculate insights from chat history
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        
        let questionsThisWeek = 0
        const topicFrequency: { [key: string]: number } = {}
        
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
        
        setInsights({
          questionsThisWeek,
          mostCommonTopic,
          hoursSaved,
          topicFrequency
        })
      } catch (error) {
        console.error("Error generating insights:", error)
      } finally {
        setIsLoading(false)
      }
    }

    generateInsights()
  }, [chatHistory, isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <CardTitle>Chat Insights</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
          <CardDescription>Your financial chat activity summary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <p>Loading insights...</p>
            </div>
          ) : insights ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Questions this week</p>
                  <p className="text-2xl font-bold">{insights.questionsThisWeek}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Most common topic</p>
                  <p className="text-lg font-bold capitalize">{insights.mostCommonTopic}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <Clock className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Research time saved</p>
                  <p className="text-2xl font-bold">{insights.hoursSaved.toFixed(1)} hours</p>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Topic frequency:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(insights.topicFrequency)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([topic, count]) => (
                      <Badge key={topic} variant="outline" className="capitalize">
                        {topic}: {count}
                      </Badge>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              No insights available yet. Start chatting to see your activity summary.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}