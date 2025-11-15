"use client"

import { useState, useEffect, useRef } from "react"
import { ChatInterface } from "@/components/chatbot/chat-interface"
import { ChatHistory } from "@/components/chatbot/chat-history"
import { ChatInsights } from "@/components/chatbot/chat-insights"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, TrendingUp, Clock, MessageSquare, FileText, Share2, Download, FileDown } from "lucide-react"
import { chatbotAPI } from "@/lib/api-service"
import jsPDF from 'jspdf'

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

  // Export functionality - Direct PDF export with formatting
  const exportToPDF = async () => {
    if (!selectedChat || !selectedChat.messages.length) {
      alert("No messages to export")
      return
    }

    setIsExporting(true)
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - (margin * 2)
      let yPosition = margin

      // Helper function to check if we need a new page
      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage()
          yPosition = margin
          return true
        }
        return false
      }

      // Helper function to sanitize text for PDF (fix rupee symbol and other special chars)
      const sanitizeText = (text: string) => {
        return text
          .replace(/₹/g, 'Rs. ') // Replace rupee symbol with Rs.
          .replace(/\u20B9/g, 'Rs. ') // Replace Unicode rupee
          .replace(/[^\x00-\x7F]/g, (char) => { // Handle other non-ASCII chars
            const code = char.charCodeAt(0)
            if (code === 8377) return 'Rs. ' // Another rupee encoding
            return char // Keep other Unicode chars
          })
      }

      // Helper function to parse and render formatted content
      const renderFormattedContent = (content: string, boxX: number, maxWidth: number) => {
        const lines = content.split('\n')
        
        for (let i = 0; i < lines.length; i++) {
          let line = sanitizeText(lines[i])
          
          // Check for headers
          if (line.match(/^#{1,3}\s+/)) {
            checkPageBreak(12)
            const headerText = line.replace(/^#{1,3}\s+/, '')
            const level = (line.match(/^(#{1,3})/)?.[0].length || 1)
            const fontSize = level === 1 ? 14 : level === 2 ? 12 : 11
            
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(fontSize)
            pdf.setTextColor(40, 40, 40)
            const headerLines = pdf.splitTextToSize(headerText, maxWidth)
            headerLines.forEach((headerLine: string) => {
              pdf.text(headerLine, boxX, yPosition)
              yPosition += fontSize * 0.4
            })
            yPosition += 4
            
            // Underline for H1
            if (level === 1) {
              pdf.setDrawColor(200, 200, 200)
              pdf.line(boxX, yPosition - 2, boxX + maxWidth * 0.5, yPosition - 2)
              yPosition += 2
            }
            
            pdf.setFont('helvetica', 'normal')
            continue
          }
          
          // Check for lists
          if (line.match(/^[\*\-]\s+/) || line.match(/^\d+\.\s+/)) {
            checkPageBreak(8)
            const listText = line.replace(/^[\*\-]\s+/, '• ').replace(/^\d+\.\s+/, (match) => match)
            pdf.setFontSize(10)
            pdf.setTextColor(60, 60, 60)
            const listLines = pdf.splitTextToSize(listText, maxWidth - 5)
            listLines.forEach((listLine: string) => {
              pdf.text(listLine, boxX + 3, yPosition)
              yPosition += 5
            })
            continue
          }
          
          // Check for table rows
          if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            if (line.match(/^\|[\s\-:]+\|$/)) continue // Skip separator
            
            checkPageBreak(8)
            const cells = line.split('|').slice(1, -1).map(cell => sanitizeText(cell.trim()))
            const cellWidth = maxWidth / cells.length
            
            pdf.setFontSize(9)
            pdf.setTextColor(40, 40, 40)
            pdf.setFont('helvetica', 'normal')
            
            cells.forEach((cell, index) => {
              const cellX = boxX + (index * cellWidth)
              const cellText = cell.length > 25 ? cell.substring(0, 22) + '...' : cell
              pdf.text(cellText, cellX + 1, yPosition)
            })
            
            // Draw table borders
            pdf.setDrawColor(200, 200, 200)
            pdf.setLineWidth(0.1)
            cells.forEach((_, index) => {
              const cellX = boxX + (index * cellWidth)
              pdf.rect(cellX, yPosition - 4, cellWidth, 6)
            })
            yPosition += 7
            continue
          }
          
          // Check for horizontal rules
          if (line.match(/^-{3,}$/)) {
            checkPageBreak(4)
            pdf.setDrawColor(200, 200, 200)
            pdf.line(boxX, yPosition, boxX + maxWidth, yPosition)
            yPosition += 4
            continue
          }
          
          // Regular text with inline formatting
          if (line.trim() !== '') {
            checkPageBreak(8)
            
            // Remove markdown formatting for PDF
            let processedText = line
              .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
              .replace(/\*([^*]+)\*/g, '$1') // Italic
              .replace(/`([^`]+)`/g, '$1') // Inline code
            
            pdf.setFontSize(10)
            pdf.setTextColor(60, 60, 60)
            pdf.setFont('helvetica', 'normal')
            const textLines = pdf.splitTextToSize(processedText, maxWidth)
            textLines.forEach((textLine: string) => {
              pdf.text(textLine, boxX, yPosition)
              yPosition += 5
            })
            yPosition += 2
          } else {
            yPosition += 3 // Empty line spacing
          }
        }
      }

      // Header
      pdf.setFillColor(59, 130, 246)
      pdf.rect(0, 0, pageWidth, 25, 'F')
      
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(20)
      pdf.text('Finsync', pageWidth / 2, 12, { align: 'center' })
      
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text(selectedChat.title, pageWidth / 2, 19, { align: 'center' })
      
      yPosition = 35

      // Messages
      selectedChat.messages.forEach((message) => {
        const isUser = message.role === 'user'
        
        checkPageBreak(20)
        
        // Message role label
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)
        pdf.setTextColor(isUser ? 59 : 100, isUser ? 130 : 100, isUser ? 246 : 100)
        pdf.text(isUser ? 'You' : 'Finsync AI', margin, yPosition)
        yPosition += 7
        
        // Message content box
        const boxX = margin + 2
        const boxWidth = contentWidth - 4
        const contentStartY = yPosition
        
        // Render formatted content
        renderFormattedContent(message.content, boxX + 2, boxWidth - 4)
        
        // Draw box around message
        const boxHeight = yPosition - contentStartY + 2
        pdf.setDrawColor(isUser ? 59 : 220, isUser ? 130 : 220, isUser ? 246 : 220)
        pdf.setFillColor(isUser ? 240 : 249, isUser ? 248 : 250, isUser ? 255 : 251)
        pdf.setLineWidth(0.3)
        pdf.roundedRect(boxX, contentStartY - 3, boxWidth, boxHeight, 2, 2, 'FD')
        
        // Re-render content on top of box
        yPosition = contentStartY
        renderFormattedContent(message.content, boxX + 2, boxWidth - 4)
        
        yPosition += 8
      })

      // Footer
      const footerY = pageHeight - 10
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text(`Exported from Finsync AI - ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY, { align: 'center' })

      // Save PDF
      pdf.save(`${selectedChat.title.replace(/\s+/g, '_')}.pdf`)
      alert("Chat exported to PDF successfully")
    } catch (error) {
      console.error("Error exporting to PDF:", error)
      alert("Failed to export chat to PDF")
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
          
          {/* Sentinel element for IntersectionObserver */}
          <div ref={sentinelRef} className="h-0" />
          
          {/* Export Options Card with sticky behavior (disabled on mobile) */}
          {selectedChat && (
            <>
              {/* Placeholder to prevent layout jump */}
              {isSticky && <div className="hidden lg:block" style={{ height: `${stickyHeight}px` }} />}
              
              <div 
                ref={exportShareRef}
                className={`transition-all duration-300 mt-4 lg:mt-0 ${
                  isSticky 
                    ? 'lg:fixed lg:top-4 lg:z-10 lg:w-[calc(33.333%-1.5rem)] lg:shadow-lg' 
                    : 'lg:mt-4'
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
                      onClick={exportToPDF}
                      disabled={isExporting}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export as PDF
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