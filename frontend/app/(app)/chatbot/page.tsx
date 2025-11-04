"use client"

import { useState, useEffect, useRef } from "react"
import { ChatInterface } from "@/components/chatbot/chat-interface"
import { ChatHistory } from "@/components/chatbot/chat-history"
import { ChatInsights } from "@/components/chatbot/chat-insights"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, TrendingUp, Clock, MessageSquare, FileText, Share2, Download } from "lucide-react"
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
  const [isExporting, setIsExporting] = useState(false)
  
  // Sticky behavior state
  const [isSticky, setIsSticky] = useState(false)
  const [stickyHeight, setStickyHeight] = useState(0)
  const exportShareRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

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

  // Set up IntersectionObserver for sticky behavior
  useEffect(() => {
    if (!exportShareRef.current || !sentinelRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting)
      },
      {
        root: null,
        rootMargin: '0px 0px 0px 0px',
        threshold: 0
      }
    )

    observer.observe(sentinelRef.current)

    // Get height of export component for placeholder
    const updateHeight = () => {
      if (exportShareRef.current) {
        setStickyHeight(exportShareRef.current.offsetHeight)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [])

  const handleSelectChat = (chat: ChatHistoryItem) => {
    console.log('ChatbotPage.handleSelectChat called with:', chat)
    setSelectedChat(chat)
    setIsNewChat(false)
  }

  const handleNewChat = () => {
    console.log('ChatbotPage.handleNewChat called')
    setSelectedChat(null)
    setIsNewChat(true)
  }

  const handleChatUpdated = () => {
    // Refresh chat history when a chat is updated
    console.log('Chat updated, refreshing chat history')
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

  // Export functionality - updated to remove timestamps and dates
  const exportToHTML = async () => {
    if (!selectedChat || !selectedChat.messages.length) {
      alert("No messages to export")
      return
    }

    setIsExporting(true)
    
    try {
      // Create a PDF-optimized HTML string for the export
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${selectedChat.title}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background-color: #f8fafc;
              min-height: 100vh;
              padding: 20px;
              color: #334155;
            }
            
            .container {
              max-width: 900px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
              overflow: hidden;
            }
            
            .header {
              background-color: #ffffff;
              color: #1e293b;
              padding: 30px;
              text-align: center;
              border-bottom: 1px solid #e2e8f0;
              position: relative;
            }
            
            .branding {
              position: absolute;
              top: 20px;
              left: 20px;
              display: flex;
              align-items: center;
              color: #3b82f6;
              font-weight: 600;
              font-size: 14px;
            }
            
            .logo {
              width: 28px;
              height: 28px;
              background-color: #3b82f6;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              margin-right: 8px;
              font-size: 16px;
            }
            
            .title {
              font-size: 26px;
              font-weight: 700;
              margin-bottom: 8px;
              color: #0f172a;
            }
            
            .chat-container {
              padding: 30px;
              background-color: #ffffff;
            }
            
            .message {
              display: flex;
              margin-bottom: 24px;
              page-break-inside: avoid;
            }
            
            .message.user {
              justify-content: flex-end;
            }
            
            .message.assistant {
              justify-content: flex-start;
            }
            
            .message-content {
              max-width: 70%;
              padding: 14px 18px;
              border-radius: 16px;
              position: relative;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            }
            
            .user .message-content {
              background-color: #3b82f6;
              color: white;
              border-bottom-right-radius: 4px;
            }
            
            .assistant .message-content {
              background-color: #f1f5f9;
              color: #334155;
              border-bottom-left-radius: 4px;
              border: 1px solid #e2e8f0;
            }
            
            .message-role {
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 6px;
            }
            
            .user .message-role {
              color: rgba(255, 255, 255, 0.9);
            }
            
            .assistant .message-role {
              color: #64748b;
            }
            
            .message-text {
              font-size: 15px;
              line-height: 1.5;
              word-wrap: break-word;
            }
            
            .avatar {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 600;
              font-size: 14px;
              margin: 0 12px;
              flex-shrink: 0;
            }
            
            .user .avatar {
              background-color: #3b82f6;
              color: white;
              order: 2;
            }
            
            .assistant .avatar {
              background-color: #e2e8f0;
              color: #64748b;
              order: 0;
            }
            
            .footer {
              text-align: center;
              padding: 20px;
              background-color: #f8fafc;
              border-top: 1px solid #e2e8f0;
              font-size: 12px;
              color: #94a3b8;
            }
            
            @media (max-width: 768px) {
              .message-content {
                max-width: 85%;
              }
              
              .container {
                margin: 10px;
                border-radius: 12px;
              }
              
              .header {
                padding: 20px;
              }
              
              .branding {
                top: 15px;
                left: 15px;
              }
              
              .logo {
                width: 24px;
                height: 24px;
                font-size: 14px;
              }
              
              .title {
                font-size: 22px;
              }
              
              .chat-container {
                padding: 20px;
              }
            }
            
            /* PDF-specific optimizations */
            @media print {
              /* Remove default browser header and footer */
              @page {
                size: auto;
                margin: 10mm;
              }
              
              body {
                background-color: white;
                padding: 0;
                color: #334155;
                margin: 0;
              }
              
              .container {
                box-shadow: none;
                border-radius: 0;
                max-width: 100%;
                margin: 0;
                border: none;
                width: 100%;
              }
              
              .header {
                background-color: #f8fafc !important;
                color: #0f172a !important;
                border-bottom: 1px solid #e2e8f0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                position: relative;
                top: auto;
                left: auto;
                right: auto;
                width: 100%;
                z-index: 1;
                padding: 20px 30px;
              }
              
              .branding {
                color: #3b82f6 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                position: relative;
                top: auto;
                left: auto;
              }
              
              .logo {
                background-color: #3b82f6 !important;
                color: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .title {
                color: #0f172a !important;
              }
              
              .chat-container {
                padding: 30px;
                background-color: white !important;
              }
              
              /* Fix for user messages not showing in PDF */
              .message {
                display: flex !important;
                margin-bottom: 24px !important;
                page-break-inside: avoid;
                width: 100%;
              }
              
              .message.user {
                justify-content: flex-end !important;
              }
              
              .message.assistant {
                justify-content: flex-start !important;
              }
              
              .message-content {
                max-width: 70% !important;
                padding: 14px 18px !important;
                border-radius: 16px !important;
                position: relative !important;
                display: inline-block !important;
              }
              
              .user .message-content {
                background-color: #3b82f6 !important;
                color: white !important;
                border-bottom-right-radius: 4px !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .assistant .message-content {
                background-color: #f1f5f9 !important;
                color: #334155 !important;
                border-bottom-left-radius: 4px !important;
                border: 1px solid #e2e8f0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .message-role {
                font-size: 12px !important;
                font-weight: 600 !important;
                margin-bottom: 6px !important;
              }
              
              .user .message-role {
                color: rgba(255, 255, 255, 0.9) !important;
              }
              
              .assistant .message-role {
                color: #64748b !important;
              }
              
              .message-text {
                font-size: 15px !important;
                line-height: 1.5 !important;
                word-wrap: break-word !important;
              }
              
              .avatar {
                width: 36px !important;
                height: 36px !important;
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-weight: 600 !important;
                font-size: 14px !important;
                margin: 0 12px !important;
                flex-shrink: 0 !important;
              }
              
              .user .avatar {
                background-color: #3b82f6 !important;
                color: white !important;
                order: 2 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .assistant .avatar {
                background-color: #e2e8f0 !important;
                color: #64748b !important;
                order: 0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .footer {
                background-color: #f8fafc !important;
                color: #94a3b8 !important;
                border-top: 1px solid #e2e8f0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                position: relative;
                bottom: auto;
                left: auto;
                right: auto;
                width: 100%;
                z-index: 1;
              }
              
              /* Ensure text doesn't get cut off between pages */
              .message {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="branding">
                <div class="logo">F</div>
                <span>Finsync</span>
              </div>
              <div class="title-area">
                <div class="title">${selectedChat.title}</div>
              </div>
            </div>
            
            <div class="chat-container">
              ${selectedChat.messages.map((message, index) => `
                <div class="message ${message.role}">
                  ${message.role === 'user' ? 
                    `<div class="avatar">U</div>` : 
                    `<div class="avatar">AI</div>`
                  }
                  <div class="message-content">
                    <div class="message-role">${message.role === 'user' ? 'You' : 'Finsync AI'}</div>
                    <div class="message-text">${message.content.replace(/\n/g, '<br>')}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div class="footer">
              This chat was exported from Finsync AI
            </div>
          </div>
          
          <script>
            // Auto-print functionality
            window.onload = function() {
              if (window.confirm('Do you want to save this chat as a PDF? Click OK to print and save as PDF.')) {
                window.print();
              }
            };
          </script>
        </body>
        </html>
      `
      
      // Create a blob from the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      // Create a temporary link to download the HTML file
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedChat.title.replace(/\s+/g, '_')}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert("Chat exported as HTML. When you open the file, you'll be prompted to save as PDF.")
    } catch (error) {
      console.error("Error exporting to HTML:", error)
      alert("Failed to export chat")
    } finally {
      setIsExporting(false)
    }
  }

  const exportToText = () => {
    if (!selectedChat || !selectedChat.messages.length) {
      alert("No messages to export")
      return
    }

    try {
      let textContent = `${selectedChat.title}\n\n`
      textContent += "=" + "=".repeat(selectedChat.title.length) + "\n\n"
      
      selectedChat.messages.forEach(message => {
        const role = message.role === 'user' ? 'You' : 'Finsync AI'
        textContent += `${role}:\n${message.content}\n\n`
        textContent += "-".repeat(50) + "\n\n"
      })
      
      // Create blob and download
      const blob = new Blob([textContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedChat.title.replace(/\s+/g, '_')}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert("Chat exported to text file successfully")
    } catch (error) {
      console.error("Error exporting to text:", error)
      alert("Failed to export chat to text file")
    }
  }

  const shareViaWhatsApp = () => {
    if (!selectedChat || !selectedChat.messages.length) {
      alert("No messages to share")
      return
    }

    try {
      // Create a summary of the chat with both questions and answers
      let summary = `Check out my financial chat with Finsync AI:\n\n`
      
      // Limit to first 5 exchanges to avoid message length limits
      const exchangesToShow = Math.min(5, Math.floor(selectedChat.messages.length / 2))
      
      for (let i = 0; i < exchangesToShow; i++) {
        const userMsgIndex = i * 2
        const aiMsgIndex = i * 2 + 1
        
        if (userMsgIndex < selectedChat.messages.length) {
          summary += `Q: ${selectedChat.messages[userMsgIndex].content}\n`
        }
        
        if (aiMsgIndex < selectedChat.messages.length) {
          summary += `A: ${selectedChat.messages[aiMsgIndex].content}\n\n`
        }
      }
      
      // Add a note if there are more messages
      if (selectedChat.messages.length > exchangesToShow * 2) {
        summary += `...and ${selectedChat.messages.length - exchangesToShow * 2} more messages.\n`
      }
      
      summary += `\nView full chat: ${window.location.href}`
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summary)}`
      window.open(whatsappUrl, '_blank')
      
      alert("Opening WhatsApp share")
    } catch (error) {
      console.error("Error sharing via WhatsApp:", error)
      alert("Failed to share via WhatsApp")
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finsync AI Chatbot</h1>
          <p className="text-muted-foreground">Get personalized financial advice from our AI assistant</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Insights Summary Card */}
          {insights && (
            <Card className="w-auto border-0 shadow-none bg-transparent">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{insights.questionsThisWeek} this week</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium capitalize">{insights.mostCommonTopic}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">{insights.hoursSaved.toFixed(1)} hrs saved</span>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowInsights(true)}
            className="flex items-center gap-2"
          >
            <Lightbulb className="h-4 w-4" />
            Insights
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
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
          
          {/* Sentinel element for IntersectionObserver */}
          <div ref={sentinelRef} className="h-0" />
          
          {/* Export Options Card with sticky behavior */}
          {selectedChat && (
            <>
              {/* Placeholder to prevent layout jump */}
              {isSticky && <div style={{ height: `${stickyHeight}px` }} />}
              
              <div 
                ref={exportShareRef}
                className={`transition-all duration-300 ${
                  isSticky 
                    ? 'fixed top-4 z-10 w-[calc(33.333%-1.5rem)] shadow-lg' 
                    : 'mt-4'
                }`}
              >
                <Card className="transition-shadow duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Share2 className="h-4 w-4" />
                      Export & Share
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={exportToHTML}
                      disabled={isExporting}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export as HTML
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={exportToText}
                      disabled={isExporting}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as Text
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={shareViaWhatsApp}
                      disabled={isExporting}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Share via WhatsApp
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
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